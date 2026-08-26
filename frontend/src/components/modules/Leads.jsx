import { useEffect, useState } from "react";
import { getAllLeads, createLead, updateLead } from "../../services/salesforceApi";
import { useUser } from "../../context/UserContext";

// Real Lead.Status picklist values, verified via Salesforce describe -
// not guessed, since an invalid value is a validation error.
const LEAD_STATUSES = [
    "Open - Not Contacted",
    "Working - Contacted",
    "Closed - Converted",
    "Closed - Not Converted"
];

export default function Leads() {

    const { can } = useUser();
    const canEdit = can("EDIT_LEADS");

    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [showForm, setShowForm] = useState(false);
    const [editingLeadId, setEditingLeadId] = useState(null);
    const [formValues, setFormValues] = useState({
        lastName: "",
        firstName: "",
        company: "",
        phone: "",
        email: "",
        status: LEAD_STATUSES[0]
    });
    const [formError, setFormError] = useState("");
    const [formSubmitting, setFormSubmitting] = useState(false);

    const cellStyle = {
        padding: "12px",
        borderBottom: "1px solid #eee",
        textAlign: "left",
        verticalAlign: "middle"
    };


    useEffect(() => {

        loadLeads();

    }, []);


    async function loadLeads() {

        try {

            setLoading(true);
            setError("");

            const data = await getAllLeads();

            if (!Array.isArray(data)) {
                setLeads([]);
                setError("Invalid lead data received.");
                return;
            }

            setLeads(data);

        } catch (err) {

            setError(err.message || "Failed to load leads.");

        } finally {

            setLoading(false);

        }

    }


    function resetForm() {

        setFormValues({
            lastName: "",
            firstName: "",
            company: "",
            phone: "",
            email: "",
            status: LEAD_STATUSES[0]
        });

        setEditingLeadId(null);

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

    function handleStartEdit(lead) {

        setEditingLeadId(lead.Id);

        setFormValues({
            lastName: lead.LastName || "",
            firstName: lead.FirstName || "",
            company: lead.Company || "",
            phone: lead.Phone || "",
            email: lead.Email || "",
            status: lead.Status || LEAD_STATUSES[0]
        });

        setFormError("");
        setShowForm(true);

    }

    function handleCancelForm() {

        resetForm();
        setFormError("");
        setShowForm(false);

    }

    function updateFormField(field, value) {

        setFormValues(prev => ({ ...prev, [field]: value }));

    }

    async function handleSubmit(e) {

        e.preventDefault();

        if (!formValues.lastName.trim()) {
            setFormError("Last name is required.");
            return;
        }

        if (!formValues.company.trim()) {
            setFormError("Company is required.");
            return;
        }

        setFormSubmitting(true);
        setFormError("");

        try {

            const payload = {
                LastName: formValues.lastName.trim(),
                Company: formValues.company.trim(),
                FirstName: formValues.firstName.trim() || null,
                Phone: formValues.phone.trim() || null,
                Email: formValues.email.trim() || null,
                Status: formValues.status
            };

            if (editingLeadId) {
                await updateLead(editingLeadId, payload);
            } else {
                await createLead(payload);
            }

            resetForm();

            setShowForm(false);

            await loadLeads();

        } catch (err) {

            setFormError(
                err.message ||
                (editingLeadId ? "Failed to update lead." : "Failed to create lead.")
            );

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

                {canEdit && (
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
                        {showForm && !editingLeadId ? "Cancel" : "+ Log New Lead"}
                    </button>
                )}

            </div>

            {canEdit && showForm && (

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

                    {editingLeadId && (
                        <div style={{ gridColumn: "1 / -1", fontSize: "13px", fontWeight: "bold", color: "#0B2E4F" }}>
                            Editing: {formValues.firstName} {formValues.lastName}
                        </div>
                    )}

                    <div>
                        <label style={fieldLabelStyle}>Last Name *</label>
                        <input
                            type="text"
                            value={formValues.lastName}
                            onChange={e => updateFormField("lastName", e.target.value)}
                            required
                            style={fieldInputStyle}
                        />
                    </div>

                    <div>
                        <label style={fieldLabelStyle}>First Name</label>
                        <input
                            type="text"
                            value={formValues.firstName}
                            onChange={e => updateFormField("firstName", e.target.value)}
                            style={fieldInputStyle}
                        />
                    </div>

                    <div>
                        <label style={fieldLabelStyle}>Company *</label>
                        <input
                            type="text"
                            value={formValues.company}
                            onChange={e => updateFormField("company", e.target.value)}
                            required
                            style={fieldInputStyle}
                        />
                    </div>

                    <div>
                        <label style={fieldLabelStyle}>Phone</label>
                        <input
                            type="text"
                            value={formValues.phone}
                            onChange={e => updateFormField("phone", e.target.value)}
                            style={fieldInputStyle}
                        />
                    </div>

                    <div>
                        <label style={fieldLabelStyle}>Email</label>
                        <input
                            type="email"
                            value={formValues.email}
                            onChange={e => updateFormField("email", e.target.value)}
                            style={fieldInputStyle}
                        />
                    </div>

                    <div>
                        <label style={fieldLabelStyle}>Status</label>
                        <select
                            value={formValues.status}
                            onChange={e => updateFormField("status", e.target.value)}
                            style={fieldInputStyle}
                        >
                            {LEAD_STATUSES.map(status => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
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
                        {editingLeadId && (
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
                        minWidth: "1000px"
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

                            {canEdit && (
                                <th style={cellStyle}>
                                    Actions
                                </th>
                            )}

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

                                    {/* ACTIONS */}

                                    {canEdit && (
                                        <td style={cellStyle}>
                                            <button
                                                onClick={() => handleStartEdit(lead)}
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
                                    )}

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
