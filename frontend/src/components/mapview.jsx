import { useState } from "react";
import { useUser } from "../context/UserContext";
import useIsMobile from "../hooks/useIsMobile";
import { MapContainer, TileLayer, CircleMarker, LayerGroup, Polygon, Polyline, Tooltip, ZoomControl } from 'react-leaflet';
import "leaflet/dist/leaflet.css";
import { VISIT_OUTCOMES } from "./modules/FieldVisits";
import { OPPORTUNITY_STAGES } from "./modules/Opportunities";
import { isOpportunityOutcome } from "./mapview/checkoutOutcome";
import {
    PRIORITY_COLOR,
    GEOFENCE_RADIUS_METERS,
    TERRITORY_BOUNDARY_COLORS,
    NEXT_BEST_STOP_RADIUS_KM,
    parseTerritoryBoundary
} from "./mapview/mapviewUtils";
import { FitToRoute, FitToRecords, TerritoryDrawControl } from "./mapview/MapLayers";
import { computeExecutiveAnalytics } from "./mapview/executiveAnalytics";
import ExecutiveAnalyticsPanel from "./mapview/ExecutiveAnalyticsPanel";
import { useRecordsData } from "./mapview/useRecordsData";
import { useTerritoryBoundary } from "./mapview/useTerritoryBoundary";
import { useTerritoryBalance } from "./mapview/useTerritoryBalance";
import { useFieldVisit } from "./mapview/useFieldVisit";
import { useRouteGeneration } from "./mapview/useRouteGeneration";
import { useNextBestStops } from "./mapview/useNextBestStops";
import { useLiveFeed } from "./mapview/useLiveFeed";
import { generateExecutiveReport, exportBusinessData, exportAIActivity } from "./mapview/reportExport";

