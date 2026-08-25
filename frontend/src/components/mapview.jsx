import { useState, useEffect } from "react";
import { useUser } from "../context/UserContext";
import { WS_URL } from "../config/apiBase";
import jsPDF from "jspdf";
import { MapContainer, TileLayer, CircleMarker, LayerGroup, Polygon, Polyline, Tooltip, ZoomControl } from 'react-leaflet';
import "leaflet/dist/leaflet.css";
import {getAccounts,updateAccount,getLeads,updateLead,getOpportunitiesMap,getOpportunities,createFieldVisit,optimizeRoute,getTerritories,updateTerritory,assignTerritories
} from "../services/salesforceApi";
import { VISIT_OUTCOMES } from "./modules/FieldVisits";
import {
    TYPE_COLOR,
    TYPE_LABEL,
    PRIORITY_COLOR,
    GEOFENCE_RADIUS_METERS,
    TERRITORY_BOUNDARY_COLORS,
    parseTerritoryBoundary,
    getCurrentPosition,
    decodePolyline,
    haversine
} from "./mapview/mapviewUtils";
import { FitToRoute, FitToRecords, TerritoryDrawControl } from "./mapview/MapLayers";
import { computeExecutiveAnalytics } from "./mapview/executiveAnalytics";
import ExecutiveAnalyticsPanel from "./mapview/ExecutiveAnalyticsPanel";

const INITIAL_RECORDS = [
  { id: 'ACC-1001', name: 'Meridian Textiles', type: 'customer', territory: 'T1', lat: 17.385, lng: 78.4867, priority: 'High', owner: 'Ananya Rao', oppValue: 850000, discoverySource: '—', validation: 'Validated', lastVisit: '2026-07-12', nextVisit: '2026-08-05', visitStatus: 'pending' },
  { id: 'ACC-1002', name: 'Bluepeak Foods', type: 'customer', territory: 'T1', lat: 17.40, lng: 78.47, priority: 'Medium', owner: 'Sana Sheikh', oppValue: 420000, discoverySource: '—', validation: 'Validated', lastVisit: '2026-06-30', nextVisit: '2026-08-10', visitStatus: 'pending' },
  { id: 'LEAD-2001', name: 'Orbit Logistics', type: 'lead', territory: 'T1', lat: 17.37, lng: 78.50, priority: 'High', owner: 'Ananya Rao', oppValue: 0, discoverySource: 'Field Survey', validation: 'Validated', lastVisit: '—', nextVisit: '2026-08-03', visitStatus: 'pending' },
  { id: 'PROS-3001', name: 'Kavya Enterprises', type: 'prospect', territory: 'T1', lat: 17.39, lng: 78.44, priority: 'Medium', owner: 'Unassigned', oppValue: 180000, discoverySource: 'Web Scan', validation: 'Pending', lastVisit: '—', nextVisit: '—', visitStatus: 'pending' },
  { id: 'ACC-1003', name: 'Silverline Pharma', type: 'customer', territory: 'T2', lat: 12.97, lng: 77.60, priority: 'High', owner: 'Karthik Iyer', oppValue: 1200000, discoverySource: '—', validation: 'Validated', lastVisit: '2026-07-20', nextVisit: '2026-08-15', visitStatus: 'pending' },
  { id: 'LEAD-2002', name: 'Coral Retail Group', type: 'lead', territory: 'T2', lat: 12.99, lng: 77.58, priority: 'Low', owner: 'Karthik Iyer', oppValue: 0, discoverySource: 'Trade Directory', validation: 'Validated', lastVisit: '—', nextVisit: '2026-08-08', visitStatus: 'completed' },
];

export default function MapView({ activeModule }) {
const { currentUser, role, hasPermission } = useUser();
console.log("Active GeoSales Module:", activeModule);
console.log("Current GeoSales User:", currentUser);
console.log("Current GeoSales Role:", role);
console.log(
    "Accounts Permission:",
    hasPermission("accounts")
);
console.log(
    "User Roles Permission:",
    hasPermission("userRoles")
);


    
  const [records, setRecords] = useState(INITIAL_RECORDS);
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [liveActivityFeed, setLiveActivityFeed] = useState([]);
  const [leadRecords, setLeadRecords] = useState([]);
  const [opportunityRecords, setOpportunityRecords] = useState([]);
  const [allOpportunities, setAllOpportunities] = useState([]);
  const [territoryList, setTerritoryList] = useState([]);
  const [boundaryEditTerritoryId, setBoundaryEditTerritoryId] = useState("");
  const [pendingBoundary, setPendingBoundary] = useState(null);
  const [boundarySaving, setBoundarySaving] = useState(false);
  const [boundaryMessage, setBoundaryMessage] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignMessage, setAssignMessage] = useState("");
      async function loadAccounts() {

        try {

            const accounts = await getAccounts();

            console.log("Accounts from FastAPI:", accounts);

            const formattedAccounts = accounts
    .map(account => ({

                id: account.Id,
                name: account.Name,
                type: "customer",
                territory: account.Territory_ID__c,   // Temporary
                lat: account.Location__Latitude__s,
                lng: account.Location__Longitude__s,
                priority: account.Sales_Priority__c || "Medium",
                owner: account.Owner?.Name || "Not Assigned",
                oppValue: account.AnnualRevenue || 0,
                discoverySource: account.Discovery_Source__c || "-",
                validation: account.GIS_Validation_Status__c || "Validated",
                lastVisit: account.Last_Visit_Date__c || "-",
                nextVisit: account.Next_Visit_Date__c || "-",
                visitStatus: account.Last_Visit_Date__c
                ? "completed"
                : "pending"

            })).filter(account =>
        account.lat != null &&
        account.lng != null
    );
            console.log(accounts);

            console.log("Formatted Accounts:", formattedAccounts);

            setRecords(formattedAccounts);

        } catch (error) {

            console.error("Formatting Error:", error);

        }

    }

