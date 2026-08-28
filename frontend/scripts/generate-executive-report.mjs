// Generates the same AI Executive Report PDF the GIS Map's "Download PDF"
// button produces in the browser, headlessly - reusing the real
// computeExecutiveAnalytics/generateExecutiveReport code, not a
// reimplementation. Invoked by the backend's report scheduler
// (report_scheduler_service.py) as a subprocess.
//
// Usage: node generate-executive-report.mjs <output-pdf-path>
// Input: one JSON object on stdin - { accounts, leads, opportunities },
// each the raw array of Salesforce records as returned by this app's
// existing get_all_accounts()/get_leads()/get_opportunities() (Python).
//
// Writes the PDF to <output-pdf-path> on success; on failure, prints an
// error to stderr and exits non-zero.

import { writeFile } from "node:fs/promises";
import { formatAccountRecord, formatLeadRecord } from "../src/components/mapview/recordTransform.js";
import { buildClosedWonRevenueMap } from "../src/utils/accountRevenue.js";
import { computeExecutiveAnalytics } from "../src/components/mapview/executiveAnalytics.js";
import { generateExecutiveReport } from "../src/components/mapview/reportExport.js";

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  const outputPath = process.argv[2];

  if (!outputPath) {
    throw new Error("Usage: node generate-executive-report.mjs <output-pdf-path>");
  }

  const raw = await readStdin();
  const { accounts = [], leads = [], opportunities = [] } = JSON.parse(raw);

  const formattedAccounts = accounts
    .map(formatAccountRecord)
    .filter(a => a.lat != null && a.lng != null);

  const formattedLeads = leads
    .map(formatLeadRecord)
    .filter(l => l.lat != null && l.lng != null);

  // Same real-revenue overlay useRecordsData.js applies on the GIS Map,
  // so the emailed report's revenue figures match what's shown live.
  const closedWonByAccountId = buildClosedWonRevenueMap(opportunities);
  const recordsWithRevenue = formattedAccounts.map(r => {
    const wonRevenue = closedWonByAccountId.get(r.id);
    return wonRevenue != null ? { ...r, oppValue: wonRevenue } : r;
  });

  // Accounts + Leads cover the real territory codes - an Opportunity's
  // territory is always inherited from its Account, which already
  // contributes that same code here.
  const territoryOptions = [
    ...new Set(
      [...recordsWithRevenue, ...formattedLeads]
        .map(r => r.territory)
        .filter(Boolean)
    )
  ];

  const analytics = computeExecutiveAnalytics(recordsWithRevenue, territoryOptions, opportunities);
  const pdfArrayBuffer = generateExecutiveReport(analytics, { save: false });

  await writeFile(outputPath, Buffer.from(pdfArrayBuffer));
}

main().catch(err => {
  console.error(err.stack || err.message || String(err));
  process.exit(1);
});
