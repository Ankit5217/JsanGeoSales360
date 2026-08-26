import { ROLE_PERMISSIONS, MODULE_ACCESS } from "./rolePermissions";

// Raw permission-key check - e.g. hasPermission("SALES_MANAGER", "EDIT_ACCOUNTS").
// Used for gating individual actions/buttons within a module a role can
// already see (VIEW_ACCOUNTS vs EDIT_ACCOUNTS, etc.).
export function hasPermission(role, permission) {
    if (!role) {
        return false;
    }

    const granted = ROLE_PERMISSIONS[role];

    if (!granted) {
        return false;
    }

    if (granted === "ALL") {
        return true;
    }

    return granted.includes(permission);
}

// Module-level visibility - e.g. hasModuleAccess("FIELD_USER", "accounts").
// A role can see a module if it holds ANY of the permissions listed for
// that module in MODULE_ACCESS.
export function hasModuleAccess(role, moduleKey) {
    if (!role) {
        return false;
    }

    if (ROLE_PERMISSIONS[role] === "ALL") {
        return true;
    }

    const required = MODULE_ACCESS[moduleKey];

    if (!required || required.length === 0) {
        return false;
    }

    return required.some(permission => hasPermission(role, permission));
}
