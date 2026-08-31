// Maps a Field_Visit__c outcome to the Lead Status it implies. Pure, no
// React - shared by useFieldVisit.js (live checkout) and offline/syncEngine.js
// (replaying a queued checkout later), so the two paths can't drift apart.
// Accounts have no Status field at all, so this only ever applies to leads.

const CONTACTED_OUTCOMES = new Set([
    "Successful Meeting",
    "Customer Interested",
    "Follow-up Required",
    "Lead Qualified",
    "Customer Not Available",
    "Visit Rescheduled",
    "No Response"
]);

const CONVERTED_OUTCOMES = new Set([
    "Opportunity Created"
]);

const CLOSED_OUTCOMES = new Set([
    "Lead Rejected",
    "Duplicate Business",
    "Closed Permanently"
]);

// Returns the new Lead Status for this outcome, or null if the outcome
// shouldn't change it (e.g. "Incorrect Location" is a data-quality flag,
// not a sales-progress signal).
export function getStatusForOutcome(outcome) {
    if (CONTACTED_OUTCOMES.has(outcome)) return "Working - Contacted";
    if (CONVERTED_OUTCOMES.has(outcome)) return "Closed - Converted";
    if (CLOSED_OUTCOMES.has(outcome)) return "Closed - Not Converted";
    return null;
}

export function isOpportunityOutcome(outcome) {
    return outcome === "Opportunity Created";
}

// Every checkout has already passed a live GPS geofence check before the
// "Check out" button is even reachable (see mapview.jsx - it only renders
// once geofenceOk === true), so the checkout itself IS a location
// verification. This builds the Validation_Evidence__c payload for that
// verification automatically, so the rep never has to separately open the
// Evidence module and pick the Account/Lead themselves. Shared by
// useFieldVisit.js (live checkout) and offline/syncEngine.js (replaying a
// queued checkout later) so the two paths can't drift apart.
export function buildAutoEvidencePayload({ selectedType, selectedId, selectedName, today, fieldVisitId, checkInDistance }) {
    return {
        Name: `${selectedName} - ${today} - GPS Verification`,
        Evidence_Type__c: "GPS Verification",
        Account__c: selectedType === "lead" ? null : selectedId,
        Lead__c: selectedType === "lead" ? selectedId : null,
        Field_Visit__c: fieldVisitId || null,
        Validation_Date__c: today,
        Remarks__c: checkInDistance != null
            ? `Auto-logged from checkout - ${Math.round(checkInDistance)}m from location at check-in, within the geofence.`
            : "Auto-logged from checkout - location verified at check-in, within the geofence."
    };
}
