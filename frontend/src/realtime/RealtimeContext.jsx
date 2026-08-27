import { createContext, useContext, useEffect, useRef, useCallback } from "react";
import { WS_URL, getToken } from "../config/apiBase";
import { useAuth } from "../context/AuthContext";

const RealtimeContext = createContext(null);

const RECONNECT_DELAY_MS = 3000;

// Owns ONE WebSocket connection for the whole app - promoted out of
// mapview.jsx-scoped useLiveFeed so it works regardless of which module is
// open (needed for location sharing and live-ops notifications) and so it
// can reconnect instead of dying silently on a dropped connection.
export function RealtimeProvider({ children }) {
    const { isAuthenticated } = useAuth();
    const wsRef = useRef(null);
    const listenersRef = useRef(new Map());
    const reconnectTimerRef = useRef(null);
    const closedByUsRef = useRef(false);

    const dispatch = useCallback((message) => {
        const handlers = listenersRef.current.get(message.type);
        if (!handlers) return;
        handlers.forEach(handler => handler(message.data));
    }, []);

    useEffect(() => {
        if (!isAuthenticated) {
            return;
        }

        closedByUsRef.current = false;

        function connect() {
            const token = getToken();
            if (!token) return;

            const ws = new WebSocket(`${WS_URL}?token=${token}`);
            wsRef.current = ws;

            ws.onmessage = (event) => {
                try {
                    dispatch(JSON.parse(event.data));
                } catch {
                    // ignore malformed messages
                }
            };

            ws.onclose = (closeEvent) => {
                wsRef.current = null;

                if (closedByUsRef.current) return;

                // A 4401 means the token was rejected - reconnecting
                // immediately won't fix a stale/expired token, so don't retry.
                if (closeEvent.code === 4401) return;

                reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
            };
        }

        connect();

        return () => {
            closedByUsRef.current = true;
            clearTimeout(reconnectTimerRef.current);
            wsRef.current?.close();
            wsRef.current = null;
        };
    }, [isAuthenticated, dispatch]);

    const subscribe = useCallback((eventType, handler) => {
        if (!listenersRef.current.has(eventType)) {
            listenersRef.current.set(eventType, new Set());
        }

        listenersRef.current.get(eventType).add(handler);

        return () => {
            listenersRef.current.get(eventType)?.delete(handler);
        };
    }, []);

    const send = useCallback((obj) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(obj));
        }
    }, []);

    const value = { subscribe, send };

    return (
        <RealtimeContext.Provider value={value}>
            {children}
        </RealtimeContext.Provider>
    );
}

export function useRealtime() {
    const context = useContext(RealtimeContext);

    if (!context) {
        throw new Error("useRealtime must be used inside RealtimeProvider");
    }

    return context;
}
