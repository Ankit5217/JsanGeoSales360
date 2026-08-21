import { useEffect, useState } from "react";
import { getFieldVisits, createFieldVisit, updateFieldVisit } from "../../services/salesforceApi";

export const VISIT_OUTCOMES = [
    "Successful Meeting",
    "Customer Interested",
    "Follow-up Required",
    "Opportunity Created",
    "Lead Qualified",
    "Lead Rejected",
    "Customer Not Available",
    "Visit Rescheduled",
    "Incorrect Location",
    "Duplicate Business",
    "Closed Permanently",
    "No Response"
];

const OUTCOME_COLORS = {
    "Successful Meeting": { bg: "#e8f5e9", color: "#2e7d32" },
    "Opportunity Created": { bg: "#e8f5e9", color: "#2e7d32" },
    "Lead Qualified": { bg: "#e8f5e9", color: "#2e7d32" },
    "Customer Interested": { bg: "#e3f2fd", color: "#1565c0" },
    "Follow-up Required": { bg: "#fff3e0", color: "#ef6c00" },
    "Visit Rescheduled": { bg: "#fff3e0", color: "#ef6c00" },
    "Lead Rejected": { bg: "#fdecea", color: "#c62828" },
    "Closed Permanently": { bg: "#fdecea", color: "#c62828" },
    "Duplicate Business": { bg: "#fdecea", color: "#c62828" },
    "Incorrect Location": { bg: "#fdecea", color: "#c62828" }
};

function OutcomeBadge({ outcome }) {

    if (!outcome) {
        return <span style={{ color: "#999", fontSize: "12px" }}>-</span>;
    }

    const colors = OUTCOME_COLORS[outcome] || { bg: "#f0f0f0", color: "#555" };

    return (
        <span
            style={{
                padding: "5px 10px",
                borderRadius: "15px",
                background: colors.bg,
                color: colors.color,
                fontSize: "12px",
                fontWeight: "bold",
                whiteSpace: "nowrap"
            }}
        >
            {outcome}
        </span>
    );

}

