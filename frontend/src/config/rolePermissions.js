// Fine-grained permission keys. A role's grant is either the literal
// string "ALL" (wildcard - every permission and every module) or an array
// of the keys below.
export const PERMISSIONS = {
    VIEW_ACCOUNTS: "VIEW_ACCOUNTS",
    EDIT_ACCOUNTS: "EDIT_ACCOUNTS",
    VIEW_LEADS: "VIEW_LEADS",
    EDIT_LEADS: "EDIT_LEADS",
    CREATE_WORK_ORDER: "CREATE_WORK_ORDER",
    ASSIGN_WORK_ORDER: "ASSIGN_WORK_ORDER",
    VIEW_WORK_ORDER: "VIEW_WORK_ORDER",
    UPDATE_WORK_ORDER: "UPDATE_WORK_ORDER",
    COMPLETE_WORK_ORDER: "COMPLETE_WORK_ORDER",
    VIEW_GIS: "VIEW_GIS",
    MANAGE_TERRITORIES: "MANAGE_TERRITORIES",
    VIEW_ASSIGNED_ACCOUNTS: "VIEW_ASSIGNED_ACCOUNTS",
    VIEW_ASSIGNED_LEADS: "VIEW_ASSIGNED_LEADS",
    UPLOAD_EVIDENCE: "UPLOAD_EVIDENCE",
    VIEW_LIVE_OPS: "VIEW_LIVE_OPS"
};

export const ROLE_PERMISSIONS = {

    ADMIN: "ALL",

    SALES_MANAGER: [
        PERMISSIONS.VIEW_ACCOUNTS,
        PERMISSIONS.EDIT_ACCOUNTS,
        PERMISSIONS.VIEW_LEADS,
        PERMISSIONS.EDIT_LEADS,
        PERMISSIONS.CREATE_WORK_ORDER,
        PERMISSIONS.ASSIGN_WORK_ORDER,
        PERMISSIONS.VIEW_WORK_ORDER,
        PERMISSIONS.VIEW_GIS,
        PERMISSIONS.MANAGE_TERRITORIES,
        PERMISSIONS.VIEW_LIVE_OPS
    ],

    FIELD_USER: [
        PERMISSIONS.VIEW_ASSIGNED_ACCOUNTS,
        PERMISSIONS.VIEW_ASSIGNED_LEADS,
        PERMISSIONS.VIEW_WORK_ORDER,
        PERMISSIONS.UPDATE_WORK_ORDER,
        PERMISSIONS.COMPLETE_WORK_ORDER,
        PERMISSIONS.UPLOAD_EVIDENCE,
        PERMISSIONS.VIEW_GIS
    ]

};

export const ROLE_LABELS = {
    ADMIN: "Administrator",
    SALES_MANAGER: "Sales Manager",
    FIELD_USER: "Field User"
};

// Which permission(s) unlock each sidebar module - a module whose list is
// empty here has no non-admin permission that grants it, so only ADMIN
// (via the "ALL" wildcard) can reach it. A module is visible to a role
// if the role holds at least one permission in its list.
export const MODULE_ACCESS = {
    dashboard: [],
    accounts: [PERMISSIONS.VIEW_ACCOUNTS, PERMISSIONS.VIEW_ASSIGNED_ACCOUNTS],
    leads: [PERMISSIONS.VIEW_LEADS, PERMISSIONS.VIEW_ASSIGNED_LEADS],
    opportunities: [],
    discovery: [],
    territories: [PERMISSIONS.MANAGE_TERRITORIES],
    routes: [PERMISSIONS.CREATE_WORK_ORDER, PERMISSIONS.ASSIGN_WORK_ORDER],
    fieldVisits: [PERMISSIONS.VIEW_WORK_ORDER, PERMISSIONS.UPDATE_WORK_ORDER, PERMISSIONS.COMPLETE_WORK_ORDER],
    evidence: [PERMISSIONS.UPLOAD_EVIDENCE],
    gis: [PERMISSIONS.VIEW_GIS],
    userRoles: [],
    liveOps: [PERMISSIONS.VIEW_LIVE_OPS]
};
