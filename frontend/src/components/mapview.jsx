import { useState, useEffect } from "react";
import { useUser } from "../context/UserContext";
import { WS_URL } from "../config/apiBase";
import jsPDF from "jspdf";
import { MapContainer, TileLayer, CircleMarker, LayerGroup, Polygon, Polyline, Tooltip, useMap } from 'react-leaflet';
import "leaflet/dist/leaflet.css";
import {getAccounts,updateAccount,getLeads,updateLead,getOpportunitiesMap
} from "../services/salesforceApi";
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend,
    RadialBarChart,
    RadialBar,
    

} from "recharts";

const TERRITORIES = [
  { id: 'T1', name: 'Hyderabad', center: [17.385, 78.4867], color: '#0E8388' },
  { id: 'T2', name: 'Bangalore', center: [12.9716, 77.5946], color: '#0B2E4F' },
  
];


function territoryRing(center, r) {
  const pts = [];
  for (let a = 0; a < 360; a += 45) {
    const rad = (a * Math.PI) / 180;
    pts.push([center[0] + Math.cos(rad) * r, center[1] + Math.sin(rad) * r * 1.15]);
  }
  return pts;
}

const INITIAL_RECORDS = [
  { id: 'ACC-1001', name: 'Meridian Textiles', type: 'customer', territory: 'T1', lat: 17.385, lng: 78.4867, priority: 'High', owner: 'Ananya Rao', oppValue: 850000, discoverySource: '—', validation: 'Validated', lastVisit: '2026-07-12', nextVisit: '2026-08-05', visitStatus: 'pending' },
  { id: 'ACC-1002', name: 'Bluepeak Foods', type: 'customer', territory: 'T1', lat: 17.40, lng: 78.47, priority: 'Medium', owner: 'Sana Sheikh', oppValue: 420000, discoverySource: '—', validation: 'Validated', lastVisit: '2026-06-30', nextVisit: '2026-08-10', visitStatus: 'pending' },
  { id: 'LEAD-2001', name: 'Orbit Logistics', type: 'lead', territory: 'T1', lat: 17.37, lng: 78.50, priority: 'High', owner: 'Ananya Rao', oppValue: 0, discoverySource: 'Field Survey', validation: 'Validated', lastVisit: '—', nextVisit: '2026-08-03', visitStatus: 'pending' },
  { id: 'PROS-3001', name: 'Kavya Enterprises', type: 'prospect', territory: 'T1', lat: 17.39, lng: 78.44, priority: 'Medium', owner: 'Unassigned', oppValue: 180000, discoverySource: 'Web Scan', validation: 'Pending', lastVisit: '—', nextVisit: '—', visitStatus: 'pending' },
  { id: 'ACC-1003', name: 'Silverline Pharma', type: 'customer', territory: 'T2', lat: 12.97, lng: 77.60, priority: 'High', owner: 'Karthik Iyer', oppValue: 1200000, discoverySource: '—', validation: 'Validated', lastVisit: '2026-07-20', nextVisit: '2026-08-15', visitStatus: 'pending' },
  { id: 'LEAD-2002', name: 'Coral Retail Group', type: 'lead', territory: 'T2', lat: 12.99, lng: 77.58, priority: 'Low', owner: 'Karthik Iyer', oppValue: 0, discoverySource: 'Trade Directory', validation: 'Validated', lastVisit: '—', nextVisit: '2026-08-08', visitStatus: 'completed' },
];

