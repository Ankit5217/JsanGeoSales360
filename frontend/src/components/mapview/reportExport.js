import jsPDF from "jspdf";

function downloadCsv(filename, headers, rows) {
  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportBusinessData(records) {
  const headers = ["Account", "Territory", "Priority", "Revenue", "Latitude", "Longitude"];

  const rows = records.map(record => [
    record.name || record.accountName || "",
    record.territory || "",
    record.priority || "",
    record.oppValue || 0,
    record.lat || "",
    record.lng || ""
  ]);

  downloadCsv("JSAN_GeoSales_Business_Data.csv", headers, rows);
}

export function exportAIActivity(liveActivityFeed) {
  const headers = ["Time", "Activity", "Message"];
  const rows = liveActivityFeed.map(activity => [activity.time, activity.title, activity.message]);

  downloadCsv("JSAN_GeoSales_AI_Activity_Report.csv", headers, rows);
}

// analytics is the object returned by computeExecutiveAnalytics - only the
// fields the report actually reads are destructured below.
export function generateExecutiveReport(analytics) {
  const {
    executiveSummary,
    salesForecast,
    executiveHealthScore,
    executiveStatus,
    validationRate,
    aiRecommendations,
    pendingVisits,
    attentionRequired
  } = analytics;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  let y = 20;

  // HEADER
  doc.setFillColor(11, 46, 79);
  doc.rect(0, 0, pageWidth, 32, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("JSAN GeoSales 360", pageWidth / 2, 14, { align: "center" });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("AI Executive Report", pageWidth / 2, 23, { align: "center" });

  // REPORT DATE
  y = 45;
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, 15, y);

  // EXECUTIVE SUMMARY
  y += 15;
  doc.setTextColor(11, 46, 79);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("EXECUTIVE SUMMARY", 15, y);

  y += 10;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 40, 40);

  doc.text(`Current Revenue: Rs. ${executiveSummary.totalRevenue.toLocaleString("en-IN")}`, 20, y);
  y += 7;
  doc.text(`Forecast Revenue: Rs. ${salesForecast.toLocaleString("en-IN")}`, 20, y);
  y += 7;
  doc.text(`Growth: ${executiveSummary.growth}%`, 20, y);
  y += 7;
  doc.text(`Executive Health: ${executiveHealthScore}%`, 20, y);
  y += 7;
  doc.text(`Executive Status: ${executiveStatus}`, 20, y);

  // BUSINESS HEALTH
  y += 15;
  doc.setTextColor(11, 46, 79);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("BUSINESS HEALTH", 15, y);

  y += 10;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 40, 40);

  doc.text(`Validation Rate: ${validationRate.toFixed(1)}%`, 20, y);
  y += 7;
  doc.text(`AI Opportunities: ${aiRecommendations.length}`, 20, y);
  y += 7;
  doc.text(`Pending Field Visits: ${pendingVisits}`, 20, y);
  y += 7;
  doc.text(`High Priority Accounts: ${attentionRequired}`, 20, y);

  // TERRITORY PERFORMANCE
  y += 15;
  doc.setTextColor(11, 46, 79);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("TERRITORY PERFORMANCE", 15, y);

  y += 10;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 40, 40);

  doc.text(`Best Territory: ${executiveSummary.bestTerritory}`, 20, y);
  y += 7;
  doc.text(`Highest AI Score: ${executiveSummary.highestAIScore}`, 20, y);
  y += 7;
  doc.text(`Accounts To Visit: ${executiveSummary.accountsToVisit}`, 20, y);

  // AI RECOMMENDATION
  y += 15;
  doc.setTextColor(11, 46, 79);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("AI EXECUTIVE RECOMMENDATION", 15, y);

  y += 10;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);

  const recommendation =
    executiveHealthScore >= 80
      ? "Business performance is excellent. Continue focusing on High Priority Accounts and maximize forecast opportunities."
      : executiveHealthScore >= 60
      ? "Validation performance is average. Increase field visits and improve account verification."
      : "Immediate management attention is recommended. Revenue growth and validation performance are below expected levels.";

  const wrappedRecommendation = doc.splitTextToSize(recommendation, pageWidth - 40);
  doc.text(wrappedRecommendation, 20, y);

  // FOOTER
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("JSAN GeoSales 360 | AI-powered GIS Sales Intelligence", pageWidth / 2, pageHeight - 10, { align: "center" });

  doc.save("JSAN_GeoSales_Executive_Report.pdf");
}
