import { useState } from "react";
import {
    analyzeTerritoryBalance,
    applyTerritoryBalance
} from "../../services/salesforceApi";

// Territory auto-balancing: analyze workload/potential across territories
// that have a drawn boundary, preview the proposed record moves + redrawn
// boundaries, then apply on confirmation. Nothing is written to Salesforce
// until handleApplyBalance() runs - handleAnalyzeBalance() is read-only.
export function useTerritoryBalance({ loadTerritories, loadAccounts, loadLeads }) {
  const [balanceProposal, setBalanceProposal] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceMessage, setBalanceMessage] = useState("");
  const [applying, setApplying] = useState(false);

  async function handleAnalyzeBalance() {
    setBalanceLoading(true);
    setBalanceMessage("");
    setBalanceProposal(null);

    try {
      const proposal = await analyzeTerritoryBalance();

      setBalanceProposal(proposal);
      setBalanceMessage(proposal.message || "");
    } catch (error) {
      setBalanceMessage(error.message || "Failed to analyze territory balance.");
    } finally {
      setBalanceLoading(false);
    }
  }

  function handleDiscardBalance() {
    setBalanceProposal(null);
    setBalanceMessage("");
  }

  async function handleApplyBalance() {
    if (!balanceProposal) {
      return;
    }

    setApplying(true);
    setBalanceMessage("");

    try {
      const result = await applyTerritoryBalance(balanceProposal);

      setBalanceMessage(
        `${result.records_moved} record(s) moved, ${result.boundaries_updated} boundary(ies) redrawn.`
      );
      setBalanceProposal(null);

      await Promise.all([loadTerritories(), loadAccounts(), loadLeads()]);
    } catch (error) {
      setBalanceMessage(error.message || "Failed to apply territory balance.");
    } finally {
      setApplying(false);
    }
  }

  return {
    balanceProposal,
    balanceLoading,
    balanceMessage,
    applying,
    handleAnalyzeBalance,
    handleDiscardBalance,
    handleApplyBalance
  };
}
