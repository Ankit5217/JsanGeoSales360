import { useState, useEffect } from "react";
import { useRealtime } from "../../realtime/RealtimeContext";

// Salesforce-side changes (field visits, accounts, GIS data) push into the
// live alert/activity panels instead of requiring a refresh. Consumes the
// shared app-level WebSocket connection (see realtime/RealtimeContext.jsx)
// rather than opening its own.
export function useLiveFeed({ loadAccounts, loadLeads }) {
  const { subscribe } = useRealtime();
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [liveActivityFeed, setLiveActivityFeed] = useState([]);

  function addLiveAlert(type, title, message) {
    const newAlert = {
      id: Date.now(),
      type,
      title,
      message,
      time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    };

    setLiveAlerts(prev => [newAlert, ...prev].slice(0, 10));
  }

  function addLiveActivity(icon, title, message) {
    const activity = {
      id: Date.now(),
      time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      icon,
      title,
      message
    };

    setLiveActivityFeed(prev => [activity, ...prev].slice(0, 10));
  }

  useEffect(() => {
    const unsubscribers = [
      subscribe("field_visit_updated", async () => {
        await Promise.all([loadAccounts(), loadLeads()]);
        addLiveAlert("success", "Field Visit Updated", "A field visit was updated in Salesforce.");
        addLiveActivity("🟢", "Field Visit Updated", "A field visit was updated in Salesforce.");
      }),

      subscribe("account_updated", async () => {
        await Promise.all([loadAccounts(), loadLeads()]);
        addLiveAlert("info", "Account Updated", "Account information was updated in Salesforce.");
        addLiveActivity("🔵", "Account Updated", "Account information was updated in Salesforce.");
      }),

      subscribe("gis_updated", async () => {
        await Promise.all([loadAccounts(), loadLeads()]);
        addLiveAlert("warning", "GIS Data Updated", "GIS information was updated.");
        addLiveActivity("🗺️", "GIS Data Updated", "GIS information was updated.");
      }),

      subscribe("alert", (data) => {
        addLiveAlert("danger", "Real-Time Alert", data?.message || "A new real-time alert was received.");
        addLiveActivity("🚨", "AI Alert", data?.message || "A new real-time alert was received.");
      })
    ];

    return () => unsubscribers.forEach(unsubscribe => unsubscribe());
  }, [subscribe, loadAccounts, loadLeads]);

  return { liveAlerts, liveActivityFeed };
}
