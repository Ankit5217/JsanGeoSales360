import { useEffect, useState } from "react";
import { getTerritories, createTerritory } from "../../services/salesforceApi";

const TERRITORY_STATUSES = ["Pending", "Approved", "Rejected"];

export default function Territories() {

    const [territories, setTerritories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [showForm, setShowForm] = useState(false);
    const [formValues, setFormValues] = useState({
        name: "",
        territoryName: "",
        territoryCode: "",
        coverage: "",
        status: TERRITORY_STATUSES[0]
    });
    const [formError, setFormError] = useState("");
    const [formSubmitting, setFormSubmitting] = useState(false);


    useEffect(() => {

        loadTerritories();

    }, []);

    async function loadTerritories() {

            console.log(
                "=== TERRITORIES: START API CALL ==="
            );

            try {

                setLoading(true);
                setError("");

                const data =
                    await getTerritories();

                console.log(
                    "=== TERRITORIES: API RESPONSE ==="
                );

                console.log(data);


                if (!Array.isArray(data)) {

                    console.error(
                        "Territories API did not return an array:",
                        data
                    );

                    setTerritories([]);

                    setError(
                        "Invalid territory data received."
                    );

                    return;

                }


                setTerritories(data);

            } catch (err) {

                console.error(
                    "❌ Territories loading error:",
                    err
                );

                setError(
                    err.message ||
                    "Failed to load territories."
                );

            } finally {

                setLoading(false);

            }

    }

    async function handleCreate(e) {

        e.preventDefault();

        if (!formValues.name.trim()) {
            setFormError("Name is required.");
            return;
        }

        setFormSubmitting(true);
        setFormError("");

        try {

            await createTerritory({
                Name: formValues.name.trim(),
                Territory_Name__c: formValues.territoryName.trim() || null,
                Territory_Code__c: formValues.territoryCode.trim() || null,
                Coverage_Percentage__c: formValues.coverage !== "" ? Number(formValues.coverage) : null,
                Status__c: formValues.status
            });

            setFormValues({
                name: "",
                territoryName: "",
                territoryCode: "",
                coverage: "",
                status: TERRITORY_STATUSES[0]
            });

            setShowForm(false);

            await loadTerritories();

        } catch (err) {

            setFormError(err.message || "Failed to create territory.");

        } finally {

            setFormSubmitting(false);

        }

    }


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
                    Territories
                </h2>

                <p>
                    Loading Salesforce territories...
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
                    Territories
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
                        Failed to load territories
                    </strong>

                    <p>
                        {error}
                    </p>

                </div>

            </div>

        );

    }


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
                    marginBottom: "20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start"
                }}
            >

                <div>

                    <h2
                        style={{
                            margin: 0,
                            color: "#0B2E4F"
                        }}
                    >
                        Territories
                    </h2>

                    <p
                        style={{
                            marginTop: "6px",
                            color: "#666"
                        }}
                    >
                        Salesforce territory assignments
                    </p>

                </div>

                <button
                    onClick={() => setShowForm(prev => !prev)}
                    style={{
                        padding: "10px 16px",
                        borderRadius: "8px",
                        border: "none",
                        background: "#0B2E4F",
                        color: "#fff",
                        fontWeight: "bold",
                        fontSize: "13px",
                        cursor: "pointer",
                        whiteSpace: "nowrap"
                    }}
                >
                    {showForm ? "Cancel" : "+ Log New Territory"}
                </button>

            </div>

            {showForm && (

                <form
                    onSubmit={handleCreate}
                    style={{
                        background: "#fff",
                        borderRadius: "10px",
                        padding: "20px",
                        marginBottom: "20px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                        gap: "14px"
                    }}
                >

                    <div>
                        <label style={fieldLabelStyle}>Assignment Name *</label>
                        <input
                            type="text"
                            value={formValues.name}
                            onChange={e => setFormValues(prev => ({ ...prev, name: e.target.value }))}
                            required
                            style={fieldInputStyle}
                        />
                    </div>

                    <div>
                        <label style={fieldLabelStyle}>Territory Name</label>
                        <input
                            type="text"
                            value={formValues.territoryName}
                            onChange={e => setFormValues(prev => ({ ...prev, territoryName: e.target.value }))}
                            style={fieldInputStyle}
                        />
                    </div>

                    <div>
                        <label style={fieldLabelStyle}>Territory Code</label>
                        <input
                            type="text"
                            value={formValues.territoryCode}
                            onChange={e => setFormValues(prev => ({ ...prev, territoryCode: e.target.value }))}
                            style={fieldInputStyle}
                        />
                    </div>

                    <div>
                        <label style={fieldLabelStyle}>Coverage %</label>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            value={formValues.coverage}
                            onChange={e => setFormValues(prev => ({ ...prev, coverage: e.target.value }))}
                            style={fieldInputStyle}
                        />
                    </div>

                    <div>
                        <label style={fieldLabelStyle}>Status</label>
                        <select
                            value={formValues.status}
                            onChange={e => setFormValues(prev => ({ ...prev, status: e.target.value }))}
                            style={fieldInputStyle}
                        >
                            {TERRITORY_STATUSES.map(status => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: "flex", alignItems: "flex-end" }}>
                        <button
                            type="submit"
                            disabled={formSubmitting}
                            style={{
                                padding: "10px 16px",
                                borderRadius: "8px",
                                border: "none",
                                background: formSubmitting ? "#9aa8b5" : "#2e7d32",
                                color: "#fff",
                                fontWeight: "bold",
                                fontSize: "13px",
                                cursor: formSubmitting ? "default" : "pointer",
                                width: "100%"
                            }}
                        >
                            {formSubmitting ? "Saving..." : "Save"}
                        </button>
                    </div>

                    {formError && (
                        <div style={{ gridColumn: "1 / -1", color: "#c62828", fontSize: "13px" }}>
                            {formError}
                        </div>
                    )}

                </form>

            )}


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
                    Total Territories
                </div>

                <div
                    style={{
                        fontSize: "28px",
                        fontWeight: "bold",
                        color: "#0B2E4F",
                        marginTop: "5px"
                    }}
                >
                    {territories.length}
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

                            <th
                                style={{
                                    padding: "12px",
                                    textAlign: "left"
                                }}
                            >
                                Territory Name
                            </th>

                            <th
                                style={{
                                    padding: "12px",
                                    textAlign: "left"
                                }}
                            >
                                Territory Code
                            </th>

                            <th
                                style={{
                                    padding: "12px",
                                    textAlign: "left"
                                }}
                            >
                                Assignment
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
                                Coverage
                            </th>

                            <th
                                style={{
                                    padding: "12px",
                                    textAlign: "left"
                                }}
                            >
                                Manager
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

                        {territories.map(
                            (territory, index) => {

                                const manager =
                                    territory.Territory_Manager__r
                                        ?.Name ||
                                    "-";


                                return (

                                    <tr
                                        key={
                                            territory.Id ||
                                            index
                                        }
                                        style={{
                                            borderBottom:
                                                "1px solid #eee"
                                        }}
                                    >

                                        {/* TERRITORY NAME */}

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
                                                territory.Territory_Name__c ||
                                                "-"
                                            }
                                        </td>


                                        {/* TERRITORY CODE */}

                                        <td
                                            style={{
                                                padding: "12px"
                                            }}
                                        >
                                            {
                                                territory.Territory_Code__c ||
                                                "-"
                                            }
                                        </td>


                                        {/* ASSIGNMENT NAME */}

                                        <td
                                            style={{
                                                padding: "12px"
                                            }}
                                        >
                                            {
                                                territory.Name ||
                                                "-"
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
                                                        territory.Status__c ===
                                                        "Approved"
                                                            ? "#e8f5e9"
                                                            : "#fff3e0",
                                                    color:
                                                        territory.Status__c ===
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
                                                    territory.Status__c ||
                                                    "-"
                                                }

                                            </span>

                                        </td>


                                        {/* COVERAGE */}

                                        <td
                                            style={{
                                                padding: "12px"
                                            }}
                                        >

                                            <div
                                                style={{
                                                    display:
                                                        "flex",
                                                    alignItems:
                                                        "center",
                                                    gap:
                                                        "10px"
                                                }}
                                            >

                                                <div
                                                    style={{
                                                        width:
                                                            "100px",
                                                        height:
                                                            "8px",
                                                        background:
                                                            "#e0e0e0",
                                                        borderRadius:
                                                            "10px",
                                                        overflow:
                                                            "hidden"
                                                    }}
                                                >

                                                    <div
                                                        style={{
                                                            width:
                                                                `${Math.min(
                                                                    Math.max(
                                                                        Number(
                                                                            territory.Coverage_Percentage__c ||
                                                                            0
                                                                        ),
                                                                        0
                                                                    ),
                                                                    100
                                                                )}%`,
                                                            height:
                                                                "100%",
                                                            background:
                                                                "#0888ff"
                                                        }}
                                                    />

                                                </div>


                                                <span
                                                    style={{
                                                        fontSize:
                                                            "13px",
                                                        fontWeight:
                                                            "bold"
                                                    }}
                                                >
                                                    {
                                                        territory.Coverage_Percentage__c ??
                                                        0
                                                    }%
                                                </span>

                                            </div>

                                        </td>


                                        {/* MANAGER */}

                                        <td
                                            style={{
                                                padding: "12px"
                                            }}
                                        >
                                            {manager}
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
                                                territory.Id ||
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

                {territories.length === 0 && (

                    <div
                        style={{
                            padding: "30px",
                            textAlign:
                                "center",
                            color: "#777"
                        }}
                    >
                        No Salesforce territories found.
                    </div>

                )}

            </div>

        </div>

    );

}


const fieldLabelStyle = {
    display: "block",
    fontSize: "12px",
    fontWeight: "bold",
    color: "#666",
    marginBottom: "4px"
};

const fieldInputStyle = {
    width: "100%",
    padding: "8px 10px",
    borderRadius: "6px",
    border: "1px solid #ddd",
    fontSize: "13px",
    boxSizing: "border-box"
};