async function loadLeads() {
    try {

        const leads = await getLeads();

        console.log("🔴 RAW SALESFORCE LEADS:", leads);

        console.log(
            "🔴 LEAD TERRITORY RAW VALUES:",
            leads.map(lead => ({
                id: lead.Id,
                name: lead.Name,
                territory: lead.Territory_ID__c,
                territoryType: typeof lead.Territory_ID__c
            }))
        );
const formattedLeads = leads
    .map(lead => ({
        id: lead.Id,
        name: lead.Name,
        type: "lead",

        territory: lead.Territory_ID__c || "Unassigned",

        lat: lead.Location__Latitude__s,
        lng: lead.Location__Longitude__s,

        priority: lead.Sales_Priority__c || "Medium",

        owner: lead.Owner?.Name || "Not Assigned",

        oppValue: 0,

        discoverySource: lead.Discovery_Source__c || "Salesforce Lead",

        validation:
            lead.GIS_Validation_Status__c || "Validated",

        lastVisit: lead.Last_Visit_Date__c || "-",

        nextVisit: lead.Next_Visit_Date__c || "-",

        visitStatus: lead.Last_Visit_Date__c
            ? "completed"
            : "pending"
    }))
    .filter(lead =>
        lead.lat != null &&
        lead.lng != null
    );

console.log(
    "🔴 FORMATTED LEADS:",
    formattedLeads.map(l => ({
        name: l.name,
        territory: l.territory,
        lat: l.lat,
        lng: l.lng
    }))
);
        setLeadRecords(formattedLeads);

    } catch (error) {

        console.error(
            "Lead Loading Error:",
            error
        );

    }

}

async function loadOpportunities() {

    try {

        const opportunities = await getOpportunitiesMap();

        const formattedOpportunities = opportunities
            .map(opp => {
                const account = opp.Account || {};

                return {
                    id: opp.Id,
                    name: opp.Name,
                    type: "opportunity",

                    territory: account.Territory_ID__c || "Unassigned",

                    lat: account.Location__Latitude__s,
                    lng: account.Location__Longitude__s,

                    priority: "Medium",

                    owner: opp.Owner?.Name || "Not Assigned",

                    oppValue: opp.Amount || 0,

                    stage: opp.StageName,
                    accountName: account.Name || "-",

                    discoverySource: "-",

                    validation: account.GIS_Validation_Status__c || "Validated",

                    // Opportunities aren't field-visit targets - default to
                    // "completed" so the check-in/out panel never renders
                    // for one (that flow belongs to Accounts/Leads).
                    lastVisit: "-",
                    nextVisit: "-",
                    visitStatus: "completed"
                };
            })
            .filter(opp =>
                opp.lat != null &&
                opp.lng != null
            );

        setOpportunityRecords(formattedOpportunities);

    } catch (error) {

        console.error(
            "Opportunity Loading Error:",
            error
        );

    }

}

async function loadTerritories() {

    try {

        const data = await getTerritories();

        setTerritoryList(Array.isArray(data) ? data : []);

    } catch (error) {

        console.error("Territory Loading Error:", error);

    }

}

// Unlike loadOpportunities() (GIS-filtered, for the map pins), this
// pulls every real Opportunity with its close date/amount, used only
// to compute a real Sales Performance Trend instead of fabricated data.
async function loadAllOpportunities() {

    try {

        const data = await getOpportunities();

        setAllOpportunities(Array.isArray(data) ? data : []);

    } catch (error) {

        console.error("All Opportunities Loading Error:", error);

    }

}

useEffect(() => {

        loadAccounts();
        loadLeads();
        loadOpportunities();
        loadTerritories();
        loadAllOpportunities();

}, []);

function handleStartBoundaryEdit(territoryId) {

    const territory = territoryList.find(t => t.Id === territoryId);
    let initial = null;

    if (territory?.Boundary_GeoJSON__c) {
        try {
            initial = JSON.parse(territory.Boundary_GeoJSON__c);
        } catch (err) {
            console.error("Saved boundary is not valid GeoJSON:", err);
        }
    }

    setBoundaryEditTerritoryId(territoryId);
    setPendingBoundary(initial);
    setBoundaryMessage("");

}

function handleCancelBoundaryEdit() {

    setBoundaryEditTerritoryId("");
    setPendingBoundary(null);
    setBoundaryMessage("");

}

async function handleSaveBoundary() {

    if (!boundaryEditTerritoryId) {
        setBoundaryMessage("Select a territory to edit first.");
        return;
    }

    setBoundarySaving(true);
    setBoundaryMessage("");

    try {

        // pendingBoundary is null after deleting a shape with the map's
        // trash tool - that's a real, valid state (the boundary is being
        // cleared), not "nothing to save". Sending "" rather than null
        // matters: the backend uses exclude_none=True on this endpoint,
        // which would silently drop a null value and leave the old
        // boundary in place in Salesforce.
        await updateTerritory(boundaryEditTerritoryId, {
            Boundary_GeoJSON__c: pendingBoundary ? JSON.stringify(pendingBoundary) : ""
        });

        setBoundaryMessage(pendingBoundary ? "Boundary saved." : "Boundary cleared.");
        setBoundaryEditTerritoryId("");
        setPendingBoundary(null);

        await loadTerritories();

    } catch (error) {

        setBoundaryMessage(error.message || "Failed to save boundary.");

    } finally {

        setBoundarySaving(false);

    }

}

async function handleAssignTerritories() {

    setAssignLoading(true);
    setAssignMessage("");

    try {

        const result = await assignTerritories();

        setAssignMessage(
            `${result.accounts_updated} accounts, ${result.leads_updated} leads, ` +
            `${result.discovery_candidates_updated} discovery candidates reassigned.`
        );

        await Promise.all([loadAccounts(), loadLeads()]);

    } catch (error) {

        setAssignMessage(error.message || "Failed to assign territories.");

    } finally {

        setAssignLoading(false);

    }

}

  const [typeFilter, setTypeFilter] = useState('');
  const [territoryFilter, setTerritoryFilter] = useState('');
  const [showTerritories, setShowTerritories] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [geofenceOk, setGeofenceOk] = useState(null);
  const [checkInDistance, setCheckInDistance] = useState(null);
  const [checkInError, setCheckInError] = useState("");
  const [checkInTimestamp, setCheckInTimestamp] = useState(null);
  const [visitOutcome, setVisitOutcome] = useState(VISIT_OUTCOMES[0]);
  const [visitNotes, setVisitNotes] = useState("");
  const [visitFollowUp, setVisitFollowUp] = useState("");
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [route, setRoute] = useState(null);
  const [routeGeometry, setRouteGeometry] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState("");
  const [routeTerritory, setRouteTerritory] = useState('');
const territoryOptions = [
    ...new Set(
        [...records, ...leadRecords, ...opportunityRecords]
            .map(r => r.territory)
            .filter(Boolean)
    )
];
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchText, setSearchText] = useState("");

  const selected = [...records, ...leadRecords, ...opportunityRecords]
    .find(r => r.id === selectedId) || null;
console.log(
    "🔴 GIS LEAD DETAILS:",
    leadRecords.map(r => ({
        id: r.id,
        name: r.name,
        type: r.type,
        lat: r.lat,
        lng: r.lng,
        territory: r.territory,
        priority: r.priority
    }))
);
console.log(
    "LEAD SEARCH TEST:",
    leadRecords.map(r => ({
        name: r.name,
        type: r.type
    }))
);

