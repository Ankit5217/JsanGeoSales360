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
