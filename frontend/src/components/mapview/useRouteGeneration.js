import { useState } from "react";
import { optimizeRoute } from "../../services/salesforceApi";
import { decodePolyline, haversine } from "./mapviewUtils";

// Turns a territory's pending stops into a real, road-following route via
// OpenRouteService (falling back to a straight-line distance estimate only
// if ORS doesn't return usable distance/duration - the stop order itself
// is always real either way).
export function useRouteGeneration({ records, leadRecords }) {
  const [route, setRoute] = useState(null);
  const [routeGeometry, setRouteGeometry] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState("");
  const [routeTerritory, setRouteTerritory] = useState('');

  async function runRouteOptimization(stops) {
    // First stop is treated as the starting point (matches the old
    // nearestNeighborRoute behavior, which always chained forward from
    // stops[0]); the rest are optimized as visit-order jobs against real
    // road distances via OpenRouteService.
    const [start, ...jobStops] = stops;

    setRouteLoading(true);
    setRouteError("");

    try {
      if (jobStops.length === 0) {
        setRoute(stops);
        setRouteGeometry(null);
        setRouteInfo(null);
        return;
      }

      const result = await optimizeRoute(
        jobStops.map(s => ({ id: s.id, name: s.name, lat: s.lat, lng: s.lng })),
        { lat: start.lat, lng: start.lng }
      );

      const byId = new Map(stops.map(s => [s.id, s]));

      const orderedFullStops = [
        start,
        ...result.ordered_stops.map(o => byId.get(o.id)).filter(Boolean)
      ];

      setRoute(orderedFullStops);
      setRouteGeometry(result.geometry ? decodePolyline(result.geometry) : null);
      setRouteInfo({
        distanceKm: result.distance_meters / 1000,
        etaMin: result.duration_seconds / 60
      });
    } catch (error) {
      console.error("Route optimization failed:", error);

      setRouteError(error.message || "Failed to generate a real route. Try again.");
      setRoute(null);
      setRouteGeometry(null);
      setRouteInfo(null);
    } finally {
      setRouteLoading(false);
    }
  }

  async function generateRoute() {
    // Combine Salesforce Accounts + Leads
    const mapRecords = [...records, ...leadRecords];

    // Get Accounts + Leads belonging to selected territory
    const territoryRecords = mapRecords.filter(record => record.territory === routeTerritory);

    // Only pending visits should normally be included
    const pendingStops = territoryRecords.filter(record => record.visitStatus === "pending");

    // If there are at least 2 pending stops, optimize those stops
    if (pendingStops.length >= 2) {
      await runRouteOptimization(pendingStops);
      return;
    }

    // If fewer than 2 pending stops exist, use all records in the territory
    if (territoryRecords.length >= 2) {
      await runRouteOptimization(territoryRecords);
      return;
    }

    // No usable route
    alert(`Not enough accounts or leads in ${routeTerritory} to generate a route.`);
    setRoute(null);
  }

  const routeStats = route ? (() => {
    if (routeInfo) {
      return {
        stops: route.length,
        distKm: routeInfo.distanceKm.toFixed(1),
        etaMin: Math.round(routeInfo.etaMin)
      };
    }
    // Straight-line fallback - only used if ORS didn't return usable
    // distance/duration for some reason (route order is still real).
    let dist = 0;
    for (let i = 1; i < route.length; i++) dist += haversine([route[i - 1].lat, route[i - 1].lng], [route[i].lat, route[i].lng]);
    return { stops: route.length, distKm: dist.toFixed(1), etaMin: Math.round(dist / 28 * 60) };
  })() : null;

  return {
    route,
    setRoute,
    routeGeometry,
    setRouteGeometry,
    routeInfo,
    setRouteInfo,
    routeLoading,
    routeError,
    setRouteError,
    routeTerritory,
    setRouteTerritory,
    generateRoute,
    routeStats
  };
}