export default function MapView() {
  const { can } = useUser();
  const canManageTerritories = can("MANAGE_TERRITORIES");
  const canPlanRoutes = can("CREATE_WORK_ORDER") || can("ASSIGN_WORK_ORDER");
  const canUpdateWorkOrder = can("UPDATE_WORK_ORDER");

  const {
    records,
    leadRecords,
    opportunityRecords,
    allOpportunities,
    territoryList,
    loadAccounts,
    loadLeads,
    loadTerritories
  } = useRecordsData();

  const {
    boundaryEditTerritoryId,
    pendingBoundary,
    setPendingBoundary,
    boundarySaving,
    boundaryMessage,
    assignLoading,
    assignMessage,
    realignLoading,
    realignMessage,
    handleStartBoundaryEdit,
    handleCancelBoundaryEdit,
    handleSaveBoundary,
    handleAssignTerritories,
    handleRealignCoordinates
  } = useTerritoryBoundary({ territoryList, loadTerritories, loadAccounts, loadLeads });

  const {
    balanceProposal,
    balanceLoading,
    balanceMessage,
    applying,
    handleAnalyzeBalance,
    handleDiscardBalance,
    handleApplyBalance
  } = useTerritoryBalance({ loadTerritories, loadAccounts, loadLeads });

  const [typeFilter, setTypeFilter] = useState('');
  const [territoryFilter, setTerritoryFilter] = useState('');
  const [showTerritories, setShowTerritories] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchText, setSearchText] = useState("");

  const isMobile = useIsMobile();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const territoryOptions = [
    ...new Set(
      [...records, ...leadRecords, ...opportunityRecords]
        .map(r => r.territory)
        .filter(Boolean)
    )
  ];

  const mapRecords = [...records, ...leadRecords, ...opportunityRecords];

  const {
    selected,
    setSelectedId,
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
  } = useFieldVisit({ combinedRecords: mapRecords, loadAccounts, loadLeads });

  const {
    route,
    setRoute,
    routeGeometry,
    setRouteGeometry,
    routeInfo,
    setRouteInfo,
    routeLoading,
    routeError,
    setRouteError,
    routeTerritory,
    setRouteTerritory,
    generateRoute,
    runRouteOptimization,
    routeStats
  } = useRouteGeneration({ records, leadRecords });

  const {
    currentPosition,
    positionError,
    positionLoading,
    refreshPosition,
    suggestions
  } = useNextBestStops(mapRecords);

  async function addTopSuggestionsToRoute(count) {
    if (!currentPosition || suggestions.length === 0) return;

    const start = { id: "current-location", name: "Current Location", lat: currentPosition.lat, lng: currentPosition.lng };
    const picks = suggestions.slice(0, count).map(s => s.record);

    await runRouteOptimization([start, ...picks]);
  }

  const { liveAlerts, liveActivityFeed } = useLiveFeed({ loadAccounts, loadLeads });

  const filteredMapRecords = mapRecords.filter(
    r =>
      (!typeFilter || r.type === typeFilter) &&
      (!territoryFilter || r.territory === territoryFilter) &&
      (!priorityFilter || r.priority === priorityFilter) &&
      (
        !searchText ||
        String(r.name || "")
          .toLowerCase()
          .includes(searchText.toLowerCase())
      )
  );

  const {
    dashboardStats,
    totalRevenue,
    averageRevenue,
    validationRate,
    visitCompletionRate,
    priorityChart,
    visitChart,
    CHART_COLORS,
    territoryStats,
    revenueChart,
    priorityTerritoryChart,
    territoryRanking,
    forecastGrowth,
    salesForecast,
    salesTrend,
    bestTerritory,
    attentionRequired,
    pendingVisits,
    businessInsights,
    aiOpportunities,
    aiRecommendations,
    recommendationColor,
    revenueRisk,
    rankedAccounts,
    aiTerritories,
    executiveSummary,
    aiAlerts,
    alertColors,
    executiveHealthScore,
    executiveStatus,
    executiveColor
  } = computeExecutiveAnalytics(records, territoryOptions, allOpportunities);

  // Was a hardcoded list of 4 fixed notifications with fake "X min ago"
  // timestamps and fake unread flags that never actually changed. The
  // same underlying conditions are already computed for real in
  // aiAlerts, so notifications are derived from that real data instead
  // of being duplicated as static fake entries.
  const aiNotifications = aiAlerts.map((alert, index) => ({
    id: index,
    type: alert.type === "danger" ? "critical" : alert.type,
    title: alert.title,
    message: alert.message,
    time: "Just now",
    unread: true
  }));

  const notificationColors = {
    critical: "#e53935",
    warning: "#fb8c00",
    success: "#43a047",
    info: "#1976d2"
  };

  const unreadNotifications = aiNotifications.filter(n => n.unread).length;

  function handleGenerateExecutiveReport() {
    generateExecutiveReport({
      executiveSummary,
      salesForecast,
      executiveHealthScore,
      executiveStatus,
      validationRate,
      aiRecommendations,
      pendingVisits,
      attentionRequired
    });
  }

  function handleExportBusinessData() {
    exportBusinessData(records);
  }

  function handleExportAIActivity() {
    exportAIActivity(liveActivityFeed);
  }

  return (
    <div
        style={{
            minHeight: "100vh",
            width: "100%",
            fontFamily: "var(--gs-font-body)",
            background: "var(--gs-bg)",
            overflowX: "hidden",
            boxSizing: "border-box"
        }}
    >



        {/* ============================= */}
        {/* DASHBOARD STATISTICS */}
        {/* ============================= */}

<ExecutiveAnalyticsPanel
    dashboardStats={dashboardStats}
    totalRevenue={totalRevenue}
    averageRevenue={averageRevenue}
    validationRate={validationRate}
    visitCompletionRate={visitCompletionRate}
    priorityChart={priorityChart}
    visitChart={visitChart}
    CHART_COLORS={CHART_COLORS}
    territoryStats={territoryStats}
    revenueChart={revenueChart}
    priorityTerritoryChart={priorityTerritoryChart}
    territoryRanking={territoryRanking}
    forecastGrowth={forecastGrowth}
    salesTrend={salesTrend}
    bestTerritory={bestTerritory}
    pendingVisits={pendingVisits}
    businessInsights={businessInsights}
    aiOpportunities={aiOpportunities}
    aiRecommendations={aiRecommendations}
    recommendationColor={recommendationColor}
    revenueRisk={revenueRisk}
    rankedAccounts={rankedAccounts}
    aiTerritories={aiTerritories}
    executiveSummary={executiveSummary}
    aiAlerts={aiAlerts}
    alertColors={alertColors}
    executiveHealthScore={executiveHealthScore}
    executiveStatus={executiveStatus}
    executiveColor={executiveColor}
    aiNotifications={aiNotifications}
    notificationColors={notificationColors}
    unreadNotifications={unreadNotifications}
    liveAlerts={liveAlerts}
    liveActivityFeed={liveActivityFeed}
    generateExecutiveReport={handleGenerateExecutiveReport}
    exportAIActivity={handleExportAIActivity}
    exportBusinessData={handleExportBusinessData}
/>



<div
    style={{
        position: "relative",
        display: "flex",
        width: "100%",
        minHeight: isMobile ? "60vh" : "700px",
        height: isMobile ? "60vh" : "700px",
        overflow: "hidden",
        boxSizing: "border-box",
        background: "#ffffff"
    }}
>

      {isMobile && filtersOpen && (
          <div
              onClick={() => setFiltersOpen(false)}
              style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(0,0,0,0.45)",
                  zIndex: 55
              }}
          />
      )}

      <div
    style={{
        width: "260px",
        minWidth: "260px",
        flexShrink: 0,
        padding: "16px",
        borderRight: "1px solid #ddd",
        overflowY: "auto",
        background: "#fff",
        boxSizing: "border-box",
        ...(isMobile
            ? {
                position: "fixed",
                top: 0,
                left: 0,
                bottom: 0,
                zIndex: 60,
                boxShadow: "2px 0 12px rgba(0,0,0,0.2)",
                transform: filtersOpen ? "translateX(0)" : "translateX(-100%)",
                transition: "transform 0.2s ease"
            }
            : {})
    }}
