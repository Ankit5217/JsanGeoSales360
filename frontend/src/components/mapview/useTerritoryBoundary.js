import { useState } from "react";
import {
    updateTerritory,
    assignTerritories,
    realignCoordinatesToTerritories
} from "../../services/salesforceApi";

// Drawing/saving a territory's boundary polygon, plus the two bulk
// re-derivation actions ("Recalculate Territory Assignments" and
// "Realign Coordinates to Territories") that depend on it.
export function useTerritoryBoundary({ territoryList, loadTerritories, loadAccounts, loadLeads }) {
  const [boundaryEditTerritoryId, setBoundaryEditTerritoryId] = useState("");
  const [pendingBoundary, setPendingBoundary] = useState(null);
  const [boundarySaving, setBoundarySaving] = useState(false);
  const [boundaryMessage, setBoundaryMessage] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignMessage, setAssignMessage] = useState("");
  const [realignLoading, setRealignLoading] = useState(false);
  const [realignMessage, setRealignMessage] = useState("");

  function handleStartBoundaryEdit(territoryId) {
    const territory = territoryList.find(t => t.Id === territoryId);
    let initial = null;

    if (territory?.Boundary_GeoJSON__c) {
      try {
        initial = JSON.parse(territory.Boundary_GeoJSON__c);
      } catch (err) {
        console.error("Saved boundary is not valid GeoJSON:", err);
      }
    }

    setBoundaryEditTerritoryId(territoryId);
    setPendingBoundary(initial);
    setBoundaryMessage("");
  }

  function handleCancelBoundaryEdit() {
    setBoundaryEditTerritoryId("");
    setPendingBoundary(null);
    setBoundaryMessage("");
  }

  async function handleSaveBoundary() {
    if (!boundaryEditTerritoryId) {
      setBoundaryMessage("Select a territory to edit first.");
      return;
    }

    setBoundarySaving(true);
    setBoundaryMessage("");

    try {
      // pendingBoundary is null after deleting a shape with the map's
      // trash tool - that's a real, valid state (the boundary is being
      // cleared), not "nothing to save". Sending "" rather than null
      // matters: the backend uses exclude_none=True on this endpoint,
      // which would silently drop a null value and leave the old
      // boundary in place in Salesforce.
      await updateTerritory(boundaryEditTerritoryId, {
        Boundary_GeoJSON__c: pendingBoundary ? JSON.stringify(pendingBoundary) : ""
      });

      setBoundaryMessage(pendingBoundary ? "Boundary saved." : "Boundary cleared.");
      setBoundaryEditTerritoryId("");
      setPendingBoundary(null);

      await loadTerritories();
    } catch (error) {
      setBoundaryMessage(error.message || "Failed to save boundary.");
    } finally {
      setBoundarySaving(false);
    }
  }

  async function handleAssignTerritories() {
    setAssignLoading(true);
    setAssignMessage("");

    try {
      const result = await assignTerritories();

      setAssignMessage(
        `${result.accounts_updated} accounts, ${result.leads_updated} leads, ` +
        `${result.discovery_candidates_updated} discovery candidates reassigned.`
      );

      await Promise.all([loadAccounts(), loadLeads()]);
    } catch (error) {
      setAssignMessage(error.message || "Failed to assign territories.");
    } finally {
      setAssignLoading(false);
    }
  }

  async function handleRealignCoordinates() {
    setRealignLoading(true);
    setRealignMessage("");

    try {
      const result = await realignCoordinatesToTerritories();

      setRealignMessage(
        `${result.accounts_updated} accounts, ${result.leads_updated} leads, ` +
        `${result.discovery_candidates_updated} discovery candidates moved to match their territory.`
      );

      await Promise.all([loadAccounts(), loadLeads()]);
    } catch (error) {
      setRealignMessage(error.message || "Failed to realign coordinates.");
    } finally {
      setRealignLoading(false);
    }
  }

  return {
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
  };
}
