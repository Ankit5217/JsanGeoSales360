// Pure helper functions and constants used across the GIS Map view.
// Split out of mapview.jsx (Phase 9) - no behavior change, just moved.

import { OPPORTUNITY_STAGES } from "../modules/Opportunities";

export const TYPE_COLOR = { customer: '#0B2E4F', lead: '#0E8388', opportunity: '#D98F00', prospect: '#2E8B57', duplicate: '#C1443C' };
export const TYPE_LABEL = { customer: 'Existing Customer', lead: 'Existing Lead', opportunity: 'High-value Opportunity', prospect: 'New Prospect', duplicate: 'Possible Duplicate' };
export const PRIORITY_COLOR = {
  High: "#e53935",      // Red
  Medium: "#fb8c00",    // Orange
  Low: "#43a047"        // Green
};

export const GEOFENCE_RADIUS_METERS = 150;

// Distinct colors cycled across however many territories have a saved
// boundary - real data now, not a fixed two-territory list.
export const TERRITORY_BOUNDARY_COLORS = ['#0E8388', '#7B1FA2', '#D98F00', '#2E7D32', '#C1443C', '#1565C0'];

export function parseTerritoryBoundary(territory) {
  if (!territory.Boundary_GeoJSON__c) return null;
  try {
    const geometry = JSON.parse(territory.Boundary_GeoJSON__c);
    if (geometry.type !== "Polygon") return null;
    return geometry.coordinates[0].map(([lng, lat]) => [lat, lng]);
  } catch (err) {
    console.error("Saved territory boundary is not valid GeoJSON:", err);
    return null;
  }
}

export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    });
  });
}

// Decodes the Google-encoded polyline (precision 5) that OpenRouteService
// returns for a route's geometry, into an array of [lat, lng] pairs.
export function decodePolyline(encoded) {
  const points = [];
  let index = 0, lat = 0, lng = 0;

  while (index < encoded.length) {
    let result = 1, shift = 0, b;
    do {
      b = encoded.charCodeAt(index++) - 63 - 1;
      result += b << shift;
      shift += 5;
    } while (b >= 0x1f);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);

    result = 1;
    shift = 0;
    do {
      b = encoded.charCodeAt(index++) - 63 - 1;
      result += b << shift;
      shift += 5;
    } while (b >= 0x1f);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);

    points.push([lat * 1e-5, lng * 1e-5]);
  }

  return points;
}

