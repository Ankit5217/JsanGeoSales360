import { useState, useEffect } from "react";
import { useRealtime } from "../realtime/RealtimeContext";

// A manager's "visit this next" nudge (Live Ops) reaches the rep here,
// mounted at the App.jsx level so it shows up regardless of which module
// the rep currently has open - the same reasoning as OfflineBanner.
export default function StopNudgeToast() {
    const { subscribe } = useRealtime();
    const [nudges, setNudges] = useState([]);

    useEffect(() => {
        return subscribe("stop_nudge", (data) => {
            const id = Date.now();
            setNudges(prev => [...prev, { id, ...data }]);
            setTimeout(() => {
                setNudges(prev => prev.filter(n => n.id !== id));
            }, 15000);
        });
    }, [subscribe]);

    if (nudges.length === 0) {
        return null;
    }

    return (
        <div
            style={{
                position: "fixed",
                bottom: "20px",
                right: "20px",
                zIndex: 2000,
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                maxWidth: "320px"
            }}
        >
            {nudges.map(nudge => (
                <div
                    key={nudge.id}
                    style={{
                        background: "#0B2E4F",
                        color: "#fff",
                        borderRadius: "10px",
                        padding: "14px 16px",
                        boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
                        fontSize: "13px"
                    }}
                >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                        <strong>Visit this next</strong>
                        <button
                            onClick={() => setNudges(prev => prev.filter(n => n.id !== nudge.id))}
                            style={{
                                border: "none",
                                background: "transparent",
                                color: "#fff",
                                cursor: "pointer",
                                fontSize: "14px",
                                lineHeight: 1
                            }}
                        >
                            ✕
                        </button>
                    </div>
                    <div style={{ marginTop: "6px" }}>
                        {nudge.accountName || "A stop"} — suggested by {nudge.from}
                    </div>
                </div>
            ))}
        </div>
    );
}