>
        <h3 style={{ marginTop: 0 }}>Filters</h3>
        <label style={{ fontSize: "12px", fontWeight: 600 }}>
    Search Account / Lead / Opportunity
</label>

<input
    type="text"
    placeholder="Search account, lead, or opportunity..."
    value={searchText}
    onChange={(e) => setSearchText(e.target.value)}
    style={{
        width: "100%",
        padding: "8px",
        marginBottom: "14px",
        border: "1px solid #ccc",
        borderRadius: "5px",
        boxSizing: "border-box"
    }}
/>
        <label style={{ fontSize: '12px', fontWeight: 600 }}>Territory</label>
<select
    value={territoryFilter}
    onChange={e => setTerritoryFilter(e.target.value)}
    style={{ width: "100%", marginBottom: "10px" }}
>

    <option value="">All Territories</option>

    {territoryOptions.map(t => (

        <option key={t} value={t}>

            {t}

        </option>

    ))}

</select>

<label style={{ fontSize: '12px', fontWeight: 600 }}>
    Priority
</label>

<select
    value={priorityFilter}
    onChange={e => setPriorityFilter(e.target.value)}
    style={{ width: '100%', marginBottom: '14px' }}
>

    <option value="">All Priorities</option>

    <option value="High">High</option>

    <option value="Medium">Medium</option>

    <option value="Low">Low</option>

</select>
        <label style={{ fontSize: '12px', fontWeight: 600 }}>Record Type</label>
        <select
    value={typeFilter}
    onChange={e => setTypeFilter(e.target.value)}
    style={{
        width: "100%",
        padding: "6px",
        marginBottom: "10px",
        borderRadius: "5px",
        border: "1px solid #ccc"
    }}
>
    <option value="">All Records</option>
    <option value="customer">Accounts</option>
    <option value="lead">Leads</option>
    <option value="opportunity">Opportunities</option>
</select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', marginBottom: '18px' }}>
          <input type="checkbox" checked={showTerritories} onChange={e => setShowTerritories(e.target.checked)} />
          Show territory boundaries
        </label>

