import { useState } from "react";
import { updateAccount, updateLead, createFieldVisit } from "../../services/salesforceApi";
import { VISIT_OUTCOMES } from "../modules/FieldVisits";
import { GEOFENCE_RADIUS_METERS, getCurrentPosition, haversine } from "./mapviewUtils";
import { enqueue } from "../../offline/queue";

// The on-site check-in -> geofence verification -> outcome capture ->
// check-out flow for a selected Account/Lead, plus the record-selection
// state the detail panel reads from.
export function useFieldVisit({ combinedRecords, loadAccounts, loadLeads }) {
  const [selectedId, setSelectedId] = useState(null);
  const [geofenceOk, setGeofenceOk] = useState(null);
  const [checkInDistance, setCheckInDistance] = useState(null);
  const [checkInError, setCheckInError] = useState("");
  const [checkInTimestamp, setCheckInTimestamp] = useState(null);
  const [visitOutcome, setVisitOutcome] = useState(VISIT_OUTCOMES[0]);
  const [visitNotes, setVisitNotes] = useState("");
  const [visitFollowUp, setVisitFollowUp] = useState("");
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  // 'idle' | 'submitting' | 'queued' | 'error' - queued means it's saved to
  // the offline queue and will sync automatically, not a failure.
  const [checkoutStatus, setCheckoutStatus] = useState("idle");
  const [checkoutError, setCheckoutError] = useState("");

  const selected = combinedRecords.find(r => r.id === selectedId) || null;

  function resetCheckInState() {
    setGeofenceOk(null);
    setCheckInDistance(null);
    setCheckInError("");
    setCheckInTimestamp(null);
    setVisitOutcome(VISIT_OUTCOMES[0]);
    setVisitNotes("");
    setVisitFollowUp("");
    setCheckoutStatus("idle");
    setCheckoutError("");
  }

  function openRecord(r) {
    setSelectedId(r.id);
    resetCheckInState();
  }

  async function checkIn() {
    if (!selected) return;

    setCheckInError("");

    try {
      const position = await getCurrentPosition();
      const { latitude, longitude } = position.coords;

      if (selected.lat == null || selected.lng == null) {
        setCheckInError("This record has no saved location to verify your position against.");
        setGeofenceOk(false);
        return;
      }

      const distanceMeters = haversine(
        [latitude, longitude],
        [selected.lat, selected.lng]
      ) * 1000;

      setCheckInDistance(distanceMeters);
      setCheckInTimestamp(new Date().toISOString());

      const withinGeofence = distanceMeters <= GEOFENCE_RADIUS_METERS;
      setGeofenceOk(withinGeofence);
    } catch (error) {
      console.error("Check-in error:", error);

      if (error.code === 1) {
        setCheckInError("Location permission denied. Enable GPS access in your browser and retry.");
      } else if (error.code === 2) {
        setCheckInError("Unable to determine your location. Move to an open area and retry.");
      } else if (error.code === 3) {
        setCheckInError("Location request timed out. Try again.");
      } else {
        setCheckInError(error.message || "Unable to verify your location.");
      }

      setGeofenceOk(false);
    }
  }

  async function checkOut() {
    if (!selected) {
      console.warn("No account/lead selected");
      return;
    }

    setCheckoutSubmitting(true);
    setCheckoutStatus("submitting");
    setCheckoutError("");

    const today = new Date().toISOString().split("T")[0];
    const now = new Date().toISOString();

    // Everything runSyncedCheckout / the offline sync engine needs to
    // reconstruct this exact check-out later, since checkInTimestamp/today/
    // now are point-in-time values, not something to recompute at sync time.
    const queuedPayload = {
      selectedType: selected.type,
      selectedId: selected.id,
      selectedName: selected.name,
      today,
      now,
      checkInTimestamp,
      visitOutcome,
      visitNotes,
      visitFollowUp
    };

    async function queueForLater() {
      await enqueue("checkout", queuedPayload);
      setSelectedId(selected.id);
      resetCheckInState();
      setCheckoutStatus("queued");
    }

    if (!navigator.onLine) {
      await queueForLater();
      setCheckoutSubmitting(false);
      return;
    }

    try {
      let result;

      if (selected.type === "lead") {
        result = await updateLead(selected.id, {
          Last_Visit_Date__c: today,
          GIS_Validation_Status__c: "Validated"
        });
      } else {
        result = await updateAccount(selected.id, {
          Last_Visit_Date__c: today,
          GIS_Validation_Status__c: "Validated"
        });
      }

      if (!result || result.success !== true) {
        throw new Error("Salesforce update failed while checking out.");
      }

      // Real Field_Visit__c record - check-in/out time, geofence-verified
      // outcome and notes captured on-site, not a hardcoded pass.
      await createFieldVisit({
        Name: `${selected.name} - ${today}`,
        Account__c: selected.type === "lead" ? null : selected.id,
        Lead__c: selected.type === "lead" ? selected.id : null,
        Visit_Date__c: now,
        Check_In_Time__c: checkInTimestamp,
        Check_Out_Time__c: now,
        Visit_Outcome__c: visitOutcome,
        Notes__c: visitNotes.trim() || null,
        Follow_up_Date__c: visitFollowUp || null
      });

      await Promise.all([loadAccounts(), loadLeads()]);

      setSelectedId(selected.id);
      resetCheckInState();
    } catch (error) {
      console.error("Check-out error:", error);

      // A fetch()-level network failure (offline, DNS, connection refused)
      // throws a plain TypeError before a response ever comes back - that's
      // the signal to queue for later, not to show an error. A real HTTP
      // error status (validation failure, etc.) reached the caller as a
      // regular Error and should still surface as an error; retrying it
      // automatically later wouldn't help.
      if (error instanceof TypeError || !navigator.onLine) {
        await queueForLater();
      } else {
        setCheckoutStatus("error");
        setCheckoutError(error.message || "Failed to check out. Try again.");
      }
    } finally {
      setCheckoutSubmitting(false);
    }
  }

  return {
    selectedId,
    setSelectedId,
    selected,
    geofenceOk,
    checkInDistance,
    checkInError,
    visitOutcome,
    setVisitOutcome,
    visitNotes,
    setVisitNotes,
    visitFollowUp,
    setVisitFollowUp,
    checkoutSubmitting,
    checkoutStatus,
    checkoutError,
    openRecord,
    checkIn,
    checkOut
  };
}
