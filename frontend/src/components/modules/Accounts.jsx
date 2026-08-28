import { useEffect, useState } from "react";
import { getAllAccounts, createAccount, updateAccount, getOpportunities } from "../../services/salesforceApi";
import { useUser } from "../../context/UserContext";
import { buildClosedWonRevenueMap } from "../../utils/accountRevenue";

const ACCOUNT_TYPES = [
    "Prospect",
    "Customer - Direct",
    "Customer - Channel",
    "Channel Partner / Reseller",
    "Installation Partner",
    "Technology Partner",
    "Other"
];

// The only two GIS_Validation_Status__c values this app ever writes -
// confirmed valid picklist values, not guessed.
const GIS_VALIDATION_STATUSES = ["Validated", "Pending"];

export default function Accounts() {

    const { can } = useUser();
    const canEdit = can("EDIT_ACCOUNTS");

    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [showForm, setShowForm] = useState(false);
    const [editingAccountId, setEditingAccountId] = useState(null);
    const [formValues, setFormValues] = useState({
        name: "",
        phone: "",
        type: ACCOUNT_TYPES[0],
        billingCity: "",
        validationStatus: "",
        lastVisitDate: "",
        nextVisitDate: ""
    });
    const [formError, setFormError] = useState("");
    const [formSubmitting, setFormSubmitting] = useState(false);

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

        loadAccounts();

    }, []);

    async function loadAccounts() {

            console.log("=== ACCOUNTS: START API CALL ===");

            try {

                setLoading(true);
                setError("");

                const data = await getAllAccounts();

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

                // AnnualRevenue is static and never reflects a deal
                // actually closing - overlay each account's real Closed
                // Won total where it has one, same as the GIS Map does.
                const opportunities = await getOpportunities().catch(() => []);
                const closedWonByAccountId = buildClosedWonRevenueMap(
                    Array.isArray(opportunities) ? opportunities : []
                );

                const enrichedAccounts = data.map(account => {
                    const wonRevenue = closedWonByAccountId.get(account.Id);
                    return wonRevenue != null
                        ? { ...account, AnnualRevenue: wonRevenue }
                        : account;
                });

                setAccounts(enrichedAccounts);

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

    function resetForm() {

        setFormValues({
            name: "",
            phone: "",
            type: ACCOUNT_TYPES[0],
            billingCity: "",
            validationStatus: "",
            lastVisitDate: "",
            nextVisitDate: ""
        });

        setEditingAccountId(null);

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

    function handleStartEdit(account) {

        setEditingAccountId(account.Id);

        setFormValues({
            name: account.Name || "",
            phone: account.Phone || "",
            type: account.Type || ACCOUNT_TYPES[0],
            billingCity: account.BillingCity || "",
            validationStatus: account.GIS_Validation_Status__c || "",
            lastVisitDate: account.Last_Visit_Date__c || "",
            nextVisitDate: account.Next_Visit_Date__c || ""
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
                Phone: formValues.phone.trim() || null,
                Type: formValues.type,
                BillingCity: formValues.billingCity.trim() || null
            };

            if (editingAccountId) {
                // Only on edit, and sent explicitly even when blank - a
                // blank Validation Status/Last/Next Visit Date here means
                // "clear it" (e.g. reopening a closed record for a fresh
                // visit), not "leave it alone".
                payload.GIS_Validation_Status__c = formValues.validationStatus || null;
                payload.Last_Visit_Date__c = formValues.lastVisitDate || null;
                payload.Next_Visit_Date__c = formValues.nextVisitDate || null;

                await updateAccount(editingAccountId, payload);
            } else {
                await createAccount(payload);
            }

            resetForm();

            setShowForm(false);

            await loadAccounts();

        } catch (err) {

            setFormError(
                err.message ||
                (editingAccountId ? "Failed to update account." : "Failed to create account.")
            );

        } finally {

            setFormSubmitting(false);

        }

    }


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
                        {showForm && !editingAccountId ? "Cancel" : "+ Log New Account"}
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

                    {editingAccountId && (
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
                        <label style={fieldLabelStyle}>Phone</label>
                        <input
                            type="text"
                            value={formValues.phone}
                            onChange={e => setFormValues(prev => ({ ...prev, phone: e.target.value }))}
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
                            {ACCOUNT_TYPES.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={fieldLabelStyle}>Billing City</label>
                        <input
                            type="text"
                            value={formValues.billingCity}
                            onChange={e => setFormValues(prev => ({ ...prev, billingCity: e.target.value }))}
                            style={fieldInputStyle}
                        />
                    </div>

                    {editingAccountId && (
                        <>
                            <div>
                                <label style={fieldLabelStyle}>Validation Status</label>
                                <select
                                    value={formValues.validationStatus}
                                    onChange={e => setFormValues(prev => ({ ...prev, validationStatus: e.target.value }))}
                                    style={fieldInputStyle}
                                >
                                    <option value="">- Clear -</option>
                                    {GIS_VALIDATION_STATUSES.map(status => (
                                        <option key={status} value={status}>{status}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={fieldLabelStyle}>Last Visit Date</label>
                                <input
                                    type="date"
                                    value={formValues.lastVisitDate}
                                    onChange={e => setFormValues(prev => ({ ...prev, lastVisitDate: e.target.value }))}
                                    style={fieldInputStyle}
                                />
                                <div style={{ fontSize: "11px", color: "#888", marginTop: "3px" }}>
                                    Leave blank to clear it (e.g. to re-open this record for a fresh visit).
                                </div>
                            </div>

                            <div>
                                <label style={fieldLabelStyle}>Next Visit Date</label>
                                <input
                                    type="date"
                                    value={formValues.nextVisitDate}
                                    onChange={e => setFormValues(prev => ({ ...prev, nextVisitDate: e.target.value }))}
                                    style={fieldInputStyle}
                                />
                                <div style={{ fontSize: "11px", color: "#888", marginTop: "3px" }}>
                                    Schedule the next visit - shows in this list and drives overdue tracking.
                                </div>
                            </div>
                        </>
                    )}

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
                        {editingAccountId && (
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

                            {canEdit && (
                                <th style={cellStyle}>
                                    Actions
                                </th>
                            )}

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

                                    {/* ACTIONS */}

                                    {canEdit && (
                                        <td style={cellStyle}>
                                            <button
                                                onClick={() => handleStartEdit(account)}
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