export function haversine(a, b) {
  const R = 6371;
  const dLat = (b[0] - a[0]) * Math.PI / 180;
  const dLng = (b[1] - a[1]) * Math.PI / 180;
  const lat1 = a[0] * Math.PI / 180, lat2 = b[0] * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function calculateAIScore(record) {

    let score = 0;

    // Priority
    if (record.priority === "High")
        score += 30;
    else if (record.priority === "Medium")
        score += 20;
    else
        score += 10;

    // Revenue
    if (record.oppValue > 1000000)
        score += 30;
    else if (record.oppValue > 500000)
        score += 20;
    else if (record.oppValue > 100000)
        score += 10;

    // Validation
    if (record.validation === "Validated")
        score += 20;
    else
        score += 5;

    // Record Type
    if (record.type === "customer")
        score += 20;
    else if (record.type === "lead")
        score += 15;
    else if (record.type === "prospect")
        score += 10;

    return Math.min(score, 100);
}

export function calculateRevenueRisk(record) {

    let risk = 0;

    // Pending validation
    if (record.validation === "Pending")
        risk += 40;

    // Rejected validation
    if (record.validation === "Rejected")
        risk += 60;

    // High revenue account
    if (record.oppValue > 1000000)
        risk += 20;

    // Medium revenue
    else if (record.oppValue > 500000)
        risk += 10;

    // High priority customer
    if (record.priority === "High")
        risk += 20;

    // Medium priority
    if (record.priority === "Medium")
        risk += 10;

    return Math.min(risk,100);

}

export function calculateTerritoryScore(t) {

    let score = 0;

    // High Priority
    score += t.highPriority * 15;

    // Revenue
    score += t.totalRevenue / 100000;

    // Validation
    const validationRate =
        t.totalAccounts === 0
            ? 0
            : (t.completed / t.totalAccounts) * 100;

    score += validationRate * 0.3;

    // Penalty
    score -= t.pending * 5;

    return Math.min(100, Math.round(score));
}

// Smart Suggestions (Phase 10B) - next-best-stop ranking.

export const NEXT_BEST_STOP_RADIUS_KM = 15;

const OPEN_OPPORTUNITY_STAGES = OPPORTUNITY_STAGES.filter(
    stage => stage !== "Closed Won" && stage !== "Closed Lost"
);

// Whole days between a Last_Visit_Date__c-style value and now. Null means
// "never visited" (the field is the literal string "-" when unset).
export function daysSince(dateString) {
    if (!dateString || dateString === "-") return null;

    const then = new Date(dateString);
    if (isNaN(then.getTime())) return null;

    return Math.max(0, Math.floor((Date.now() - then.getTime()) / 86400000));
}

function distanceBonus(distanceKm) {
    if (distanceKm <= 1) return 20;
    if (distanceKm <= 3) return 15;
    if (distanceKm <= 7) return 10;
    return 5;
}

// Ranks how worth visiting `record` is right now, given the rep's current
// position. Returns null for records outside NEXT_BEST_STOP_RADIUS_KM, or
// for a closed Lead/Opportunity - these aren't candidates, not zero-scored
// ones (a closed Lead is done, not a stop still waiting on a visit).
// Two lenses: accounts/leads are visit-driven (overdue days + priority),
// opportunities are deal-driven (stage progress + value) since they carry
// no real lastVisit/priority of their own (see useRecordsData.js).
export function calculateNextBestStopScore(record, currentPos) {
    if (record.lat == null || record.lng == null) return null;

    const distanceKm = haversine([currentPos.lat, currentPos.lng], [record.lat, record.lng]);
    if (distanceKm > NEXT_BEST_STOP_RADIUS_KM) return null;

    const distancePart = distanceBonus(distanceKm);
    const distanceLabel = `${distanceKm.toFixed(1)} km away`;

    if (record.type === "lead" && record.isClosed) return null;

    if (record.type === "opportunity") {
        if (record.stage === "Closed Won" || record.stage === "Closed Lost") return null;

        const stageIndex = OPEN_OPPORTUNITY_STAGES.indexOf(record.stage);
        const stageScore = stageIndex >= 0
            ? Math.round((stageIndex / (OPEN_OPPORTUNITY_STAGES.length - 1)) * 40)
            : 15;

        let valueScore = 0;
        if (record.oppValue > 1000000) valueScore = 30;
        else if (record.oppValue > 500000) valueScore = 20;
        else if (record.oppValue > 100000) valueScore = 10;

        return {
            score: Math.min(100, stageScore + valueScore + distancePart),
            reason: `Open opportunity in ${record.stage || "early stage"} · ${distanceLabel}`,
            distanceKm
        };
    }

    const overdueDays = daysSince(record.lastVisit);
    let overdueScore, overdueLabel;

    if (overdueDays === null) {
        overdueScore = 45;
        overdueLabel = record.type === "lead" ? "New lead · unvisited ever" : "Never visited";
    } else if (overdueDays >= 60) {
        overdueScore = 45;
        overdueLabel = `Overdue visit (${overdueDays} days)`;
    } else if (overdueDays >= 30) {
        overdueScore = 35;
        overdueLabel = `Overdue visit (${overdueDays} days)`;
    } else if (overdueDays >= 14) {
        overdueScore = 20;
        overdueLabel = `Due for a visit (${overdueDays} days)`;
    } else {
        overdueScore = 5;
        overdueLabel = `Visited ${overdueDays} day${overdueDays === 1 ? "" : "s"} ago`;
    }

    let priorityScore = 10;
    if (record.priority === "High") priorityScore = 30;
    else if (record.priority === "Medium") priorityScore = 20;

    return {
        score: Math.min(100, overdueScore + priorityScore + distancePart),
        reason: `${overdueLabel} · ${record.priority || "Medium"} priority · ${distanceLabel}`,
        distanceKm
    };
}