{canManageTerritories && (
<>
<h3
    style={{
        borderTop: '1px solid #eee',
        paddingTop: '14px'
    }}
>
    Territory Boundaries
</h3>

{!boundaryEditTerritoryId ? (
    <>
        <select
            value=""
            onChange={e => e.target.value && handleStartBoundaryEdit(e.target.value)}
            style={{
                width: '100%',
                marginBottom: '10px',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '5px'
            }}
        >
            <option value="">Draw / edit a territory...</option>
            {territoryList.map(t => (
                <option key={t.Id} value={t.Id}>
                    {t.Territory_Name__c || t.Name}
                    {t.Boundary_GeoJSON__c ? " (has boundary)" : ""}
                </option>
            ))}
        </select>

        {boundaryMessage && (
            <div style={{ marginBottom: '8px', fontSize: '11px', color: '#2E7D32' }}>
                {boundaryMessage}
            </div>
        )}

        <button
            disabled={assignLoading}
            onClick={handleAssignTerritories}
            style={{ width: '100%', cursor: assignLoading ? 'default' : 'pointer' }}
        >
            {assignLoading ? "Assigning..." : "Recalculate Territory Assignments"}
        </button>

        {assignMessage && (
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#0B2E4F' }}>
                {assignMessage}
            </div>
        )}

        <button
            disabled={realignLoading}
            onClick={handleRealignCoordinates}
            style={{ width: '100%', marginTop: '8px', cursor: realignLoading ? 'default' : 'pointer' }}
            title="Move every account/lead/discovery candidate's map pin so it actually sits inside the territory it's assigned to"
        >
            {realignLoading ? "Realigning..." : "Realign Coordinates to Territories"}
        </button>

        {realignMessage && (
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#0B2E4F' }}>
                {realignMessage}
            </div>
        )}

        <button
            disabled={balanceLoading}
            onClick={handleAnalyzeBalance}
            style={{ width: '100%', marginTop: '8px', cursor: balanceLoading ? 'default' : 'pointer' }}
            title="Compares workload (account+lead count) and revenue potential across territories that have a drawn boundary, and proposes moving border records to even things out"
        >
            {balanceLoading ? "Analyzing..." : "Analyze Territory Balance"}
        </button>

        {balanceMessage && !balanceProposal && (
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#0B2E4F' }}>
                {balanceMessage}
            </div>
        )}

        {balanceProposal && (
            <div style={{ marginTop: '10px', fontSize: '11px', border: '1px solid #eee', borderRadius: '6px', padding: '10px' }}>
                <div style={{ fontWeight: 700, marginBottom: '6px' }}>
                    Territory Balance Proposal
                </div>

                {balanceProposal.message ? (
                    <div style={{ color: '#666' }}>{balanceProposal.message}</div>
                ) : balanceProposal.moves.length === 0 ? (
                    <div style={{ color: '#666' }}>
                        All territories are within {Math.round(balanceProposal.threshold_pct * 100)}% of
                        fair share (~{balanceProposal.fair_workload.toFixed(1)} records each) - nothing to move.
                    </div>
                ) : (
                    <>
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', color: '#666' }}>
                                    <th style={{ padding: '2px 4px' }}>Territory</th>
                                    <th style={{ padding: '2px 4px' }}>Workload</th>
                                    <th style={{ padding: '2px 4px' }}>Potential</th>
                                </tr>
                            </thead>
                            <tbody>
                                {balanceProposal.territories.map(t => (
                                    <tr key={t.territory_id}>
                                        <td style={{ padding: '2px 4px' }}>{t.territory_name || t.territory_code}</td>
                                        <td style={{ padding: '2px 4px' }}>{t.workload_before} &rarr; {t.workload_after}</td>
                                        <td style={{ padding: '2px 4px' }}>
                                            {Math.round(t.potential_before / 1000)}k &rarr; {Math.round(t.potential_after / 1000)}k
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div style={{ color: '#666', marginBottom: '6px' }}>
                            {balanceProposal.moves.length} record(s) proposed to move (dashed lines on the map show the redrawn boundaries):
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '16px', maxHeight: '110px', overflowY: 'auto' }}>
                            {balanceProposal.moves.map(m => (
                                <li key={m.id}>{m.name} ({m.record_type}): {m.from_code} &rarr; {m.to_code}</li>
                            ))}
                        </ul>
                    </>
                )}

                {balanceProposal.excluded_territories.length > 0 && (
                    <div style={{ color: '#999', marginTop: '6px' }}>
                        Excluded (no boundary drawn): {balanceProposal.excluded_territories.map(e => e.territory_name || e.territory_code).join(", ")}
                    </div>
                )}

                {balanceProposal.moves && balanceProposal.moves.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button
                            disabled={applying}
                            onClick={handleApplyBalance}
                            style={{
                                flex: 1,
                                padding: '7px',
                                fontWeight: 700,
                                border: 'none',
                                borderRadius: '5px',
                                background: applying ? '#9aa8b5' : '#0B2E4F',
                                color: '#fff',
                                cursor: applying ? 'default' : 'pointer'
                            }}
                        >
                            {applying ? "Applying..." : "Apply"}
                        </button>
                        <button
                            disabled={applying}
                            onClick={handleDiscardBalance}
                            style={{
                                flex: 1,
                                padding: '7px',
                                border: '1px solid #ccc',
                                borderRadius: '5px',
                                background: '#fff',
                                cursor: 'pointer'
                            }}
                        >
                            Discard
                        </button>
                    </div>
                )}

                {!balanceProposal.moves.length && (
                    <button
                        onClick={handleDiscardBalance}
                        style={{ width: '100%', marginTop: '8px', padding: '6px', border: '1px solid #ccc', borderRadius: '5px', background: '#fff', cursor: 'pointer' }}
                    >
                        Close
                    </button>
                )}

                {balanceMessage && (
                    <div style={{ marginTop: '8px', color: '#2E7D32' }}>
                        {balanceMessage}
                    </div>
                )}
            </div>
        )}
    </>
) : (
    <div style={{ fontSize: '12px' }}>
        <div style={{ marginBottom: '8px', color: '#555' }}>
            Draw a polygon on the map (use the tools in the top-right
            corner of the map), then save it. To remove a boundary, use
            the trash tool, click the shape, then click its checkmark to
            confirm - then Save here to make the removal permanent.
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
            <button
                disabled={boundarySaving}
                onClick={handleSaveBoundary}
                style={{
                    flex: 1,
                    padding: '8px',
                    fontWeight: 700,
                    border: 'none',
                    borderRadius: '5px',
                    background: boundarySaving ? '#9aa8b5' : '#0B2E4F',
                    color: '#fff',
                    cursor: boundarySaving ? 'default' : 'pointer'
                }}
            >
                {boundarySaving ? "Saving..." : pendingBoundary ? "Save Boundary" : "Save (Clear Boundary)"}
            </button>
            <button
                onClick={handleCancelBoundaryEdit}
                style={{
                    flex: 1,
                    padding: '8px',
                    border: '1px solid #ccc',
                    borderRadius: '5px',
                    background: '#fff',
                    cursor: 'pointer'
                }}
            >
                Cancel
            </button>
        </div>

        {boundaryMessage && (
            <div style={{ marginTop: '8px', color: '#C1443C' }}>
                {boundaryMessage}
            </div>
        )}
    </div>
)}
</>
)}

<h3
    style={{
        borderTop: '1px solid #eee',
        paddingTop: '14px'
    }}
>
    Smart Suggestions
</h3>

<button
    disabled={positionLoading}
    onClick={refreshPosition}
    style={{ cursor: positionLoading ? 'default' : 'pointer' }}
