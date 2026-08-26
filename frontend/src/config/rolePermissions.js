export const ROLE_PERMISSIONS = {

    "Administrator": {
        dashboard: true,
        accounts: true,
        leads: true,
        opportunities: true,
        discovery: true,
        territories: true,
        routes: true,
        fieldVisits: true,
        evidence: true,
        userRoles: true,
        gis: true
    },

    "Sales Manager": {
        dashboard: true,
        accounts: true,
        leads: true,
        opportunities: true,
        discovery: true,
        territories: true,
        routes: true,
        fieldVisits: true,
        evidence: true,
        userRoles: false,
        gis: true
    },

    "Sales Executive": {
        dashboard: true,
        accounts: true,
        leads: true,
        opportunities: true,
        discovery: false,
        territories: false,
        routes: false,
        fieldVisits: false,
        evidence: false,
        userRoles: false,
        gis: true
    },

    "Field Sales Representative": {
        dashboard: true,
        accounts: true,
        leads: true,
        opportunities: true,
        discovery: true,
        territories: true,
        routes: true,
        fieldVisits: true,
        evidence: true,
        userRoles: false,
        gis: true
    },

    "GIS Analyst": {
        dashboard: true,
        accounts: true,
        leads: true,
        opportunities: false,
        discovery: true,
        territories: true,
        routes: true,
        fieldVisits: true,
        evidence: true,
        userRoles: false,
        gis: true
    }

};