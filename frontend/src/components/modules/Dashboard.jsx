import { useEffect, useState } from "react";
import { getAccounts } from "../../services/salesforceApi";

export default function Dashboard() {

    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {

        async function loadAccounts() {

            try {

                const accounts = await getAccounts();

                console.log(
                    "Dashboard Accounts:",
                    accounts
                );

                const formattedAccounts = accounts
                    .map(account => ({

                        id: account.Id,

                        name: account.Name,

                        priority:
                            account.Sales_Priority__c ||
                            "Medium",

                        revenue:
                            account.AnnualRevenue ||
                            0,

                        validation:
                            account.GIS_Validation_Status__c ||
                            "Validated",

                        territory:
                            account.Territory_ID__c ||
                            "Unassigned"

                    }))
                    .filter(account =>
                        account.id
                    );

                setRecords(formattedAccounts);

            } catch (error) {

                console.error(
                    "Dashboard account loading error:",
                    error
                );

            } finally {

                setLoading(false);

            }

        }

        loadAccounts();

    }, []);

    if (loading) {

        return (
            <div style={{ padding: "30px" }}>
                Loading dashboard...
            </div>
        );

    }

    const totalAccounts =
        records.length;

    const highPriority =
        records.filter(
            r => r.priority === "High"
        ).length;

    const mediumPriority =
        records.filter(
            r => r.priority === "Medium"
        ).length;

    const lowPriority =
        records.filter(
            r => r.priority === "Low"
        ).length;

    const pendingVisits =
        records.filter(
            r => r.validation === "Pending"
        ).length;

    const completedVisits =
        records.filter(
            r => r.validation === "Validated"
        ).length;

    const totalRevenue =
        records.reduce(
            (sum, r) =>
                sum + (r.revenue || 0),
            0
        );

    return (

        <div
            style={{
                padding: "25px",
                background: "#f4f6f9",
                minHeight: "100vh"
            }}
        >

            <h1
                style={{
                    color: "#0B2E4F"
                }}
            >
                GeoSales Dashboard
            </h1>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns:
                        "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "15px"
                }}
            >

                <DashboardCard
                    title="Total Accounts"
                    value={totalAccounts}
                />

                <DashboardCard
                    title="High Priority"
                    value={highPriority}
                />

                <DashboardCard
                    title="Medium Priority"
                    value={mediumPriority}
                />

                <DashboardCard
                    title="Low Priority"
                    value={lowPriority}
                />

                <DashboardCard
                    title="Pending Visits"
                    value={pendingVisits}
                />

                <DashboardCard
                    title="Completed Visits"
                    value={completedVisits}
                />

                <DashboardCard
                    title="Total Revenue"
                    value={`₹${totalRevenue.toLocaleString("en-IN")}`}
                />

            </div>

        </div>

    );

}


function DashboardCard({
    title,
    value
}) {

    return (

        <div
            style={{
                background: "#fff",
                borderRadius: "10px",
                padding: "20px",
                boxShadow:
                    "0 2px 8px rgba(0,0,0,0.08)"
            }}
        >

            <div
                style={{
                    fontSize: "13px",
                    color: "#666"
                }}
            >
                {title}
            </div>

            <div
                style={{
                    fontSize: "28px",
                    fontWeight: "bold",
                    color: "#0B2E4F",
                    marginTop: "8px"
                }}
            >
                {value}
            </div>

        </div>

    );

}
