import logging
import os

from fastapi import Depends, FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.realtime import connected_clients

from app.auth import get_current_user
from app.routers.auth_router import router as auth_router
from app.routers.salesforce_router import router as salesforce_router
from app.realtime import connect_client, disconnect_client

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
async def websocket_endpoint(websocket: WebSocket):

    await connect_client(websocket)

    try:

        while True:

            message = await websocket.receive_text()

            logger.debug("WebSocket message: %s", message)

    except WebSocketDisconnect:

        await disconnect_client(websocket)

# ============================================================
# BROADCAST EVENT
# ============================================================

# async def broadcast_event(
#     event_type,
#     data
# ):

#     message = {
#         "type": event_type,
#         "data": data
#     }

#     disconnected_clients = []

#     for client in connected_clients:

#         try:

#             await client.send_json(message)

#         except Exception:

#             disconnected_clients.append(
#                 client
#             )

#     for client in disconnected_clients:

#         connected_clients.discard(
#             client
#         )

# @app.post("/test-broadcast")
# async def test_broadcast():
#     await broadcast_event(
#         "test_event",
#         {
#             "message": "Hello from JSAN GeoSales 360!",
#             "source": "FastAPI",
#             "status": "success"
#         }
#     )

#     return {
#         "status": "broadcast_sent"
#     }