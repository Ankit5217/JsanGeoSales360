import { API_BASE_URL as BASE_URL, authFetch } from "../config/apiBase";
export async function getAccounts() {

    try {

        const response = await authFetch(
            `${BASE_URL}/salesforce/gis/accounts`
        );

        if (!response.ok) {
            throw new Error("Failed to fetch accounts");
        }

        return await response.json();

    } catch (error) {

        console.error("Accounts API Error:", error);

        return [];

    }

}

export async function updateAccount(accountId, data) {

    const response = await authFetch(

        `${BASE_URL}/salesforce/accounts/${accountId}`,

        {

            method: "PUT",

            headers: {

                "Content-Type": "application/json"

            },

            body: JSON.stringify(data)

        }

    );

    if (!response.ok) {

        const errorData = await response.json().catch(() => ({}));

        throw new Error(
            errorData.detail ||
            "Failed to update account"
        );

    }

    return await response.json();

}

export async function updateLead(leadId, data) {

    const response = await authFetch(
        `${BASE_URL}/salesforce/leads/${leadId}`,
        {
            method: "PUT",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(data)
        }
    );

    if (!response.ok) {

        const errorData = await response.json().catch(() => ({}));

        throw new Error(
            errorData.detail ||
            "Failed to update lead"
        );

    }

    return await response.json();
}

export async function getLeads() {

    try {

        const response = await authFetch(
            `${BASE_URL}/salesforce/gis/leads`
        );

        if (!response.ok) {

            throw new Error(
                "Failed to fetch leads"
            );

        }

        return await response.json();

    } catch (error) {

        console.error(
            "Leads API Error:",
            error
        );

        return [];

    }

}

// Unlike getLeads() (which hits the GIS-filtered endpoint and only
// returns leads that already have a latitude/longitude - fine for the
// map, but silently hides most leads elsewhere), this returns every
// lead regardless of whether it's been geolocated yet.
export async function getAllLeads() {

    try {

        const response = await authFetch(
            `${BASE_URL}/salesforce/leads`
        );

        if (!response.ok) {

            throw new Error(
                "Failed to fetch leads"
            );

        }

        return await response.json();

    } catch (error) {

        console.error(
            "Leads API Error:",
            error
        );

        return [];

    }

}

export async function getTerritories() {

    try {

        const response = await authFetch(
            `${BASE_URL}/salesforce/gis/territories`
        );

        if (!response.ok) {

            throw new Error(
                "Failed to fetch territories"
            );

        }

        return await response.json();

    } catch (error) {

        console.error(
            "Territories API Error:",
            error
        );

        return [];

    }

}

export async function getRoutes() {

    try {

        const response = await authFetch(
            `${BASE_URL}/salesforce/gis/routes`
        );

        if (!response.ok) {

            throw new Error(
                "Failed to fetch routes"
            );

        }

        return await response.json();

    } catch (error) {

        console.error(
            "Routes API Error:",
            error
        );

        return [];

    }

}

export async function getFieldVisits() {

    console.log(
        "=== GET FIELD VISITS: START ==="
    );

    try {

        const url =
            `${BASE_URL}/salesforce/gis/field-visits`;

        console.log(
            "Field Visits URL:",
            url
        );


        const response =
            await authFetch(url);


        console.log(
            "Field Visits HTTP Status:",
            response.status
        );


        const responseText =
            await response.text();


        console.log(
            "Field Visits Raw Response:",
            responseText
        );


        if (!response.ok) {

            throw new Error(
                `Field Visits API failed: ${response.status}`
            );

        }


        const data =
            JSON.parse(responseText);


        console.log(
            "Field Visits Parsed Response:",
            data
        );


        return data;

    } catch (error) {

        console.error(
            "❌ Field Visits API Error:",
            error
        );

        return [];

    }

}