const TYPE_COLOR = { customer: '#0B2E4F', lead: '#0E8388', opportunity: '#D98F00', prospect: '#2E8B57', duplicate: '#C1443C' };
const TYPE_LABEL = { customer: 'Existing Customer', lead: 'Existing Lead', opportunity: 'High-value Opportunity', prospect: 'New Prospect', duplicate: 'Possible Duplicate' };
const PRIORITY_COLOR = {
  High: "#e53935",      // Red
  Medium: "#fb8c00",    // Orange
  Low: "#43a047"        // Green
};
function haversine(a, b) {
  const R = 6371;
  const dLat = (b[0] - a[0]) * Math.PI / 180;
  const dLng = (b[1] - a[1]) * Math.PI / 180;
  const lat1 = a[0] * Math.PI / 180, lat2 = b[0] * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function nearestNeighborRoute(stops) {
  if (stops.length < 2) return stops;
  const remaining = [...stops];
  const ordered = [remaining.shift()];
  while (remaining.length) {
    const last = ordered[ordered.length - 1];
    remaining.sort((a, b) => haversine([last.lat, last.lng], [a.lat, a.lng]) - haversine([last.lat, last.lng], [b.lat, b.lng]));
    ordered.push(remaining.shift());
  }
  return ordered;
}

function FitToRoute({ stops }) {
  const map = useMap();
  if (stops.length > 1) {
    map.fitBounds(stops.map(s => [s.lat, s.lng]), { padding: [60, 60] });
  }
  return null;
}

function calculateAIScore(record) {

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

function calculateRevenueRisk(record) {

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

function FitToRecords({ records }) {
    const map = useMap();

    useEffect(() => {
        const validRecords = records.filter(
            r =>
                Number.isFinite(Number(r.lat)) &&
                Number.isFinite(Number(r.lng))
        );

        if (!validRecords.length) {
            return;
        }

        const bounds = validRecords.map(r => [
            Number(r.lat),
            Number(r.lng)
        ]);

        map.fitBounds(bounds, {
            padding: [40, 40],
            maxZoom: 12
        });
    }, [records, map]);

    return null;
}
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

useEffect(() => {

        loadAccounts();
        loadLeads();
        loadOpportunities();

}, []);

  const [typeFilter, setTypeFilter] = useState('');
  const [territoryFilter, setTerritoryFilter] = useState('');
  const [showTerritories, setShowTerritories] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [geofenceOk, setGeofenceOk] = useState(null);
  const [route, setRoute] = useState(null);
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
const dashboardStats = {

    totalAccounts: records.length,

    highPriority: records.filter(
        r => r.priority === "High"
    ).length,

    mediumPriority: records.filter(
        r => r.priority === "Medium"
    ).length,

    lowPriority: records.filter(
        r => r.priority === "Low"
    ).length,

    pendingVisits:

records.filter(

    r => r.validation === "Pending"

).length,

completedVisits:

records.filter(

    r => r.validation === "Validated"

).length

};

const totalRevenue = records.reduce(
    (sum, r) => sum + (r.oppValue || 0),
    0
);

const averageRevenue =
    records.length > 0
        ? totalRevenue / records.length
        : 0;

const validationRate =
    records.length > 0
        ? (
            dashboardStats.completedVisits /
            records.length
        ) * 100
        : 0;

const visitCompletionRate =
    (dashboardStats.completedVisits + dashboardStats.pendingVisits) > 0
        ? (
            dashboardStats.completedVisits /
            (
                dashboardStats.completedVisits +
                dashboardStats.pendingVisits
            )
        ) * 100
        : 0;

const priorityChart = [

    {
        name: "High",
        value: dashboardStats.highPriority
    },

    {
        name: "Medium",
        value: dashboardStats.mediumPriority
    },

    {
        name: "Low",
        value: dashboardStats.lowPriority
    }

];

const visitChart = [

    {
        name: "Pending",
        value: dashboardStats.pendingVisits
    },

    {
        name: "Completed",
        value: dashboardStats.completedVisits
    }

];

const CHART_COLORS = [

    "#e53935",

    "#fb8c00",

    "#43a047"

];

const territoryStats = territoryOptions.map(territory => {

    const territoryRecords = records.filter(
        r => r.territory === territory
    );
    console.log(
    territory,
    territoryRecords.map(r => ({
        name: r.name,
        validation: r.validation
    }))
);



    return {

        territory,

        totalAccounts: territoryRecords.length,

        highPriority: territoryRecords.filter(
            r => r.priority === "High"
        ).length,

        mediumPriority: territoryRecords.filter(
            r => r.priority === "Medium"
        ).length,

        lowPriority: territoryRecords.filter(
            r => r.priority === "Low"
        ).length,

pending:

territoryRecords.filter(

    r => r.validation === "Pending"

).length,

completed:

territoryRecords.filter(

    r => r.validation === "Validated"

).length,

        totalRevenue: territoryRecords.reduce(
            (sum, r) => sum + (r.oppValue || 0),
            0
        )

    };
});

const revenueChart = territoryStats.map(t => ({
    territory: t.territory,
    revenue: t.totalRevenue
}));


const priorityTerritoryChart = territoryStats.map(t => ({
    territory: t.territory,
    High: t.highPriority,
    Medium: t.mediumPriority,
    Low: t.lowPriority
}));

const territoryRanking = [...territoryStats]
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .map((t, index) => ({
        rank: index + 1,
        territory: t.territory,
        revenue: t.totalRevenue,
        accounts: t.totalAccounts,
        high: t.highPriority
    }));

const currentRevenue =
    records.reduce(
        (sum, record) =>
            sum + (record.oppValue || 0),
        0
    );

const salesForecast =
    Math.round(
        records.reduce((sum, record) => {

            let multiplier = 1;

            if (record.priority === "High")
                multiplier = 1.20;

            else if (record.priority === "Medium")
                multiplier = 1.10;

            else
                multiplier = 1.05;

            return sum + (record.oppValue || 0) * multiplier;

        }, 0)
    );

const forecastGrowth =
    (
        ((salesForecast - currentRevenue) /
            currentRevenue) * 100
    ).toFixed(1);


  
  const salesTrend = [
    { month: "Jan", revenue: 250000 },
    { month: "Feb", revenue: 310000 },
    { month: "Mar", revenue: 420000 },
    { month: "Apr", revenue: 390000 },
    { month: "May", revenue: 520000 },
    { month: "Jun", revenue: 610000 },
    { month: "Jul", revenue: 720000 },
    { month: "Aug", revenue: 680000 },
    { month: "Sep", revenue: 810000 },
    { month: "Oct", revenue: 900000 },
    { month: "Nov", revenue: 980000 },
    { month: "Dec", revenue: 1100000 }
];

const bestTerritory =
    territoryStats.reduce(
        (best, current) =>
            current.totalRevenue > best.totalRevenue
                ? current
                : best,
        territoryStats[0]
    );

const attentionRequired =
    records.filter(
        r =>
            r.priority === "High" &&
            r.validation !== "Validated"
    ).length;

const pendingVisits =
    records.filter(
        r =>
            r.visitStatus === "pending"
    ).length;

const businessInsights = [

    {
        title: "Best Performing Territory",
        value: bestTerritory?.territory || "-"
    },

    {
        title: "Highest Revenue",
        value: `₹${bestTerritory?.totalRevenue.toLocaleString("en-IN")}`
    },

    {
        title: "Accounts Needing Attention",
        value: attentionRequired
    },

    {
        title: "Pending Field Visits",
        value: pendingVisits
    },

    {
        title: "Validation Rate",
        value: `${validationRate.toFixed(1)}%`
    },

    {
        title: "Recommendation",
        value:
            attentionRequired > 0
                ? "Prioritize High Priority Accounts"
                : "Operations Healthy"

    }

];

const aiOpportunities = [...records]
    .map(record => ({
        ...record,
        aiScore: calculateAIScore(record)
    }))
    .sort((a, b) => b.aiScore - a.aiScore);


  function openRecord(r) {
    setSelectedId(r.id);
    setGeofenceOk(null);
  }

const aiRecommendations = aiOpportunities
    .filter(record => {

        // Already visited and validated
        if (record.validation === "Validated")
            return false;

        // Invalid GIS location
        if (record.validation === "Rejected")
            return false;

        // Recommend only Pending records
        if (record.validation !== "Pending")
            return false;

        return true;

    })
    .slice(0, 5)
    .map(record => {

        let type = "info";
        let message = "";

        if (record.aiScore >= 90) {

            type = "success";

            message =
                "Highest priority opportunity. Schedule a field visit immediately.";

        }
        else if (record.aiScore >= 75) {

            type = "pending";

            message =
                "Strong sales potential. Visit this account within the next few days.";

        }
        else if (record.aiScore >= 60) {

            type = "warning";

            message =
                "Medium opportunity. Follow up after completing higher priority accounts.";

        }
        else {

            type = "info";

            message =
                "Low priority. Keep this account in the monitoring list.";

        }

        return {

            ...record,
            type,
            message

        };

    });
const recommendationColor = {
    success: "#2E8B57",
    warning: "#C1443C",
    pending: "#D98F00",
    info: "#0B2E4F"
};

const revenueRisk = records
    .map(record => ({
        ...record,
        riskScore: calculateRevenueRisk(record)
    }))
    .sort((a,b)=>b.riskScore-a.riskScore);

const rankedAccounts = [...aiOpportunities]
    .sort((a, b) => b.aiScore - a.aiScore)
    .map((record, index) => ({
        ...record,
        rank: index + 1
    }));

function calculateTerritoryScore(t) {

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

const aiTerritories = territoryStats
    .map(t => ({
        ...t,
        aiScore: calculateTerritoryScore(t)
    }))
    .sort((a, b) => b.aiScore - a.aiScore);

const executiveSummary = {

    totalRevenue: totalRevenue,

    predictedRevenue: salesForecast,

    growth: forecastGrowth,

    bestTerritory: bestTerritory?.territory || "-",

    highestAIScore:
        aiOpportunities.length > 0
            ? aiOpportunities[0].aiScore
            : 0,

    accountsToVisit:
        aiRecommendations.length,

    validationRate:
        validationRate.toFixed(1)

};

const aiAlerts = [];

// Revenue Forecast

if (forecastGrowth >= 10) {

    aiAlerts.push({

        type: "success",

        title: "Revenue Forecast",

        message: `Revenue is expected to grow by ${forecastGrowth}%`

    });

}

// Validation

if (validationRate < 85) {

    aiAlerts.push({

        type: "warning",

        title: "Validation Rate",

        message: `Validation is only ${validationRate.toFixed(1)}%`

    });

}

// Pending Visits

if (pendingVisits > 5) {

    aiAlerts.push({

        type: "danger",

        title: "Pending Visits",

        message: `${pendingVisits} field visits still pending`

    });

}

// High Priority Accounts

if (attentionRequired > 0) {

    aiAlerts.push({

        type: "danger",

        title: "High Priority Accounts",

        message: `${attentionRequired} high priority accounts need attention`

    });

}

// Best Territory

if (bestTerritory) {

    aiAlerts.push({

        type: "success",

        title: "Top Territory",

        message: `${bestTerritory.territory} is leading in revenue`

    });

}

const alertColors = {

    success: "#2E8B57",

    warning: "#D98F00",

    danger: "#C1443C"

};

const executiveHealthScore = Math.round(

    (
        Number(validationRate) +
        Number(forecastGrowth) +
        (
            aiRecommendations.length === 0
                ? 100
                : 100 - aiRecommendations.length * 10
        )
    ) / 3

);

let executiveStatus = "Excellent";

if (executiveHealthScore < 80)
    executiveStatus = "Good";

if (executiveHealthScore < 60)
    executiveStatus = "Needs Attention";

if (executiveHealthScore < 40)
    executiveStatus = "Critical";

const executiveColor =
    executiveHealthScore >= 80
        ? "#2E8B57"
        : executiveHealthScore >= 60
        ? "#D98F00"
        : "#C1443C";

<RadialBar
    dataKey="value"
    fill={executiveColor}
    animationBegin={0}
    animationDuration={1800}
    animationEasing="ease-out"
    cornerRadius={12}
/>
function getTerritoryRank(index){

    if(index===0) return "🥇";

    if(index===1) return "🥈";

    if(index===2) return "🥉";

    return `#${index+1}`;
}

function getRankIcon(rank) {

    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";

    return `#${rank}`;
}

async function checkIn() {

    if (!selected) return;

    try {

        console.log(
            "📍 Checking in to:",
            selected.name
        );

        // For now, use the selected account location
        // as the successful geofence verification.
        setGeofenceOk(true);

        console.log(
            "🟢 Geofence verified for:",
            selected.name
        );

    } catch (error) {

        console.error(
            "❌ Check-in error:",
            error
        );

        setGeofenceOk(false);
    }
}
async function checkOut() {

    if (!selected) {
        console.warn("No account/lead selected");
        return;
    }

    try {

        console.log(
            "📍 Checking out:",
            selected.name
        );

        console.log(
            "Selected ID:",
            selected.id
        );

        console.log(
            "Selected Type:",
            selected.type
        );

        const today = new Date()
            .toISOString()
            .split("T")[0];

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

        console.log(
            "✅ Visit completed successfully:",
            selected.name
        );

        await loadAccounts();

        setSelectedId(selected.id);

        setGeofenceOk(null);

    } catch (error) {

        console.error(
            "❌ Check-out error:",
            error
        );

    }
}
// function generateRoute() {

//     console.log("========== ROUTE DEBUG ==========");

//     console.log("Selected Territory:", routeTerritory);

//     records.forEach(r => {
//         console.log(
//             r.name,
//             "| Territory =", r.territory,
//             "| Status =", r.visitStatus
//         );
//     });

//     const stops = records.filter(
//         r =>
//             r.territory === routeTerritory &&
//             r.visitStatus === "pending"
//     );

//     console.log("Matching Stops:", stops);

//     if (stops.length < 2) {
//         alert("Not enough pending-visit stops in this territory to build a route.");
//         setRoute(null);
//         return;
//     }

//     setRoute(nearestNeighborRoute(stops));
// }

function generateRoute() {

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

        const optimizedRoute =
            nearestNeighborRoute(
                pendingStops
            );

        console.log(
            "Optimized Route:",
            optimizedRoute
        );

        setRoute(
            optimizedRoute
        );

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

        const optimizedRoute =
            nearestNeighborRoute(
                territoryRecords
            );

        console.log(
            "Optimized Fallback Route:",
            optimizedRoute
        );

        setRoute(
            optimizedRoute
        );

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
    let dist = 0;
    for (let i = 1; i < route.length; i++) dist += haversine([route[i - 1].lat, route[i - 1].lng], [route[i].lat, route[i].lng]);
    return { stops: route.length, distKm: dist.toFixed(1), etaMin: Math.round(dist / 28 * 60) };
  })() : null;

  const aiActivityFeed = [

{
    time: "2 min ago",
    icon: "🟢",
    title: "Account Validated",
    message: `${
    records.find(r => r.validation === "Validated")?.name || "Account"
} successfully validated.`
},

{
    time: "5 min ago",
    icon: "🟡",
    title: "Revenue Forecast Updated",
    message: `Forecast increased to ₹${salesForecast.toLocaleString("en-IN")}.`
},

{
    time: "8 min ago",
    icon: "🔵",
    title: "Route Optimized",
    message: `${pendingVisits} pending visits optimized by AI.`
},

{
    time: "12 min ago",
    icon: "🔴",
    title: "High Priority Alert",
    message: `${attentionRequired} high priority accounts require immediate action.`
},

{
    time: "18 min ago",
    icon: "🟢",
    title: "Territory Performance",
    message: `${bestTerritory?.territory} is leading revenue generation.`
}

];

const aiNotifications = [

{
    id: 1,
    type: "critical",
    title: "Revenue Risk",
    message: `${attentionRequired} high-priority accounts require immediate action.`,
    time: "2 min ago",
    unread: true
},

{
    id: 2,
    type: "warning",
    title: "Pending Visits",
    message: `${pendingVisits} field visits are still pending.`,
    time: "8 min ago",
    unread: true
},

{
    id: 3,
    type: "success",
    title: "Validation Completed",
    message: `${dashboardStats.completedVisits} accounts successfully validated.`,
    time: "15 min ago",
    unread: false
},

{
    id: 4,
    type: "info",
    title: "Forecast Updated",
    message: `Predicted revenue updated to ₹${salesForecast.toLocaleString("en-IN")}.`,
    time: "25 min ago",
    unread: false
}

];

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

    const rows = aiActivityFeed.map(activity => [
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

        <div
            style={{
                display: "grid",
                gridTemplateColumns:
                    "repeat(auto-fit, minmax(170px, 1fr))",
                gap: "12px",
                padding: "15px",
                background: "#f4f6f9",
                borderBottom: "1px solid #ddd",
                boxSizing: "border-box"
            }}
        ></div>
      <div
    style={{
        display: "grid",
        gridTemplateColumns:
        "repeat(auto-fit, minmax(170px,1fr))",
        gap: "12px",
        padding: "15px",
        background: "#f4f6f9",
        borderBottom: "1px solid #ddd"
    }}
>

    {[
    {
        title: "Total Accounts",
        value: dashboardStats.totalAccounts
    },
    {
        title: "High Priority",
        value: dashboardStats.highPriority
    },
    {
        title: "Medium Priority",
        value: dashboardStats.mediumPriority
    },
    {
        title: "Low Priority",
        value: dashboardStats.lowPriority
    },
    {
        title: "Pending Visits",
        value: dashboardStats.pendingVisits
    },
    {
        title: "Completed Visits",
        value: dashboardStats.completedVisits
    },
    {
        title: "Total Revenue",
        value: `₹${totalRevenue.toLocaleString("en-IN")}`
    },
    {
        title: "Average Revenue",
        value: `₹${Math.round(averageRevenue).toLocaleString("en-IN")}`
    },
    {
        title: "Validation Rate",
        value: `${validationRate.toFixed(1)}%`
    },
    {
        title: "Visit Completion",
        value: `${visitCompletionRate.toFixed(1)}%`
    }

    
].map(card => (

        <div
            key={card.title}
            style={{
                background: "#fff",
                borderRadius: "10px",
                padding: "15px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
            }}
        >

            <div
                style={{
                    fontSize: "12px",
                    color: "#666"
                }}
            >
                {card.title}
            </div>

            <div
                style={{
                    fontSize: "28px",
                    fontWeight: "bold",
                    color: "#0B2E4F",
                    marginTop: "6px"
                }}
            >
                {card.value}
            </div>

        </div>

    ))}

</div>
<div
    style={{
        maxWidth: "1600px",
        width: "95%",
        margin: "25px auto",
        background: "linear-gradient(135deg, #0B2E4F 0%, #1B5D96 100%)",
        color: "#fff",
        padding: "30px",
        borderRadius: "18px",
        boxShadow: "0 8px 20px rgba(0,0,0,.15)"
    }}
>

<h2
    style={{
        textAlign: "center",
        marginTop: 0,
        marginBottom: "30px",
        color: "#fff"
    }}
>
AI Executive Dashboard
</h2>

<div
    style={{
        marginTop: "25px",
        background: "#fff",
        color: "#222",
        padding: "20px",
        borderRadius: "12px",
        boxShadow: "0 3px 10px rgba(0,0,0,0.10)"
    }}
>

<h3
    style={{
        marginTop: 0,
        marginBottom: "20px",
        color: "#0B2E4F"
    }}
>
🛰 Live AI Activity Feed
</h3>

<div
    style={{
        display: "flex",
        flexDirection: "column",
        gap: "15px"
    }}
>

{[
    ...liveActivityFeed,
    ...aiActivityFeed
].slice(0, 10).map((activity, index) => (

<div
    key={activity.id || `${activity.title}-${activity.time}-${index}`}
    style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "15px",
        borderRadius: "10px",
        background: "#f8f9fb",
        borderLeft: "5px solid #0B2E4F"
    }}
>

<div
    style={{
        display: "flex",
        alignItems: "center",
        gap: "15px"
    }}
>

<div
    style={{
        fontSize: "28px"
    }}
>
{activity.icon}
</div>

<div>

<div
    style={{
        fontWeight: "bold",
        color: "#0B2E4F"
    }}
>
{activity.title}
</div>

<div
    style={{
        fontSize: "14px",
        color: "#666",
        marginTop: "5px"
    }}
>
{activity.message}
</div>

</div>

</div>

<div
    style={{
        color: "#888",
        fontSize: "13px",
        fontWeight: "bold"
    }}
>
{activity.time}
</div>

</div>

))}

</div>

</div>

<div
    style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "20px",
        alignItems: "stretch",
        marginTop: "25px"
    }}
>

  <div
    style={{
        background: "#fff",
        color: "#222",
        padding: "20px",
        borderRadius: "12px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
    }}
>

<div
    style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "20px"
    }}
