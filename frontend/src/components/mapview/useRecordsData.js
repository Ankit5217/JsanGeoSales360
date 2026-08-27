import { useState, useEffect } from "react";
import {
    getAccounts,
    getLeads,
    getOpportunitiesMap,
    getOpportunities,
    getTerritories
} from "../../services/salesforceApi";

const INITIAL_RECORDS = [
  { id: 'ACC-1001', name: 'Meridian Textiles', type: 'customer', territory: 'T1', lat: 17.385, lng: 78.4867, priority: 'High', owner: 'Ananya Rao', oppValue: 850000, discoverySource: '—', validation: 'Validated', lastVisit: '2026-07-12', nextVisit: '2026-08-05', visitStatus: 'pending' },
  { id: 'ACC-1002', name: 'Bluepeak Foods', type: 'customer', territory: 'T1', lat: 17.40, lng: 78.47, priority: 'Medium', owner: 'Sana Sheikh', oppValue: 420000, discoverySource: '—', validation: 'Validated', lastVisit: '2026-06-30', nextVisit: '2026-08-10', visitStatus: 'pending' },
  { id: 'LEAD-2001', name: 'Orbit Logistics', type: 'lead', territory: 'T1', lat: 17.37, lng: 78.50, priority: 'High', owner: 'Ananya Rao', oppValue: 0, discoverySource: 'Field Survey', validation: 'Validated', lastVisit: '—', nextVisit: '2026-08-03', visitStatus: 'pending' },
  { id: 'PROS-3001', name: 'Kavya Enterprises', type: 'prospect', territory: 'T1', lat: 17.39, lng: 78.44, priority: 'Medium', owner: 'Unassigned', oppValue: 180000, discoverySource: 'Web Scan', validation: 'Pending', lastVisit: '—', nextVisit: '—', visitStatus: 'pending' },
  { id: 'ACC-1003', name: 'Silverline Pharma', type: 'customer', territory: 'T2', lat: 12.97, lng: 77.60, priority: 'High', owner: 'Karthik Iyer', oppValue: 1200000, discoverySource: '—', validation: 'Validated', lastVisit: '2026-07-20', nextVisit: '2026-08-15', visitStatus: 'pending' },
  { id: 'LEAD-2002', name: 'Coral Retail Group', type: 'lead', territory: 'T2', lat: 12.99, lng: 77.58, priority: 'Low', owner: 'Karthik Iyer', oppValue: 0, discoverySource: 'Trade Directory', validation: 'Validated', lastVisit: '—', nextVisit: '2026-08-08', visitStatus: 'completed' },
];

// All Salesforce data fetching for the GIS Map: Accounts/Leads/Opportunities
// (map pins), Territories, and every real Opportunity (used only for the
// Sales Performance Trend, not the map). Kicked off once on mount.
export function useRecordsData() {
  const [records, setRecords] = useState(INITIAL_RECORDS);
  const [leadRecords, setLeadRecords] = useState([]);
  const [opportunityRecords, setOpportunityRecords] = useState([]);
  const [allOpportunities, setAllOpportunities] = useState([]);
  const [territoryList, setTerritoryList] = useState([]);

  async function loadAccounts() {
    try {
      const accounts = await getAccounts();

      const formattedAccounts = accounts
        .map(account => ({
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
          // "validated" - defaulting to "Validated" here previously made
          // every unvalidated account/lead look validated on the GIS Map
          // and in the analytics/scoring that reads from this hook.
          validation: account.GIS_Validation_Status__c || "Pending",
          lastVisit: account.Last_Visit_Date__c || "-",
          nextVisit: account.Next_Visit_Date__c || "-",
          visitStatus: account.Last_Visit_Date__c ? "completed" : "pending"
        }))
        .filter(account => account.lat != null && account.lng != null);

      setRecords(formattedAccounts);
    } catch (error) {
      console.error("Formatting Error:", error);
    }
  }

  async function loadLeads() {
    try {
      const leads = await getLeads();

      const formattedLeads = leads
        .map(lead => ({
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
          lastVisit: lead.Last_Visit_Date__c || "-",
          nextVisit: lead.Next_Visit_Date__c || "-",
          visitStatus: lead.Last_Visit_Date__c ? "completed" : "pending"
        }))
        .filter(lead => lead.lat != null && lead.lng != null);

      setLeadRecords(formattedLeads);
    } catch (error) {
      console.error("Lead Loading Error:", error);
    }
  }

  async function loadOpportunities() {
    try {
      const opportunities = await getOpportunitiesMap();

      const formattedOpportunities = opportunities
        .map(opp => {
          const account = opp.Account || {};

          return {
            id: opp.Id,
            name: opp.Name,
            type: "opportunity",
            territory: account.Territory_ID__c || "Unassigned",
            lat: account.Location__Latitude__s,
            lng: account.Location__Longitude__s,
            priority: "Medium",
            owner: opp.Owner?.Name || "Not Assigned",
            oppValue: opp.Amount || 0,
            stage: opp.StageName,
            accountName: account.Name || "-",
            discoverySource: "-",
            validation: account.GIS_Validation_Status__c || "Pending",
            // Opportunities aren't field-visit targets - default to
            // "completed" so the check-in/out panel never renders
            // for one (that flow belongs to Accounts/Leads).
            lastVisit: "-",
            nextVisit: "-",
            visitStatus: "completed"
          };
        })
        .filter(opp => opp.lat != null && opp.lng != null);

      setOpportunityRecords(formattedOpportunities);
    } catch (error) {
      console.error("Opportunity Loading Error:", error);
    }
  }

  async function loadTerritories() {
    try {
      const data = await getTerritories();
      setTerritoryList(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Territory Loading Error:", error);
    }
  }

  // Unlike loadOpportunities() (GIS-filtered, for the map pins), this
  // pulls every real Opportunity with its close date/amount, used only
  // to compute a real Sales Performance Trend instead of fabricated data.
  async function loadAllOpportunities() {
    try {
      const data = await getOpportunities();
      setAllOpportunities(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("All Opportunities Loading Error:", error);
    }
  }

  useEffect(() => {
    loadAccounts();
    loadLeads();
    loadOpportunities();
    loadTerritories();
    loadAllOpportunities();
  }, []);

  return {
    records,
    leadRecords,
    opportunityRecords,
    allOpportunities,
    territoryList,
    loadAccounts,
    loadLeads,
    loadOpportunities,
    loadTerritories,
    loadAllOpportunities
  };
}