export async function getEvidence() {
    try {
        console.log("=== EVIDENCE API CALL START ===");

        const response = await authFetch(
            `${BASE_URL}/salesforce/evidence`
        );

        console.log(
            "Evidence HTTP Status:",
            response.status
        );

        const rawText = await response.text();

        console.log(
            "Evidence Raw Response:",
            rawText
        );

        if (!response.ok) {
            throw new Error(
                `Evidence API failed: ${response.status}`
            );
        }

        const data = JSON.parse(rawText);

        console.log(
            "=== EVIDENCE API RESPONSE ===",
            data
        );

        return Array.isArray(data)
            ? data
            : data.records || [];

    } catch (error) {

        console.error(
            "❌ Evidence API Error:",
            error
        );

        return [];
    }
}

export async function getGISAccounts() {

    try {

        const response = await authFetch(
            `${BASE_URL}/salesforce/gis/accounts`
        );

        if (!response.ok) {
            throw new Error(
                `GIS Accounts API failed: ${response.status}`
            );
        }

        return await response.json();

    } catch (error) {

        console.error(
            "GIS Accounts API Error:",
            error
        );

        return [];

    }

}


export async function getGISLeads() {

    try {

        const response = await authFetch(
            `${BASE_URL}/salesforce/gis/leads`
        );

        if (!response.ok) {
            throw new Error(
                `GIS Leads API failed: ${response.status}`
            );
        }

        return await response.json();

    } catch (error) {

        console.error(
            "GIS Leads API Error:",
            error
        );

        return [];

    }

}


export async function getGISDiscovery() {

    try {

        const response = await authFetch(
            `${BASE_URL}/salesforce/gis/discovery`
        );

        if (!response.ok) {
            throw new Error(
                `GIS Discovery API failed: ${response.status}`
            );
        }

        return await response.json();

    } catch (error) {

        console.error(
            "GIS Discovery API Error:",
            error
        );

        return [];

    }

}


export async function getGISTerritories() {

    try {

        const response = await authFetch(
            `${BASE_URL}/salesforce/gis/territories`
        );

        if (!response.ok) {
            throw new Error(
                `GIS Territories API failed: ${response.status}`
            );
        }

        return await response.json();

    } catch (error) {

        console.error(
            "GIS Territories API Error:",
            error
        );

        return [];

    }

}


export async function getGISRoutes() {

    try {

        const response = await authFetch(
            `${BASE_URL}/salesforce/gis/routes`
        );

        if (!response.ok) {
            throw new Error(
                `GIS Routes API failed: ${response.status}`
            );
        }

        return await response.json();

    } catch (error) {

        console.error(
            "GIS Routes API Error:",
            error
        );

        return [];

    }

}


export async function getGISFieldVisits() {

    try {

        const response = await authFetch(
            `${BASE_URL}/salesforce/gis/field-visits`
        );

        if (!response.ok) {
            throw new Error(
                `GIS Field Visits API failed: ${response.status}`
            );
        }

        return await response.json();

    } catch (error) {

        console.error(
            "GIS Field Visits API Error:",
            error
        );

        return [];

    }

}

export async function createDiscoveryCandidate(data) {

    const response = await authFetch(
        `${BASE_URL}/salesforce/discovery-candidates`,
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(data)
        }
    );

    if (!response.ok) {

        const errorData = await response.json().catch(() => ({}));

        throw new Error(
            errorData.detail ||
            "Failed to log new discovery"
        );

    }

    return await response.json();
}

export async function getDiscoveryCandidates() {

    try {

        const response = await authFetch(
            `${BASE_URL}/salesforce/discovery-candidates`
        );

        if (!response.ok) {
            throw new Error(
                `Discovery Candidates API failed: ${response.status}`
            );
        }

        return await response.json();

    } catch (error) {

        console.error(
            "Discovery Candidates API Error:",
            error
        );

        return [];

    }

}

export async function updateDiscoveryCandidate(candidateId, data) {

    const response = await authFetch(
        `${BASE_URL}/salesforce/discovery-candidates/${candidateId}`,
        {
            method: "PUT",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(data)
        }
    );

    if (!response.ok) {

        const errorData = await response.json().catch(() => ({}));

        throw new Error(
            errorData.detail ||
            "Failed to update discovery candidate"
        );

    }

    return await response.json();
}

