import { useEffect, useState } from "react";
import {
    getOpportunities,
    createOpportunity,
    getAllAccounts
} from "../../services/salesforceApi";

// Real Opportunity.StageName picklist values, verified via Salesforce
// describe - not guessed, since an invalid value is a validation error.
const OPPORTUNITY_STAGES = [
    "Prospecting",
    "Qualification",
    "Needs Analysis",
    "Value Proposition",
    "Id. Decision Makers",
    "Perception Analysis",
    "Proposal/Price Quote",
    "Negotiation/Review",
    "Closed Won",
    "Closed Lost"
];

const STAGE_COLORS = {
    "Closed Won": { bg: "#e8f5e9", color: "#2e7d32" },
    "Closed Lost": { bg: "#fdecea", color: "#c62828" },
    "Negotiation/Review": { bg: "#fff3e0", color: "#ef6c00" },
    "Proposal/Price Quote": { bg: "#fff3e0", color: "#ef6c00" }
};

function StageBadge({ stage }) {

    if (!stage) {
        return <span style={{ color: "#999", fontSize: "12px" }}>-</span>;
    }

    const colors = STAGE_COLORS[stage] || { bg: "#e3f2fd", color: "#1565c0" };

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
            {stage}
        </span>
    );

}

export default function Opportunities() {

    const [opportunities, setOpportunities] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [showForm, setShowForm] = useState(false);
    const [formValues, setFormValues] = useState({
        name: "",
        accountId: "",
        stage: OPPORTUNITY_STAGES[0],
        amount: "",
        closeDate: ""
    });
    const [formError, setFormError] = useState("");
    const [formSubmitting, setFormSubmitting] = useState(false);

    useEffect(() => {

        loadOpportunities();
        loadAccounts();

    }, []);

    async function loadOpportunities() {

        try {

            setLoading(true);
            setError("");

            const data = await getOpportunities();

            if (!Array.isArray(data)) {
                setOpportunities([]);
                setError("Invalid opportunity data received.");
                return;
            }

            setOpportunities(data);

        } catch (err) {

            setError(err.message || "Failed to load opportunities.");

        } finally {

            setLoading(false);

        }

    }

    async function loadAccounts() {

        try {

            const data = await getAllAccounts();

            setAccounts(Array.isArray(data) ? data : []);

        } catch (err) {

            console.error("Failed to load accounts for opportunity form:", err);

        }

    }

    function updateFormField(field, value) {

        setFormValues(prev => ({ ...prev, [field]: value }));

    }

    async function handleCreate(e) {

        e.preventDefault();

        if (!formValues.name.trim()) {
            setFormError("Name is required.");
            return;
        }

        if (!formValues.closeDate) {
            setFormError("Close date is required.");
            return;
        }

        setFormSubmitting(true);
        setFormError("");

        try {

            await createOpportunity({
                Name: formValues.name.trim(),
                StageName: formValues.stage,
                CloseDate: formValues.closeDate,
                Amount: formValues.amount ? Number(formValues.amount) : null,
                AccountId: formValues.accountId || null
            });

            setFormValues({
                name: "",
                accountId: "",
                stage: OPPORTUNITY_STAGES[0],
                amount: "",
                closeDate: ""
            });

            setShowForm(false);

            await loadOpportunities();

        } catch (err) {

            setFormError(err.message || "Failed to create opportunity.");

        } finally {

            setFormSubmitting(false);

        }

    }

    const totalValue = opportunities.reduce(
        (sum, opp) => sum + (opp.amount || 0),
        0
    );
    const wonValue = opportunities
        .filter(opp => opp.stage === "Closed Won")
        .reduce((sum, opp) => sum + (opp.amount || 0), 0);


    if (loading) {

        return (
            <div style={{ padding: "30px", background: "#f4f6f9", minHeight: "100vh" }}>
                <h2 style={{ color: "#0B2E4F" }}>Opportunities</h2>
                <p>Loading opportunities...</p>
            </div>
        );

    }


    if (error) {

        return (
            <div style={{ padding: "30px", background: "#f4f6f9", minHeight: "100vh" }}>
                <h2 style={{ color: "#0B2E4F" }}>Opportunities</h2>
                <div
                    style={{
                        background: "#fff",
                        padding: "20px",
                        borderRadius: "10px",
                        color: "#c62828",
                        borderLeft: "5px solid #e53935"
                    }}
                >
                    <strong>Failed to load opportunities</strong>
                    <p>{error}</p>
                </div>
            </div>
        );

    }


    return (
        <div style={{ padding: "25px", background: "#f4f6f9", minHeight: "100vh" }}>

            <div
                style={{
                    marginBottom: "20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start"
                }}
            >
                <div>
                    <h2 style={{ margin: 0, color: "#0B2E4F" }}>Opportunities</h2>
                    <p style={{ marginTop: "6px", color: "#666" }}>
                        Sales opportunities linked to Salesforce accounts
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
                    {showForm ? "Cancel" : "+ Log New Opportunity"}
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
                        <label style={fieldLabelStyle}>Name *</label>
                        <input
                            type="text"
                            value={formValues.name}
                            onChange={e => updateFormField("name", e.target.value)}
                            required
                            style={fieldInputStyle}
                        />
                    </div>

                    <div>
                        <label style={fieldLabelStyle}>Account</label>
                        <select
                            value={formValues.accountId}
                            onChange={e => updateFormField("accountId", e.target.value)}
                            style={fieldInputStyle}
                        >
                            <option value="">- None -</option>
                            {accounts.map(account => (
                                <option key={account.Id} value={account.Id}>
                                    {account.Name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={fieldLabelStyle}>Stage</label>
                        <select
                            value={formValues.stage}
                            onChange={e => updateFormField("stage", e.target.value)}
                            style={fieldInputStyle}
                        >
                            {OPPORTUNITY_STAGES.map(stage => (
                                <option key={stage} value={stage}>{stage}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={fieldLabelStyle}>Amount</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formValues.amount}
                            onChange={e => updateFormField("amount", e.target.value)}
                            style={fieldInputStyle}
                        />
                    </div>

                    <div>
                        <label style={fieldLabelStyle}>Close Date *</label>
                        <input
                            type="date"
                            value={formValues.closeDate}
                            onChange={e => updateFormField("closeDate", e.target.value)}
                            required
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

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "16px",
                    marginBottom: "20px"
                }}
            >

                <div style={summaryCardStyle}>
                    <div style={summaryLabelStyle}>Total Opportunities</div>
                    <div style={summaryValueStyle}>{opportunities.length}</div>
                </div>

                <div style={summaryCardStyle}>
                    <div style={summaryLabelStyle}>Total Pipeline Value</div>
                    <div style={summaryValueStyle}>₹{totalValue.toLocaleString("en-IN")}</div>
                </div>

                <div style={summaryCardStyle}>
                    <div style={summaryLabelStyle}>Closed Won Value</div>
                    <div style={{ ...summaryValueStyle, color: "#2e7d32" }}>
                        ₹{wonValue.toLocaleString("en-IN")}
                    </div>
                </div>

            </div>

            <div
                style={{
                    background: "#fff",
                    borderRadius: "10px",
                    padding: "20px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    overflowX: "auto"
                }}
            >
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1000px" }}>

                    <thead>
                        <tr style={{ background: "#f4f6f9" }}>
                            <th style={{ padding: "12px", textAlign: "left" }}>Name</th>
                            <th style={{ padding: "12px", textAlign: "left" }}>Account</th>
                            <th style={{ padding: "12px", textAlign: "left" }}>Stage</th>
                            <th style={{ padding: "12px", textAlign: "left" }}>Amount</th>
                            <th style={{ padding: "12px", textAlign: "left" }}>Close Date</th>
                            <th style={{ padding: "12px", textAlign: "left" }}>Owner</th>
                        </tr>
                    </thead>

                    <tbody>
                        {opportunities.map(opp => (
                            <tr key={opp.id} style={{ borderBottom: "1px solid #eee" }}>

                                <td style={{ padding: "12px", fontWeight: "600", color: "#0B2E4F" }}>
                                    {opp.name || "-"}
                                </td>

                                <td style={{ padding: "12px" }}>
                                    {opp.account_name || "-"}
                                </td>

                                <td style={{ padding: "12px" }}>
                                    <StageBadge stage={opp.stage} />
                                </td>

                                <td style={{ padding: "12px" }}>
                                    {opp.amount != null ? `₹${opp.amount.toLocaleString("en-IN")}` : "-"}
                                </td>

                                <td style={{ padding: "12px" }}>
                                    {opp.close_date || "-"}
                                </td>

                                <td style={{ padding: "12px" }}>
                                    {opp.owner_name || "Not Assigned"}
                                </td>

                            </tr>
                        ))}
                    </tbody>

                </table>

                {opportunities.length === 0 && (
                    <div style={{ padding: "30px", textAlign: "center", color: "#777" }}>
                        No opportunities found.
                    </div>
                )}

            </div>

        </div>
    );

}


const summaryCardStyle = {
    background: "#fff",
    borderRadius: "10px",
    padding: "20px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
};

const summaryLabelStyle = {
    color: "#666",
    fontSize: "13px"
};

const summaryValueStyle = {
    fontSize: "28px",
    fontWeight: "bold",
    color: "#0B2E4F",
    marginTop: "5px"
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
