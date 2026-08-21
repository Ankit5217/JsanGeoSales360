import os
from pathlib import Path

import requests
from dotenv import load_dotenv
from fastapi import HTTPException

# Loaded directly (not relying on import order elsewhere) - same reasoning
# as auth.py: this module can be imported before whatever else happens to
# trigger .env loading first.
load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")

ORS_API_KEY = os.getenv("ORS_API_KEY")
ORS_BASE_URL = "https://api.openrouteservice.org"


def optimize_route(stops: list[dict], start: dict):
    """
    stops: [{"id": str, "name": str, "lat": float, "lng": float}, ...]
    start: {"lat": float, "lng": float} - the rep's starting point.

    Calls ORS's VROOM-based /optimization endpoint: given a single
    vehicle starting at `start` and one job per stop, returns the
    visiting order that minimizes real road travel time, plus the
    actual road-following route geometry, distance, and duration -
    replacing the old straight-line nearest-neighbor simulation.
    """
    if not ORS_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Routing is not configured (ORS_API_KEY missing)"
        )

    if not stops:
        raise HTTPException(
            status_code=400,
            detail="No stops provided for route optimization"
        )

    payload = {
        "vehicles": [
            {
                "id": 1,
                "profile": "driving-car",
                "start": [start["lng"], start["lat"]]
            }
        ],
        "jobs": [
            {
                "id": index,
                "location": [stop["lng"], stop["lat"]]
            }
            for index, stop in enumerate(stops)
        ],
        "options": {
            "g": True
        }
    }

    response = requests.post(
        f"{ORS_BASE_URL}/optimization",
        json=payload,
        headers={
            "Authorization": ORS_API_KEY,
            "Content-Type": "application/json"
        },
        timeout=20
    )

    if not response.ok:
        raise HTTPException(
            status_code=502,
            detail=f"Routing service request failed: {response.text}"
        )

    data = response.json()

    routes = data.get("routes") or []

    if not routes:
        raise HTTPException(
            status_code=502,
            detail="Routing service returned no route"
        )

    route = routes[0]

    # Map each "job" step back to the stop that was passed in, in the
    # optimized visiting order.
    ordered_stops = []
    for step in route.get("steps", []):
        if step.get("type") != "job":
            continue
        stop = stops[step["id"]]
        ordered_stops.append({
            **stop,
            "arrival_seconds": step.get("arrival"),
        })

    return {
        "ordered_stops": ordered_stops,
        "geometry": route.get("geometry"),
        "distance_meters": route.get("distance"),
        "duration_seconds": route.get("duration")
    }