>

<h3
    style={{
        margin: 0,
        color: "#0B2E4F",
    }}
>
🔔 AI Notification Center
</h3>

<div
    style={{
        background: "#e53935",
        color: "#fff",
        borderRadius: "20px",
        padding: "6px 14px",
        fontWeight: "bold",
        fontSize: "13px"
    }}
>
{unreadNotifications} Unread
</div>

</div>

<div
    style={{
        display: "flex",
        flexDirection: "column",
        gap: "14px"
    }}
>

{aiNotifications.map(notification => (

<div
    key={notification.id}
    style={{
        borderLeft: `6px solid ${notificationColors[notification.type]}`,
        background: "#f8f9fb",
        borderRadius: "10px",
        padding: "16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
    }}
>

<div>

<div
    style={{
        display: "flex",
        alignItems: "center",
        gap: "10px"
    }}
>

<strong
    style={{
        color: "#0B2E4F",
        fontSize: "15px"
    }}
>
{notification.title}
</strong>

{notification.unread && (

<span
style={{
background:"#e53935",
color:"#fff",
fontSize:"10px",
padding:"2px 6px",
borderRadius:"20px"
}}
>

NEW

</span>

)}

</div>

<div
style={{
marginTop:"6px",
color:"#555",
fontSize:"14px"
}}
>

{notification.message}

</div>

</div>

<div
style={{
fontSize:"12px",
color:"#777",
fontWeight:"bold"
}}
>

{notification.time}

</div>

</div>

))}

