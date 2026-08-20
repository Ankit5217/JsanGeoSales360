import { useEffect, useState } from "react";
import { getEvidence, createEvidence } from "../../services/salesforceApi";

const EVIDENCE_TYPES = [
    "Photograph",
    "GPS Verification",
    "Business Card",
    "Customer Confirmation",
    "Address Verification",
    "Google Maps Verification",
    "OpenStreetMap Verification",
    "Sales Representative Verification",
    "Site Survey",
    "Document Upload",
    "Phone Verification",
    "Other"
];

const EVIDENCE_STATUSES = ["Pending", "Approved", "Rejected"];

export default function Evidence() {

    const [evidence, setEvidence] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showForm, setShowForm] = useState(false);
    const [formValues, setFormValues] = useState({
        name: "",
        type: EVIDENCE_TYPES[0],
        photoUrl: "",
        validationDate: "",
        status: EVIDENCE_STATUSES[0],
        remarks: ""
    });
    const [formError, setFormError] = useState("");
    const [formSubmitting, setFormSubmitting] = useState(false);

    useEffect(() => {

        loadEvidence();

    }, []);

    async function loadEvidence() {

            console.log("=== EVIDENCE: START API CALL ===");

            try {

                const data = await getEvidence();

                console.log(
                    "=== EVIDENCE: API RESPONSE ==="
                );

                console.log(data);

                setEvidence(
                    Array.isArray(data)
                        ? data
                        : []
                );

            } catch (error) {

                console.error(
                    "Evidence loading error:",
                    error
                );

                setEvidence([]);

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

            await createEvidence({
                Name: formValues.name.trim(),
                Evidence_Type__c: formValues.type,
                Photo_URL__c: formValues.photoUrl.trim() || null,
                Validation_Date__c: formValues.validationDate || null,
                Status__c: formValues.status,
                Remarks__c: formValues.remarks.trim() || null
            });

            setFormValues({
                name: "",
                type: EVIDENCE_TYPES[0],
                photoUrl: "",
                validationDate: "",
                status: EVIDENCE_STATUSES[0],
                remarks: ""
            });

            setShowForm(false);

            await loadEvidence();

        } catch (err) {

            setFormError(err.message || "Failed to create evidence.");

        } finally {

            setFormSubmitting(false);

        }

    }


    if (loading) {

        return (
            <div style={{ padding: "30px" }}>
                Loading evidence...
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

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start"
                }}
            >

                <div>

                    <h1
                        style={{
                            color: "#0B2E4F",
                            marginBottom: "9px"
                        }}
                    >
                        Evidence
                    </h1>

                    <p style={{ color: "#666" }}>
                        Validation evidence and field inspection records
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
                    {showForm ? "Cancel" : "+ Log New Evidence"}
                </button>

            </div>

            {showForm && (

                <form
                    onSubmit={handleCreate}
                    style={{
                        background: "#fff",
                        borderRadius: "10px",
                        padding: "20px",
                        marginTop: "20px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                        gap: "14px"
                    }}
                >

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
                        <label style={fieldLabelStyle}>Type</label>
                        <select
                            value={formValues.type}
                            onChange={e => setFormValues(prev => ({ ...prev, type: e.target.value }))}
                            style={fieldInputStyle}
                        >
                            {EVIDENCE_TYPES.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={fieldLabelStyle}>Photo URL</label>
                        <input
                            type="text"
                            value={formValues.photoUrl}
                            onChange={e => setFormValues(prev => ({ ...prev, photoUrl: e.target.value }))}
                            style={fieldInputStyle}
                        />
                    </div>

                    <div>
                        <label style={fieldLabelStyle}>Validation Date</label>
                        <input
                            type="date"
                            value={formValues.validationDate}
                            onChange={e => setFormValues(prev => ({ ...prev, validationDate: e.target.value }))}
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
                            {EVIDENCE_STATUSES.map(status => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ gridColumn: "span 2" }}>
                        <label style={fieldLabelStyle}>Remarks</label>
                        <input
                            type="text"
                            value={formValues.remarks}
                            onChange={e => setFormValues(prev => ({ ...prev, remarks: e.target.value }))}
                            style={fieldInputStyle}
                        />
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


            {/* SUMMARY */}

            <div
                style={{
                    display: "flex",
                    gap: "15px",
                    marginTop: "20px",
                    marginBottom: "20px"
                }}
            >

                <div style={summaryCardStyle}>
                    <div style={summaryTitleStyle}>
                        Total Evidence
                    </div>

                    <div style={summaryNumberStyle}>
                        {evidence.length}
                    </div>
                </div>


                <div style={summaryCardStyle}>
                    <div style={summaryTitleStyle}>
                        Approved
                    </div>

                    <div style={summaryNumberStyle}>
                        {
                            evidence.filter(
                                item =>
                                    item.status === "Approved"
                            ).length
                        }
                    </div>
                </div>


                <div style={summaryCardStyle}>
                    <div style={summaryTitleStyle}>
                        Pending
                    </div>

                    <div style={summaryNumberStyle}>
                        {
                            evidence.filter(
                                item =>
                                    item.status === "Pending"
                            ).length
                        }
                    </div>
                </div>


                <div style={summaryCardStyle}>
                    <div style={summaryTitleStyle}>
                        With Photo
                    </div>

                    <div style={summaryNumberStyle}>
                        {
                            evidence.filter(
                                item =>
                                    item.photo
                            ).length
                        }
                    </div>
                </div>

            </div>


            {/* TABLE */}

            <div
                style={{
                    background: "#fff",
                    borderRadius: "10px",
                    padding: "20px",
                    boxShadow:
                        "0 2px 8px rgba(0,0,0,0.08)"
                }}
            >

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

                            <th style={thStyle}>
                                Evidence Name
                            </th>

                            <th style={thStyle}>
                                Type
                            </th>

                            <th style={thStyle}>
                                Validation Date
                            </th>

                            <th style={thStyle}>
                                Status
                            </th>

                            <th style={thStyle}>
                                Photo
                            </th>

                            <th style={thStyle}>
                                Remarks
                            </th>

                            <th style={thStyle}>
                                Salesforce ID
                            </th>

                        </tr>

                    </thead>


                    <tbody>

                        {evidence.map(
                            (item, index) => (

                                <tr
                                    key={
                                        item.id ||
                                        index
                                    }
                                >

                                    {/* NAME */}

                                    <td style={tdStyle}>
                                        <strong>
                                            {item.name || "-"}
                                        </strong>
                                    </td>


                                    {/* TYPE */}

                                    <td style={tdStyle}>
                                        {item.type || "-"}
                                    </td>


                                    {/* DATE */}

                                    <td style={tdStyle}>
                                        {formatDate(
                                            item.validation_date
                                        )}
                                    </td>


                                    {/* STATUS */}

                                    <td style={tdStyle}>

                                        <span
                                            style={getStatusStyle(
                                                item.status
                                            )}
                                        >
                                            {
                                                item.status ||
                                                "Not Assigned"
                                            }
                                        </span>

                                    </td>


                                    {/* PHOTO */}

                                    <td style={tdStyle}>

                                        {item.photo ? (

                                            <a
                                                href={item.photo}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                <img
                                                    src={item.photo}
                                                    alt={
                                                        item.name ||
                                                        "Evidence"
                                                    }
                                                    style={{
                                                        width: "70px",
                                                        height: "50px",
                                                        objectFit: "cover",
                                                        borderRadius: "6px",
                                                        border:
                                                            "1px solid #ddd"
                                                    }}
                                                />
                                            </a>

                                        ) : (

                                            <span
                                                style={{
                                                    color: "#999"
                                                }}
                                            >
                                                No Photo
                                            </span>

                                        )}

                                    </td>


                                    {/* REMARKS */}

                                    <td
                                        style={{
                                            ...tdStyle,
                                            maxWidth: "300px"
                                        }}
                                    >
                                        {item.remarks || "-"}
                                    </td>


                                    {/* SALESFORCE ID */}

                                    <td
                                        style={{
                                            ...tdStyle,
                                            fontSize: "12px",
                                            color: "#666"
                                        }}
                                    >
                                        {item.id || "-"}
                                    </td>

                                </tr>

                            )
                        )}

                    </tbody>

                </table>


                {/* EMPTY STATE */}

                {evidence.length === 0 && (

                    <div
                        style={{
                            padding: "40px",
                            textAlign: "center",
                            color: "#777"
                        }}
                    >
                        No evidence records found.
                    </div>

                )}

            </div>

        </div>

    );

}


/* =========================
   DATE FORMAT
========================= */

function formatDate(date) {

    if (!date) {
        return "-";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
        return date;
    }

    return parsedDate.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


/* =========================
   STATUS STYLE
========================= */

function getStatusStyle(status) {

    if (status === "Approved") {

        return {
            background: "#dff6e4",
            color: "#16743a",
            padding: "5px 10px",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: "600"
        };

    }


    if (status === "Pending") {

        return {
            background: "#fff3cd",
            color: "#856404",
            padding: "5px 10px",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: "600"
        };

    }


    return {
        background: "#eee",
        color: "#666",
        padding: "5px 10px",
        borderRadius: "20px",
        fontSize: "12px",
        fontWeight: "600"
    };

}


/* =========================
   STYLES
========================= */

const summaryCardStyle = {

    background: "#fff",

    borderRadius: "10px",

    padding: "18px 25px",

    minWidth: "150px",

    boxShadow:
        "0 2px 8px rgba(0,0,0,0.08)"

};


const summaryTitleStyle = {

    color: "#666",

    fontSize: "13px",

    marginBottom: "8px"

};


const summaryNumberStyle = {

    color: "#0B2E4F",

    fontSize: "24px",

    fontWeight: "700"

};


const thStyle = {

    padding: "12px",

    textAlign: "left",

    borderBottom: "1px solid #ddd",

    fontWeight: "600",

    color: "#333",

    fontSize: "13px"

};


const tdStyle = {

    padding: "12px",

    borderBottom: "1px solid #eee",

    verticalAlign: "middle",

    fontSize: "13px"

};


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