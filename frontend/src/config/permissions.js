import { ROLE_PERMISSIONS } from "./rolePermissions";

export function hasPermission(role, permission) {

    if (!role) {
        return false;
    }

    const permissions = ROLE_PERMISSIONS[role];

    if (!permissions) {
        return false;
    }

    return permissions[permission] === true;
}