console.log(
    "🔴 LEAD TERRITORY DEBUG:",
    leadRecords.map(lead => ({
        name: lead.name,
        territory: lead.territory,
        territoryLength: lead.territory?.length,
        type: lead.type
    }))
);
const filtered = records.filter(
  r =>
    (!typeFilter || r.type === typeFilter) &&
    (!territoryFilter || r.territory === territoryFilter) &&
    (!priorityFilter || r.priority === priorityFilter) &&
    (!searchText ||
      String(r.name || "")
    .toLowerCase()
    .includes(searchText.toLowerCase()))
);
const mapRecords = [
    ...records,
    ...leadRecords,
    ...opportunityRecords
];

console.log(
    "GIS Map Records:",
    mapRecords
);

console.log(
    "GIS Accounts:",
    records.length
);

console.log(
    "GIS Leads:",
    leadRecords.length
);

console.log(
    "GIS Lead Details:",
    leadRecords.map(r => ({
        id: r.id,
        name: r.name,
        type: r.type,
        lat: r.lat,
        lng: r.lng,
        territory: r.territory,
        priority: r.priority
    }))
);

const filteredMapRecords = mapRecords.filter(
    r =>
        (!typeFilter || r.type === typeFilter) &&
        (!territoryFilter || r.territory === territoryFilter) &&
        (!priorityFilter || r.priority === priorityFilter) &&
        (
            !searchText ||
            String(r.name || "")
                .toLowerCase()
                .includes(searchText.toLowerCase())
        )
);

console.log(
    "🔎 FILTERED MAP RECORDS:",
    filteredMapRecords
);

console.log(
    "🔎 FILTERED LEADS:",
    filteredMapRecords.filter(r => r.type === "lead")
);
console.log(
    "🔎 SEARCH TEXT:",
    searchText
);

console.log(
    "🔎 SEARCH RESULTS:",
    filteredMapRecords.filter(r =>
        String(r.name || "")
            .toLowerCase()
            .includes(String(searchText || "").toLowerCase())
    )
);
const {
    dashboardStats,
    totalRevenue,
    averageRevenue,
    validationRate,
    visitCompletionRate,
    priorityChart,
    visitChart,
    CHART_COLORS,
    territoryStats,
    revenueChart,
    priorityTerritoryChart,
    territoryRanking,
    currentRevenue,
    salesForecast,
    forecastGrowth,
    salesTrend,
    bestTerritory,
    attentionRequired,
    pendingVisits,
    businessInsights,
    aiOpportunities,
    aiRecommendations,
    recommendationColor,
    revenueRisk,
    rankedAccounts,
    aiTerritories,
    executiveSummary,
    aiAlerts,
    alertColors,
    executiveHealthScore,
    executiveStatus,
    executiveColor
} = computeExecutiveAnalytics(records, territoryOptions, allOpportunities);

  function openRecord(r) {
    setSelectedId(r.id);
    resetCheckInState();
  }

async function checkIn() {

    if (!selected) return;

    setCheckInError("");

    try {

        console.log(
            "📍 Requesting device location for check-in to:",
            selected.name
        );

        const position = await getCurrentPosition();
        const { latitude, longitude } = position.coords;

        if (selected.lat == null || selected.lng == null) {
            setCheckInError("This record has no saved location to verify your position against.");
            setGeofenceOk(false);
            return;
        }

        const distanceMeters = haversine(
            [latitude, longitude],
            [selected.lat, selected.lng]
        ) * 1000;

        setCheckInDistance(distanceMeters);
        setCheckInTimestamp(new Date().toISOString());

        const withinGeofence = distanceMeters <= GEOFENCE_RADIUS_METERS;

        setGeofenceOk(withinGeofence);

        console.log(
            withinGeofence ? "🟢 Within geofence" : "🔴 Outside geofence",
            "- distance:", Math.round(distanceMeters), "m"
        );

    } catch (error) {

        console.error(
            "❌ Check-in error:",
            error
        );

        if (error.code === 1) {
            setCheckInError("Location permission denied. Enable GPS access in your browser and retry.");
        } else if (error.code === 2) {
            setCheckInError("Unable to determine your location. Move to an open area and retry.");
        } else if (error.code === 3) {
            setCheckInError("Location request timed out. Try again.");
        } else {
            setCheckInError(error.message || "Unable to verify your location.");
        }

        setGeofenceOk(false);
    }
}

function resetCheckInState() {
    setGeofenceOk(null);
    setCheckInDistance(null);
    setCheckInError("");
    setCheckInTimestamp(null);
    setVisitOutcome(VISIT_OUTCOMES[0]);
    setVisitNotes("");
    setVisitFollowUp("");
}

async function checkOut() {

    if (!selected) {
        console.warn("No account/lead selected");
        return;
    }

    setCheckoutSubmitting(true);

    try {

        console.log(
            "📍 Checking out:",
            selected.name
        );

        const today = new Date()
            .toISOString()
            .split("T")[0];
        const now = new Date().toISOString();

        let result;

        // ==========================================
        // LEAD CHECK-OUT
        // ==========================================

        if (selected.type === "lead") {

            console.log(
                "🟣 Updating Salesforce LEAD:",
                selected.id
            );

            result = await updateLead(
                selected.id,
                {
                    Last_Visit_Date__c: today,
                    GIS_Validation_Status__c: "Validated"
                }
            );

        }

        // ==========================================
        // ACCOUNT CHECK-OUT
        // ==========================================

        else {

            console.log(
                "🔵 Updating Salesforce ACCOUNT:",
                selected.id
            );

            result = await updateAccount(
                selected.id,
                {
                    Last_Visit_Date__c: today,
                    GIS_Validation_Status__c: "Validated"
                }
            );
        }

        console.log(
            "📤 Check-out Salesforce response:",
            result
        );

        if (!result || result.success !== true) {

            console.error(
                "❌ Salesforce update failed:",
                result
            );

            return;
        }

        // Real Field_Visit__c record - check-in/out time, geofence-verified
        // outcome and notes captured on-site, not a hardcoded pass.
        await createFieldVisit({
            Name: `${selected.name} - ${today}`,
            Account__c: selected.type === "lead" ? null : selected.id,
            Lead__c: selected.type === "lead" ? selected.id : null,
            Visit_Date__c: now,
            Check_In_Time__c: checkInTimestamp,
            Check_Out_Time__c: now,
            Visit_Outcome__c: visitOutcome,
            Notes__c: visitNotes.trim() || null,
            Follow_up_Date__c: visitFollowUp || null
        });

        console.log(
            "✅ Visit completed successfully:",
            selected.name
        );

        await Promise.all([
            loadAccounts(),
            loadLeads()
        ]);

        setSelectedId(selected.id);

        resetCheckInState();

    } catch (error) {

        console.error(
            "❌ Check-out error:",
            error
        );

    } finally {

        setCheckoutSubmitting(false);

    }
}
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
        setRouteGeometry(
            result.geometry ? decodePolyline(result.geometry) : null
        );
        setRouteInfo({
            distanceKm: result.distance_meters / 1000,
            etaMin: result.duration_seconds / 60
        });

    } catch (error) {

        console.error("Route optimization failed:", error);

        setRouteError(
            error.message || "Failed to generate a real route. Try again."
        );
        setRoute(null);
        setRouteGeometry(null);
        setRouteInfo(null);

    } finally {

        setRouteLoading(false);

    }

}

