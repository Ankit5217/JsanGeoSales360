import logging

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.realtime import connected_clients

from app.routers.salesforce_router import router as salesforce_router
from app.realtime import connect_client, disconnect_client

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s"
)

logger = logging.getLogger(__name__)


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

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# ROUTERS
# ============================================================

app.include_router(salesforce_router)


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