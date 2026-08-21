// Pure helper functions and constants used across the GIS Map view.
// Split out of mapview.jsx (Phase 9) - no behavior change, just moved.

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