async function generateRoute() {

    console.log("========== ROUTE GENERATION ==========");

    console.log(
        "Selected Territory:",
        routeTerritory
    );

    // Combine Salesforce Accounts + Leads
    const mapRecords = [
        ...records,
        ...leadRecords
    ];

    console.log(
        "All GIS Records:",
        mapRecords
    );

    console.log(
        "Total Accounts:",
        records.length
    );

    console.log(
        "Total Leads:",
        leadRecords.length
    );

    // Get Accounts + Leads belonging to selected territory
    const territoryRecords = mapRecords.filter(
        record =>
            record.territory === routeTerritory
    );

    console.log(
        "Records in selected territory:",
        territoryRecords
    );

    console.log(
        "Accounts in selected territory:",
        territoryRecords.filter(
            record => record.type === "customer"
        )
    );

    console.log(
        "Leads in selected territory:",
        territoryRecords.filter(
            record => record.type === "lead"
        )
    );

    // Only pending visits should normally be included
    const pendingStops = territoryRecords.filter(
        record =>
            record.visitStatus === "pending"
    );

    console.log(
        "Pending route stops:",
        pendingStops
    );

    // If there are at least 2 pending stops,
    // optimize those stops
    if (pendingStops.length >= 2) {

        await runRouteOptimization(pendingStops);

        return;
    }

    // If fewer than 2 pending stops exist,
    // use all records in the territory
    if (territoryRecords.length >= 2) {

        console.log(
            "Not enough pending visits."
        );

        console.log(
            "Creating route using all territory records."
        );

        await runRouteOptimization(territoryRecords);

        return;
    }

    // No usable route
    alert(
        `Not enough accounts or leads in ${routeTerritory} to generate a route.`
    );

    setRoute(null);
}
const exportBusinessData = () => {

    const headers = [
        "Account",
        "Territory",
        "Priority",
        "Revenue",
        "Latitude",
        "Longitude"
    ];

    const rows = records.map(record => [
        record.name || record.accountName || "",
        record.territory || "",
        record.priority || "",
        record.oppValue || 0,
        record.lat || "",
        record.lng || ""
    ]);

    const csvContent = [
        headers.join(","),
        ...rows.map(row =>
            row.map(value =>
                `"${String(value).replace(/"/g, '""')}"`
            ).join(",")
        )
    ].join("\n");

    const blob = new Blob(
        [csvContent],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = "JSAN_GeoSales_Business_Data.csv";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
};


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

// Was a hardcoded list with fake, frozen "X min ago" timestamps that
// never changed no matter when the page loaded. Real live activity
// (with real timestamps) already comes from the WebSocket feed via
// liveActivityFeed - this fake filler was misleading alongside it, so
// it's gone; the panel now shows only genuine real-time events.

// Was a hardcoded list of 4 fixed notifications with fake "X min ago"
// timestamps and fake unread flags that never actually changed. The
// same underlying conditions are already computed for real in
// aiAlerts, so notifications are now derived from that real data
// instead of being duplicated as static fake entries.
const aiNotifications = aiAlerts.map((alert, index) => ({
    id: index,
    type: alert.type === "danger" ? "critical" : alert.type,
    title: alert.title,
    message: alert.message,
    time: "Just now",
    unread: true
}));

const notificationColors = {

    critical: "#e53935",

    warning: "#fb8c00",

    success: "#43a047",

    info: "#1976d2"

};

const unreadNotifications =
    aiNotifications.filter(n => n.unread).length;

const generateExecutiveReport = () => {

    const doc = new jsPDF();

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    let y = 20;

    // ==========================================
    // HEADER
    // ==========================================

    doc.setFillColor(11, 46, 79);
    doc.rect(0, 0, pageWidth, 32, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");

    doc.text(
        "JSAN GeoSales 360",
        pageWidth / 2,
        14,
        { align: "center" }
    );

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");

    doc.text(
        "AI Executive Report",
        pageWidth / 2,
        23,
        { align: "center" }
    );

    // ==========================================
    // REPORT DATE
    // ==========================================

    y = 45;

    doc.setTextColor(80, 80, 80);
    doc.setFontSize(9);

    doc.text(
        `Generated: ${new Date().toLocaleString("en-IN")}`,
        15,
        y
    );

    // ==========================================
    // EXECUTIVE SUMMARY
    // ==========================================

    y += 15;

    doc.setTextColor(11, 46, 79);
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");

    doc.text(
        "EXECUTIVE SUMMARY",
        15,
        y
    );

    y += 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);

    doc.text(
        `Current Revenue: Rs. ${executiveSummary.totalRevenue.toLocaleString("en-IN")}`,
        20,
        y
    );

    y += 7;

    doc.text(
        `Forecast Revenue: Rs. ${salesForecast.toLocaleString("en-IN")}`,
        20,
        y
    );

    y += 7;

    doc.text(
        `Growth: ${executiveSummary.growth}%`,
        20,
        y
    );

    y += 7;

    doc.text(
        `Executive Health: ${executiveHealthScore}%`,
        20,
        y
    );

    y += 7;

    doc.text(
        `Executive Status: ${executiveStatus}`,
        20,
        y
    );

    // ==========================================
    // BUSINESS HEALTH
    // ==========================================

    y += 15;

    doc.setTextColor(11, 46, 79);
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");

    doc.text(
        "BUSINESS HEALTH",
        15,
        y
    );

    y += 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);

    doc.text(
        `Validation Rate: ${validationRate.toFixed(1)}%`,
        20,
        y
    );

    y += 7;

    doc.text(
        `AI Opportunities: ${aiRecommendations.length}`,
        20,
        y
    );

    y += 7;

    doc.text(
        `Pending Field Visits: ${pendingVisits}`,
        20,
        y
    );

    y += 7;

    doc.text(
        `High Priority Accounts: ${attentionRequired}`,
        20,
        y
    );

    // ==========================================
    // TERRITORY PERFORMANCE
    // ==========================================

    y += 15;

    doc.setTextColor(11, 46, 79);
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");

    doc.text(
        "TERRITORY PERFORMANCE",
        15,
        y
    );

    y += 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);

    doc.text(
        `Best Territory: ${executiveSummary.bestTerritory}`,
        20,
        y
    );

    y += 7;

    doc.text(
        `Highest AI Score: ${executiveSummary.highestAIScore}`,
        20,
        y
    );

    y += 7;

    doc.text(
        `Accounts To Visit: ${executiveSummary.accountsToVisit}`,
        20,
        y
    );

    // ==========================================
    // AI RECOMMENDATION
    // ==========================================

    y += 15;

    doc.setTextColor(11, 46, 79);
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");

    doc.text(
        "AI EXECUTIVE RECOMMENDATION",
        15,
        y
    );

    y += 10;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);

    const recommendation =
        executiveHealthScore >= 80
            ? "Business performance is excellent. Continue focusing on High Priority Accounts and maximize forecast opportunities."
            : executiveHealthScore >= 60
            ? "Validation performance is average. Increase field visits and improve account verification."
            : "Immediate management attention is recommended. Revenue growth and validation performance are below expected levels.";

    const wrappedRecommendation =
        doc.splitTextToSize(
            recommendation,
            pageWidth - 40
        );

    doc.text(
        wrappedRecommendation,
        20,
        y
    );

    // ==========================================
    // FOOTER
    // ==========================================

    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);

    doc.text(
        "JSAN GeoSales 360 | AI-powered GIS Sales Intelligence",
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
    );

    // ==========================================
    // DOWNLOAD REAL PDF
    // ==========================================

    doc.save(
        "JSAN_GeoSales_Executive_Report.pdf"
    );
};

