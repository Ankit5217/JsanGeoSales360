import logging
import os

from fastapi import Depends, FastAPI, Query, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import json
                                                                                                                                                                                                                                                            
from apscheduler.schedulers.background import BackgroundScheduler

from app.auth import get_current_user, decode_token
from app.routers.auth_router import router as auth_router
from app.routers.salesforce_router import router as salesforce_router
from app.routers.reports_router import router as reports_router
from app.realtime import connect_client, disconnect_client, broadcast_event, send_to_user, record_position, clear_position
from app.services.report_scheduler_service import send_daily_report, maybe_catch_up_on_startup

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s"
)

logger = logging.getLogger(__name__)

if not os.getenv("JWT_SECRET_KEY"):
    logger.warning(
        "JWT_SECRET_KEY is not set — login and all Salesforce endpoints "
        "will fail until it's configured."
    )

if not os.getenv("APP_USERS"):
    logger.warning(
        "APP_USERS is not set — no one will be able to log in until it's "
        "configured. See backend/.env.example."
    )


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="JSAN GeoSales 360 API",
    version="1.0.0"
)


# ============================================================
# CORS
# ============================================================

FRONTEND_URL = os.getenv("FRONTEND_URL")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        *([FRONTEND_URL] if FRONTEND_URL else [])
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# ROUTERS
# ============================================================

app.include_router(auth_router)
app.include_router(
    salesforce_router,
    dependencies=[Depends(get_current_user)]
)
app.include_router(reports_router)


# ============================================================
# ERROR HANDLING
# ============================================================
# HTTPException (raised deliberately, e.g. by sf_request()) is still
# handled by FastAPI's own default handler with its real status code.
# This only catches genuine bugs so they log with a traceback and come
# back as a consistent JSON body instead of Starlette's plain-text 500.

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception(
        "Unhandled error on %s %s",
        request.method,
        request.url.path
    )

    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )


# ============================================================
# SCHEDULED EXECUTIVE REPORT EMAILS
# ============================================================

@app.on_event("startup")
def start_report_scheduler():
    if not os.getenv("SMTP_USERNAME"):
        logger.warning(
            "SMTP_USERNAME is not set - scheduled executive report emails "
            "are disabled until backend/.env is configured."
        )
        return

    # The backend isn't a persistent service - if it wasn't running at
    # today's send time, this sends immediately instead of silently
    # skipping the day (guarded so it only fires once per day).
    maybe_catch_up_on_startup()

    send_hour = int(os.getenv("REPORT_SEND_HOUR_IST", "8"))

    scheduler = BackgroundScheduler(timezone="Asia/Kolkata")
    scheduler.add_job(
        send_daily_report,
        "cron",
        hour=send_hour,
        minute=0,
        id="daily_executive_report",
        misfire_grace_time=3600
    )
    scheduler.start()

    logger.info(
        "Scheduled executive report emails: daily at %02d:00 IST", send_hour
    )


# ============================================================
# WEBSOCKET CLIENTS
# ============================================================



# ============================================================
# ROOT ENDPOINT
# ============================================================

@app.get("/")
def root():

    return {
        "message": "Welcome to JSAN GeoSales 360 API"
    }


# ============================================================
# WEBSOCKET ENDPOINT
# ============================================================

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(default=None)):

    user = decode_token(token)

    if not user:
        # A close code sent before the handshake is accepted can't reach the
        # browser as anything but a generic 1006 abnormal-closure - accept
        # first so the real 4401 propagates and the frontend's reconnect
        # logic can tell "bad token" apart from a transient network drop.
        await websocket.accept()
        await websocket.close(code=4401)
        return

    await connect_client(websocket, user)

    try:

        while True:

            raw_message = await websocket.receive_text()

            try:
                message = json.loads(raw_message)
            except (TypeError, ValueError):
                logger.debug("Ignoring non-JSON WebSocket message: %s", raw_message)
                continue

            message_type = message.get("type")

            if message_type == "position_update":
                lat = message.get("lat")
                lng = message.get("lng")

                if lat is None or lng is None:
                    continue

                record_position(user["username"], user["role"], lat, lng)

                await broadcast_event(
                    "rep_position",
                    {"username": user["username"], "role": user["role"], "lat": lat, "lng": lng},
                    roles=["ADMIN", "SALES_MANAGER"]
                )

            elif message_type == "position_stop":
                await clear_position(user["username"])

            elif message_type == "stop_nudge":
                if user["role"] not in ("ADMIN", "SALES_MANAGER"):
                    continue

                target_username = message.get("target_username")

                if not target_username:
                    continue

                await send_to_user(
                    target_username,
                    "stop_nudge",
                    {
                        "from": user["username"],
                        "accountName": message.get("accountName"),
                        "lat": message.get("lat"),
                        "lng": message.get("lng")
                    }
                )

            else:
                logger.debug("Ignoring unknown WebSocket message type: %s", message_type)

    except WebSocketDisconnect:

        await disconnect_client(websocket)