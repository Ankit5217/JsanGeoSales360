from fastapi import WebSocket


connected_clients = set()


async def connect_client(websocket: WebSocket):

    await websocket.accept()

    connected_clients.add(websocket)

    print("🟢 WebSocket client connected")
    print("Connected clients:", len(connected_clients))


async def disconnect_client(websocket: WebSocket):

    connected_clients.discard(websocket)

    print("🟡 WebSocket client disconnected")
    print("Connected clients:", len(connected_clients))


async def broadcast_event(event_type, data):

    message = {
        "type": event_type,
        "data": data
    }

    print("======================================")
    print("📡 BROADCAST EVENT")
    print("Event type:", event_type)
    print("Connected clients:", len(connected_clients))
    print("Data:", data)
    print("======================================")

    disconnected_clients = []

    for client in connected_clients:

        try:

            await client.send_json(message)

            print("✅ Event sent to WebSocket client")

        except Exception as e:

            print("❌ Failed to send WebSocket event:", e)

            disconnected_clients.append(client)

    for client in disconnected_clients:

        connected_clients.discard(client)