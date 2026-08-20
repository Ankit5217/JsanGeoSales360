import { Fragment, useEffect, useState } from "react";
import {
    getDiscoveryCandidates,
    updateDiscoveryCandidate,
    convertDiscoveryCandidateToLead,
    createDiscoveryCandidate,
    checkDiscoveryCandidateDuplicates
} from "../../services/salesforceApi";

const DISCOVERY_SOURCES = [
    "Sales Representative",
    "Manual Survey",
    "Google Maps",
    "OpenStreetMap",
    "Partner Referral",
    "Import"
];

const VALIDATION_COLORS = {
    Validated: { bg: "#e8f5e9", color: "#2e7d32" },
    Pending: { bg: "#fff3e0", color: "#ef6c00" },
    "Needs Review": { bg: "#fff3e0", color: "#ef6c00" },
    Rejected: { bg: "#fdecea", color: "#c62828" }
};

const DUPLICATE_COLORS = {
    Unique: { bg: "#e8f5e9", color: "#2e7d32" },
    "Possible Duplicate": { bg: "#fff3e0", color: "#ef6c00" },
    "Confirmed Duplicate": { bg: "#fdecea", color: "#c62828" },
    "Existing Lead": { bg: "#fdecea", color: "#c62828" },
    "Existing Account": { bg: "#fdecea", color: "#c62828" }
};

const REVIEW_COLORS = {
    Approved: { bg: "#e8f5e9", color: "#2e7d32" },
    Rejected: { bg: "#fdecea", color: "#c62828" },
    Pending: { bg: "#fff3e0", color: "#ef6c00" }
};

function Badge({ value, palette }) {

    if (!value) {
        return <span style={{ color: "#999", fontSize: "12px" }}>-</span>;
    }

    const colors = palette[value] || { bg: "#f0f0f0", color: "#555" };

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
            {value}
        </span>
    );

}

