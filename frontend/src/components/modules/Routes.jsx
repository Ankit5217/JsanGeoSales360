import { useEffect, useState } from "react";
import { getRoutes } from "../../services/salesforceApi";

export default function Routes() {

    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");


    useEffect(() => {

        async function loadRoutes() {

            console.log(
                "=== ROUTES: START API CALL ==="
            );

            try {

                setLoading(true);
                setError("");

                const data = await getRoutes();

                console.log(
                    "=== ROUTES: API RESPONSE ==="
                );

                console.log(data);


                if (!Array.isArray(data)) {

                    console.error(
                        "Routes API did not return an array:",
                        data
                    );

                    setRoutes([]);

                    setError(
                        "Invalid route data received."
                    );

                    return;

                }


                setRoutes(data);

            } catch (err) {

                console.error(
                    "❌ Routes loading error:",
                    err
                );

                setError(
                    err.message ||
                    "Failed to load routes."
                );

            } finally {

                setLoading(false);

            }

        }


        loadRoutes();

    }, []);


    /*
     * LOADING
     */

    if (loading) {

        return (

            <div
                style={{
                    padding: "30px",
                    background: "#f4f6f9",
                    minHeight: "100vh"
                }}
            >

                <h2
                    style={{
                        color: "#0B2E4F"
                    }}
                >
                    Routes
                </h2>

                <p>
                    Loading Salesforce routes...
                </p>

            </div>

        );

    }


    /*
     * ERROR
     */

    if (error) {

        return (

            <div
                style={{
                    padding: "30px",
                    background: "#f4f6f9",
                    minHeight: "100vh"
                }}
            >

                <h2
                    style={{
                        color: "#0B2E4F"
                    }}
                >
                    Routes
                </h2>


                <div
                    style={{
                        background: "#fff",
                        padding: "20px",
                        borderRadius: "10px",
                        color: "#c62828",
                        borderLeft:
                            "5px solid #e53935"
                    }}
                >

                    <strong>
                        Failed to load routes
                    </strong>

                    <p>
                        {error}
                    </p>

                </div>

            </div>

        );

    }


    /*
     * MAIN UI
     */

    return (

        <div
            style={{
                padding: "25px",
                background: "#f4f6f9",
                minHeight: "100vh"
            }}
        >

            {/* HEADER */}

            <div
                style={{
                    marginBottom: "20px"
                }}
            >

                <h2
                    style={{
                        margin: 0,
                        color: "#0B2E4F"
                    }}
                >
                    Routes
                </h2>

                <p
                    style={{
                        marginTop: "6px",
                        color: "#666"
                    }}
                >
                    Salesforce route plans
                </p>

            </div>


            {/* SUMMARY */}

            <div
                style={{
                    background: "#fff",
                    borderRadius: "10px",
                    padding: "20px",
                    marginBottom: "20px",
                    boxShadow:
                        "0 2px 8px rgba(0,0,0,0.08)"
                }}
            >

                <div
                    style={{
                        color: "#666",
                        fontSize: "13px"
                    }}
                >
                    Total Routes
                </div>

                <div
                    style={{
                        fontSize: "28px",
                        fontWeight: "bold",
                        color: "#0B2E4F",
                        marginTop: "5px"
                    }}
                >
                    {routes.length}
                </div>

            </div>


            {/* TABLE */}

            <div
                style={{
                    background: "#fff",
                    borderRadius: "10px",
                    padding: "20px",
                    boxShadow:
                        "0 2px 8px rgba(0,0,0,0.08)",
                    overflowX: "auto"
                }}
            >

                <table
                    style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        minWidth: "950px"
                    }}
                >

                    <thead>

                        <tr
                            style={{
                                background: "#f4f6f9"
                            }}
                        >

                            <th
                                style={{
                                    padding: "12px",
                                    textAlign: "left"
                                }}
                            >
                                Route Name
                            </th>


                            <th
                                style={{
                                    padding: "12px",
                                    textAlign: "left"
                                }}
                            >
                                Route Date
                            </th>


                            <th
                                style={{
                                    padding: "12px",
                                    textAlign: "left"
                                }}
                            >
                                Territory
                            </th>


                            <th
                                style={{
                                    padding: "12px",
                                    textAlign: "left"
                                }}
                            >
                                Sales Representative
                            </th>


                            <th
                                style={{
                                    padding: "12px",
                                    textAlign: "left"
                                }}
                            >
                                Status
                            </th>


                            <th
                                style={{
                                    padding: "12px",
                                    textAlign: "left"
                                }}
                            >
                                Salesforce ID
                            </th>

                        </tr>

                    </thead>


                    <tbody>

                        {routes.map(
                            (route, index) => {

                                const territory =
                                    route.Territory__r
                                        ?.Name ||
                                    "-";


                                const salesRepresentative =
                                    route.Sales_Representative__r
                                        ?.Name ||
                                    "-";


                                return (

                                    <tr
                                        key={
                                            route.Id ||
                                            index
                                        }
                                        style={{
                                            borderBottom:
                                                "1px solid #eee"
                                        }}
                                    >

                                        {/* ROUTE NAME */}

                                        <td
                                            style={{
                                                padding: "12px",
                                                fontWeight:
                                                    "600",
                                                color:
                                                    "#0B2E4F"
                                            }}
                                        >

                                            {
                                                route.Name ||
                                                "-"
                                            }

                                        </td>


                                        {/* ROUTE DATE */}

                                        <td
                                            style={{
                                                padding: "12px"
                                            }}
                                        >

                                            {
                                                route.Route_Date__c ||
                                                "-"
                                            }

                                        </td>


                                        {/* TERRITORY */}

                                        <td
                                            style={{
                                                padding: "12px"
                                            }}
                                        >

                                            {
                                                territory
                                            }

                                        </td>


                                        {/* SALES REPRESENTATIVE */}

                                        <td
                                            style={{
                                                padding: "12px"
                                            }}
                                        >

                                            {
                                                salesRepresentative
                                            }

                                        </td>


                                        {/* STATUS */}

                                        <td
                                            style={{
                                                padding: "12px"
                                            }}
                                        >

                                            <span
                                                style={{
                                                    padding:
                                                        "5px 10px",
                                                    borderRadius:
                                                        "15px",
                                                    background:
                                                        route.Status__c ===
                                                        "Approved"
                                                            ? "#e8f5e9"
                                                            : "#fff3e0",
                                                    color:
                                                        route.Status__c ===
                                                        "Approved"
                                                            ? "#2e7d32"
                                                            : "#ef6c00",
                                                    fontSize:
                                                        "12px",
                                                    fontWeight:
                                                        "bold"
                                                }}
                                            >

                                                {
                                                    route.Status__c ||
                                                    "-"
                                                }

                                            </span>

                                        </td>


                                        {/* SALESFORCE ID */}

                                        <td
                                            style={{
                                                padding: "12px",
                                                fontSize:
                                                    "11px",
                                                color:
                                                    "#666"
                                            }}
                                        >

                                            {
                                                route.Id ||
                                                "-"
                                            }

                                        </td>

                                    </tr>

                                );

                            }

                        )}

                    </tbody>

                </table>


                {/* NO DATA */}

                {routes.length === 0 && (

                    <div
                        style={{
                            padding: "30px",
                            textAlign:
                                "center",
                            color: "#777"
                        }}
                    >

                        No Salesforce routes found.

                    </div>

                )}

            </div>

        </div>

    );

}