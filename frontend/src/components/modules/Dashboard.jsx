import { useEffect, useState } from "react";
import { useUser } from "../../context/UserContext";
import {
    getAllAccounts,
    getAllLeads,
    getOpportunities,
    getDiscoveryCandidates,
    getAllTerritories,
    getRoutes,
    getFieldVisits
} from "../../services/salesforceApi";
import { VISIT_OUTCOMES } from "./FieldVisits";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Cell
} from "recharts";

// All picklist/status constants below are the real Salesforce values,
// already verified via describe elsewhere in the app (Leads.jsx,
// Opportunities.jsx, Routes.jsx, Territories.jsx, FieldVisits.jsx) -
// repeated here rather than imported so each module stays independent.

const PRIORITIES = ["High", "Medium", "Low"];
const PRIORITY_COLORS = { High: "#e53935", Medium: "#fb8c00", Low: "#43a047" };

const VALIDATION_STATUSES = ["Validated", "Pending", "Rejected"];
const VALIDATION_COLORS = { Validated: "#2e7d32", Pending: "#ef6c00", Rejected: "#c62828" };

const LEAD_STATUSES = [
    "Open - Not Contacted",
    "Working - Contacted",
    "Closed - Converted",
    "Closed - Not Converted"
];

const OPPORTUNITY_STAGES = [
    "Prospecting",
    "Qualification",
    "Needs Analysis",
    "Value Proposition",
    "Id. Decision Makers",
    "Perception Analysis",
    "Proposal/Price Quote",
    "Negotiation/Review",
    "Closed Won",
    "Closed Lost"
];

const ROUTE_STATUSES = ["Pending", "Approved", "Rejected"];
const ROUTE_STATUS_COLORS = { Pending: "#ef6c00", Approved: "#2e7d32", Rejected: "#c62828" };

const POSITIVE_VISIT_OUTCOMES = [
    "Successful Meeting",
    "Opportunity Created",
    "Lead Qualified",
    "Customer Interested"
];

function countByBucket(items, getValue, buckets) {
    const counts = Object.fromEntries(buckets.map(b => [b, 0]));

    items.forEach(item => {
        const value = getValue(item);
        if (value && counts[value] !== undefined) {
            counts[value] += 1;
        }
    });

    return buckets.map(bucket => ({ name: bucket, count: counts[bucket] }));
}

