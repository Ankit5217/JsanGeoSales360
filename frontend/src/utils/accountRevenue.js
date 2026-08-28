// A real Opportunity's Closed Won amount is the truth for what an Account
// is worth - Account.AnnualRevenue is a static field nothing in this app's
// checkout/conversion flow ever writes, so it never reflects a deal
// actually closing. Shared by the GIS Map (useRecordsData.js) and the
// Accounts module list view so their revenue figures can't disagree.
//
// Expects opportunities in the shape returned by GET /salesforce/opportunities
// (lowercase keys: stage, account_id, amount).
export function buildClosedWonRevenueMap(opportunities) {
    const map = new Map();

    opportunities
        .filter(o => o.stage === "Closed Won" && o.account_id)
        .forEach(o => {
            map.set(
                o.account_id,
                (map.get(o.account_id) || 0) + (o.amount || 0)
            );
        });

    return map;
}
