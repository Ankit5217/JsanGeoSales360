import { useUser } from "../context/UserContext";
import { useAuth } from "../context/AuthContext";
import jsanLogo from "../assets/jsan-logo.jpg";

const MODULES = [
    { key: "dashboard", label: "Dashboard", icon: "📊", permission: "dashboard" },
    { key: "accounts", label: "Accounts", icon: "🏢", permission: "accounts" },
    { key: "leads", label: "Leads", icon: "👤", permission: "leads" },
    { key: "opportunities", label: "Opportunities", icon: "💰", permission: "opportunities" },
    { key: "discovery", label: "Discovery", icon: "🔍", permission: "discovery" },
    { key: "territories", label: "Territories", icon: "🗺️", permission: "territories" },
    { key: "routes", label: "Routes", icon: "🚗", permission: "routes" },
    { key: "fieldVisits", label: "Field Visits", icon: "📍", permission: "fieldVisits" },
    { key: "evidence", label: "Evidence", icon: "📷", permission: "evidence" },
    { key: "gis", label: "GIS Map", icon: "🌍", permission: "gis" },
    { key: "userRoles", label: "User Roles", icon: "🔐", permission: "userRoles" }
];

export default function Sidebar({ activeModule, onModuleChange }) {
    const { currentUser, hasPermission } = useUser();
    const { logout } = useAuth();

    const allowedModules = MODULES.filter(module => hasPermission(module.permission));
    const initial = (currentUser?.username || "?").charAt(0).toUpperCase();

    return (
        <div
            style={{
                width: "252px",
                minWidth: "252px",
                minHeight: "100vh",
                background: "linear-gradient(180deg, var(--gs-navy) 0%, var(--gs-navy-dark) 100%)",
                color: "var(--gs-ink-on-navy)",
                display: "flex",
                flexDirection: "column",
                boxSizing: "border-box",
                boxShadow: "2px 0 12px rgba(0,0,0,0.15)"
            }}
        >

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "22px 20px",
                    borderBottom: "1px solid rgba(255,255,255,0.1)"
                }}
            >
                <img
                    src={jsanLogo}
                    alt="JSAN logo"
                    style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "8px",
                        objectFit: "cover",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.3)"
                    }}
                />
                <div>
                    <div
                        style={{
                            fontFamily: "var(--gs-font-display)",
                            fontSize: "16px",
                            fontWeight: 800,
                            letterSpacing: "-0.01em",
                            lineHeight: 1.1
                        }}
                    >
                        GeoSales 360
                    </div>
                    <div
                        style={{
                            fontSize: "10.5px",
                            fontWeight: 500,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            color: "var(--gs-teal-light)",
                            marginTop: "2px"
                        }}
                    >
                        Field Sales Intelligence
                    </div>
                </div>
            </div>

            <nav
                style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "16px 12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "3px"
                }}
            >
                {allowedModules.map(module => {
                    const active = activeModule === module.key;
                    return (
                        <button
                            key={module.key}
                            onClick={() => onModuleChange(module.key)}
                            style={{
                                width: "100%",
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                padding: "10px 14px",
                                border: "none",
                                borderLeft: active ? "3px solid var(--gs-teal-light)" : "3px solid transparent",
                                borderRadius: "8px",
                                background: active ? "rgba(255,255,255,0.12)" : "transparent",
                                color: active ? "#ffffff" : "var(--gs-ink-on-navy)",
                                cursor: "pointer",
                                textAlign: "left",
                                fontSize: "13.5px",
                                fontWeight: active ? 600 : 500
                            }}
                            onMouseEnter={e => {
                                if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                            }}
                            onMouseLeave={e => {
                                if (!active) e.currentTarget.style.background = "transparent";
                            }}
                        >
                            <span style={{ fontSize: "16px" }}>{module.icon}</span>
                            <span>{module.label}</span>
                        </button>
                    );
                })}
            </nav>

            <div
                style={{
                    padding: "14px 16px",
                    borderTop: "1px solid rgba(255,255,255,0.1)",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px"
                }}
            >
                <div
                    style={{
                        width: "34px",
                        height: "34px",
                        minWidth: "34px",
                        borderRadius: "50%",
                        background: "var(--gs-teal)",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "14px"
                    }}
                >
                    {initial}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                        style={{
                            fontSize: "12.5px",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis"
                        }}
                    >
                        {currentUser?.username || "Unknown"}
                    </div>
                    <div
                        style={{
                            fontSize: "10.5px",
                            color: "var(--gs-ink-on-navy-muted)"
                        }}
                    >
                        {currentUser?.geoSalesRole || "—"}
                    </div>
                </div>
                <button
                    onClick={logout}
                    title="Sign out"
                    style={{
                        border: "1px solid rgba(255,255,255,0.18)",
                        background: "transparent",
                        color: "var(--gs-ink-on-navy-muted)",
                        borderRadius: "6px",
                        padding: "6px 8px",
                        fontSize: "11px",
                        cursor: "pointer"
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                        e.currentTarget.style.color = "#fff";
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "var(--gs-ink-on-navy-muted)";
                    }}
                >
                    Sign out
                </button>
            </div>

        </div>
    );
}
