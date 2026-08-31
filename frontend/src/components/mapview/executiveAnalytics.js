// Pure derived-analytics computation for the GIS Map view's embedded
// "AI Executive Dashboard" section. Split out of mapview.jsx (Phase 9).
//
// NOTE: dashboardStats/territoryStats/aiOpportunities/etc. are derived
// from Accounts (records) only - they do not fold in Leads. That's a
// pre-existing scope limitation, not something this file changes.
// salesTrend is the exception: it's computed from real Opportunities
// (passed in separately) since Accounts have no historical revenue data.

import { calculateAIScore, calculateRevenueRisk, calculateTerritoryScore } from "./mapviewUtils.js";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Real revenue-over-time trend from Closed Won Opportunities' CloseDate,
// for the trailing 12 calendar months ending this month. Replaces what
// used to be a hardcoded, always-identical fake dataset.
function computeSalesTrend(opportunities, now) {

    const months = [];

    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
            key: `${d.getFullYear()}-${d.getMonth()}`,
            month: MONTH_LABELS[d.getMonth()],
            revenue: 0
        });
    }

    const byKey = new Map(months.map(m => [m.key, m]));

    opportunities
        .filter(o => o.stage === "Closed Won" && o.close_date)
        .forEach(o => {
            const closeDate = new Date(o.close_date);
            const key = `${closeDate.getFullYear()}-${closeDate.getMonth()}`;
            const bucket = byKey.get(key);
            if (bucket) {
                bucket.revenue += o.amount || 0;
            }
        });

    return months.map(({ month, revenue }) => ({ month, revenue }));
}

export function computeExecutiveAnalytics(records, territoryOptions, opportunities = []) {

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


  const salesTrend = computeSalesTrend(opportunities, new Date());

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

return {
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
};

}
