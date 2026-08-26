import { useState, useEffect } from "react";
import { WS_URL } from "../../config/apiBase";

// Real-time WebSocket connection: Salesforce-side changes (field visits,
// accounts, GIS data) push into the live alert/activity panels instead of
// requiring a refresh.
export function useLiveFeed({ loadAccounts, loadLeads }) {
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
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log("Real-time WebSocket connected");
    };

    ws.onmessage = async (event) => {
      const message = JSON.parse(event.data);

      if (message.type === "field_visit_updated") {
        await Promise.all([loadAccounts(), loadLeads()]);
        addLiveAlert("success", "Field Visit Updated", "A field visit was updated in Salesforce.");
        addLiveActivity("🟢", "Field Visit Updated", "A field visit was updated in Salesforce.");
      }

      if (message.type === "account_updated") {
        await Promise.all([loadAccounts(), loadLeads()]);
        addLiveAlert("info", "Account Updated", "Account information was updated in Salesforce.");
        addLiveActivity("🔵", "Account Updated", "Account information was updated in Salesforce.");
      }

      if (message.type === "gis_updated") {
        await Promise.all([loadAccounts(), loadLeads()]);
        addLiveAlert("warning", "GIS Data Updated", "GIS information was updated.");
        addLiveActivity("🗺️", "GIS Data Updated", "GIS information was updated.");
      }

      if (message.type === "alert") {
        addLiveAlert("danger", "Real-Time Alert", message.data?.message || "A new real-time alert was received.");
        addLiveActivity("🚨", "AI Alert", message.data?.message || "A new real-time alert was received.");
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
    };

    return () => {
      ws.close();
    };
  }, []);

  return { liveAlerts, liveActivityFeed };
}
