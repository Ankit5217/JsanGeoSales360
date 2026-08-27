import { useAuth } from "../context/AuthContext";
import { useLocationSharing } from "../realtime/useLocationSharing";

// Field reps only, and only while logged in - self-gates like OfflineBanner
// does, so it can be mounted unconditionally in App.jsx.
export default function LocationShareToggle() {
    const { isAuthenticated, role } = useAuth();
    const { sharing, error, toggleSharing } = useLocationSharing();

    if (!isAuthenticated || role !== "FIELD_USER") {
        return null;
    }

    return (
        <div
            style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "9px 20px",
                fontSize: "12.5px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "10px",
                flexWrap: "wrap",
                background: error ? "#FBE9E7" : (sharing ? "#E6F4EA" : "#f6f8fb"),
                color: error ? "#C1443C" : (sharing ? "#1E7B34" : "#555")
            }}
        >
            <span>{error ? "⚠" : (sharing ? "📍" : "📴")}</span>
            <span>
                {error || (sharing ? "Sharing your live location with your manager" : "Your location is not being shared")}
            </span>
            <button
                onClick={toggleSharing}
                style={{
                    marginLeft: "auto",
                    border: "1px solid currentColor",
                    background: "transparent",
                    color: "inherit",
                    borderRadius: "6px",
                    padding: "4px 10px",
                    fontSize: "11.5px",
                    fontWeight: 700,
                    cursor: "pointer"
                }}
            >
                {sharing ? "Stop sharing" : "Share my location"}
            </button>
        </div>
    );
}