const exportAIActivity = () => {

    const rows = liveActivityFeed.map(activity => [
        activity.time,
        activity.title,
        activity.message
    ]);

    const headers = [
        "Time",
        "Activity",
        "Message"
    ];

    const csvContent = [
        headers.join(","),
        ...rows.map(row =>
            row.map(value =>
                `"${String(value).replace(/"/g, '""')}"`
            ).join(",")
        )
    ].join("\n");

    const blob = new Blob(
        [csvContent],
        {
            type: "text/csv;charset=utf-8;"
        }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = "JSAN_GeoSales_AI_Activity_Report.csv";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
};
function addLiveAlert(type, title, message) {

    const newAlert = {
        id: Date.now(),
        type,
        title,
        message,
        time: new Date().toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit"
        })
    };

    setLiveAlerts(prev => [
        newAlert,
        ...prev
    ].slice(0, 10));
}
useEffect(() => {

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {

        console.log("🟢 Real-time WebSocket connected");

    };

ws.onmessage = async (event) => {

    const message = JSON.parse(event.data);

    console.log(
        "📡 Real-time event received:",
        message
    );

    // ==========================================
    // FIELD VISIT UPDATED
    // ==========================================

 if (message.type === "field_visit_updated") {

    console.log(
        "🟢 Field Visit updated in Salesforce:",
        message.data
    );

    await Promise.all([
    loadAccounts(),
    loadLeads()
]);

    addLiveAlert(
        "success",
        "Field Visit Updated",
        "A field visit was updated in Salesforce."
    );

    addLiveActivity(
    "🟢",
    "Field Visit Updated",
    "A field visit was updated in Salesforce."
);

    console.log(
        "🔄 Dashboard refreshed after field visit update"
    );
}


    // ==========================================
    // ACCOUNT UPDATED
    // ==========================================

if (message.type === "account_updated") {

    console.log(
        "🟢 Account updated in Salesforce:",
        message.data
    );

    await Promise.all([
    loadAccounts(),
    loadLeads()
]);

    addLiveAlert(
        "info",
        "Account Updated",
        "Account information was updated in Salesforce."
    );

    addLiveActivity(
    "🔵",
    "Account Updated",
    "Account information was updated in Salesforce."
);

    console.log(
        "🔄 Dashboard refreshed after account update"
    );
}


    // ==========================================
    // GIS UPDATED
    // ==========================================

if (message.type === "gis_updated") {

    console.log(
        "🗺 GIS data updated:",
        message.data
    );

    await Promise.all([
    loadAccounts(),
    loadLeads()
]);

    addLiveAlert(
        "warning",
        "GIS Data Updated",
        "GIS information was updated."
    );

    addLiveActivity(
        "🗺️",
        "GIS Data Updated",
        "GIS information was updated."
    );

    console.log(
        "🔄 Dashboard refreshed after GIS update"
    );
}


    // ==========================================
    // REAL-TIME ALERT
    // ==========================================

if (message.type === "alert") {

    console.log(
        "🚨 Real-time alert:",
        message.data
    );

    addLiveAlert(
        "danger",
        "Real-Time Alert",
        message.data?.message ||
        "A new real-time alert was received."
    );

    addLiveActivity(
    "🚨",
    "AI Alert",
    message.data?.message ||
    "A new real-time alert was received."
);

    console.log(
        "🔔 Real-time alert received"
    );
}

};
    ws.onerror = (error) => {

        console.error("🔴 WebSocket error:", error);

    };

    ws.onclose = () => {

        console.log("🟡 WebSocket disconnected");

    };

    return () => {

        ws.close();

    };

}, []);

function addLiveActivity(icon, title, message) {

    const activity = {
        id: Date.now(),
        time: new Date().toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit"
        }),
        icon,
        title,
        message
    };

    setLiveActivityFeed(prev => [
        activity,
        ...prev
    ].slice(0, 10));
}

