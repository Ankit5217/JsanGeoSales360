import json


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
    Returns the Territory_Code__c of the first saved boundary containing
    the point, or None if no boundary covers it.
    """
    for territory in territories:
        if point_in_geojson_polygon(lat, lng, territory.get("boundary_geojson")):
            return territory.get("territory_code")

    return None