export default function FieldVisits() {

    const [fieldVisits, setFieldVisits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [showForm, setShowForm] = useState(false);
    const [editingVisitId, setEditingVisitId] = useState(null);
    const [formValues, setFormValues] = useState({
        name: "",
        visitDate: "",
        outcome: VISIT_OUTCOMES[0],
        notes: "",
        followUp: ""
    });
    const [formError, setFormError] = useState("");
    const [formSubmitting, setFormSubmitting] = useState(false);


    useEffect(() => {

        loadFieldVisits();

    }, []);

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

    // Visit_Date__c comes back as a full ISO datetime; a datetime-local
    // input needs "YYYY-MM-DDTHH:mm" with no timezone suffix.
    function toDatetimeLocalValue(isoString) {

        if (!isoString) {
            return "";
        }

        const date = new Date(isoString);

        if (isNaN(date.getTime())) {
            return "";
        }

        const pad = n => String(n).padStart(2, "0");

        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

    }

    function resetForm() {

        setFormValues({
            name: "",
            visitDate: "",
            outcome: VISIT_OUTCOMES[0],
            notes: "",
            followUp: ""
        });

        setEditingVisitId(null);

    }

    function handleToggleCreate() {

        if (showForm) {
            handleCancelForm();
            return;
        }

        resetForm();
        setFormError("");
        setShowForm(true);

    }

    function handleStartEdit(visit) {

        setEditingVisitId(visit.Id);

        setFormValues({
            name: visit.Name || "",
            visitDate: toDatetimeLocalValue(visit.Visit_Date__c),
            outcome: visit.Visit_Outcome__c || VISIT_OUTCOMES[0],
            notes: visit.Notes__c || "",
            followUp: visit.Follow_up_Date__c || ""
        });

        setFormError("");
        setShowForm(true);

    }

    function handleCancelForm() {

        resetForm();
        setFormError("");
        setShowForm(false);

    }

    async function handleSubmit(e) {

        e.preventDefault();

        if (!formValues.name.trim()) {
            setFormError("Name is required.");
            return;
        }

        setFormSubmitting(true);
        setFormError("");

        try {

            const payload = {
                Name: formValues.name.trim(),
                Visit_Date__c: formValues.visitDate || null,
                Visit_Outcome__c: formValues.outcome,
                Notes__c: formValues.notes.trim() || null,
                Follow_up_Date__c: formValues.followUp || null
            };

            if (editingVisitId) {
                await updateFieldVisit(editingVisitId, payload);
            } else {
                await createFieldVisit(payload);
            }

            resetForm();

            setShowForm(false);

            await loadFieldVisits();

        } catch (err) {

            setFormError(
                err.message ||
                (editingVisitId ? "Failed to update field visit." : "Failed to create field visit.")
            );

        } finally {

            setFormSubmitting(false);

        }

    }


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

                <button
                    onClick={handleToggleCreate}
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
                    {showForm && !editingVisitId ? "Cancel" : "+ Log New Field Visit"}
                </button>

            </div>

            {showForm && (

                <form
                    onSubmit={handleSubmit}
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

                    {editingVisitId && (
                        <div style={{ gridColumn: "1 / -1", fontSize: "13px", fontWeight: "bold", color: "#0B2E4F" }}>
                            Editing: {formValues.name}
                        </div>
                    )}

                    <div>
                        <label style={fieldLabelStyle}>Name *</label>
                        <input
                            type="text"
                            value={formValues.name}
                            onChange={e => setFormValues(prev => ({ ...prev, name: e.target.value }))}
                            required
                            style={fieldInputStyle}
                        />
                    </div>

                    <div>
                        <label style={fieldLabelStyle}>Visit Date</label>
                        <input
                            type="datetime-local"
                            value={formValues.visitDate}
                            onChange={e => setFormValues(prev => ({ ...prev, visitDate: e.target.value }))}
                            style={fieldInputStyle}
                        />
                    </div>

                    <div>
                        <label style={fieldLabelStyle}>Outcome</label>
                        <select
                            value={formValues.outcome}
                            onChange={e => setFormValues(prev => ({ ...prev, outcome: e.target.value }))}
                            style={fieldInputStyle}
                        >
                            {VISIT_OUTCOMES.map(outcome => (
                                <option key={outcome} value={outcome}>{outcome}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ gridColumn: "span 2" }}>
                        <label style={fieldLabelStyle}>Notes</label>
                        <input
                            type="text"
                            value={formValues.notes}
                            onChange={e => setFormValues(prev => ({ ...prev, notes: e.target.value }))}
                            style={fieldInputStyle}
                        />
                    </div>

                    <div>
                        <label style={fieldLabelStyle}>Follow-up Date</label>
                        <input
                            type="date"
                            value={formValues.followUp}
                            onChange={e => setFormValues(prev => ({ ...prev, followUp: e.target.value }))}
                            style={fieldInputStyle}
                        />
                    </div>

                    <div style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
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
                        {editingVisitId && (
                            <button
                                type="button"
                                onClick={handleCancelForm}
                                style={{
                                    padding: "10px 16px",
                                    borderRadius: "8px",
                                    border: "1px solid #ccc",
                                    background: "#fff",
                                    color: "#555",
                                    fontWeight: "bold",
                                    fontSize: "13px",
                                    cursor: "pointer",
                                    whiteSpace: "nowrap"
                                }}
                            >
                                Cancel
                            </button>
                        )}
                    </div>

                    {formError && (
                        <div style={{ gridColumn: "1 / -1", color: "#c62828", fontSize: "13px" }}>
                            {formError}
                        </div>
                    )}

                </form>

            )}


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
                                Outcome
                            </th>


                            <th
                                style={{
                                    padding: "12px",
                                    textAlign: "left"
                                }}
                            >
                                Salesforce ID
                            </th>

                            <th
                                style={{
                                    padding: "12px",
                                    textAlign: "left"
                                }}
                            >
                                Actions
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
                                                    visit.Visit_Date__c
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
                                                (visit.Lead__r?.Name
                                                    ? `${visit.Lead__r.Name} (Lead)`
                                                    : "-")
                                            }

                                        </td>


                                        <td
                                            style={{
                                                padding: "12px"
                                            }}
                                        >

                                            {
                                                visit.Representative__r?.Name ||
                                                "Not Assigned"
                                            }

                                        </td>


                                        <td
                                            style={{
                                                padding: "12px"
                                            }}
                                        >

                                            <OutcomeBadge outcome={visit.Visit_Outcome__c} />

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

                                        <td
                                            style={{
                                                padding: "12px"
                                            }}
                                        >
                                            <button
                                                onClick={() => handleStartEdit(visit)}
                                                style={{
                                                    padding: "6px 10px",
                                                    borderRadius: "6px",
                                                    border: "1px solid #0B2E4F",
                                                    background: "#fff",
                                                    color: "#0B2E4F",
                                                    fontSize: "12px",
                                                    fontWeight: "bold",
                                                    cursor: "pointer",
                                                    whiteSpace: "nowrap"
                                                }}
                                            >
                                                Edit
                                            </button>
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