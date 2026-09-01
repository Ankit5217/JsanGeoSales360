"""
Pure unit tests for the geometry helpers in territory_balance_service.py -
convex hull and the boundary-redraw fallback logic. The test BODIES never
call Salesforce, but importing territory_balance_service pulls in
app.salesforce_client, which authenticates against Salesforce immediately
at import time (a real network call, module-level, not lazy) - so this
whole file needs backend/.env with real SF_* credentials just to collect,
and skips cleanly (not a failure) wherever that's not available, e.g. CI.
_boundary_for_members' deduped-points case is a regression test locking
in a real bug fixed earlier: a hull that collapses to 2 points (collinear
or duplicate input) used to slip past the old "len(input) < 3" check and
produce an invalid 2-point "polygon".
"""
import os
from pathlib import Path

import pytest
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

if not (os.getenv("SF_LOGIN_URL") and os.getenv("SF_CLIENT_ID") and os.getenv("SF_CLIENT_SECRET")):
    pytest.skip(
        "Requires backend/.env with real Salesforce credentials - "
        "app.salesforce_client authenticates at import time.",
        allow_module_level=True
    )

from app.services.territory_balance_service import (
    SINGLETON_PAD_DEGREES,
    _boundary_for_members,
    _centroid,
    _convex_hull,
    _distance,
)


def test_convex_hull_of_a_square_returns_all_four_corners():
    square = [(0, 0), (0, 1), (1, 1), (1, 0)]
    hull = _convex_hull(square)
    assert set(hull) == set(square)


def test_convex_hull_drops_an_interior_point():
    points = [(0, 0), (0, 2), (2, 2), (2, 0), (1, 1)]  # (1,1) is the center
    hull = _convex_hull(points)
    assert (1, 1) not in hull
    assert len(hull) == 4


def test_convex_hull_of_two_points_returns_both():
    assert _convex_hull([(0, 0), (1, 1)]) == [(0, 0), (1, 1)]


def test_distance_between_identical_points_is_zero():
    point = {"lat": 17.4, "lng": 78.5}
    assert _distance(point, (17.4, 78.5)) == 0


def test_centroid_of_empty_list_is_none():
    assert _centroid([]) is None


def test_centroid_averages_lat_lng():
    members = [{"lat": 0, "lng": 0}, {"lat": 2, "lng": 4}]
    assert _centroid(members) == (1, 2)


def test_boundary_for_members_returns_none_for_no_members():
    assert _boundary_for_members([]) is None


def test_boundary_for_members_normal_triangle_is_a_closed_polygon():
    members = [
        {"lat": 17.30, "lng": 78.30},
        {"lat": 17.40, "lng": 78.40},
        {"lat": 17.30, "lng": 78.50},
    ]
    boundary = _boundary_for_members(members)

    assert boundary["type"] == "Polygon"
    ring = boundary["coordinates"][0]
    assert ring[0] == ring[-1]  # GeoJSON rings must close
    assert len(ring) >= 4  # 3 padded corners + the closing repeat


def test_boundary_for_members_singleton_falls_back_to_a_small_square():
    boundary = _boundary_for_members([{"lat": 17.4, "lng": 78.5}])
    ring = boundary["coordinates"][0]

    assert len(ring) == 5  # 4 corners + closing repeat
    lngs = [p[0] for p in ring]
    assert max(lngs) - min(lngs) == pytest.approx(2 * SINGLETON_PAD_DEGREES)


def test_boundary_for_members_deduped_points_dont_produce_a_degenerate_polygon():
    # Three members where two share the exact same coordinates (e.g. a
    # geocoding rounding collision) - _convex_hull dedupes via set(), so
    # this reliably collapses to a 2-point hull. This is the same shape
    # as the real bug fixed earlier: a hull of 3+ points collapsing below
    # 3 vertices (collinear or duplicate) used to slip past the old
    # "len(raw input) < 3" check and produce an invalid 2-point "polygon".
    members = [
        {"lat": 17.30, "lng": 78.30},
        {"lat": 17.30, "lng": 78.30},  # exact duplicate
        {"lat": 17.40, "lng": 78.40},
    ]
    boundary = _boundary_for_members(members)
    ring = boundary["coordinates"][0]

    # Must fall back to the padded-square path, not a 2-point line.
    assert len(ring) == 5
    lngs = [p[0] for p in ring]
    lats = [p[1] for p in ring]
    assert max(lngs) - min(lngs) > 0
    assert max(lats) - min(lats) > 0
