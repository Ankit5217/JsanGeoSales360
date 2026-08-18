import { useEffect, useState } from "react";
import { getFieldVisits } from "../../services/salesforceApi";

export default function FieldVisits() {

    const [fieldVisits, setFieldVisits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");


    useEffect(() => {

        async function loadFieldVisits() {

            console.log(
                "=== FIELD VISITS: START API CALL ==="
            );

            try {

                setLoading(true);
                setError("");

                const data =
                    await getFieldVisits();

                console.log(
                    "=== FIELD VISITS: API RESPONSE ==="
                );

                console.log(data);


                if (!Array.isArray(data)) {

                    console.error(
                        "Field Visits API did not return an array:",
                        data
                    );

                    setFieldVisits([]);

                    setError(
                        "Invalid field visit data received."
                    );

                    return;

                }


                setFieldVisits(data);

            } catch (err) {

                console.error(
                    "❌ Field Visits loading error:",
                    err
                );

                setError(
                    err.message ||
                    "Failed to load field visits."
                );

            } finally {

                setLoading(false);

            }

        }


        loadFieldVisits();

    }, []);


    /*
     * LOADING
     */
function formatVisitDate(dateValue) {

    if (!dateValue) {
        return "-";
    }

    const date = new Date(dateValue);

    if (isNaN(date.getTime())) {
        return dateValue;
    }

    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    });

}
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
                    Field Visits
                </h2>

                <p>
                    Loading Salesforce field visits...
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
                    Field Visits
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
                        Failed to load field visits
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
                    Field Visits
                </h2>

                <p
                    style={{
                        marginTop: "6px",
                        color: "#666"
                    }}
                >
                    Salesforce field visit records
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
                    Total Field Visits
                </div>

                <div
                    style={{
                        fontSize: "28px",
                        fontWeight: "bold",
                        color: "#0B2E4F",
                        marginTop: "5px"
                    }}
                >
                    {fieldVisits.length}
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
                                Visit Name
                            </th>


                            <th
                                style={{
                                    padding: "12px",
                                    textAlign: "left"
                                }}
                            >
                                Visit Date
                            </th>


                            <th
                                style={{
                                    padding: "12px",
                                    textAlign: "left"
                                }}
                            >
                                Account
                            </th>


                            <th
                                style={{
                                    padding: "12px",
                                    textAlign: "left"
                                }}
                            >
                                Representative
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

                        {fieldVisits.map(
                            (visit, index) => {

                                return (

                                    <tr
                                        key={
                                            visit.Id ||
                                            visit.id ||
                                            index
                                        }
                                        style={{
                                            borderBottom:
                                                "1px solid #eee"
                                        }}
                                    >

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
                                                visit.Name ||
                                                visit.name ||
                                                "-"
                                            }

                                        </td>


                                        <td
                                            style={{
                                                padding: "12px"
                                            }}
                                        >

                                            {
                                                formatVisitDate(
                                                visit.Visit_Date__c ||
                                                visit.Field_Visit_Date__c ||
                                                visit.VisitDate ||
                                                visit.visitDate
                                                )
                                            }

                                        </td>


                                        <td
                                            style={{
                                                padding: "12px"
                                            }}
                                        >

                                            {
                                                visit.Account__r?.Name ||
                                                visit.Account__c ||
                                                visit.Account ||
                                                "-"
                                            }

                                        </td>


                                        <td
                                            style={{
                                                padding: "12px"
                                            }}
                                        >

                                            {
                                                visit.Sales_Representative__r?.Name ||
                                                visit.Field_Sales_Representative__r?.Name ||
                                                visit.Representative__r?.Name ||
                                                "-"
                                            }

                                        </td>


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
                                                        "#e8f5e9",
                                                    color:
                                                        "#2e7d32",
                                                    fontSize:
                                                        "12px",
                                                    fontWeight:
                                                        "bold"
                                                }}
                                            >

                                                {
                                                    visit.Status__c ||
                                                    visit.Status ||
                                                    visit.status ||
                                                    "Active"
                                                }

                                            </span>

                                        </td>


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
                                                visit.Id ||
                                                visit.id ||
                                                "-"
                                            }

                                        </td>

                                    </tr>

                                );

                            }

                        )}

                    </tbody>

                </table>


                {fieldVisits.length === 0 && (

                    <div
                        style={{
                            padding: "30px",
                            textAlign:
                                "center",
                            color: "#777"
                        }}
                    >

                        No Salesforce field visits found.

                    </div>

                )}

            </div>

        </div>

    );

}