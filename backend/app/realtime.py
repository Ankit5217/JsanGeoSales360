import logging
import time

from fastapi import WebSocket

logger = logging.getLogger(__name__)


# WebSocket -> {"username", "role"} for every connected client. Identity is
# attached at handshake time (see main.py) so broadcasts can be targeted by
# role or by a specific user instead of fanning out to everyone.
connected_clients = {}

# username -> {"lat", "lng", "role", "updated_at"} - the latest known
# position of every rep currently sharing their location. In-memory only,
# never persisted to Salesforce (a rep's live position is inherently
# ephemeral, and there's no Salesforce object for it).
live_positions = {}


async def connect_client(websocket: WebSocket, user: dict):

    await websocket.accept()

    connected_clients[websocket] = user

    logger.info("WebSocket client connected: %s (%s)", user["username"], user["role"])
    logger.info("Connected clients: %d", len(connected_clients))


async def disconnect_client(websocket: WebSocket):

    user = connected_clients.pop(websocket, None)

    if user:
        await clear_position(user["username"])

    logger.info("WebSocket client disconnected: %s", user["username"] if user else "unknown")
    logger.info("Connected clients: %d", len(connected_clients))


async def clear_position(username):
    """Drops a rep's live position and tells managers they're offline -
    called both when a rep explicitly toggles sharing off (still connected)
    and when their connection drops entirely (disconnect_client)."""

    if username in live_positions:
        del live_positions[username]
        await broadcast_event(
            "rep_offline",
            {"username": username},
            roles=["ADMIN", "SALES_MANAGER"]
        )


async def broadcast_event(event_type, data, roles=None):
    """
    roles=None (default) sends to every connected client - the existing
    behavior field_visit_updated/account_updated already rely on. Pass a
    list of roles (e.g. ["ADMIN", "SALES_MANAGER"]) to target only clients
    with one of those roles - used for rep position updates, so reps never
    see each other's live location.
    """

    message = {
        "type": event_type,
        "data": data
    }

    disconnected_clients = []

    for client, user in connected_clients.items():

        if roles is not None and user["role"] not in roles:
            continue

        try:
            await client.send_json(message)
        except Exception as e:
            logger.warning("Failed to send WebSocket event: %s", e)
            disconnected_clients.append(client)

    for client in disconnected_clients:
        connected_clients.pop(client, None)


async def send_to_user(username, event_type, data):
    """Sends to every connection currently authenticated as `username`
    (normally just one) - used for the stop-nudge, which targets exactly
    one rep rather than a role."""

    message = {
        "type": event_type,
        "data": data
    }

    for client, user in list(connected_clients.items()):

        if user["username"] != username:
            continue

        try:
            await client.send_json(message)
        except Exception as e:
            logger.warning("Failed to send WebSocket event: %s", e)
            connected_clients.pop(client, None)


def record_position(username, role, lat, lng):
    live_positions[username] = {
        "lat": lat,
        "lng": lng,
        "role": role,
        "updated_at": time.time()
    }
