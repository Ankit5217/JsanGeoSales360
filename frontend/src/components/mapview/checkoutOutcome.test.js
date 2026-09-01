import { describe, expect, it } from "vitest";
import { buildAutoEvidencePayload, getStatusForOutcome, isOpportunityOutcome } from "./checkoutOutcome";

describe("getStatusForOutcome", () => {
    it("maps a contacted-style outcome to Working - Contacted", () => {
        expect(getStatusForOutcome("Successful Meeting")).toBe("Working - Contacted");
        expect(getStatusForOutcome("Lead Qualified")).toBe("Working - Contacted");
    });

    it("maps Opportunity Created to Closed - Converted", () => {
        expect(getStatusForOutcome("Opportunity Created")).toBe("Closed - Converted");
    });

    it("maps a closed-style outcome to Closed - Not Converted", () => {
        expect(getStatusForOutcome("Lead Rejected")).toBe("Closed - Not Converted");
        expect(getStatusForOutcome("Duplicate Business")).toBe("Closed - Not Converted");
    });

    it("returns null for a data-quality flag, not a sales-progress signal", () => {
        expect(getStatusForOutcome("Incorrect Location")).toBeNull();
    });

    it("returns null for an unrecognized outcome", () => {
        expect(getStatusForOutcome("Not A Real Outcome")).toBeNull();
    });
});

describe("isOpportunityOutcome", () => {
    it("is true only for Opportunity Created", () => {
        expect(isOpportunityOutcome("Opportunity Created")).toBe(true);
        expect(isOpportunityOutcome("Successful Meeting")).toBe(false);
        expect(isOpportunityOutcome(undefined)).toBe(false);
    });
});

describe("buildAutoEvidencePayload", () => {
    const today = "2026-08-31";

    it("links to Account__c for an account checkout, leaving Lead__c null", () => {
        const payload = buildAutoEvidencePayload({
            selectedType: "customer",
            selectedId: "001ACCOUNT",
            selectedName: "Wipro",
            today,
            fieldVisitId: "a03VISIT",
            checkInDistance: 12.4
        });

        expect(payload.Account__c).toBe("001ACCOUNT");
        expect(payload.Lead__c).toBeNull();
        expect(payload.Field_Visit__c).toBe("a03VISIT");
        expect(payload.Evidence_Type__c).toBe("GPS Verification");
        expect(payload.Validation_Date__c).toBe(today);
    });

    it("links to Lead__c for a lead checkout, leaving Account__c null", () => {
        const payload = buildAutoEvidencePayload({
            selectedType: "lead",
            selectedId: "00QLEAD",
            selectedName: "Karan Mehta",
            today,
            fieldVisitId: "a03VISIT",
            checkInDistance: null
        });

        expect(payload.Lead__c).toBe("00QLEAD");
        expect(payload.Account__c).toBeNull();
    });

    it("includes the rounded check-in distance in the remarks when known", () => {
        const payload = buildAutoEvidencePayload({
            selectedType: "customer",
            selectedId: "001ACCOUNT",
            selectedName: "Wipro",
            today,
            fieldVisitId: "a03VISIT",
            checkInDistance: 87.6
        });

        expect(payload.Remarks__c).toContain("88m");
    });

    it("falls back to a distance-free remark when check-in distance is unknown", () => {
        const payload = buildAutoEvidencePayload({
            selectedType: "customer",
            selectedId: "001ACCOUNT",
            selectedName: "Wipro",
            today,
            fieldVisitId: "a03VISIT",
            checkInDistance: null
        });

        expect(payload.Remarks__c).not.toMatch(/\d+m/);
        expect(payload.Remarks__c).toContain("geofence");
    });

    it("defaults Field_Visit__c to null when no visit id is available", () => {
        const payload = buildAutoEvidencePayload({
            selectedType: "customer",
            selectedId: "001ACCOUNT",
            selectedName: "Wipro",
            today,
            fieldVisitId: undefined,
            checkInDistance: null
        });

        expect(payload.Field_Visit__c).toBeNull();
    });
});
