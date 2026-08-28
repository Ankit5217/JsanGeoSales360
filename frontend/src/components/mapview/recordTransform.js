// Pure transforms from raw Salesforce Account/Lead field shapes to the
// flat record shape the GIS Map, executive analytics, and the scheduled
// PDF report all consume. Extracted from useRecordsData.js so the Node
// report-generation script (generate-executive-report.mjs) can reuse the
// exact same mapping instead of duplicating it.

export function formatAccountRecord(account) {
  return {
    id: account.Id,
    name: account.Name,
    type: "customer",
    territory: account.Territory_ID__c,
    lat: account.Location__Latitude__s,
    lng: account.Location__Longitude__s,
    priority: account.Sales_Priority__c || "Medium",
    owner: account.Owner?.Name || "Not Assigned",
    oppValue: account.AnnualRevenue || 0,
    discoverySource: account.Discovery_Source__c || "-",
    // A blank GIS_Validation_Status__c means "not yet validated," not
    // "validated" - defaulting to "Validated" here previously made every
    // unvalidated account/lead look validated on the GIS Map and in the
    // analytics/scoring that reads from this hook.
    validation: account.GIS_Validation_Status__c || "Pending",
    lastVisit: account.Last_Visit_Date__c || "-",
    nextVisit: account.Next_Visit_Date__c || "-",
    visitStatus: account.Last_Visit_Date__c ? "completed" : "pending"
  };
}

export function formatLeadRecord(lead) {
  return {
    id: lead.Id,
    name: lead.Name,
    type: "lead",
    territory: lead.Territory_ID__c || "Unassigned",
    lat: lead.Location__Latitude__s,
    lng: lead.Location__Longitude__s,
    priority: lead.Sales_Priority__c || "Medium",
    owner: lead.Owner?.Name || "Not Assigned",
    oppValue: 0,
    discoverySource: lead.Discovery_Source__c || "Salesforce Lead",
    validation: lead.GIS_Validation_Status__c || "Pending",
    status: lead.Status || null,
    // A closed Lead (converted or not) is done, not a stop still waiting
    // on a visit - keeps it out of Next-Best-Stop and off the checkout
    // flow, same as a Closed Won/Lost Opportunity.
    isClosed: lead.Status === "Closed - Converted" || lead.Status === "Closed - Not Converted",
    lastVisit: lead.Last_Visit_Date__c || "-",
    nextVisit: lead.Next_Visit_Date__c || "-",
    visitStatus: lead.Last_Visit_Date__c ? "completed" : "pending"
  };
}