>
    {positionLoading
        ? "Finding your location..."
        : currentPosition
            ? "Refresh my location"
            : "Show my next best stops"}
</button>

{positionError && (
    <div
        style={{
            marginTop: '10px',
            fontSize: '12px',
            color: '#C1443C',
            background: '#fdecea',
            padding: '8px',
            borderRadius: '6px'
        }}
    >
        ⚠ {positionError}
    </div>
)}

{currentPosition && suggestions.length === 0 && !positionLoading && (
    <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
        No accounts, leads, or open opportunities within {NEXT_BEST_STOP_RADIUS_KM} km right now.
    </div>
)}

{suggestions.map(s => (
    <div
        key={s.record.id}
        style={{
            marginTop: '10px',
            padding: '10px',
            background: '#f6f8fb',
            borderRadius: '8px',
            fontSize: '12px'
        }}
    >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            <strong style={{ fontSize: '13px' }}>{s.record.name}</strong>
            <span
                style={{
                    background: '#0B2E4F',
                    color: '#fff',
                    borderRadius: '12px',
                    padding: '2px 8px',
                    fontWeight: 700,
                    fontSize: '11px',
                    flexShrink: 0
                }}
            >
                {s.score}
            </span>
        </div>

        <div style={{ marginTop: '6px', height: '5px', background: '#e1e6eb', borderRadius: '3px', overflow: 'hidden' }}>
            <div
                style={{
                    width: `${s.score}%`,
                    height: '100%',
                    background: PRIORITY_COLOR[s.record.priority] || '#0E8388'
                }}
            />
        </div>

        <div style={{ marginTop: '6px', color: '#666' }}>
            {s.reason}
        </div>
    </div>
))}

{suggestions.length > 0 && canPlanRoutes && (
    <button
        disabled={routeLoading}
        onClick={() => addTopSuggestionsToRoute(2)}
        style={{ marginTop: '10px', width: '100%', cursor: routeLoading ? 'default' : 'pointer' }}
    >
        Add top 2 to today's route
    </button>
)}

{canPlanRoutes && (
<>
<h3
    style={{
        borderTop: '1px solid #eee',
        paddingTop: '14px'
    }}
>
    Route Planning
</h3>

<label
    style={{
        fontSize: '12px',
        fontWeight: 600
    }}
>
    Territory
</label>

<select
    value={routeTerritory}
    onChange={e => setRouteTerritory(e.target.value)}
    style={{
        width: '100%',
        marginBottom: '10px',
        padding: '8px',
        border: '1px solid #ccc',
        borderRadius: '5px'
    }}
>
    <option value="">
        Select Territory
    </option>

    {territoryOptions.map(territory => (
        <option
            key={territory}
            value={territory}
        >
            {territory}
        </option>
    ))}
</select>

<button
    disabled={routeLoading}
    onClick={generateRoute}
    style={{ cursor: routeLoading ? 'default' : 'pointer' }}
>
    {routeLoading ? "Calculating road route..." : "Generate Route"}
</button>

{routeError && (
    <div
        style={{
            marginTop: '10px',
            fontSize: '12px',
            color: '#C1443C',
            background: '#fdecea',
            padding: '8px',
            borderRadius: '6px'
        }}
    >
        ⚠ {routeError}
    </div>
)}

{routeStats && (
    <div
        style={{
            marginTop: '10px',
            fontSize: '12px',
            background: '#f6f8fb',
            padding: '10px',
            borderRadius: '6px'
        }}
    >

        <div>
            Territory:
            <strong> {routeTerritory}</strong>
        </div>

        <div>
            Stops:
            <strong> {routeStats.stops}</strong>
        </div>

        <div>
            Distance:
            <strong> {routeStats.distKm} km</strong>
        </div>

        <div>
            ETA:
            <strong> {routeStats.etaMin} min</strong>
        </div>

        <button
            onClick={() => {
                setRoute(null);
                setRouteGeometry(null);
                setRouteInfo(null);
                setRouteError("");
            }}
            style={{
                marginTop: '8px',
                width: '100%',
                padding: '6px',
                fontSize: '11px',
                border: '1px solid #ccc',
                borderRadius: '5px',
                background: '#fff',
                cursor: 'pointer'
            }}
        >
            Clear Route
        </button>

    </div>
)}
</>
)}


<h4 style={{ marginTop: "18px", marginBottom: "6px" }}>
    Sales Priority
</h4>

{Object.entries(PRIORITY_COLOR).map(([priority, color]) => (

    <div
        key={priority}
        style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "12px",
            padding: "3px 0"
        }}
    >

        <span
            style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: color
            }}
        />

        {priority}

    </div>

))}
      </div>

<div
    style={{
        position: "relative",
        flex: 1,
        minWidth: 0,
        height: isMobile ? "60vh" : "700px",
        borderRadius: "10px",
        overflow: "hidden",
        background: "#ffffff",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        boxSizing: "border-box"
    }}
>
    {/* STEP 11 — GIS CONTROL TOOLBAR */}
