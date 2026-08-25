import json
import math
import random

# Real geocoding is a separate, bigger feature; until then, every
# auto-located record gets a random point within this Hyderabad-area
# box. Territory names are directional (Hyderabad North/South/East/
# West), so a point's compass direction *from the middle of this box*
# is used as a fallback territory match whenever a territory doesn't
# have a hand-drawn boundary yet - keeping "which territory a record
# lands in" and "where it actually is" consistent even before every
# territory has a real polygon.
HYDERABAD_LAT_RANGE = (17.15, 17.65)
HYDERABAD_LNG_RANGE = (78.30, 78.70)
HYDERABAD_CENTER = (
    sum(HYDERABAD_LAT_RANGE) / 2,
    sum(HYDERABAD_LNG_RANGE) / 2,
)

# Compass bearing (0=N, 90=E, 180/-180=S, -90=W) each direction is
# centered on. A point belongs to a direction if it's within 45
# degrees of that bearing - four equal, non-overlapping quadrants
# radiating out from HYDERABAD_CENTER.
DIRECTION_BEARINGS = {
    "NORTH": 0,
    "EAST": 90,
    "SOUTH": 180,
    "WEST": -90,
}


def random_point_in_bbox():
    lat = round(random.uniform(*HYDERABAD_LAT_RANGE), 5)
    lng = round(random.uniform(*HYDERABAD_LNG_RANGE), 5)
    return lat, lng


def _bearing_from_center(lat, lng):
    d_lat = lat - HYDERABAD_CENTER[0]
    d_lng = lng - HYDERABAD_CENTER[1]
    return math.degrees(math.atan2(d_lng, d_lat))


def _angle_diff(a, b):
    return abs((a - b + 180) % 360 - 180)


def direction_from_territory_code(territory_code):
    """'HYD-NORTH' / 'Hyderabad North' -> 'NORTH', tolerant of whatever
    casing/format the code happens to be in. None if it doesn't name
    one of the four compass directions."""
    if not territory_code:
        return None

    upper = territory_code.upper()

    for direction in DIRECTION_BEARINGS:
        if direction in upper:
            return direction

    return None


def point_in_direction_sector(lat, lng, direction):
    target = DIRECTION_BEARINGS.get(direction)

    if target is None or lat is None or lng is None:
        return False

    return _angle_diff(_bearing_from_center(lat, lng), target) <= 45


def _polygon_bbox(geojson_str):
    try:
        geometry = json.loads(geojson_str)
    except (json.JSONDecodeError, TypeError):
        return None

    geom_type = geometry.get("type")
    coordinates = geometry.get("coordinates")

    points = []
    if geom_type == "Polygon" and coordinates:
        points = coordinates[0]
    elif geom_type == "MultiPolygon" and coordinates:
        for polygon in coordinates:
            points.extend(polygon[0])

    if not points:
        return None

    lats = [p[1] for p in points]
    lngs = [p[0] for p in points]
    return min(lats), max(lats), min(lngs), max(lngs)


def random_point_in_polygon(geojson_str, max_attempts=200):
    """Rejection-samples a point inside a saved boundary's own bounding
    box until one actually lands inside the polygon. None if the
    boundary is missing/invalid or nothing landed inside after
    max_attempts (only possible for a degenerate sliver of a shape)."""
    bbox = _polygon_bbox(geojson_str)

    if not bbox:
        return None

    min_lat, max_lat, min_lng, max_lng = bbox

    for _ in range(max_attempts):
        lat = round(random.uniform(min_lat, max_lat), 5)
        lng = round(random.uniform(min_lng, max_lng), 5)

        if point_in_geojson_polygon(lat, lng, geojson_str):
            return lat, lng

    return None


def generate_point_for_territory(territory_code, territories, max_attempts=500):
    """
    Returns a (lat, lng) that genuinely belongs to `territory_code`:
    inside its real saved boundary if it has one, otherwise inside the
    compass-direction sector implied by its own name. Falls back to
    anywhere in the metro area only if the code names no known
    direction and has no boundary.
    """
    match = next(
        (
            t for t in territories
            if (t.get("territory_code") or "").upper() == (territory_code or "").upper()
        ),
        None
    )

    if match and match.get("boundary_geojson"):
        point = random_point_in_polygon(match["boundary_geojson"], max_attempts)
        if point:
            return point

    direction = direction_from_territory_code(territory_code)

    if direction:
        for _ in range(max_attempts):
            lat, lng = random_point_in_bbox()
            if point_in_direction_sector(lat, lng, direction):
                return lat, lng

    return random_point_in_bbox()


def _point_in_ring(lat, lng, ring):
    """Ray-casting point-in-polygon test. `ring` is a list of
    [lng, lat] pairs (GeoJSON coordinate order)."""

    inside = False
    n = len(ring)
    j = n - 1

    for i in range(n):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]

        intersect = ((yi > lat) != (yj > lat)) and (
            lng < (xj - xi) * (lat - yi) / (yj - yi + 1e-15) + xi
        )

        if intersect:
            inside = not inside

        j = i

    return inside


def point_in_geojson_polygon(lat, lng, geojson_str):
    """
    geojson_str: a GeoJSON Polygon or MultiPolygon geometry, as saved by
    the GIS Map's boundary editor (Leaflet's layer.toGeoJSON().geometry).
    """
    if not geojson_str or lat is None or lng is None:
        return False

    try:
        geometry = json.loads(geojson_str)
    except (json.JSONDecodeError, TypeError):
        return False

    geom_type = geometry.get("type")
    coordinates = geometry.get("coordinates")

    if not coordinates:
        return False

    if geom_type == "Polygon":
        rings = coordinates

        if not _point_in_ring(lat, lng, rings[0]):
            return False

        # Any additional rings are holes - a point inside one isn't
        # actually inside the territory.
        for hole in rings[1:]:
            if _point_in_ring(lat, lng, hole):
                return False

        return True

    if geom_type == "MultiPolygon":
        for polygon in coordinates:
            if not _point_in_ring(lat, lng, polygon[0]):
                continue
            if any(_point_in_ring(lat, lng, hole) for hole in polygon[1:]):
                continue
            return True

        return False

    return False


def find_territory_code_for_point(lat, lng, territories):
    """
    territories: list of dicts with 'territory_code' and
    'boundary_geojson' keys (matches get_territory_assignments()'s shape).
    Prefers an exact match against a real saved boundary; falls back to
    the compass-direction sector implied by a territory's own name
    (see generate_point_for_territory) for any territory that doesn't
    have a boundary drawn yet. None if nothing matches either way.
    """
    for territory in territories:
        if point_in_geojson_polygon(lat, lng, territory.get("boundary_geojson")):
            return territory.get("territory_code")

    for territory in territories:
        code = territory.get("territory_code")
        if not territory.get("boundary_geojson") and point_in_direction_sector(lat, lng, direction_from_territory_code(code)):
            return code

    return None