export default function Discovery() {

    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [busyId, setBusyId] = useState(null);
    const [rowErrors, setRowErrors] = useState({});

    const [showForm, setShowForm] = useState(false);
    const [formValues, setFormValues] = useState({
        name: "",
        business: "",
        address: "",
        phone: "",
        source: DISCOVERY_SOURCES[0]
    });
    const [formError, setFormError] = useState("");
    const [formSubmitting, setFormSubmitting] = useState(false);

    // Keyed by candidate id: { matches, error } once fetched, or absent
    // if the panel for that row has never been opened / has been closed.
    const [duplicatePanels, setDuplicatePanels] = useState({});
    const [duplicateBusyId, setDuplicateBusyId] = useState(null);


    useEffect(() => {

        loadCandidates();

    }, []);


    async function loadCandidates() {

        try {

            setLoading(true);
            setError("");

            const data = await getDiscoveryCandidates();

            if (!Array.isArray(data)) {
                setCandidates([]);
                setError("Invalid discovery candidate data received.");
                return;
            }

            setCandidates(data);

        } catch (err) {

            setError(err.message || "Failed to load discovery candidates.");

        } finally {

            setLoading(false);

        }

    }


    function patchLocalCandidate(id, changes) {

        setCandidates(prev =>
            prev.map(c => (c.id === id ? { ...c, ...changes } : c))
        );

    }


    async function handleReview(candidate, reviewStatus) {

        setBusyId(candidate.id);

        setRowErrors(prev => ({ ...prev, [candidate.id]: null }));

        try {

            await updateDiscoveryCandidate(candidate.id, {
                Review_Status__c: reviewStatus
            });

            patchLocalCandidate(candidate.id, {
                review_status: reviewStatus
            });

        } catch (err) {

            setRowErrors(prev => ({
                ...prev,
                [candidate.id]: err.message || "Update failed"
            }));

        } finally {

            setBusyId(null);

        }

    }


    async function handleConvert(candidate) {

        setBusyId(candidate.id);

        setRowErrors(prev => ({ ...prev, [candidate.id]: null }));

        try {

            const result = await convertDiscoveryCandidateToLead(candidate.id);

            patchLocalCandidate(candidate.id, {
                related_lead: result.lead_id
            });

        } catch (err) {

            setRowErrors(prev => ({
                ...prev,
                [candidate.id]: err.message || "Conversion failed"
            }));

        } finally {

            setBusyId(null);

        }

    }


    async function handleCheckDuplicates(candidate) {

        setDuplicatePanels(prev => {

            const next = { ...prev };

            // Toggle closed if the panel is already open for this row.
            if (next[candidate.id]) {
                delete next[candidate.id];
                return next;
            }

            return next;

        });

        if (duplicatePanels[candidate.id]) {
            return;
        }

        setDuplicateBusyId(candidate.id);

        try {

            const result = await checkDiscoveryCandidateDuplicates(candidate.id);

            patchLocalCandidate(candidate.id, {
                duplicate_status: result.duplicate_status,
                confidence_score: result.confidence_score
            });

            setDuplicatePanels(prev => ({
                ...prev,
                [candidate.id]: { matches: result.matches || [], error: null }
            }));

        } catch (err) {

            setDuplicatePanels(prev => ({
                ...prev,
                [candidate.id]: { matches: [], error: err.message || "Duplicate check failed" }
            }));

        } finally {

            setDuplicateBusyId(null);

        }

    }


    function updateFormField(field, value) {

        setFormValues(prev => ({ ...prev, [field]: value }));

    }


    async function handleLogDiscovery(e) {

        e.preventDefault();

        if (!formValues.name.trim()) {
            setFormError("Name is required.");
            return;
        }

        setFormSubmitting(true);
        setFormError("");

        try {

            await createDiscoveryCandidate({
                Name: formValues.name.trim(),
                Candidate_Name__c: formValues.name.trim(),
                Business_Name__c: formValues.business.trim() || null,
                Address__c: formValues.address.trim() || null,
                Phone__c: formValues.phone.trim() || null,
                Discovery_Source__c: formValues.source
            });

            setFormValues({
                name: "",
                business: "",
                address: "",
                phone: "",
                source: DISCOVERY_SOURCES[0]
            });

            setShowForm(false);

            await loadCandidates();

        } catch (err) {

            setFormError(err.message || "Failed to log new discovery.");

        } finally {

            setFormSubmitting(false);

        }

    }


    if (loading) {

        return (
            <div style={{ padding: "30px", background: "#f4f6f9", minHeight: "100vh" }}>
                <h2 style={{ color: "#0B2E4F" }}>Discovery</h2>
                <p>Loading discovery candidates...</p>
            </div>
        );

    }


    if (error) {

        return (
            <div style={{ padding: "30px", background: "#f4f6f9", minHeight: "100vh" }}>
                <h2 style={{ color: "#0B2E4F" }}>Discovery</h2>
                <div
                    style={{
                        background: "#fff",
                        padding: "20px",
                        borderRadius: "10px",
                        color: "#c62828",
                        borderLeft: "5px solid #e53935"
                    }}
                >
                    <strong>Failed to load discovery candidates</strong>
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
                    <h2 style={{ margin: 0, color: "#0B2E4F" }}>Discovery</h2>
                    <p style={{ marginTop: "6px", color: "#666" }}>
                        Prospective new accounts and leads awaiting review
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
                    {showForm ? "Cancel" : "+ Log New Discovery"}
                </button>
            </div>

            {showForm && (

                <form
                    onSubmit={handleLogDiscovery}
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
                        <label style={fieldLabelStyle}>Business</label>
                        <input
                            type="text"
                            value={formValues.business}
                            onChange={e => updateFormField("business", e.target.value)}
                            style={fieldInputStyle}
                        />
                    </div>

                    <div>
                        <label style={fieldLabelStyle}>Address</label>
                        <input
                            type="text"
                            value={formValues.address}
                            onChange={e => updateFormField("address", e.target.value)}
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
                        <label style={fieldLabelStyle}>Source</label>
                        <select
                            value={formValues.source}
                            onChange={e => updateFormField("source", e.target.value)}
                            style={fieldInputStyle}
                        >
                            {DISCOVERY_SOURCES.map(source => (
                                <option key={source} value={source}>{source}</option>
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

            <div
                style={{
                    background: "#fff",
                    borderRadius: "10px",
                    padding: "20px",
                    marginBottom: "20px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
                }}
            >
                <div style={{ color: "#666", fontSize: "13px" }}>Total Candidates</div>
                <div style={{ fontSize: "28px", fontWeight: "bold", color: "#0B2E4F", marginTop: "5px" }}>
                    {candidates.length}
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
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1150px" }}>

                    <thead>
                        <tr style={{ background: "#f4f6f9" }}>
                            <th style={{ padding: "12px", textAlign: "left" }}>Name</th>
                            <th style={{ padding: "12px", textAlign: "left" }}>Business</th>
                            <th style={{ padding: "12px", textAlign: "left" }}>Phone</th>
                            <th style={{ padding: "12px", textAlign: "left" }}>Territory</th>
                            <th style={{ padding: "12px", textAlign: "left" }}>Source</th>
                            <th style={{ padding: "12px", textAlign: "left" }}>Confidence</th>
                            <th style={{ padding: "12px", textAlign: "left" }}>Validation</th>
                            <th style={{ padding: "12px", textAlign: "left" }}>Duplicate</th>
                            <th style={{ padding: "12px", textAlign: "left" }}>Review</th>
                            <th style={{ padding: "12px", textAlign: "left" }}>Actions</th>
                        </tr>
                    </thead>

                    <tbody>
                        {candidates.map(candidate => {

                            const isBusy = busyId === candidate.id;
                            const isConverted = !!candidate.related_lead;
                            const isApproved = candidate.review_status === "Approved";
                            const rowError = rowErrors[candidate.id];
                            const isDuplicateBusy = duplicateBusyId === candidate.id;
                            const duplicatePanel = duplicatePanels[candidate.id];

                            return (
                                <Fragment key={candidate.id}>
                                <tr style={{ borderBottom: "1px solid #eee" }}>

                                    <td style={{ padding: "12px", fontWeight: "600", color: "#0B2E4F" }}>
                                        {candidate.candidate_name || candidate.record_name || "-"}
                                    </td>

                                    <td style={{ padding: "12px" }}>
                                        {candidate.business_name || "-"}
                                    </td>

                                    <td style={{ padding: "12px" }}>
                                        {candidate.phone || "-"}
                                    </td>

                                    <td style={{ padding: "12px" }}>
                                        {candidate.assigned_territory || "-"}
                                    </td>

                                    <td style={{ padding: "12px" }}>
                                        {candidate.discovery_source || "-"}
                                    </td>

                                    <td style={{ padding: "12px" }}>
                                        {candidate.confidence_score != null
                                            ? `${candidate.confidence_score}%`
                                            : "-"}
                                    </td>

                                    <td style={{ padding: "12px" }}>
                                        <Badge
                                            value={candidate.validation_status}
                                            palette={VALIDATION_COLORS}
                                        />
                                    </td>

                                    <td style={{ padding: "12px" }}>
                                        <Badge
                                            value={candidate.duplicate_status}
                                            palette={DUPLICATE_COLORS}
                                        />
                                        <div style={{ marginTop: "6px" }}>
                                            <button
                                                onClick={() => handleCheckDuplicates(candidate)}
                                                disabled={isDuplicateBusy}
                                                style={actionButtonStyle("#0B2E4F", isDuplicateBusy)}
                                            >
                                                {isDuplicateBusy
                                                    ? "Checking..."
                                                    : duplicatePanel
                                                    ? "Hide Matches"
                                                    : "Check Duplicates"}
                                            </button>
                                        </div>
                                    </td>

                                    <td style={{ padding: "12px" }}>
                                        <Badge
                                            value={candidate.review_status}
                                            palette={REVIEW_COLORS}
                                        />
                                    </td>

                                    <td style={{ padding: "12px" }}>

                                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>

                                            <button
                                                onClick={() => handleReview(candidate, "Approved")}
                                                disabled={isBusy || isApproved}
                                                style={actionButtonStyle("#2e7d32", isBusy || isApproved)}
                                            >
                                                Approve
                                            </button>

                                            <button
                                                onClick={() => handleReview(candidate, "Rejected")}
                                                disabled={isBusy || candidate.review_status === "Rejected"}
                                                style={actionButtonStyle(
                                                    "#c62828",
                                                    isBusy || candidate.review_status === "Rejected"
                                                )}
                                            >
                                                Reject
                                            </button>

                                            <button
                                                onClick={() => handleConvert(candidate)}
                                                disabled={isBusy || !isApproved || isConverted}
                                                title={
                                                    !isApproved
                                                        ? "Approve this candidate first"
                                                        : isConverted
                                                        ? "Already converted"
                                                        : ""
                                                }
                                                style={actionButtonStyle(
                                                    "#0B2E4F",
                                                    isBusy || !isApproved || isConverted
                                                )}
                                            >
                                                {isConverted ? "Converted ✓" : "Convert to Lead"}
                                            </button>

                                        </div>

                                        {rowError && (
                                            <div style={{ color: "#c62828", fontSize: "11px", marginTop: "4px" }}>
                                                {rowError}
                                            </div>
                                        )}

                                    </td>

                                </tr>

                                {duplicatePanel && (
                                    <tr style={{ borderBottom: "1px solid #eee" }}>
                                        <td colSpan={10} style={{ padding: "12px 16px", background: "#f9fafb" }}>

                                            {duplicatePanel.error && (
                                                <div style={{ color: "#c62828", fontSize: "13px" }}>
                                                    {duplicatePanel.error}
                                                </div>
                                            )}

                                            {!duplicatePanel.error && duplicatePanel.matches.length === 0 && (
                                                <div style={{ color: "#666", fontSize: "13px" }}>
                                                    No similar Leads, Accounts, or Discovery Candidates found.
                                                </div>
                                            )}

                                            {!duplicatePanel.error && duplicatePanel.matches.length > 0 && (
                                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                                    {duplicatePanel.matches.map((match, idx) => (
                                                        <div
                                                            key={`${match.source_type}-${match.id}-${idx}`}
                                                            style={{
                                                                display: "flex",
                                                                justifyContent: "space-between",
                                                                alignItems: "center",
                                                                fontSize: "13px",
                                                                padding: "6px 10px",
                                                                background: "#fff",
                                                                borderRadius: "6px",
                                                                border: "1px solid #eee"
                                                            }}
                                                        >
                                                            <span>
                                                                <strong>{match.source_type}:</strong> {match.name || "-"}
                                                                {match.matched_on.length > 0 && (
                                                                    <span style={{ color: "#888" }}>
                                                                        {" "}(matched on {match.matched_on.join(", ")})
                                                                    </span>
                                                                )}
                                                            </span>
                                                            <span style={{ fontWeight: "bold", color: "#0B2E4F" }}>
                                                                {match.score}%
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                        </td>
                                    </tr>
                                )}

                                </Fragment>
                            );

                        })}
                    </tbody>

                </table>

                {candidates.length === 0 && (
                    <div style={{ padding: "30px", textAlign: "center", color: "#777" }}>
                        No discovery candidates found.
                    </div>
                )}

            </div>

        </div>
    );

}


function actionButtonStyle(color, disabled) {

    return {
        padding: "6px 10px",
        borderRadius: "6px",
        border: `1px solid ${color}`,
        background: disabled ? "#f0f0f0" : "#fff",
        color: disabled ? "#aaa" : color,
        fontSize: "12px",
        fontWeight: "bold",
        cursor: disabled ? "default" : "pointer",
        whiteSpace: "nowrap"
    };

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