<div
    style={{
        position: "absolute",
        top: "12px",
        left: "12px",
        right: (!isMobile && selected) ? "350px" : "12px",
        zIndex: 900,
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 12px",
        background: "rgba(255,255,255,0.96)",
        border: "1px solid #e1e6eb",
        borderRadius: "10px",
        boxShadow: "0 3px 12px rgba(0,0,0,0.12)",
        transition: "right 0.25s ease",
        flexWrap: "wrap"
    }}
>

    {isMobile && (
        <button
            onClick={() => setFiltersOpen(true)}
            style={{
                padding: "7px 12px",
                borderRadius: "6px",
                border: "1px solid #d5dce3",
                background: "#0B2E4F",
                color: "#ffffff",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "600"
            }}
        >
            ☰ Filters
        </button>
    )}

    <div
        style={{
            fontSize: "13px",
            fontWeight: "700",
            color: "#0B2E4F",
            marginRight: "8px"
        }}
    >
        GIS Controls
    </div>


    {/* Territory Toggle */}
    <button
        onClick={() => setShowTerritories(!showTerritories)}
        style={{
            padding: "7px 12px",
            borderRadius: "6px",
            border: "1px solid #d5dce3",
            background: showTerritories ? "#0B2E4F" : "#ffffff",
            color: showTerritories ? "#ffffff" : "#333333",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "600"
        }}
    >
        {showTerritories ? "Hide Territories" : "Show Territories"}
    </button>


    {/* Map Reset */}
    <button
        onClick={() => window.location.reload()}
        style={{
            padding: "7px 12px",
            borderRadius: "6px",
            border: "1px solid #d5dce3",
            background: "#ffffff",
            color: "#333333",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "600"
        }}
    >
        Reset Map
    </button>

</div>
<MapContainer
    center={[22.5155, 86.2655]}
    zoom={8}
    zoomControl={false}
    style={{
        height: "100%",
        width: "100%",
        minHeight: "650px"
    }}
>
{/* Default zoom control sits top-left, same corner as the GIS
    Controls bar above - moved out of its way rather than fighting
    over the same 12px corner. Bottom-left is otherwise unused. */}
<ZoomControl position="bottomleft" />
<TileLayer
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    attribution="&copy; OpenStreetMap contributors"
/>
<FitToRecords records={filteredMapRecords} />
          {showTerritories && !boundaryEditTerritoryId && (
            <LayerGroup>
              {territoryList.map((t, idx) => {
                const positions = parseTerritoryBoundary(t);
                if (!positions) return null;
                return (
                  <Polygon
                    key={t.Id}
                    positions={positions}
                    pathOptions={{
                      color: TERRITORY_BOUNDARY_COLORS[idx % TERRITORY_BOUNDARY_COLORS.length],
                      weight: 2,
                      fillOpacity: 0.08
                    }}
                  >
                    <Tooltip>{t.Territory_Name__c || t.Name} Territory</Tooltip>
                  </Polygon>
                );
              })}
            </LayerGroup>
          )}

          {balanceProposal && balanceProposal.territories.some(t => t.boundary_after) && (
            <LayerGroup>
              {balanceProposal.territories
                .filter(t => t.boundary_after)
                .map(t => {
                  const positions = parseTerritoryBoundary({
                    Boundary_GeoJSON__c: JSON.stringify(t.boundary_after)
                  });
                  if (!positions) return null;
                  return (
                    <Polygon
                      key={`balance-preview-${t.territory_id}`}
                      positions={positions}
                      pathOptions={{
                        color: '#D98F00',
                        weight: 3,
                        dashArray: '6 6',
                        fillOpacity: 0.05
                      }}
                    >
                      <Tooltip>{t.territory_name || t.territory_code} - proposed boundary</Tooltip>
                    </Polygon>
                  );
                })}
            </LayerGroup>
          )}

          {boundaryEditTerritoryId && (
            <TerritoryDrawControl
              key={boundaryEditTerritoryId}
              initialGeoJSON={pendingBoundary}
              onChange={setPendingBoundary}
            />
          )}

