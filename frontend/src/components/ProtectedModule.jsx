import { useUser } from "../context/UserContext";

export default function ProtectedModule({ permission, children }) {
    const { hasPermission, loading } = useUser();

    if (loading) {
        return (
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "60vh",
                    color: "var(--gs-ink-muted)",
                    fontSize: "13.5px"
                }}
            >
                Loading…
            </div>
        );
    }

    if (!hasPermission(permission)) {
        return (
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "60vh"
                }}
            >
                <div style={{ textAlign: "center", maxWidth: "360px" }}>
                    <div style={{ fontSize: "34px", marginBottom: "8px" }}>🔒</div>
                    <h2 style={{ color: "var(--gs-danger)", fontSize: "18px" }}>Access denied</h2>
                    <p style={{ color: "var(--gs-ink-muted)", marginTop: "6px", fontSize: "13.5px" }}>
                        You do not have permission to access this module. Contact an administrator
                        if you believe this is a mistake.
                    </p>
                </div>
            </div>
        );
    }

    return children;
}
