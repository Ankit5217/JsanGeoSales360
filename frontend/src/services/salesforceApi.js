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