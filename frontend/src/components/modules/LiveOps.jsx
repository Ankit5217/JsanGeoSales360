import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useRealtime } from "../../realtime/RealtimeContext";
import { useRecordsData } from "../mapview/useRecordsData";

const ROLE_COLOR = { ADMIN: "#0B2E4F", SALES_MANAGER: "#0E8388", FIELD_USER: "#D98F00" };

function timeAgoLabel(ms) {
    const seconds = Math.max(0, Math.round(ms / 1000));
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.round(seconds / 60)}m ago`;
}

export default function LiveOps() {
    const { subscribe, send } = useRealtime();
    const { records, leadRecords } = useRecordsData();

    const [reps, setReps] = useState({});
    const [now, setNow] = useState(() => Date.now());
    const [selectedRep, setSelectedRep] = useState("");
    const [selectedTargetId, setSelectedTargetId] = useState("");
    const [nudgeSent, setNudgeSent] = useState("");

    const nudgeTargets = useMemo(
        () => [...records, ...leadRecords].filter(r => r.lat != null && r.lng != null),
        [records, leadRecords]
    );

    useEffect(() => {
        const unsubPosition = subscribe("rep_position", (data) => {
            setReps(prev => ({
                ...prev,
                [data.username]: { ...data, receivedAt: Date.now() }
            }));
        });

        const unsubOffline = subscribe("rep_offline", (data) => {
            setReps(prev => {
                const next = { ...prev };
                delete next[data.username];
                return next;
            });
        });

        return () => {
            unsubPosition();
            unsubOffline();
        };
    }, [subscribe]);

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 5000);
        return () => clearInterval(interval);
    }, []);

    const repList = Object.entries(reps);

    function handleSendNudge() {
        if (!selectedRep || !selectedTargetId) return;

        const target = nudgeTargets.find(t => t.id === selectedTargetId);
        if (!target) return;

        send({
            type: "stop_nudge",
            target_username: selectedRep,
            accountName: target.name,
            lat: target.lat,
            lng: target.lng
        });

        setNudgeSent(`Sent "${target.name}" to ${selectedRep}.`);
        setTimeout(() => setNudgeSent(""), 4000);
    }

    return (
        <div style={{ padding: "24px", boxSizing: "border-box" }}>

            <h2 style={{ marginTop: 0 }}>Live Operations</h2>
            <p style={{ color: "#666", marginTop: "-6px" }}>
                Reps who have turned on "Share my location" appear here in real time.
            </p>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                    gap: "20px",
                    marginTop: "20px"
                }}
            >

                <div
                    style={{
                        background: "#fff",
                        borderRadius: "10px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                        overflow: "hidden",
                        height: "520px"
                    }}
                >
                    <MapContainer center={[17.385, 78.4867]} zoom={11} style={{ height: "100%", width: "100%" }}>
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; OpenStreetMap contributors'
                        />

                        {repList.map(([username, pos]) => (
                            <CircleMarker
                                key={username}
                                center={[pos.lat, pos.lng]}
                                radius={9}
                                pathOptions={{
                                    color: "#fff",
                                    weight: 2,
                                    fillColor: ROLE_COLOR[pos.role] || "#0E8388",
                                    fillOpacity: 0.95
                                }}
                            >
                                <Tooltip permanent direction="top" offset={[0, -8]}>
                                    <strong>{username}</strong> · {timeAgoLabel(now - pos.receivedAt)}
                                </Tooltip>
                            </CircleMarker>
                        ))}
                    </MapContainer>
                </div>

                <div
                    style={{
                        background: "#fff",
                        borderRadius: "10px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                        padding: "18px",
                        boxSizing: "border-box"
                    }}
                >
                    <h3 style={{ marginTop: 0 }}>Reps online ({repList.length})</h3>

                    {repList.length === 0 && (
                        <div style={{ fontSize: "13px", color: "#666" }}>
                            No one is currently sharing their location.
                        </div>
                    )}

                    {repList.map(([username, pos]) => (
                        <div
                            key={username}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "8px 0",
                                borderBottom: "1px solid #eee",
                                fontSize: "13px"
                            }}
                        >
                            <span
                                style={{
                                    width: "10px",
                                    height: "10px",
                                    borderRadius: "50%",
                                    background: ROLE_COLOR[pos.role] || "#0E8388",
                                    flexShrink: 0
                                }}
                            />
                            <strong>{username}</strong>
                            <span style={{ color: "#888" }}>{pos.role}</span>
                            <span style={{ marginLeft: "auto", color: "#888" }}>{timeAgoLabel(now - pos.receivedAt)}</span>
                        </div>
                    ))}

                    <h3 style={{ marginTop: "20px" }}>Nudge a rep to visit next</h3>

                    <label style={{ fontSize: "12px", fontWeight: 600 }}>Rep</label>
                    <select
                        value={selectedRep}
                        onChange={e => setSelectedRep(e.target.value)}
                        style={{ width: "100%", marginBottom: "10px", padding: "8px", border: "1px solid #ccc", borderRadius: "5px" }}
                    >
                        <option value="">Select an online rep</option>
                        {repList.map(([username]) => (
                            <option key={username} value={username}>{username}</option>
                        ))}
                    </select>

                    <label style={{ fontSize: "12px", fontWeight: 600 }}>Account / Lead</label>
                    <select
                        value={selectedTargetId}
                        onChange={e => setSelectedTargetId(e.target.value)}
                        style={{ width: "100%", marginBottom: "10px", padding: "8px", border: "1px solid #ccc", borderRadius: "5px" }}
                    >
                        <option value="">Select a stop</option>
                        {nudgeTargets.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>

                    <button
                        disabled={!selectedRep || !selectedTargetId}
                        onClick={handleSendNudge}
                        style={{ cursor: (!selectedRep || !selectedTargetId) ? "default" : "pointer" }}
                    >
                        Send nudge
                    </button>

                    {nudgeSent && (
                        <div style={{ marginTop: "10px", fontSize: "12px", color: "#1E7B34", background: "#E6F4EA", padding: "8px", borderRadius: "6px" }}>
                            {nudgeSent}
                        </div>
                    )}
                </div>

            </div>

        </div>
    );
}
