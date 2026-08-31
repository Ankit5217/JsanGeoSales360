import { useState, useEffect } from "react";
import { useRealtime } from "../realtime/RealtimeContext";
import { playNudgeReceivedSound } from "../utils/notificationSound";

const SLIDE_IN_KEYFRAMES = `
@keyframes stopNudgeSlideIn {
    from { transform: translateX(24px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}
@keyframes stopNudgeRingPulse {
    0% { box-shadow: 0 6px 20px rgba(0,0,0,0.25), 0 0 0 0 rgba(14,131,136,0.55); }
    70% { box-shadow: 0 6px 20px rgba(0,0,0,0.25), 0 0 0 14px rgba(14,131,136,0); }
    100% { box-shadow: 0 6px 20px rgba(0,0,0,0.25), 0 0 0 0 rgba(14,131,136,0); }
}
`;

// A manager's "visit this next" nudge (Live Ops) reaches the rep here,
// mounted at the App.jsx level so it shows up regardless of which module
// the rep currently has open - the same reasoning as OfflineBanner. This
// is the only genuinely real-time, targeted-at-one-user notification in
// the app today, so it's the one that plays a sound - it can arrive while
// the rep is looking at a completely different screen.
export default function StopNudgeToast() {
    const { subscribe } = useRealtime();
    const [nudges, setNudges] = useState([]);

    useEffect(() => {
        return subscribe("stop_nudge", (data) => {
            const id = Date.now();
            setNudges(prev => [...prev, { id, ...data }]);
            playNudgeReceivedSound();
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
            <style>{SLIDE_IN_KEYFRAMES}</style>
            {nudges.map(nudge => (
                <div
                    key={nudge.id}
                    style={{
                        background: "#0B2E4F",
                        color: "#fff",
                        borderRadius: "10px",
                        padding: "14px 16px",
                        boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
                        fontSize: "13px",
                        animation: "stopNudgeSlideIn 0.28s ease-out, stopNudgeRingPulse 1.4s ease-out 0.28s"
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
