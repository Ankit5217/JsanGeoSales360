import { useEffect, useState } from "react";
import { getAccounts } from "../../services/salesforceApi";

export default function Accounts() {

    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    /*
     * Common table cell styling
     */
    const cellStyle = {
        padding: "12px",
        borderBottom: "1px solid #eee",
        textAlign: "left",
        verticalAlign: "middle"
    };

    /*
     * Load Accounts from Salesforce / FastAPI
     */
    useEffect(() => {

        async function loadAccounts() {

            console.log("=== ACCOUNTS: START API CALL ===");

            try {

                setLoading(true);
                setError("");

                const data = await getAccounts();

                console.log(
                    "=== ACCOUNTS: API RESPONSE ==="
                );

                console.log(data);

                /*
                 * Make sure we received an array
                 */
                if (!Array.isArray(data)) {

                    console.error(
                        "Accounts API did not return an array:",
                        data
                    );

                    setAccounts([]);
                    setError(
                        "Invalid account data received from server."
                    );

                    return;
                }

                /*
                 * Show the first record for debugging
                 */
                console.log(
                    "=== FIRST ACCOUNT ==="
                );

                console.log(data[0]);

                /*
                 * Show all available Salesforce fields
                 */
                if (data.length > 0) {

                    console.log(
                        "=== ACCOUNT FIELD NAMES ==="
                    );

                    console.log(
                        Object.keys(data[0])
                    );

                }

                setAccounts(data);

            } catch (err) {

                console.error(
                    "❌ Accounts loading error:",
                    err
                );

                setError(
                    err.message ||
                    "Failed to load accounts."
                );

                setAccounts([]);

            } finally {

                setLoading(false);

            }

        }

        loadAccounts();

    }, []);


    /*
     * Loading state
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
                    Accounts
                </h2>

                <p>
                    Loading Salesforce accounts...
                </p>

            </div>

        );

    }


    /*
     * Error state
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
                    Accounts
                </h2>

                <div
                    style={{
                        background: "#fff",
                        padding: "20px",
                        borderRadius: "10px",
                        borderLeft: "5px solid #e53935",
                        color: "#c62828"
                    }}
                >

                    <strong>
                        Failed to load accounts
                    </strong>

                    <p>
                        {error}
                    </p>

                </div>

            </div>

        );

    }


    /*
     * Main Accounts UI
     */
    return (

        <div
            style={{
                padding: "25px",
                background: "#f4f6f9",
                minHeight: "100vh"
            }}
        >

            {/* PAGE HEADER */}

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
                    Accounts
                </h2>

                <p
                    style={{
                        marginTop: "6px",
                        color: "#666"
                    }}
                >
                    Salesforce customer accounts
                </p>

            </div>


            {/* SUMMARY CARD */}

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
                    Total Accounts
                </div>

                <div
                    style={{
                        marginTop: "5px",
                        fontSize: "28px",
                        fontWeight: "bold",
                        color: "#0B2E4F"
                    }}
                >
                    {accounts.length}
                </div>

            </div>


            {/* ACCOUNTS TABLE */}

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
                        minWidth: "1100px"
                    }}
                >

                    <thead>

                        <tr
                            style={{
                                background: "#f4f6f9"
                            }}
                        >

                            <th style={cellStyle}>
                                Account Name
                            </th>

                            <th style={cellStyle}>
                                Territory
                            </th>

                            <th style={cellStyle}>
                                Priority
                            </th>

                            <th style={cellStyle}>
                                Revenue
                            </th>

                            <th style={cellStyle}>
                                GIS Validation
                            </th>

                            <th style={cellStyle}>
                                Owner
                            </th>

                            <th style={cellStyle}>
                                Last Visit
                            </th>

                            <th style={cellStyle}>
                                Next Visit
                            </th>

                            <th style={cellStyle}>
                                Salesforce ID
                            </th>

                        </tr>

                    </thead>


                    <tbody>

                        {accounts.map(
                            (account, index) => (

                                <tr
                                    key={
                                        account.Id ||
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
                                        {account.Name ||
                                            "-"}
                                    </td>


                                    {/* TERRITORY */}

                                    <td style={cellStyle}>
                                        {account.Territory_ID__c ||
                                            "Unassigned"}
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
                                                    account.Sales_Priority__c ===
                                                    "High"
                                                        ? "#ffebee"
                                                        : account.Sales_Priority__c ===
                                                          "Medium"
                                                        ? "#fff3e0"
                                                        : "#e8f5e9",
                                                color:
                                                    account.Sales_Priority__c ===
                                                    "High"
                                                        ? "#c62828"
                                                        : account.Sales_Priority__c ===
                                                          "Medium"
                                                        ? "#ef6c00"
                                                        : "#2e7d32"
                                            }}
                                        >
                                            {account.Sales_Priority__c ||
                                                "Medium"}
                                        </span>

                                    </td>


                                    {/* REVENUE */}

                                    <td style={cellStyle}>

                                        ₹
                                        {(
                                            account.AnnualRevenue ||
                                            0
                                        ).toLocaleString(
                                            "en-IN"
                                        )}

                                    </td>


                                    {/* GIS VALIDATION */}

                                    <td style={cellStyle}>

                                        <span
                                            style={{
                                                color:
                                                    account.GIS_Validation_Status__c ===
                                                    "Validated"
                                                        ? "#2e7d32"
                                                        : "#ef6c00",
                                                fontWeight:
                                                    "600"
                                            }}
                                        >
                                            {account.GIS_Validation_Status__c ||
                                                "-"}
                                        </span>

                                    </td>


                                    {/* OWNER */}

                                    <td style={cellStyle}>
                                        {account.Owner?.Name ||
                                            "Not Assigned"}
                                    </td>


                                    {/* LAST VISIT */}

                                    <td style={cellStyle}>
                                        {account.Last_Visit_Date__c ||
                                            "-"}
                                    </td>


                                    {/* NEXT VISIT */}

                                    <td style={cellStyle}>
                                        {account.Next_Visit_Date__c ||
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
                                        {account.Id ||
                                            "-"}
                                    </td>

                                </tr>

                            )
                        )}

                    </tbody>

                </table>


                {/* NO DATA */}

                {accounts.length === 0 && (

                    <div
                        style={{
                            padding: "30px",
                            textAlign: "center",
                            color: "#777"
                        }}
                    >
                        No Salesforce accounts found.
                    </div>

                )}

            </div>

        </div>

    );

}