</div>

</div>

  <div
    style={{
        background: "#fff",
        padding: "20px",
        borderRadius: "12px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
    }}
>

    <h3
        style={{
            marginTop: 0,
            color: "#0B2E4F"
        }}
    >
        🚨 Live AI Alerts
        </h3>
        {liveAlerts.length === 0 ? (

    <div
        style={{
            background: "#f8f9fb",
            padding: "15px",
            borderRadius: "10px",
            color: "#777",
            fontSize: "13px"
        }}
    >
        No new real-time alerts.
    </div>

) : (

    <div
        style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px"
        }}
    >

        {liveAlerts.map(alert => (

            <div
                key={alert.id}
                style={{
                    borderLeft:
                        `5px solid ${
                            alert.type === "success"
                                ? "#2E8B57"
                                : alert.type === "warning"
                                ? "#D98F00"
                                : alert.type === "danger"
                                ? "#C1443C"
                                : "#0B2E4F"
                        }`,
                    background: "#f8f9fb",
                    padding: "12px",
                    borderRadius: "8px"
                }}
            >

                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between"
                    }}
                >

                    <strong
                        style={{
                            color: "#0B2E4F"
                        }}
                    >
                        {alert.title}
                    </strong>

                    <span
                        style={{
                            fontSize: "11px",
                            color: "#777"
                        }}
                    >
                        {alert.time}
                    </span>

                </div>

                <div
                    style={{
                        marginTop: "5px",
                        fontSize: "13px",
                        color: "#555"
                    }}
                >
                    {alert.message}
                </div>

            </div>

        ))}

    </div>

)}

    <h4
        style={{
            marginTop: "20px",
            marginBottom: "12px",
            color: "#0B2E4F"
        }}
    >
        AI-Generated Alerts
    </h4>

    <div
        style={{
            display: "grid",
            flexDirection:"column",
            gap: "12px"
        }}
    >

        {aiAlerts.map((alert, index) => (

            <div
                key={index}
                style={{
                    borderLeft: `6px solid ${alertColors[alert.type]}`,
                    background: "#f8f9fb",
                    borderRadius: "10px",
                    padding: "16px",
                    transition: "0.3s"
                }}
            >

                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                    }}
                >

                    <div>

                        <div
                            style={{
                                fontWeight: "bold",
                                fontSize: "16px",
                                color: "#0B2E4F"
                            }}
                        >
                            {alert.title}
                        </div>

                        <div
                            style={{
                                marginTop: "8px",
                                color: "#555",
                                lineHeight: "22px"
                            }}
                        >
                            {alert.message}
                        </div>

                    </div>

                    <div
                        style={{
                            fontSize: "26px"
                        }}
                    >

                        {alert.type === "success"
                            ? "🟢"
                            : alert.type === "warning"
                            ? "🟡"
                            : "🔴"}

                    </div>

                </div>

            </div>

        ))}

    </div>