return (
    <div
        style={{
            minHeight: "100vh",
            width: "100%",
            fontFamily: "system-ui, sans-serif",
            background: "#f4f6f9",
            overflowX: "hidden",
            boxSizing: "border-box"
        }}
    >

    

        {/* ============================= */}
        {/* DASHBOARD STATISTICS */}
        {/* ============================= */}

<ExecutiveAnalyticsPanel
    dashboardStats={dashboardStats}
    totalRevenue={totalRevenue}
    averageRevenue={averageRevenue}
    validationRate={validationRate}
    visitCompletionRate={visitCompletionRate}
    priorityChart={priorityChart}
    visitChart={visitChart}
    CHART_COLORS={CHART_COLORS}
    territoryStats={territoryStats}
    revenueChart={revenueChart}
    priorityTerritoryChart={priorityTerritoryChart}
    territoryRanking={territoryRanking}
    forecastGrowth={forecastGrowth}
    salesTrend={salesTrend}
    bestTerritory={bestTerritory}
    pendingVisits={pendingVisits}
    businessInsights={businessInsights}
    aiOpportunities={aiOpportunities}
    aiRecommendations={aiRecommendations}
    recommendationColor={recommendationColor}
    revenueRisk={revenueRisk}
    rankedAccounts={rankedAccounts}
    aiTerritories={aiTerritories}
    executiveSummary={executiveSummary}
    aiAlerts={aiAlerts}
    alertColors={alertColors}
    executiveHealthScore={executiveHealthScore}
    executiveStatus={executiveStatus}
    executiveColor={executiveColor}
    aiNotifications={aiNotifications}
    notificationColors={notificationColors}
    unreadNotifications={unreadNotifications}
    liveAlerts={liveAlerts}
    liveActivityFeed={liveActivityFeed}
    generateExecutiveReport={generateExecutiveReport}
    exportAIActivity={exportAIActivity}
    exportBusinessData={exportBusinessData}
/>



<div
    style={{
        position: "relative",
        display: "flex",
        width: "100%",
        minHeight: "700px",
        height: "700px",
        overflow: "hidden",
        boxSizing: "border-box",
        background: "#ffffff"
    }}
>

      <div
    style={{
        width: "260px",
        minWidth: "260px",
        flexShrink: 0,
        padding: "16px",
        borderRight: "1px solid #ddd",
        overflowY: "auto",
        background: "#fff",
        boxSizing: "border-box"
    }}
>
        <h3 style={{ marginTop: 0 }}>Filters</h3>
        <label style={{ fontSize: "12px", fontWeight: 600 }}>
    Search Account / Lead / Opportunity
</label>

<input
    type="text"
    placeholder="Search account, lead, or opportunity..."
    value={searchText}
    onChange={(e) => setSearchText(e.target.value)}
    style={{
        width: "100%",
        padding: "8px",
        marginBottom: "14px",
        border: "1px solid #ccc",
        borderRadius: "5px",
        boxSizing: "border-box"
    }}
/>
        <label style={{ fontSize: '12px', fontWeight: 600 }}>Territory</label>
<select
    value={territoryFilter}
    onChange={e => setTerritoryFilter(e.target.value)}
    style={{ width: "100%", marginBottom: "10px" }}
>

    <option value="">All Territories</option>

    {territoryOptions.map(t => (

        <option key={t} value={t}>

            {t}

        </option>

    ))}

</select>

<label style={{ fontSize: '12px', fontWeight: 600 }}>
    Priority
</label>

<select
    value={priorityFilter}
    onChange={e => setPriorityFilter(e.target.value)}
    style={{ width: '100%', marginBottom: '14px' }}
>

    <option value="">All Priorities</option>

    <option value="High">High</option>

    <option value="Medium">Medium</option>

    <option value="Low">Low</option>

</select>
        <label style={{ fontSize: '12px', fontWeight: 600 }}>Record Type</label>
        <select
    value={typeFilter}
    onChange={e => setTypeFilter(e.target.value)}
    style={{
        width: "100%",
        padding: "6px",
        marginBottom: "10px",
        borderRadius: "5px",
        border: "1px solid #ccc"
    }}
>
    <option value="">All Records</option>
    <option value="customer">Accounts</option>
    <option value="lead">Leads</option>
    <option value="opportunity">Opportunities</option>
</select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', marginBottom: '18px' }}>
          <input type="checkbox" checked={showTerritories} onChange={e => setShowTerritories(e.target.checked)} />
          Show territory boundaries
        </label>

<h3
    style={{
        borderTop: '1px solid #eee',
        paddingTop: '14px'
    }}
>
    Territory Boundaries
</h3>

{!boundaryEditTerritoryId ? (
    <>
        <select
            value=""
            onChange={e => e.target.value && handleStartBoundaryEdit(e.target.value)}
            style={{
                width: '100%',
                marginBottom: '10px',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '5px'
            }}
        >
            <option value="">Draw / edit a territory...</option>
            {territoryList.map(t => (
                <option key={t.Id} value={t.Id}>
                    {t.Territory_Name__c || t.Name}
                    {t.Boundary_GeoJSON__c ? " (has boundary)" : ""}
                </option>
            ))}
        </select>

        {boundaryMessage && (
            <div style={{ marginBottom: '8px', fontSize: '11px', color: '#2E7D32' }}>
                {boundaryMessage}
            </div>
        )}

        <button
            disabled={assignLoading}
            onClick={handleAssignTerritories}
            style={{ width: '100%', cursor: assignLoading ? 'default' : 'pointer' }}
        >
            {assignLoading ? "Assigning..." : "Recalculate Territory Assignments"}
        </button>

        {assignMessage && (
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#0B2E4F' }}>
                {assignMessage}
            </div>
        )}
    </>
) : (
    <div style={{ fontSize: '12px' }}>
        <div style={{ marginBottom: '8px', color: '#555' }}>
            Draw a polygon on the map (use the tools in the top-right
            corner of the map), then save it. To remove a boundary, use
            the trash tool, click the shape, then click its checkmark to
            confirm - then Save here to make the removal permanent.
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
            <button
                disabled={boundarySaving}
                onClick={handleSaveBoundary}
                style={{
                    flex: 1,
                    padding: '8px',
                    fontWeight: 700,
                    border: 'none',
                    borderRadius: '5px',
                    background: boundarySaving ? '#9aa8b5' : '#0B2E4F',
                    color: '#fff',
                    cursor: boundarySaving ? 'default' : 'pointer'
                }}
            >
                {boundarySaving ? "Saving..." : pendingBoundary ? "Save Boundary" : "Save (Clear Boundary)"}
            </button>
            <button
                onClick={handleCancelBoundaryEdit}
                style={{
                    flex: 1,
                    padding: '8px',
                    border: '1px solid #ccc',
                    borderRadius: '5px',
                    background: '#fff',
                    cursor: 'pointer'
                }}
            >
                Cancel
            </button>
        </div>

        {boundaryMessage && (
            <div style={{ marginTop: '8px', color: '#C1443C' }}>
                {boundaryMessage}
            </div>
        )}
    </div>
)}

<h3
    style={{
        borderTop: '1px solid #eee',
        paddingTop: '14px'
    }}
>
    Route Planning
</h3>

<label
    style={{
        fontSize: '12px',
        fontWeight: 600
    }}
>
    Territory
</label>

<select
    value={routeTerritory}
    onChange={e => setRouteTerritory(e.target.value)}
    style={{
        width: '100%',
        marginBottom: '10px',
        padding: '8px',
        border: '1px solid #ccc',
        borderRadius: '5px'
    }}
>
    <option value="">
        Select Territory
    </option>

    {territoryOptions.map(territory => (
        <option
            key={territory}
            value={territory}
        >
            {territory}
        </option>
    ))}
</select>

<button
    disabled={routeLoading}
    onClick={() => {
        console.log("🟢 GENERATE ROUTE BUTTON CLICKED");
        generateRoute();
    }}
    style={{ cursor: routeLoading ? 'default' : 'pointer' }}
>
    {routeLoading ? "Calculating road route..." : "Generate Route"}
</button>

{routeError && (
    <div
        style={{
            marginTop: '10px',
            fontSize: '12px',
            color: '#C1443C',
            background: '#fdecea',
            padding: '8px',
            borderRadius: '6px'
        }}
    >
        ⚠ {routeError}
    </div>
)}

{routeStats && (
    <div
        style={{
            marginTop: '10px',
            fontSize: '12px',
            background: '#f6f8fb',
            padding: '10px',
            borderRadius: '6px'
        }}
    >

        <div>
            Territory:
            <strong> {routeTerritory}</strong>
        </div>

        <div>
            Stops:
            <strong> {routeStats.stops}</strong>
        </div>

        <div>
            Distance:
            <strong> {routeStats.distKm} km</strong>
        </div>

        <div>
            ETA:
            <strong> {routeStats.etaMin} min</strong>
        </div>

        <button
            onClick={() => {
                setRoute(null);
                setRouteGeometry(null);
                setRouteInfo(null);
                setRouteError("");
            }}
            style={{
                marginTop: '8px',
                width: '100%',
                padding: '6px',
                fontSize: '11px',
                border: '1px solid #ccc',
                borderRadius: '5px',
                background: '#fff',
                cursor: 'pointer'
            }}
        >
            Clear Route
        </button>

    </div>
)}
 

<h4 style={{ marginTop: "18px", marginBottom: "6px" }}>
    Sales Priority
</h4>

{Object.entries(PRIORITY_COLOR).map(([priority, color]) => (

    <div
        key={priority}
        style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "12px",
            padding: "3px 0"
        }}
    >

        <span
            style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: color
            }}
        />

        {priority}

    </div>

))}
      </div>

