import { describe, expect, it, vi } from "vitest";
import { decodePolyline, haversine, parseTerritoryBoundary } from "./mapviewUtils";

describe("haversine", () => {
    it("returns 0 for identical points", () => {
        expect(haversine([17.4, 78.5], [17.4, 78.5])).toBe(0);
    });

    it("returns the known great-circle distance for 1 degree of longitude at the equator", () => {
        // A textbook reference value: 1 degree of longitude at the equator
        // is ~111.19 km.
        const distanceKm = haversine([0, 0], [0, 1]);
        expect(distanceKm).toBeCloseTo(111.19, 1);
    });

    it("is symmetric", () => {
        const a = [17.385, 78.4867];
        const b = [17.44, 78.35];
        expect(haversine(a, b)).toBeCloseTo(haversine(b, a), 10);
    });
});

describe("decodePolyline", () => {
    it("decodes the canonical Google polyline algorithm example", () => {
        // https://developers.google.com/maps/documentation/utilities/polylinealgorithm
        const encoded = "_p~iF~ps|U_ulLnnqC_mqNvxq`@";
        const points = decodePolyline(encoded);

        expect(points).toHaveLength(3);
        expect(points[0][0]).toBeCloseTo(38.5, 4);
        expect(points[0][1]).toBeCloseTo(-120.2, 4);
        expect(points[1][0]).toBeCloseTo(40.7, 4);
        expect(points[1][1]).toBeCloseTo(-120.95, 4);
        expect(points[2][0]).toBeCloseTo(43.252, 4);
        expect(points[2][1]).toBeCloseTo(-126.453, 4);
    });

    it("returns an empty array for an empty string", () => {
        expect(decodePolyline("")).toEqual([]);
    });
});

describe("parseTerritoryBoundary", () => {
    it("returns null when there is no saved boundary", () => {
        expect(parseTerritoryBoundary({})).toBeNull();
    });

    it("parses a valid GeoJSON Polygon into [lat, lng] pairs", () => {
        const territory = {
            Boundary_GeoJSON__c: JSON.stringify({
                type: "Polygon",
                coordinates: [[[78.30, 17.30], [78.40, 17.30], [78.40, 17.40], [78.30, 17.30]]]
            })
        };

        const result = parseTerritoryBoundary(territory);

        expect(result).toEqual([
            [17.30, 78.30],
            [17.30, 78.40],
            [17.40, 78.40],
            [17.30, 78.30]
        ]);
    });

    it("returns null for a non-Polygon geometry type", () => {
        const territory = {
            Boundary_GeoJSON__c: JSON.stringify({ type: "Point", coordinates: [78.3, 17.3] })
        };
        expect(parseTerritoryBoundary(territory)).toBeNull();
    });

    it("returns null (not a throw) for malformed JSON", () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        const territory = { Boundary_GeoJSON__c: "{not valid json" };

        expect(parseTerritoryBoundary(territory)).toBeNull();

        spy.mockRestore();
    });
});