</div>

</div>

<div
    style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "20px",
        alignItems: "stretch",
        marginTop: "25px",
        marginBottom: "10px"
    }}
>

<div
    style={{
        background: "rgba(255,255,255,0.12)",
        borderRadius: "12px",
        padding: "20px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center"
    }}
>

<h4>💰 Current Revenue</h4>

<h2 style={{ color: "#fff" }}>

₹{executiveSummary.totalRevenue.toLocaleString("en-IN")}

</h2>

</div>

<div
    style={{
        background: "rgba(255,255,255,0.12)",
        borderRadius: "12px",
        padding: "20px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center"
    }}
>

<h4>🧠 Executive Health</h4>

<ResponsiveContainer
    width="100%"
    height={260}
>

<RadialBarChart

innerRadius="70%"

outerRadius="100%"

data={[
{
name:"Health",
value:executiveHealthScore
}
]}

startAngle={180}

endAngle={0}

>

<RadialBar

dataKey="value"

fill={executiveColor}

/>

<text
    x="50%"
    y="50%"
    textAnchor="middle"
    fill="#ffffff"
    fontSize="34"
    fontWeight="700"
>
    {executiveHealthScore}%
</text>

</RadialBarChart>

</ResponsiveContainer>

<div
style={{
marginTop:"-8px",
fontWeight:"bold",
fontSize:"18px"
}}
>

{executiveStatus}

<div
    style={{
        marginTop: "10px",
        display: "inline-block",
        padding: "8px 20px",
        borderRadius: "30px",
        background:
            executiveHealthScore >= 80
                ? "#2E8B57"
                : executiveHealthScore >= 60
                ? "#D98F00"
                : "#C1443C",
        color: "#fff",
        fontWeight: "bold",
        fontSize: "14px",
        letterSpacing: "0.5px"
    }}
>
    {executiveHealthScore >= 80
        ? "EXCELLENT"
        : executiveHealthScore >= 60
        ? "STABLE"
        : "CRITICAL"}
</div>

<div
    style={{
        marginTop: "15px",
        fontSize: "13px",
        color: "#EAEAEA",
        textAlign: "center",
        lineHeight: "22px"
    }}
>
    Overall AI Business Performance
</div>

<div
    style={{
        marginTop: "8px",
        fontSize: "22px",
        fontWeight: "bold",
        color:
            forecastGrowth > 0
                ? "#7CFC00"
                : "#ff8080"
    }}
>
    {forecastGrowth > 0 ? "▲" : "▼"} {forecastGrowth}%
</div>

</div>

</div>

<div
    style={{
        background: "rgba(255,255,255,0.12)",
        borderRadius: "12px",
        padding: "20px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center"
    }}
>

<h4>🚀 Growth</h4>

<h2 style={{ color: "#fff" }}>

{executiveSummary.growth}%

</h2>

</div>

</div>

<div
style={{
marginTop:"25px",
background:"#fff",
color:"#222",
padding:"28px",
borderRadius:"10px"

}}
>

<h3>

AI Executive Recommendation

</h3>

<p
style={{
fontSize:"15px",
lineHeight:"26px"
}}
>

{
executiveHealthScore>=80
?

"Business performance is excellent. Continue focusing on High Priority Accounts and maximize forecast opportunities."

:

executiveHealthScore>=60

?

"Validation performance is average. Increase field visits and improve account verification."

:

"Immediate management attention is recommended. Revenue growth and validation performance are below expected levels."

}

</p>

</div>

<div
style={{
display:"grid",
gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",
gap:"15px",
marginTop:"25px"
}}
>

{[
{
title:"Revenue",
status:forecastGrowth>10,
value:"Healthy"
},

{
title:"Validation",
status:validationRate>80,
value:`${validationRate.toFixed(1)}%`
},

{
title:"AI Opportunities",
status:aiRecommendations.length<5,
value:aiRecommendations.length
},

{
title:"Field Visits",
status:pendingVisits<10,
value:pendingVisits
}

].map(card=>(

<div

key={card.title}

style={{
background:"#fff",
color:"#222",
padding:"15px",
borderRadius:"10px",
textAlign:"center"
}}
>

<div
style={{
fontWeight:"bold",
marginBottom:"8px"
}}
>

{card.title}

</div>

<div
style={{
fontSize:"26px"
}}
>

{card.status ? "🟢":"🔴"}

</div>

<div
style={{
marginTop:"8px"
}}
>

{card.value}

</div>

</div>

))}

</div>

<div
style={{
display:"grid",
gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",
gap:"20px",
marginTop:"25px"
}}
>

<div
style={{
background:"#fff",
color:"#222",
padding:"18px",
borderRadius:"10px",
textAlign:"center"
}}
>

<h4>Best Territory</h4>

<h2>

{executiveSummary.bestTerritory}

</h2>

</div>

<div
style={{
background:"#fff",
color:"#222",
padding:"18px",
borderRadius:"10px",
textAlign:"center"
}}
>

<h4>Highest AI Score</h4>

<h2>

{executiveSummary.highestAIScore}

</h2>

</div>

<div
style={{
background:"#fff",
color:"#222",
padding:"18px",
borderRadius:"10px",
textAlign:"center"
}}
>

<h4>Accounts To Visit</h4>

<h2>

{executiveSummary.accountsToVisit}

</h2>

</div>

</div>

</div>
<div
    style={{
        padding: "15px",
        background: "#ffffff",
        borderBottom: "1px solid #ddd"
    }}