<LayerGroup>
    {filteredMapRecords
        .filter(r =>
            r.lat != null &&
            r.lng != null &&
            !isNaN(Number(r.lat)) &&
            !isNaN(Number(r.lng))
        )
        .map(r => (

            <CircleMarker
                key={r.id}
                center={[
                    Number(r.lat),
                    Number(r.lng)
                ]}
                radius={r.type === "lead" ? 10 : r.type === "opportunity" ? 9 : 8}
                pathOptions={{
                    color:
                        r.type === "lead"
                            ? "#7B1FA2"
                            : r.type === "opportunity"
                            ? "#1565C0"
                            : PRIORITY_COLOR[r.priority] || "#0B2E4F",

                    fillColor:
                        r.type === "lead"
                            ? "#9C27B0"
                            : r.type === "opportunity"
                            ? "#1E88E5"
                            : PRIORITY_COLOR[r.priority] || "#0B2E4F",

                    fillOpacity: 0.9,
                    weight: 2
                }}
                eventHandlers={{
                    click: () => openRecord(r)
                }}
            >

                <Tooltip direction="top">

                    <div>

                        <strong>
                            {r.name}
                        </strong>

                        <br />

                        Type:
                        {" "}
                        {r.type === "lead"
                            ? "Lead"
                            : r.type === "opportunity"
                            ? "Opportunity"
                            : "Account"}

                        <br />

                        Territory:
                        {" "}
                        {r.territory}

                        <br />

                        Owner:
                        {" "}
                        {r.owner}

                        {r.type === "opportunity" ? (
                            <>
                                <br />

                                Stage:
                                {" "}
                                {r.stage}

                                <br />

                                Account:
                                {" "}
                                {r.accountName}
                            </>
                        ) : (
                            <>
                                <br />

                                Priority:
                                {" "}
                                {r.priority}

                                <br />

                                Validation:
                                {" "}
                                {r.validation}
                            </>
                        )}

                    </div>

                </Tooltip>

            </CircleMarker>

        ))
    }
</LayerGroup>

          {route && (
            <>
              <Polyline
                positions={routeGeometry || route.map(s => [s.lat, s.lng])}
                pathOptions={{
                  color: '#D98F00',
                  weight: 3,
                  dashArray: routeGeometry ? null : '6 5'
                }}
              />
              {route.map((s, i) => (
                <CircleMarker
                  key={'route-' + s.id}
                  center={[s.lat, s.lng]}
                  radius={11}
                  pathOptions={{ color: '#D98F00', fillColor: '#D98F00', fillOpacity: 1, weight: 2 }}
                  eventHandlers={{ click: () => openRecord(s) }}
                >
                  <Tooltip permanent direction="top" offset={[0, -10]}>{i + 1}</Tooltip>
                </CircleMarker>
              ))}
              <FitToRoute stops={route} />
            </>
          )}


        </MapContainer>



<div
    style={isMobile
        ? {
            position: "absolute",
            left: 0,
            right: 0,
            bottom: selected ? 0 : "-75%",
            width: "100%",
            maxHeight: "70%",
            background: "#ffffff",
            border: "1px solid #e1e6eb",
            borderRadius: "14px 14px 0 0",
            transition: "bottom 0.25s ease",
            padding: "18px",
            boxShadow: "0 -6px 20px rgba(0,0,0,0.15)",
            overflowY: "auto",
            zIndex: 1000,
            boxSizing: "border-box"
        }
        : {
            position: "absolute",
            top: "12px",
            right: selected ? "12px" : "-360px",
            width: "320px",
            maxWidth: "calc(100% - 24px)",
            maxHeight: "calc(100% - 24px)",
            background: "#ffffff",
            border: "1px solid #e1e6eb",
            borderRadius: "10px",
            transition: "right 0.25s ease",
            padding: "18px",
            boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
            overflowY: "auto",
            zIndex: 1000,
            boxSizing: "border-box"
        }}