export default function Dashboard() {

    const { hasPermission } = useUser();

    const [loading, setLoading] = useState(true);
    const [accounts, setAccounts] = useState([]);
    const [leads, setLeads] = useState([]);
    const [opportunities, setOpportunities] = useState([]);
    const [discovery, setDiscovery] = useState([]);
    const [territories, setTerritories] = useState([]);
    const [routes, setRoutes] = useState([]);
    const [visits, setVisits] = useState([]);

    useEffect(() => {

        async function load() {

            try {

                const [
                    accountsData,
                    leadsData,
                    opportunitiesData,
                    discoveryData,
                    territoriesData,
                    routesData,
                    visitsData
                ] = await Promise.all([
                    hasPermission("accounts") ? getAllAccounts() : [],
                    hasPermission("leads") ? getAllLeads() : [],
                    hasPermission("opportunities") ? getOpportunities() : [],
                    hasPermission("discovery") ? getDiscoveryCandidates() : [],
                    hasPermission("territories") ? getAllTerritories() : [],
                    hasPermission("routes") ? getRoutes() : [],
                    hasPermission("fieldVisits") ? getFieldVisits() : []
                ]);

                setAccounts(accountsData);
                setLeads(leadsData);
                setOpportunities(opportunitiesData);
                setDiscovery(discoveryData);
                setTerritories(territoriesData);
                setRoutes(routesData);
                setVisits(visitsData);

            } catch (error) {

                console.error("Dashboard loading error:", error);

            } finally {

                setLoading(false);

            }

        }

        load();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (loading) {
        return (
            <div style={{ padding: "30px" }}>
                Loading dashboard...
            </div>
        );
    }

    const showAccounts = hasPermission("accounts");
    const showLeads = hasPermission("leads");
    const showOpportunities = hasPermission("opportunities");
    const showDiscovery = hasPermission("discovery");
    const showTerritories = hasPermission("territories");
    const showRoutes = hasPermission("routes");
    const showVisits = hasPermission("fieldVisits");

    // --- Accounts + Leads combined ---
    const priorityBreakdown = countByBucket(
        [...accounts, ...leads],
        r => r.Sales_Priority__c,
        PRIORITIES
    );

    const validationBreakdown = countByBucket(
        [...accounts, ...leads],
        r => r.GIS_Validation_Status__c,
        VALIDATION_STATUSES
    );

    const totalRevenue = accounts.reduce(
        (sum, a) => sum + (a.AnnualRevenue || 0),
        0
    );

    // --- Leads ---
    const leadStatusBreakdown = countByBucket(
        leads,
        l => l.Status,
        LEAD_STATUSES
    );

    // --- Opportunities ---
    const wonOpps = opportunities.filter(o => o.stage === "Closed Won");
    const lostOpps = opportunities.filter(o => o.stage === "Closed Lost");
    const openOpps = opportunities.filter(
        o => o.stage !== "Closed Won" && o.stage !== "Closed Lost"
    );

    const pipelineValue = openOpps.reduce((sum, o) => sum + (o.amount || 0), 0);
    const wonRevenue = wonOpps.reduce((sum, o) => sum + (o.amount || 0), 0);

    const winRate = (wonOpps.length + lostOpps.length) > 0
        ? Math.round((wonOpps.length / (wonOpps.length + lostOpps.length)) * 100)
        : null;

    const stageBreakdown = countByBucket(
        opportunities,
        o => o.stage,
        OPPORTUNITY_STAGES
    );

    // --- Discovery Candidates ---
    const approvedCandidates = discovery.filter(d => d.review_status === "Approved");
    const rejectedCandidates = discovery.filter(d => d.review_status === "Rejected");
    const convertedCandidates = discovery.filter(d => !!d.related_lead);

    const approvalRate = discovery.length
        ? Math.round((approvedCandidates.length / discovery.length) * 100)
        : null;

    const conversionRate = approvedCandidates.length
        ? Math.round((convertedCandidates.length / approvedCandidates.length) * 100)
        : null;

    // --- Territories ---
    const combinedTerritoryIds = [
        ...accounts.map(a => a.Territory_ID__c),
        ...leads.map(l => l.Territory_ID__c)
    ];

    const territoryRows = territories.map(t => {
        const code = (t.territory_code || "").toUpperCase();

        const assignedCount = combinedTerritoryIds.filter(
            id => id && id.toUpperCase() === code
        ).length;

        return { ...t, assignedCount };
    });

    const knownCodes = territories.map(t => (t.territory_code || "").toUpperCase());

    const unassignedCount = combinedTerritoryIds.filter(
        id => !id || !knownCodes.includes(id.toUpperCase())
    ).length;

    // --- Routes ---
    const routeStatusBreakdown = countByBucket(
        routes,
        r => r.status,
        ROUTE_STATUSES
    );

    const totalDistance = routes.reduce((sum, r) => sum + (r.distance || 0), 0);
    const totalEstTime = routes.reduce((sum, r) => sum + (r.estimated_time || 0), 0);

    // --- Field Visits ---
    // getFieldVisits() hits the GIS map endpoint, which returns raw
    // Salesforce field names (Visit_Outcome__c), not the snake_case
    // shape from the unused get_field_visits() service function.
    const visitsWithOutcome = visits.filter(v => v.Visit_Outcome__c);
    const successfulVisits = visits.filter(v => POSITIVE_VISIT_OUTCOMES.includes(v.Visit_Outcome__c));

    const visitSuccessRate = visitsWithOutcome.length
        ? Math.round((successfulVisits.length / visitsWithOutcome.length) * 100)
        : null;

    const today = new Date().toISOString().split("T")[0];
    const pendingFollowUps = visits.filter(v => v.Follow_up_Date__c && v.Follow_up_Date__c >= today).length;

    const outcomeBreakdown = countByBucket(
        visits,
        v => v.Visit_Outcome__c,
        VISIT_OUTCOMES
    ).filter(b => b.count > 0);

    return (
        <div style={{ padding: "25px", background: "#f4f6f9", minHeight: "100vh" }}>

            <h1 style={{ color: "#0B2E4F" }}>GeoSales Dashboard</h1>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "15px",
                    marginBottom: "25px"
                }}
            >
                {showAccounts && (
                    <DashboardCard title="Total Accounts" value={accounts.length} />
                )}
                {showAccounts && (
                    <DashboardCard title="Total Revenue" value={`₹${totalRevenue.toLocaleString("en-IN")}`} />
                )}
                {showLeads && (
                    <DashboardCard title="Total Leads" value={leads.length} />
                )}
                {showOpportunities && (
                    <DashboardCard title="Open Pipeline" value={`₹${pipelineValue.toLocaleString("en-IN")}`} />
                )}
                {showOpportunities && (
                    <DashboardCard title="Won Revenue" value={`₹${wonRevenue.toLocaleString("en-IN")}`} />
                )}
                {showDiscovery && (
                    <DashboardCard title="Discovery Candidates" value={discovery.length} />
                )}
                {showTerritories && (
                    <DashboardCard title="Territories" value={territories.length} />
                )}
                {showRoutes && (
                    <DashboardCard title="Routes Planned" value={routes.length} />
                )}
                {showVisits && (
                    <DashboardCard title="Field Visits" value={visits.length} />
                )}
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
                    gap: "18px"
                }}
            >

                {(showAccounts || showLeads) && (
                    <Panel title="Priority Breakdown (Accounts + Leads)">
                        <BreakdownBarChart data={priorityBreakdown} colors={PRIORITY_COLORS} />
                    </Panel>
                )}

                {(showAccounts || showLeads) && (
                    <Panel title="GIS Validation Status (Accounts + Leads)">
                        <BreakdownBarChart data={validationBreakdown} colors={VALIDATION_COLORS} />
                    </Panel>
                )}

                {showLeads && (
                    <Panel title="Lead Status">
                        <BreakdownBarChart data={leadStatusBreakdown} colors={{}} defaultColor="#1565c0" />
                    </Panel>
                )}

                {showOpportunities && (
                    <Panel title="Opportunity Pipeline by Stage">
                        <Stat label="Win Rate" value={winRate != null ? `${winRate}%` : "—"} />
                        <BreakdownBarChart data={stageBreakdown} colors={{}} defaultColor="#7B1FA2" />
                    </Panel>
                )}

                {showDiscovery && (
                    <Panel title="Discovery Funnel">
                        <div style={{ display: "flex", gap: "18px", marginBottom: "10px" }}>
                            <Stat label="Approval Rate" value={approvalRate != null ? `${approvalRate}%` : "—"} />
                            <Stat label="Conversion Rate" value={conversionRate != null ? `${conversionRate}%` : "—"} />
                        </div>
                        <BreakdownBarChart
                            data={[
                                { name: "Total", count: discovery.length },
                                { name: "Approved", count: approvedCandidates.length },
                                { name: "Rejected", count: rejectedCandidates.length },
                                { name: "Converted to Lead", count: convertedCandidates.length }
                            ]}
                            colors={{}}
                            defaultColor="#0E8388"
                        />
                    </Panel>
                )}

                {showRoutes && (
                    <Panel title="Route Plan Status">
                        <div style={{ display: "flex", gap: "18px", marginBottom: "10px" }}>
                            <Stat label="Total Distance" value={`${totalDistance.toFixed(1)} km`} />
                            <Stat label="Total Est. Time" value={`${totalEstTime.toFixed(0)} min`} />
                        </div>
                        <BreakdownBarChart data={routeStatusBreakdown} colors={ROUTE_STATUS_COLORS} />
                    </Panel>
                )}

                {showVisits && (
                    <Panel title="Field Visit Outcomes">
                        <div style={{ display: "flex", gap: "18px", marginBottom: "10px" }}>
                            <Stat label="Success Rate" value={visitSuccessRate != null ? `${visitSuccessRate}%` : "—"} />
                            <Stat label="Pending Follow-ups" value={pendingFollowUps} />
                        </div>
                        {outcomeBreakdown.length > 0
                            ? <BreakdownBarChart data={outcomeBreakdown} colors={{}} defaultColor="#D98F00" />
                            : <div style={{ fontSize: "12px", color: "#999" }}>No visit outcomes recorded yet.</div>
                        }
                    </Panel>
                )}

            </div>

            {showTerritories && (
                <div style={{ marginTop: "25px" }}>
                    <Panel title="Territory Coverage">
                        <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", minWidth: "560px", borderCollapse: "collapse", fontSize: "13px" }}>
                            <thead>
                                <tr style={{ textAlign: "left", borderBottom: "2px solid #e1e6eb" }}>
                                    <th style={{ padding: "8px" }}>Territory</th>
                                    <th style={{ padding: "8px" }}>Code</th>
                                    <th style={{ padding: "8px" }}>Status</th>
                                    <th style={{ padding: "8px" }}>Coverage %</th>
                                    <th style={{ padding: "8px" }}>Accounts + Leads</th>
                                </tr>
                            </thead>
                            <tbody>
                                {territoryRows.map(t => (
                                    <tr key={t.id} style={{ borderBottom: "1px solid #eee" }}>
                                        <td style={{ padding: "8px" }}>{t.territory_name || "—"}</td>
                                        <td style={{ padding: "8px" }}>{t.territory_code || "—"}</td>
                                        <td style={{ padding: "8px" }}>{t.status || "—"}</td>
                                        <td style={{ padding: "8px" }}>{t.coverage != null ? `${t.coverage}%` : "—"}</td>
                                        <td style={{ padding: "8px" }}>{t.assignedCount}</td>
                                    </tr>
                                ))}
                                <tr>
                                    <td style={{ padding: "8px", fontStyle: "italic", color: "#666" }} colSpan={4}>
                                        Unassigned
                                    </td>
                                    <td style={{ padding: "8px" }}>{unassignedCount}</td>
                                </tr>
                            </tbody>
                        </table>
                        </div>
                    </Panel>
                </div>
            )}

        </div>
    );

}

