import { useState, useRef, useCallback, useEffect } from "react";
import { useRealtime } from "./RealtimeContext";

// A rep's live position is only ever streamed while they've explicitly
// turned this on - no silent background tracking. Throttles sends to at
// most once per MIN_SEND_INTERVAL_MS regardless of how often the browser's
// watchPosition callback fires.
const MIN_SEND_INTERVAL_MS = 15000;

export function useLocationSharing() {
    const { send } = useRealtime();
    const [sharing, setSharing] = useState(false);
    const [error, setError] = useState("");
    const watchIdRef = useRef(null);
    const lastSentRef = useRef(0);

    const stop = useCallback(() => {
        if (watchIdRef.current != null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
            // Only tell the server if we were actually watching - avoids a
            // pointless send on the initial mount/unmount when sharing was
            // never on.
            send({ type: "position_stop" });
        }

        setSharing(false);
    }, [send]);

    const start = useCallback(() => {
        if (!navigator.geolocation) {
            setError("Geolocation is not supported by this browser.");
            return;
        }

        setError("");

        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                const now = Date.now();

                if (now - lastSentRef.current < MIN_SEND_INTERVAL_MS) return;

                lastSentRef.current = now;

                send({
                    type: "position_update",
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
            },
            (err) => {
                if (err.code === 1) {
                    setError("Location permission denied. Enable GPS access in your browser and retry.");
                } else if (err.code === 2) {
                    setError("Unable to determine your location. Move to an open area and retry.");
                } else if (err.code === 3) {
                    setError("Location request timed out. Try again.");
                } else {
                    setError(err.message || "Unable to share your location.");
                }

                stop();
            },
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
        );

        setSharing(true);
    }, [send, stop]);

    function toggleSharing() {
        if (sharing) {
            stop();
        } else {
            start();
        }
    }

    useEffect(() => stop, [stop]);

    return { sharing, error, toggleSharing };
}