>

    <h3 style={{ marginTop: 0 }}>
        Territory Analytics
    </h3>

    <table
        style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "13px"
        }}
    >

        <thead>
            <tr style={{ background: "#f4f6f9" }}>
                <th style={{ padding: "8px", textAlign: "left" }}>Territory</th>
                <th>Accounts</th>
                <th>High</th>
                <th>Medium</th>
                <th>Low</th>
                <th>Pending</th>
                <th>Completed</th>
                <th>Revenue</th>
            </tr>
        </thead>

        <tbody>

            {territoryStats.map(t => (

                <tr key={t.territory} style={{ borderBottom: "1px solid #eee" }}>

                    <td style={{ padding: "8px" }}>{t.territory}</td>

                    <td>{t.totalAccounts}</td>

                    <td>{t.highPriority}</td>

                    <td>{t.mediumPriority}</td>

                    <td>{t.lowPriority}</td>

                    <td>{t.pending}</td>

                    <td>{t.completed}</td>

                    <td>₹{t.totalRevenue.toLocaleString("en-IN")}</td>

                </tr>

            ))}

        </tbody>

    </table>

</div>
<div
    style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(500px,1fr))",
        gap: "20px",
        padding: "20px"
    }}
>

    {/* Priority Chart */}

    <div
        style={{
            background: "#fff",
            borderRadius: "12px",
            padding: "15px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
        }}
    >

        <h3>Priority Distribution</h3>

        <ResponsiveContainer
            width="100%"
            height={300}
        >

            <PieChart>

                <Pie
                    data={priorityChart}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={100}
                    label
                >

                    {priorityChart.map((entry, index) => (

                        <Cell
                            key={index}
                            fill={CHART_COLORS[index]}
                        />

                    ))}

                </Pie>

                <RechartsTooltip />

            </PieChart>

        </ResponsiveContainer>

    </div>

    {/* Visit Status */}

    <div
        style={{
            background: "#fff",
            borderRadius: "12px",
            padding: "15px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
        }}
    >

        <h3>Visit Status</h3>

        <ResponsiveContainer
            width="100%"
            height={300}
        >

            <BarChart data={visitChart}>

                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="name" />

                <YAxis />

                <RechartsTooltip />

                <Legend />

                <Bar
                    dataKey="value"
                    fill="#0B2E4F"
                />

            </BarChart>

        </ResponsiveContainer>

    </div>

</div>

  <div
    style={{
        background: "#fff",
        margin: "20px",
        padding: "20px",
        borderRadius: "12px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
    }}
>
    <h3>Revenue by Territory</h3>

    <ResponsiveContainer
        width="100%"
        height={350}
    >
        <BarChart data={revenueChart}>

            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="territory" />

            <YAxis
    tickFormatter={(value) =>
        `₹${(value / 100000).toFixed(1)}L`
    }
/>

            <RechartsTooltip
    formatter={(value) => [
        `₹${Number(value).toLocaleString("en-IN")}`,
        "Revenue"
    ]}
/>

            <Legend />

            <Bar
                dataKey="revenue"
                fill="#0B2E4F"
                radius={[6, 6, 0, 0]}
            />

        </BarChart>
    </ResponsiveContainer>
</div>

<div
    style={{
        background: "#fff",
        margin: "20px",
        padding: "25px",
        borderRadius: "12px",
        boxShadow: "0 3px 10px rgba(0,0,0,0.10)"
    }}
>

    <div
        style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
            marginBottom: "20px"
        }}
    >

        <div>

            <h3
                style={{
                    margin: 0,
                    color: "#0B2E4F"
                }}
            >
                📊 Reports & Export
            </h3>

            <p
                style={{
                    marginTop: "6px",
                    marginBottom: 0,
                    color: "#666",
                    fontSize: "13px"
                }}
            >
                Generate executive reports from Salesforce, GIS and AI analytics.
            </p>

        </div>

    </div>


    {/* REPORT OPTIONS */}

    <div
        style={{
            display: "grid",
            gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "15px"
        }}
    >

        {/* Executive Report */}

        <div
            style={{
                background: "#f8f9fb",
                borderRadius: "10px",
                padding: "18px",
                borderLeft: "5px solid #0B2E4F"
            }}
        >

            <div
                style={{
                    fontSize: "30px",
                    marginBottom: "8px"
                }}
            >
                📄
            </div>

            <h4
                style={{
                    margin: "5px 0",
                    color: "#0B2E4F"
                }}
            >
                Executive Summary
            </h4>

            <p
                style={{
                    fontSize: "13px",
                    color: "#666",
                    lineHeight: "20px"
                }}
            >
                Revenue, AI health, territories, visits and
                executive recommendations.
            </p>

            <button
                style={{
                    marginTop: "10px",
                    padding: "10px 16px",
                    border: "none",
                    borderRadius: "8px",
                    background: "#0B2E4F",
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: "bold"
                }}
                onClick={generateExecutiveReport}
            >
                Download PDF
            </button>

        </div>


        {/* Data Export */}

        <div
            style={{
                background: "#f8f9fb",
                borderRadius: "10px",
                padding: "18px",
                borderLeft: "5px solid #2E8B57"
            }}
        >

            <div
                style={{
                    fontSize: "30px",
                    marginBottom: "8px"
                }}
            >
                📊
            </div>

            <h4
                style={{
                    margin: "5px 0",
                    color: "#0B2E4F"
                }}
            >
                Business Data
            </h4>

            <p
                style={{
                    fontSize: "13px",
                    color: "#666",
                    lineHeight: "20px"
                }}
            >
                Export accounts, territories, revenue and
                field visit information.
            </p>

            <button
                style={{
                    marginTop: "10px",
                    padding: "10px 16px",
                    border: "none",
                    borderRadius: "8px",
                    background: "#2E8B57",
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: "bold"
                }}
                onClick={exportBusinessData}
            >
                Export CSV
            </button>

        </div>


        {/* AI Report */}

        <div
            style={{
                background: "#f8f9fb",
                borderRadius: "10px",
                padding: "18px",
                borderLeft: "5px solid #7B61FF"
            }}
        >

            <div
                style={{
                    fontSize: "30px",
                    marginBottom: "8px"
                }}
            >
                🤖
            </div>

            <h4
                style={{
                    margin: "5px 0",
                    color: "#0B2E4F"
                }}
            >
                AI Activity Report
            </h4>

            <p
                style={{
                    fontSize: "13px",
                    color: "#666",
                    lineHeight: "20px"
                }}
            >
                Export AI alerts, notifications and
                activity history.
            </p>

            <button
                style={{
                    marginTop: "10px",
                    padding: "10px 16px",
                    border: "none",
                    borderRadius: "8px",
                    background: "#7B61FF",
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: "bold"
                }}
                onClick={exportAIActivity}
            >
                Export AI Report
            </button>

        </div>

    </div>

</div>

<div
    style={{
        background: "#fff",
        margin: "20px",
        padding: "20px",
        borderRadius: "12px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
    }}
>
    <h3>Priority Distribution by Territory</h3>

    <ResponsiveContainer
        width="100%"
        height={350}
    >

        <BarChart data={priorityTerritoryChart}>

            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="territory" />

            <YAxis />

            <RechartsTooltip
    formatter={(value, name) => [
        value,
        `${name} Priority`
    ]}