<div
    style={{
        position: "relative",
        flex: 1,
        minWidth: 0,
        height: "700px",
        borderRadius: "10px",
        overflow: "hidden",
        background: "#ffffff",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        boxSizing: "border-box"
    }}
>
    {/* STEP 11 — GIS CONTROL TOOLBAR */}
<div
    style={{
        position: "absolute",
        top: "12px",
        left: "12px",
        right: selected ? "350px" : "12px",
        zIndex: 900,
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 12px",
        background: "rgba(255,255,255,0.96)",
        border: "1px solid #e1e6eb",
        borderRadius: "10px",
        boxShadow: "0 3px 12px rgba(0,0,0,0.12)",
        transition: "right 0.25s ease",
        flexWrap: "wrap"
    }}
>

    <div
        style={{
            fontSize: "13px",
            fontWeight: "700",
            color: "#0B2E4F",
            marginRight: "8px"
        }}
    >
        GIS Controls
    </div>


    {/* Territory Toggle */}
    <button
        onClick={() => setShowTerritories(!showTerritories)}
        style={{
            padding: "7px 12px",
            borderRadius: "6px",
            border: "1px solid #d5dce3",
            background: showTerritories ? "#0B2E4F" : "#ffffff",
            color: showTerritories ? "#ffffff" : "#333333",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "600"
        }}
    >
        {showTerritories ? "Hide Territories" : "Show Territories"}
    </button>


    {/* Map Reset */}
    <button
        onClick={() => window.location.reload()}
        style={{
            padding: "7px 12px",
            borderRadius: "6px",
            border: "1px solid #d5dce3",
            background: "#ffffff",
            color: "#333333",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "600"
        }}
    >
        Reset Map
    </button>

</div>
<MapContainer
    center={[22.5155, 86.2655]}
    zoom={8}
    zoomControl={false}
    style={{
        height: "100%",
        width: "100%",
        minHeight: "650px"
    }}
>
{/* Default zoom control sits top-left, same corner as the GIS
    Controls bar above - moved out of its way rather than fighting
    over the same 12px corner. Bottom-left is otherwise unused. */}
<ZoomControl position="bottomleft" />
<TileLayer
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    attribution="&copy; OpenStreetMap contributors"
/>
<FitToRecords records={filteredMapRecords} />
          {showTerritories && !boundaryEditTerritoryId && (
            <LayerGroup>
              {territoryList.map((t, idx) => {
                const positions = parseTerritoryBoundary(t);
                if (!positions) return null;
                return (
                  <Polygon
                    key={t.Id}
                    positions={positions}
                    pathOptions={{
                      color: TERRITORY_BOUNDARY_COLORS[idx % TERRITORY_BOUNDARY_COLORS.length],
                      weight: 2,
                      fillOpacity: 0.08
                    }}
                  >
                    <Tooltip>{t.Territory_Name__c || t.Name} Territory</Tooltip>
                  </Polygon>
                );
              })}
            </LayerGroup>
          )}

          {boundaryEditTerritoryId && (
            <TerritoryDrawControl
              key={boundaryEditTerritoryId}
              initialGeoJSON={pendingBoundary}
              onChange={setPendingBoundary}
            />
          )}

<LayerGroup>
    {filteredMapRecords
        .filter(r =>
            r.lat != null &&
            r.lng != null &&
            !isNaN(Number(r.lat)) &&
            !isNaN(Number(r.lng))
        )
        .map(r => (

            <CircleMarker
                key={r.id}
                center={[
                    Number(r.lat),
                    Number(r.lng)
                ]}
                radius={r.type === "lead" ? 10 : r.type === "opportunity" ? 9 : 8}
                pathOptions={{
                    color:
                        r.type === "lead"
                            ? "#7B1FA2"
                            : r.type === "opportunity"
                            ? "#1565C0"
                            : PRIORITY_COLOR[r.priority] || "#0B2E4F",

                    fillColor:
                        r.type === "lead"
                            ? "#9C27B0"
                            : r.type === "opportunity"
                            ? "#1E88E5"
                            : PRIORITY_COLOR[r.priority] || "#0B2E4F",

                    fillOpacity: 0.9,
                    weight: 2
                }}
                eventHandlers={{
                    click: () => openRecord(r)
                }}
            >

                <Tooltip direction="top">

                    <div>

                        <strong>
                            {r.name}
                        </strong>

                        <br />

                        Type:
                        {" "}
                        {r.type === "lead"
                            ? "Lead"
                            : r.type === "opportunity"
                            ? "Opportunity"
                            : "Account"}

                        <br />

                        Territory:
                        {" "}
                        {r.territory}

                        <br />

                        Owner:
                        {" "}
                        {r.owner}

                        {r.type === "opportunity" ? (
                            <>
                                <br />

                                Stage:
                                {" "}
                                {r.stage}

                                <br />

                                Account:
                                {" "}
                                {r.accountName}
                            </>
                        ) : (
                            <>
                                <br />

                                Priority:
                                {" "}
                                {r.priority}

                                <br />

                                Validation:
                                {" "}
                                {r.validation}
                            </>
                        )}

                    </div>

                </Tooltip>

            </CircleMarker>

        ))
    }
