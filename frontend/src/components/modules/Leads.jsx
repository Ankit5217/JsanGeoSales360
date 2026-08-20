import { useEffect, useState } from "react";
import { getAllLeads } from "../../services/salesforceApi";

export default function Leads() {

    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const cellStyle = {
        padding: "12px",
        borderBottom: "1px solid #eee",
        textAlign: "left",
        verticalAlign: "middle"
    };


    useEffect(() => {

        async function loadLeads() {

            console.log("=== LEADS: START API CALL ===");

            try {

                setLoading(true);
                setError("");

                const data = await getAllLeads();

                console.log("=== LEADS: API RESPONSE ===");
                console.log(data);

                if (!Array.isArray(data)) {

                    console.error(
                        "Leads API did not return an array:",
                        data
                    );

                    setLeads([]);

                    setError(
                        "Invalid lead data received."
                    );

                    return;
                }

                setLeads(data);

            } catch (err) {

                console.error(
                    "❌ Leads loading error:",
                    err
                );

                setError(
                    err.message ||
                    "Failed to load leads."
                );

            } finally {

                setLoading(false);

            }

        }

        loadLeads();

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

                <h2 style={{ color: "#0B2E4F" }}>
                    Leads
                </h2>

                <p>
                    Loading Salesforce leads...
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

                <h2 style={{ color: "#0B2E4F" }}>
                    Leads
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
                        Failed to load leads
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
                    Leads
                </h2>

                <p
                    style={{
                        marginTop: "6px",
                        color: "#666"
                    }}
                >
                    Salesforce sales leads
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
                    Total Leads
                </div>

                <div
                    style={{
                        fontSize: "28px",
                        fontWeight: "bold",
                        color: "#0B2E4F",
                        marginTop: "5px"
                    }}
                >
                    {leads.length}
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
                        minWidth: "900px"
                    }}
                >

                    <thead>

                        <tr
                            style={{
                                background: "#f4f6f9"
                            }}
                        >

                            <th style={cellStyle}>
                                Lead Name
                            </th>

                            <th style={cellStyle}>
                                Company
                            </th>

                            <th style={cellStyle}>
                                Sales Priority
                            </th>

                            <th style={cellStyle}>
                                GIS Validation
                            </th>

                            <th style={cellStyle}>
                                Latitude
                            </th>

                            <th style={cellStyle}>
                                Longitude
                            </th>

                            <th style={cellStyle}>
                                Salesforce ID
                            </th>

                        </tr>

                    </thead>


                    <tbody>

                        {leads.map(
                            (lead, index) => (

                                <tr
                                    key={
                                        lead.Id ||
                                        index
                                    }
                                >

                                    {/* NAME */}

                                    <td
                                        style={{
                                            ...cellStyle,
                                            fontWeight:
                                                "600",
                                            color:
                                                "#0B2E4F"
                                        }}
                                    >
                                        {lead.Name || "-"}
                                    </td>


                                    {/* COMPANY */}

                                    <td style={cellStyle}>
                                        {lead.Company || "-"}
                                    </td>


                                    {/* PRIORITY */}

                                    <td style={cellStyle}>

                                        <span
                                            style={{
                                                display:
                                                    "inline-block",

                                                padding:
                                                    "5px 10px",

                                                borderRadius:
                                                    "15px",

                                                fontSize:
                                                    "12px",

                                                fontWeight:
                                                    "bold",

                                                background:
                                                    lead.Sales_Priority__c ===
                                                    "High"
                                                        ? "#ffebee"
                                                        : lead.Sales_Priority__c ===
                                                          "Medium"
                                                        ? "#fff3e0"
                                                        : "#e8f5e9",

                                                color:
                                                    lead.Sales_Priority__c ===
                                                    "High"
                                                        ? "#c62828"
                                                        : lead.Sales_Priority__c ===
                                                          "Medium"
                                                        ? "#ef6c00"
                                                        : "#2e7d32"
                                            }}
                                        >
                                            {lead.Sales_Priority__c ||
                                                "Medium"}
                                        </span>

                                    </td>


                                    {/* GIS VALIDATION */}

                                    <td style={cellStyle}>

                                        <span
                                            style={{
                                                color:
                                                    lead.GIS_Validation_Status__c ===
                                                    "Validated"
                                                        ? "#2e7d32"
                                                        : "#ef6c00",

                                                fontWeight:
                                                    "600"
                                            }}
                                        >
                                            {lead.GIS_Validation_Status__c ||
                                                "-"}
                                        </span>

                                    </td>


                                    {/* LATITUDE */}

                                    <td style={cellStyle}>
                                        {lead.Location__Latitude__s ??
                                            "-"}
                                    </td>


                                    {/* LONGITUDE */}

                                    <td style={cellStyle}>
                                        {lead.Location__Longitude__s ??
                                            "-"}
                                    </td>


                                    {/* SALESFORCE ID */}

                                    <td
                                        style={{
                                            ...cellStyle,
                                            fontSize:
                                                "11px",
                                            color:
                                                "#666"
                                        }}
                                    >
                                        {lead.Id || "-"}
                                    </td>

                                </tr>

                            )
                        )}

                    </tbody>

                </table>


                {/* NO DATA */}

                {leads.length === 0 && (

                    <div
                        style={{
                            padding: "30px",
                            textAlign:
                                "center",
                            color: "#777"
                        }}
                    >
                        No Salesforce leads found.
                    </div>

                )}

            </div>

        </div>

    );

}