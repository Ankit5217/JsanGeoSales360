// The "AI Executive Dashboard" analytics/chart section of the GIS Map
// view. Split out of mapview.jsx (Phase 9) - verbatim JSX move, no
// behavior change. Every value it uses is passed in as a prop with the
// same name it had as a local variable in mapview.jsx, so the JSX below
// is untouched from the original.

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
    RadialBar
} from "recharts";

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

export default function ExecutiveAnalyticsPanel({
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
    forecastGrowth,
    salesTrend,
    bestTerritory,
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
    executiveColor,
    aiActivityFeed,
    aiNotifications,
    notificationColors,
    unreadNotifications,
    liveAlerts,
    liveActivityFeed,
    generateExecutiveReport,
    exportAIActivity,
    exportBusinessData
}) {

    return (
        <>
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
        </>
    );
}
