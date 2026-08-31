import { listPending, updateStatus, remove, subscribe } from "./queue";
import { getToken } from "../config/apiBase";
import { updateLead, updateAccount, createFieldVisit, createEvidence, createOpportunity, convertLeadToAccount } from "../services/salesforceApi";
import { getStatusForOutcome, isOpportunityOutcome, buildAutoEvidencePayload } from "../components/mapview/checkoutOutcome";

function defaultCloseDate() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
}

async function syncCheckout(payload) {
  const {
    selectedType,
    selectedId,
    selectedName,
    today,
    now,
    checkInTimestamp,
    visitOutcome,
    visitNotes,
    visitFollowUp,
    dealName,
    dealAmount,
    dealStage,
    checkInDistance
  } = payload;

  let result;

  if (selectedType === "lead") {
    const newStatus = getStatusForOutcome(visitOutcome);

    result = await updateLead(selectedId, {
      Last_Visit_Date__c: today,
      GIS_Validation_Status__c: "Validated",
      ...(newStatus ? { Status: newStatus } : {})
    });
  } else {
    result = await updateAccount(selectedId, {
      Last_Visit_Date__c: today,
      GIS_Validation_Status__c: "Validated"
    });
  }

  if (!result || result.success !== true) {
    throw new Error("Salesforce update failed while syncing a queued check-out.");
  }

  // Same conversion reasoning as the live checkout path in useFieldVisit.js -
  // a Lead reaching "Opportunity Created" becomes a real Account here, and
  // the new Opportunity links to it like any other.
  let opportunityNoteSuffix = "";

  if (isOpportunityOutcome(visitOutcome) && dealName && dealName.trim()) {
    const opportunityName = `${selectedName} - ${dealName.trim()}`;

    let opportunityAccountId = selectedType === "customer" ? selectedId : null;

    if (selectedType === "lead") {
      const conversion = await convertLeadToAccount(selectedId);
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

  const visitResult = await createFieldVisit({
    Name: `${selectedName} - ${today}`,
    Account__c: selectedType === "lead" ? null : selectedId,
    Lead__c: selectedType === "lead" ? selectedId : null,
    Visit_Date__c: now,
    Check_In_Time__c: checkInTimestamp,
    Check_Out_Time__c: now,
    Visit_Outcome__c: visitOutcome,
    Notes__c: ((visitNotes ? visitNotes.trim() : "") + opportunityNoteSuffix).trim() || null,
    Follow_up_Date__c: visitFollowUp || null
  });

  // Same auto-evidence logging as the live checkout path in
  // useFieldVisit.js - a failure here shouldn't fail the whole queued
  // item and re-block Account/Lead + Field Visit sync, which already
  // succeeded above.
  try {
    await createEvidence(buildAutoEvidencePayload({
      selectedType,
      selectedId,
      selectedName,
      today,
      fieldVisitId: visitResult?.id,
      checkInDistance
    }));
  } catch (evidenceError) {
    console.error("Auto-evidence logging failed during queued checkout sync:", evidenceError);
  }
}

async function syncEvidence(payload) {
  await createEvidence(payload);
}

async function syncItem(item) {
  if (item.kind === "checkout") {
    return syncCheckout(item.payload);
  }

  if (item.kind === "evidence") {
    return syncEvidence(item.payload);
  }

  throw new Error(`Unknown queued item kind: ${item.kind}`);
}

let draining = false;

// Drains every pending item in the offline queue, oldest first. Stops the
// moment a sync attempt fails because the login token is gone (authFetch
// already cleared it on a 401) - that means the whole session is dead, not
// just this one item, so hammering the rest of the queue with a dead token
// would just mark everything blocked for no reason. A non-auth failure
// (still offline, a transient error) leaves that item "pending" and moves
// on to the next one, so one stuck item never blocks the rest of the queue.
export async function drainQueue() {
  if (draining) {
    return;
  }

  draining = true;

  try {
    const items = await listPending();
    const ordered = [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    for (const item of ordered) {
      try {
        await updateStatus(item.id, "syncing");
        await syncItem(item);
        await remove(item.id);
      } catch (error) {
        if (!getToken()) {
          await updateStatus(item.id, "blocked");
          break;
        }

        console.error("Queued item sync failed, will retry:", item.id, error);
        await updateStatus(item.id, "pending");
      }
    }
  } finally {
    draining = false;
  }
}

let started = false;

// Wires the three portable sync triggers (no W3C Background Sync API -
// Safari/Firefox don't support it, this works everywhere): on regaining
// connectivity, once on startup, and a periodic check while online (covers
// the case where the browser never fires a clean "online" event, or the
// token was refreshed via a fresh login after being blocked).
export function startOfflineSync() {
  if (started) {
    return () => {};
  }

  started = true;

  const onOnline = () => drainQueue();
  window.addEventListener("online", onOnline);

  const interval = setInterval(() => {
    if (navigator.onLine) {
      drainQueue();
    }
  }, 30000);

  drainQueue();

  return () => {
    window.removeEventListener("online", onOnline);
    clearInterval(interval);
    started = false;
  };
}

export { subscribe };
