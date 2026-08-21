from pydantic import BaseModel


class RouteStop(BaseModel):
    id: str
    name: str | None = None
    lat: float
    lng: float


class RouteStart(BaseModel):
    lat: float
    lng: float


class RouteOptimizeRequest(BaseModel):
    stops: list[RouteStop]
    start: RouteStart