function DashboardCard({ title, value }) {
    return (
        <div
            style={{
                background: "#fff",
                borderRadius: "10px",
                padding: "20px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
            }}
        >
            <div style={{ fontSize: "13px", color: "#666" }}>{title}</div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#0B2E4F", marginTop: "8px" }}>
                {value}
            </div>
        </div>
    );
}

function Panel({ title, children }) {
    return (
        <div
            style={{
                background: "#fff",
                borderRadius: "10px",
                padding: "18px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
            }}
        >
            <div style={{ fontWeight: 700, color: "#0B2E4F", marginBottom: "12px" }}>{title}</div>
            {children}
        </div>
    );
}

function Stat({ label, value }) {
    return (
        <div style={{ marginBottom: "8px" }}>
            <div style={{ fontSize: "11px", color: "#666" }}>{label}</div>
            <div style={{ fontSize: "20px", fontWeight: "bold", color: "#0B2E4F" }}>{value}</div>
        </div>
    );
}

function BreakdownBarChart({ data, colors, defaultColor = "#0B2E4F" }) {
    return (
        <ResponsiveContainer width="100%" height={Math.max(160, data.length * 32)}>
            <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                <RechartsTooltip />
                <Bar dataKey="count">
                    {data.map((entry, index) => (
                        <Cell key={index} fill={colors[entry.name] || defaultColor} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}