export async function convertDiscoveryCandidateToLead(candidateId) {

    const response = await authFetch(
        `${BASE_URL}/salesforce/discovery-candidates/${candidateId}/convert-to-lead`,
        {
            method: "POST"
        }
    );

    if (!response.ok) {

        const errorData = await response.json().catch(() => ({}));

        throw new Error(
            errorData.detail ||
            "Failed to convert candidate to lead"
        );

    }

    return await response.json();
}

export async function checkDiscoveryCandidateDuplicates(candidateId) {

    const response = await authFetch(
        `${BASE_URL}/salesforce/discovery-candidates/${candidateId}/check-duplicates`,
        {
            method: "POST"
        }
    );

    if (!response.ok) {

        const errorData = await response.json().catch(() => ({}));

        throw new Error(
            errorData.detail ||
            "Failed to check for duplicates"
        );

    }

    return await response.json();
}

// Unlike getAccounts() (GIS-filtered - only accounts that already have
// a latitude/longitude, correct for the map, wrong for a plain list),
// this returns every account regardless of whether it's been
// geolocated yet. Same fix as getAllLeads().
export async function getAllAccounts() {

    try {

        const response = await authFetch(
            `${BASE_URL}/salesforce/accounts/all`
        );

        if (!response.ok) {
            throw new Error("Failed to fetch accounts");
        }

        return await response.json();

    } catch (error) {

        console.error("Accounts API Error:", error);

        return [];

    }

}

export async function createAccount(data) {

    const response = await authFetch(
        `${BASE_URL}/salesforce/accounts`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        }
    );

    if (!response.ok) {

        const errorData = await response.json().catch(() => ({}));

        throw new Error(
            errorData.detail ||
            "Failed to create account"
        );

    }

    return await response.json();
}

export async function createTerritory(data) {

    const response = await authFetch(
        `${BASE_URL}/salesforce/territories`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        }
    );

    if (!response.ok) {

        const errorData = await response.json().catch(() => ({}));

        throw new Error(
            errorData.detail ||
            "Failed to create territory"
        );

    }

    return await response.json();
}

export async function createRoute(data) {

    const response = await authFetch(
        `${BASE_URL}/salesforce/routes`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        }
    );

    if (!response.ok) {

        const errorData = await response.json().catch(() => ({}));

        throw new Error(
            errorData.detail ||
            "Failed to create route"
        );

    }

    return await response.json();
}

export async function createFieldVisit(data) {

    const response = await authFetch(
        `${BASE_URL}/salesforce/visits`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        }
    );

    if (!response.ok) {

        const errorData = await response.json().catch(() => ({}));

        throw new Error(
            errorData.detail ||
            "Failed to create field visit"
        );

    }

    return await response.json();
}

export async function createEvidence(data) {

    const response = await authFetch(
        `${BASE_URL}/salesforce/evidence`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        }
    );

    if (!response.ok) {

        const errorData = await response.json().catch(() => ({}));

        throw new Error(
            errorData.detail ||
            "Failed to create evidence"
        );

    }

    return await response.json();
}

export async function getOpportunities() {

    try {

        const response = await authFetch(
            `${BASE_URL}/salesforce/opportunities`
        );

        if (!response.ok) {
            throw new Error("Failed to fetch opportunities");
        }

        return await response.json();

    } catch (error) {

        console.error("Opportunities API Error:", error);

        return [];

    }

}

// GIS-filtered (only opportunities whose linked Account already has a
// latitude/longitude) - for plotting pins on the GIS Map, not the list.
export async function getOpportunitiesMap() {

    try {

        const response = await authFetch(
            `${BASE_URL}/salesforce/gis/opportunities`
        );

        if (!response.ok) {
            throw new Error("Failed to fetch opportunities map data");
        }

        return await response.json();

    } catch (error) {

        console.error("Opportunities Map API Error:", error);

        return [];

    }

}

export async function createOpportunity(data) {

    const response = await authFetch(
        `${BASE_URL}/salesforce/opportunities`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        }
    );

    if (!response.ok) {

        const errorData = await response.json().catch(() => ({}));

        throw new Error(
            errorData.detail ||
            "Failed to create opportunity"
        );

    }

    return await response.json();
}