import { useEffect, useState } from "react";
import {
    getDiscoveryCandidates,
    updateDiscoveryCandidate,
    convertDiscoveryCandidateToLead
} from "../../services/salesforceApi";

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

            <div style={{ marginBottom: "20px" }}>
                <h2 style={{ margin: 0, color: "#0B2E4F" }}>Discovery</h2>
                <p style={{ marginTop: "6px", color: "#666" }}>
                    Prospective new accounts and leads awaiting review
                </p>
            </div>

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

                            return (
                                <tr key={candidate.id} style={{ borderBottom: "1px solid #eee" }}>

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
