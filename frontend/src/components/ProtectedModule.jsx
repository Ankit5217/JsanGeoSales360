import { useUser } from "../context/UserContext";

export default function ProtectedModule({
    permission,
    children
}) {

    const { hasPermission, loading } = useUser();

    if (loading) {
        return (
            <div style={{ padding: "30px" }}>
                Loading...
            </div>
        );
    }

    if (!hasPermission(permission)) {
        return (
            <div
                style={{
                    padding: "40px",
                    textAlign: "center"
                }}
            >
                <h2
                    style={{
                        color: "#C1443C"
                    }}
                >
                    Access Denied
                </h2>

                <p
                    style={{
                        color: "#666"
                    }}
                >
                    You do not have permission to access
                    this module.
                </p>
            </div>
        );
    }

    return children;
}