/>

            <Legend />

            <Bar
                dataKey="High"
                stackId="priority"
                fill="#e53935"
            />

            <Bar
                dataKey="Medium"
                stackId="priority"
                fill="#fb8c00"
            />

            <Bar
                dataKey="Low"
                stackId="priority"
                fill="#43a047"
            />

        </BarChart>

    </ResponsiveContainer>

</div>

<div
    style={{
        background: "#fff",
        margin: "20px",
        padding: "20px",
        borderRadius: "12px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
    }}
>

    <h3>Top Performing Territories</h3>

    <table
        style={{
            width: "100%",
            borderCollapse: "collapse"
        }}
    >

        <thead>

            <tr
                style={{
                    background: "#f4f6f9"
                }}
            >

                <th style={{padding:"10px"}}>Rank</th>
                <th>Territory</th>
                <th>Revenue</th>
                <th>Accounts</th>
                <th>High Priority</th>

            </tr>

        </thead>

        <tbody>

            {territoryRanking.map(t => (

                <tr
                    key={t.territory}
                    style={{
                        borderBottom:"1px solid #eee"
                    }}
                >

                    <td style={{padding:"10px"}}>

                        {t.rank===1?"🥇":
                         t.rank===2?"🥈":
                         t.rank===3?"🥉":
                         `#${t.rank}`}

                    </td>

                    <td>{t.territory}</td>

                    <td>
                        ₹{t.revenue.toLocaleString("en-IN")}
                    </td>

                    <td>{t.accounts}</td>

                    <td>{t.high}</td>

                </tr>

            ))}

        </tbody>

    </table>

<div
    style={{
        background: "#fff",
        margin: "20px",
        padding: "20px",
        borderRadius: "12px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
    }}
>

    <h3>Sales Performance Trend</h3>

    <ResponsiveContainer
        width="100%"
        height={350}
    >

        <LineChart data={salesTrend}>

            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="month" />

            <YAxis
                tickFormatter={(value) =>
                    `₹${(value / 100000).toFixed(1)}L`
                }
            />

            <RechartsTooltip
                formatter={(value) => [
                    `₹${Number(value).toLocaleString("en-IN")}`,
                    "Revenue"
                ]}
            />

            <Legend />

            <Line
                type="monotone"
                dataKey="revenue"
                stroke="#0B2E4F"
                strokeWidth={3}
                dot={{ r: 5 }}
                activeDot={{ r: 7 }}
            />

        </LineChart>

    </ResponsiveContainer>

</div>
</div>

<div
    style={{
        margin: "20px",
        background: "#fff",
        padding: "20px",
        borderRadius: "12px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
    }}
>

    <h3>Business Insights</h3>

    <div
        style={{
            display: "grid",
            gridTemplateColumns: "repeat(2,1fr)",
            gap: "15px"
        }}
    >

        {businessInsights.map((item) => (

            <div
                key={item.title}
                style={{
                    background: "#f8f9fb",
                    padding: "15px",
                    borderRadius: "10px"
                }}
            >

                <div
                    style={{
                        fontSize: "12px",
                        color: "#777"
                    }}
                >
                    {item.title}
                </div>

                <div
                    style={{
                        fontSize: "20px",
                        fontWeight: "bold",
                        color: "#0B2E4F",
                        marginTop: "6px"
                    }}
                >
                    {item.value}
                </div>

            </div>

        ))}

    </div>

</div>

<div
    style={{
        margin: "20px",
        background: "#fff",
        borderRadius: "12px",
        padding: "20px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
    }}
>

<h3>AI Opportunity Score</h3>

<table
    style={{
        width: "100%",
        borderCollapse: "collapse"
    }}
>

<thead>

<tr
    style={{
        background: "#f4f6f9"
    }}
>

<th style={{padding:"10px"}}>Account</th>
<th>Priority</th>
<th>Revenue</th>
<th>Status</th>
<th>AI Score</th>

</tr>

</thead>

<tbody>

{aiOpportunities.map(record => (

<tr
    key={record.id}
    style={{
        borderBottom:"1px solid #eee"
    }}
>

<td style={{padding:"10px"}}>

<strong>{record.name}</strong>

</td>

<td>{record.priority}</td>

<td>

₹{Number(record.oppValue || 0).toLocaleString("en-IN")}

</td>

<td>

<span
style={{
    padding:"4px 8px",
    borderRadius:"5px",
    color:"#fff",
    background:
        record.validation==="Validated"
            ? "#2E8B57"
            : record.validation==="Pending"
            ? "#D98F00"
            : "#C1443C"
}}
>

{record.validation}

</span>

</td>

<td>

<div
style={{
    display:"flex",
    alignItems:"center",
    gap:"10px"
}}
>

<div
style={{
    width:"120px",
    height:"10px",
    background:"#eee",
    borderRadius:"20px"
}}
>

<div
style={{
    width:`${record.aiScore}%`,
    height:"100%",
    borderRadius:"20px",
    background:
        record.aiScore>=90
        ? "#2E8B57"
        : record.aiScore>=75
        ? "#D98F00"
        : "#C1443C"
}}
/>

</div>

<strong>{record.aiScore}</strong>

</div>

</td>

</tr>

))}

</tbody>

</table>

</div>

<div
style={{
    margin:0,
    background:"#fff",
    padding:"20px",
    borderRadius:"12px",
    boxShadow:"0 2px 8px rgba(0,0,0,0.08)"
}}
>

<h3>Smart AI Recommendations</h3>

{
aiRecommendations.length===0 ?

(

<div
style={{
    padding:"20px",
    textAlign:"center",
    color:"#2E8B57",
    fontWeight:"bold"
}}
>

🎉 Excellent!

No recommendations available.

All pending accounts have already been completed or validated.

</div>

)

:

(

<div
style={{
    display:"flex",
    flexDirection:"column",
    gap:"12px"
}}
>

{aiRecommendations.map(item=>(

<div
key={item.id}
style={{

    borderLeft:`6px solid ${recommendationColor[item.type]}`,
    background:"#f8f9fb",
    padding:"16px",
    borderRadius:"8px"

}}
>

<div
style={{
    display:"flex",
    justifyContent:"space-between",
    alignItems:"center"
}}
>

<div>

<div
style={{
    fontWeight:"bold",
    fontSize:"16px"
}}
>

{item.name}

</div>

<div
style={{
    fontSize:"13px",
    color:"#777"
}}
>

Priority :
<strong> {item.priority}</strong>

</div>

<div
style={{
    fontSize:"13px",
    color:"#777"
}}
>

Revenue :
<strong>

₹{Number(item.oppValue || 0).toLocaleString("en-IN")}

</strong>

</div>

</div>

<div
style={{
    background:"#0B2E4F",
    color:"#fff",
    padding:"6px 10px",
    borderRadius:"8px",
    fontWeight:"bold"
}}
>

AI Score {item.aiScore}

</div>

</div>

<div
style={{
    marginTop:"10px",
    color:"#555",
    lineHeight:"22px"
}}
>

{item.message}

</div>

</div>

))}

</div>

)

}

</div>