>
          {selected && (
            <>
              <button onClick={() => setSelectedId(null)} style={{ float: 'right', border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
              <span
style={{
    display: "inline-block",
    background: PRIORITY_COLOR[selected.priority] || "#0B2E4F",
    color: "#fff",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "11px"
}}
>
    {selected.priority} Priority
</span>
              <h3 style={{ margin: '4px 0' }}>{selected.name}</h3>
              <div style={{ fontSize: '11px', color: '#666', marginBottom: '14px' }}>
                {selected.id} · {territoryList.find(t => t.Territory_Code__c === selected.territory)?.Territory_Name__c || selected.territory || "Unassigned"} Territory
              </div>
              {(selected.type === "opportunity" ? [
                ['Account', selected.accountName],
                ['Stage', selected.stage],
                ['Owner', selected.owner],
                ['Opportunity Value', selected.oppValue ? `₹${selected.oppValue.toLocaleString('en-IN')}` : '—'],
              ] : [
                ['Owner', selected.owner],
                ['Priority', selected.priority],
                ['Opportunity Value', selected.oppValue ? `₹${selected.oppValue.toLocaleString('en-IN')}` : '—'],
                ['Discovery Source', selected.discoverySource],
                ['Validation Status', selected.validation],
                ['Last Visit', selected.lastVisit],
                ['Next Visit', selected.nextVisit],
              ]).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #eee', fontSize: '12px' }}>
                  <span style={{ color: '#666' }}>{k}</span>
                  <strong>{v}</strong>
                </div>
              ))}

              {selected.type !== "opportunity" && (
              <div style={{ marginTop: '14px', padding: '10px', background: '#f6f8fb', borderRadius: '7px', fontSize: '12px' }}>
                <div style={{ fontWeight: 700, marginBottom: '6px' }}>Field Visit</div>
                <div>Status: <strong>{selected.visitStatus}</strong></div>
                {selected.isClosed && (
                  <div style={{ marginTop: '10px', color: '#666', fontStyle: 'italic' }}>
                    This lead is closed ({selected.status}) — no further visits needed.
                  </div>
                )}
                {!selected.isClosed && canUpdateWorkOrder && (selected.visitStatus === 'pending' || selected.validation !== 'Validated') && (
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    {geofenceOk === null && (
                      <button onClick={checkIn} style={{ padding: '8px', fontWeight: 700, border: '1px solid #ccc', borderRadius: '5px', background: '#fff', cursor: 'pointer' }}>
                        Check in (verify geofence)
                      </button>
                    )}
                    {geofenceOk === true && (
                      <>
                        <div style={{ color: '#2E8B57', fontWeight: 700 }}>
                          ✓ {checkInDistance != null ? `${Math.round(checkInDistance)}m from location` : "Location verified"} — within {GEOFENCE_RADIUS_METERS}m geofence
                        </div>

                        <label style={{ fontSize: '11px', fontWeight: 600, marginTop: '4px' }}>Outcome</label>
                        <select
                          value={visitOutcome}
                          onChange={e => setVisitOutcome(e.target.value)}
                          style={{ padding: '6px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '12px' }}
                        >
                          {VISIT_OUTCOMES.map(outcome => (
                            <option key={outcome} value={outcome}>{outcome}</option>
                          ))}
                        </select>

                        {isOpportunityOutcome(visitOutcome) && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', padding: '8px', border: '1px solid #d5dce3', borderRadius: '6px', background: '#f6f8fb' }}>
                            <label style={{ fontSize: '11px', fontWeight: 600 }}>Deal Name</label>
                            <input
                              type="text"
                              value={dealName}
                              onChange={e => setDealName(e.target.value)}
                              placeholder="e.g. New POS System"
                              style={{ padding: '6px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '12px' }}
                            />

                            <label style={{ fontSize: '11px', fontWeight: 600 }}>Amount (optional)</label>
                            <input
                              type="number"
                              value={dealAmount}
                              onChange={e => setDealAmount(e.target.value)}
                              placeholder="0"
                              style={{ padding: '6px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '12px' }}
                            />

                            <label style={{ fontSize: '11px', fontWeight: 600 }}>Stage</label>
                            <select
                              value={dealStage}
                              onChange={e => setDealStage(e.target.value)}
                              style={{ padding: '6px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '12px' }}
                            >
                              {OPPORTUNITY_STAGES.map(stage => (
                                <option key={stage} value={stage}>{stage}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        <label style={{ fontSize: '11px', fontWeight: 600 }}>Notes</label>
                        <textarea
                          value={visitNotes}
                          onChange={e => setVisitNotes(e.target.value)}
                          rows={2}
                          style={{ padding: '6px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '12px', resize: 'vertical' }}
                        />

                        <label style={{ fontSize: '11px', fontWeight: 600 }}>Follow-up Date (optional)</label>
                        <input
                          type="date"
                          value={visitFollowUp}
                          onChange={e => setVisitFollowUp(e.target.value)}
                          style={{ padding: '6px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '12px' }}
                        />

                        {(() => {
                          const needsDealName = isOpportunityOutcome(visitOutcome) && !dealName.trim();
                          const checkoutDisabled = checkoutSubmitting || needsDealName;

                          return (
                            <button
                              onClick={checkOut}
                              disabled={checkoutDisabled}
                              title={needsDealName ? "Enter a deal name to create the Opportunity" : ""}
                              style={{ padding: '8px', fontWeight: 700, border: 'none', borderRadius: '5px', background: checkoutDisabled ? '#9aa8b5' : '#0B2E4F', color: '#fff', cursor: checkoutDisabled ? 'default' : 'pointer' }}
                            >
                              {checkoutSubmitting ? "Saving..." : "Check out & complete visit"}
                            </button>
                          );
                        })()}

                        {checkoutStatus === 'queued' && (
                          <div style={{ color: '#B5760A', fontWeight: 700, fontSize: '12px', background: '#FBF0DD', padding: '8px', borderRadius: '5px' }}>
                            ⏳ Offline — saved on this device, will sync automatically when you're back online.
                          </div>
                        )}

                        {checkoutStatus === 'error' && (
                          <div style={{ color: '#C1443C', fontWeight: 700, fontSize: '12px' }}>
                            ⚠ {checkoutError}
                          </div>
                        )}
                      </>
                    )}
                    {geofenceOk === false && (
                      <>
                        <div style={{ color: '#C1443C', fontWeight: 700 }}>
                          {checkInError
                            ? `⚠ ${checkInError}`
                            : `⚠ Outside geofence — ${checkInDistance != null ? `${Math.round(checkInDistance)}m away, ` : ""}move closer and retry`}
                        </div>
                        <button onClick={checkIn} style={{ padding: '8px', fontWeight: 700, border: '1px solid #ccc', borderRadius: '5px', background: '#fff', cursor: 'pointer' }}>
                          Retry check-in
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
