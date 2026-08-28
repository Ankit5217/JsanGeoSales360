import { useState } from "react";
import { updateAccount, updateLead, createFieldVisit, createOpportunity, convertLeadToAccount } from "../../services/salesforceApi";
import { VISIT_OUTCOMES } from "../modules/FieldVisits";
import { OPPORTUNITY_STAGES } from "../../config/opportunityStages";
import { GEOFENCE_RADIUS_METERS, getCurrentPosition, haversine } from "./mapviewUtils";
import { getStatusForOutcome, isOpportunityOutcome } from "./checkoutOutcome";
import { enqueue } from "../../offline/queue";

// CloseDate is required by the Opportunity schema but not asked of the rep
// in the inline checkout form (kept to just name/amount/stage) - 30 days
// out is a reasonable default they can adjust later from the Opportunities
// screen.
function defaultCloseDate() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
}

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
  const [dealName, setDealName] = useState("");
  const [dealAmount, setDealAmount] = useState("");
  const [dealStage, setDealStage] = useState(OPPORTUNITY_STAGES[0]);
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
    setDealName("");
    setDealAmount("");
    setDealStage(OPPORTUNITY_STAGES[0]);
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
      visitFollowUp,
      dealName,
      dealAmount,
      dealStage
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
        const newStatus = getStatusForOutcome(visitOutcome);

        result = await updateLead(selected.id, {
          Last_Visit_Date__c: today,
          GIS_Validation_Status__c: "Validated",
          ...(newStatus ? { Status: newStatus } : {})
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

      // "Opportunity Created" carries real deal details captured on-site.
      // A Lead reaching this outcome just became a real deal, so it also
      // becomes a real Account here (convertLeadToAccount) - the Lead was
      // only ever a prospect, and a "won" one shouldn't be left with no
      // actual customer record behind it. The new Opportunity links to
      // that Account like any other; Accounts checking out already have
      // an Id to link to directly.
      let opportunityNoteSuffix = "";

      if (isOpportunityOutcome(visitOutcome) && dealName.trim()) {
        const opportunityName = `${selected.name} - ${dealName.trim()}`;

        let opportunityAccountId = selected.type === "customer" ? selected.id : null;

        if (selected.type === "lead") {
          const conversion = await convertLeadToAccount(selected.id);
          opportunityAccountId = conversion.account_id;
        }

        await createOpportunity({
          Name: opportunityName,
          StageName: dealStage,
          CloseDate: defaultCloseDate(),
          Amount: dealAmount ? Number(dealAmount) : null,
          AccountId: opportunityAccountId
        });

        opportunityNoteSuffix = `\n[Opportunity created: ${opportunityName}]`;
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
        Notes__c: (visitNotes.trim() + opportunityNoteSuffix).trim() || null,
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
    dealName,
    setDealName,
    dealAmount,
    setDealAmount,
    dealStage,
    setDealStage,
    checkoutSubmitting,
    checkoutStatus,
    checkoutError,
    openRecord,
    checkIn,
    checkOut
  };
}