<div
style={{
    margin:0,
    background:"#fff",
    padding:"20px",
    borderRadius:"12px",
    boxShadow:"0 2px 8px rgba(0,0,0,.08)"
}}
>

<h3>AI Revenue Risk Analysis</h3>

<table
style={{
    width:"100%",
    borderCollapse:"collapse"
}}
>

<thead>

<tr style={{background:"#f4f6f9"}}>

<th style={{padding:"10px"}}>Account</th>

<th>Revenue</th>

<th>Validation</th>

<th>Risk</th>

</tr>

</thead>

<tbody>

{revenueRisk.map(record=>(

<tr key={record.id}>

<td style={{padding:"10px"}}>

<strong>{record.name}</strong>

</td>

<td>

₹{record.oppValue.toLocaleString("en-IN")}

</td>

<td>

{record.validation}

</td>

<td>

<div
style={{
display:"flex",
alignItems:"center",
gap:"10px"
}}
>

<div
style={{
width:"120px",
height:"10px",
background:"#eee",
borderRadius:"20px"
}}
>

<div
style={{
width:`${record.riskScore}%`,
height:"100%",
borderRadius:"20px",
background:
record.riskScore>=70
?"#e53935"
:record.riskScore>=40
?"#fb8c00"
:"#43a047"
}}
/>

</div>

<strong>

{record.riskScore}%

</strong>

</div>

</td>

</tr>

))}

</tbody>

</table>

</div>
<div
    style={{
        margin: "20px",
        background: "#fff",
        padding: "20px",
        borderRadius: "12px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
    }}
>

<h3>AI Sales Ranking</h3>

<table
    style={{
        width: "100%",
        borderCollapse: "collapse"
    }}
>

<thead>

<tr
style={{
background:"#f4f6f9"
}}
>

<th style={{padding:"10px"}}>Rank</th>
<th>Account</th>
<th>Priority</th>
<th>Revenue</th>
<th>AI Score</th>

</tr>

</thead>

<tbody>

{rankedAccounts.map(record=>(

<tr
key={record.id}
style={{
borderBottom:"1px solid #eee"
}}
>

<td
style={{
padding:"10px",
fontWeight:"bold",
fontSize:"18px"
}}
>

{getRankIcon(record.rank)}

</td>

<td>

<strong>{record.name}</strong>

</td>

<td>

<span
style={{
padding:"4px 8px",
borderRadius:"5px",
background:
record.priority==="High"
?"#e53935"
:record.priority==="Medium"
?"#fb8c00"
:"#43a047",
color:"#fff",
fontSize:"12px"
}}
>

{record.priority}

</span>

</td>

<td>

₹{record.oppValue.toLocaleString("en-IN")}

</td>

<td>

<div
style={{
display:"flex",
alignItems:"center",
gap:"10px"
}}
>

<div
style={{
width:"120px",
height:"10px",
background:"#eee",
borderRadius:"20px"
}}
>

<div
style={{
width:`${record.aiScore}%`,
height:"100%",
borderRadius:"20px",
background:
record.aiScore>=80
?"#2E8B57"
:record.aiScore>=60
?"#D98F00"
:"#C1443C"
}}
/>

</div>

<strong>

{record.aiScore}

</strong>

</div>

</td>

</tr>

))}

</tbody>

</table>

</div>

<div
    style={{
        margin:0,
        background:"#fff",
        padding:"20px",
        borderRadius:"12px",
        boxShadow:"0 2px 8px rgba(0,0,0,0.08)"
    }}
>

<h3>AI Territory Ranking</h3>

<table
    style={{
        width:"100%",
        borderCollapse:"collapse"
    }}
>

<thead>

<tr style={{background:"#f4f6f9"}}>

<th style={{padding:"10px"}}>Rank</th>
<th>Territory</th>
<th>Accounts</th>
<th>Revenue</th>
<th>Validation</th>
<th>AI Score</th>

</tr>

</thead>

<tbody>

{aiTerritories.map((t,index)=>(

<tr
key={t.territory}
style={{
borderBottom:"1px solid #eee"
}}
>

<td
style={{
fontSize:"24px",
textAlign:"center"
}}
>
{getTerritoryRank(index)}
</td>

<td>

<strong>{t.territory}</strong>

</td>

<td>

{t.totalAccounts}

</td>

<td>

₹{t.totalRevenue.toLocaleString("en-IN")}

</td>

<td>

{t.completed}/{t.totalAccounts}

</td>

<td>

<div
style={{
display:"flex",
alignItems:"center",
gap:"10px"
}}
>

<div
style={{
width:"120px",
height:"10px",
background:"#eee",
borderRadius:"20px"
}}
>

<div
style={{
width:`${t.aiScore}%`,
height:"100%",
borderRadius:"20px",
background:
t.aiScore>=80
? "#2E8B57"
: t.aiScore>=60
? "#D98F00"
: "#C1443C"
}}
/>

</div>

<strong>

{t.aiScore}

</strong>

</div>

</td>

</tr>

))}

</tbody>

</table>

</div>



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
    onClick={() => {
        console.log("🟢 GENERATE ROUTE BUTTON CLICKED");
        generateRoute();
    }}
>
    Generate Route
</button>

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
            onClick={() => setRoute(null)}
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
    style={{
        height: "100%",
        width: "100%",
        minHeight: "650px"
    }}
>
<TileLayer
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    attribution="&copy; OpenStreetMap contributors"
/>
<FitToRecords records={filteredMapRecords} />
          {showTerritories && (
            <LayerGroup>
              {TERRITORIES.map(t => (
                <Polygon key={t.id} positions={territoryRing(t.center, 0.25)} pathOptions={{ color: t.color, weight: 2, fillOpacity: 0.06, dashArray: '4 3' }}>
                  <Tooltip>{t.name} Territory</Tooltip>
                </Polygon>
              ))}
            </LayerGroup>
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
              <Polyline positions={route.map(s => [s.lat, s.lng])} pathOptions={{ color: '#D98F00', weight: 3, dashArray: '6 5' }} />
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
                {selected.id} · {TERRITORIES.find(t => t.id === selected.territory)?.name} Territory
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
                {selected.visitStatus === 'pending' && (
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    {geofenceOk === null && (
                      <button onClick={checkIn} style={{ padding: '8px', fontWeight: 700, border: '1px solid #ccc', borderRadius: '5px', background: '#fff', cursor: 'pointer' }}>
                        Check in (verify geofence)
                      </button>
                    )}
                    {geofenceOk === true && (
                      <>
                        <div style={{ color: '#2E8B57', fontWeight: 700 }}>✓ Within 150m geofence</div>
                        <button onClick={checkOut} style={{ padding: '8px', fontWeight: 700, border: 'none', borderRadius: '5px', background: '#0B2E4F', color: '#fff', cursor: 'pointer' }}>
                          Check out & complete visit
                        </button>
                      </>
                    )}
                    {geofenceOk === false && (
                      <>
                        <div style={{ color: '#C1443C', fontWeight: 700 }}>⚠ Outside geofence — move closer and retry</div>
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