</LayerGroup>

          {route && (
            <>
              <Polyline
                positions={routeGeometry || route.map(s => [s.lat, s.lng])}
                pathOptions={{
                  color: '#D98F00',
                  weight: 3,
                  dashArray: routeGeometry ? null : '6 5'
                }}
              />
              {route.map((s, i) => (
                <CircleMarker
                  key={'route-' + s.id}
                  center={[s.lat, s.lng]}
                  radius={11}
                  pathOptions={{ color: '#D98F00', fillColor: '#D98F00', fillOpacity: 1, weight: 2 }}
                  eventHandlers={{ click: () => openRecord(s) }}
                >
                  <Tooltip permanent direction="top" offset={[0, -10]}>{i + 1}</Tooltip>
                </CircleMarker>
              ))}
              <FitToRoute stops={route} />
            </>
          )}


        </MapContainer>

        

<div
    style={{
        position: "absolute",
        top: "12px",
        right: selected ? "12px" : "-360px",
        width: "320px",
        maxWidth: "calc(100% - 24px)",
        maxHeight: "calc(100% - 24px)",
        background: "#ffffff",
        border: "1px solid #e1e6eb",
        borderRadius: "10px",
        transition: "right 0.25s ease",
        padding: "18px",
        boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
        overflowY: "auto",
        zIndex: 1000,
        boxSizing: "border-box"
    }}
>
          {selected && (
            <>
              <button onClick={() => setSelectedId(null)} style={{ float: 'right', border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
              <span
style={{
    display: "inline-block",
    background: PRIORITY_COLOR[selected.priority] || "#0B2E4F",
    color: "#fff",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "11px"
}}
>
    {selected.priority} Priority
</span>
              <h3 style={{ margin: '4px 0' }}>{selected.name}</h3>
              <div style={{ fontSize: '11px', color: '#666', marginBottom: '14px' }}>
                {selected.id} · {territoryList.find(t => t.Territory_Code__c === selected.territory)?.Territory_Name__c || selected.territory || "Unassigned"} Territory
              </div>
              {(selected.type === "opportunity" ? [
                ['Account', selected.accountName],
                ['Stage', selected.stage],
                ['Owner', selected.owner],
                ['Opportunity Value', selected.oppValue ? `₹${selected.oppValue.toLocaleString('en-IN')}` : '—'],
              ] : [
                ['Owner', selected.owner],
                ['Priority', selected.priority],
                ['Opportunity Value', selected.oppValue ? `₹${selected.oppValue.toLocaleString('en-IN')}` : '—'],
                ['Discovery Source', selected.discoverySource],
                ['Validation Status', selected.validation],
                ['Last Visit', selected.lastVisit],
                ['Next Visit', selected.nextVisit],
              ]).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #eee', fontSize: '12px' }}>
                  <span style={{ color: '#666' }}>{k}</span>
                  <strong>{v}</strong>
                </div>
              ))}

              {selected.type !== "opportunity" && (
              <div style={{ marginTop: '14px', padding: '10px', background: '#f6f8fb', borderRadius: '7px', fontSize: '12px' }}>
                <div style={{ fontWeight: 700, marginBottom: '6px' }}>Field Visit</div>
                <div>Status: <strong>{selected.visitStatus}</strong></div>
                {(selected.visitStatus === 'pending' || selected.validation !== 'Validated') && (
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    {geofenceOk === null && (
                      <button onClick={checkIn} style={{ padding: '8px', fontWeight: 700, border: '1px solid #ccc', borderRadius: '5px', background: '#fff', cursor: 'pointer' }}>
                        Check in (verify geofence)
                      </button>
                    )}
                    {geofenceOk === true && (
                      <>
                        <div style={{ color: '#2E8B57', fontWeight: 700 }}>
                          ✓ {checkInDistance != null ? `${Math.round(checkInDistance)}m from location` : "Location verified"} — within {GEOFENCE_RADIUS_METERS}m geofence
                        </div>

                        <label style={{ fontSize: '11px', fontWeight: 600, marginTop: '4px' }}>Outcome</label>
                        <select
                          value={visitOutcome}
                          onChange={e => setVisitOutcome(e.target.value)}
                          style={{ padding: '6px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '12px' }}
                        >
                          {VISIT_OUTCOMES.map(outcome => (
                            <option key={outcome} value={outcome}>{outcome}</option>
                          ))}
                        </select>

                        <label style={{ fontSize: '11px', fontWeight: 600 }}>Notes</label>
                        <textarea
                          value={visitNotes}
                          onChange={e => setVisitNotes(e.target.value)}
                          rows={2}
                          style={{ padding: '6px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '12px', resize: 'vertical' }}
                        />

                        <label style={{ fontSize: '11px', fontWeight: 600 }}>Follow-up Date (optional)</label>
                        <input
                          type="date"
                          value={visitFollowUp}
                          onChange={e => setVisitFollowUp(e.target.value)}
                          style={{ padding: '6px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '12px' }}
                        />

                        <button
                          onClick={checkOut}
                          disabled={checkoutSubmitting}
                          style={{ padding: '8px', fontWeight: 700, border: 'none', borderRadius: '5px', background: checkoutSubmitting ? '#9aa8b5' : '#0B2E4F', color: '#fff', cursor: checkoutSubmitting ? 'default' : 'pointer' }}
                        >
                          {checkoutSubmitting ? "Saving..." : "Check out & complete visit"}
                        </button>
                      </>
                    )}
                    {geofenceOk === false && (
                      <>
                        <div style={{ color: '#C1443C', fontWeight: 700 }}>
                          {checkInError
                            ? `⚠ ${checkInError}`
                            : `⚠ Outside geofence — ${checkInDistance != null ? `${Math.round(checkInDistance)}m away, ` : ""}move closer and retry`}
                        </div>
                        <button onClick={checkIn} style={{ padding: '8px', fontWeight: 700, border: '1px solid #ccc', borderRadius: '5px', background: '#fff', cursor: 'pointer' }}>
                          Retry check-in
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}