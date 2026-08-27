import { useEffect, useState, useCallback } from "react";
import { listAll, subscribe } from "../offline/queue";

export default function OfflineBanner() {
    const [items, setItems] = useState([]);
    const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);

    const refresh = useCallback(() => {
        listAll().then(setItems).catch(() => {});
    }, []);

    useEffect(() => {
        refresh();
        const unsubscribe = subscribe(refresh);

        const goOnline = () => setOnline(true);
        const goOffline = () => setOnline(false);
        window.addEventListener("online", goOnline);
        window.addEventListener("offline", goOffline);

        return () => {
            unsubscribe();
            window.removeEventListener("online", goOnline);
            window.removeEventListener("offline", goOffline);
        };
    }, [refresh]);

    const blocked = items.filter(item => item.status === "blocked");
    const active = items.filter(item => item.status !== "blocked");

    if (blocked.length === 0 && active.length === 0 && online) {
        return null;
    }

    const blockedMessage =
        blocked.length > 0
            ? `Sign in again to sync ${blocked.length} pending item${blocked.length === 1 ? "" : "s"}.`
            : null;

    const activeMessage =
        active.length > 0
            ? `${online ? "" : "Offline — "}${active.length} item${active.length === 1 ? "" : "s"} queued, will sync automatically.`
            : (!online ? "Offline — changes will be saved and synced automatically." : null);

    const isBlocked = Boolean(blockedMessage);

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
                gap: "8px",
                background: isBlocked ? "#FBE9E7" : "#B5760A",
                color: isBlocked ? "#C1443C" : "#fff"
            }}
        >
            <span>{isBlocked ? "🔒" : "⏳"}</span>
            <span>{blockedMessage || activeMessage}</span>
        </div>
    );
}
