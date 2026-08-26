import { createContext, useContext } from "react";
import { useAuth } from "./AuthContext";
import { hasPermission, hasModuleAccess } from "../config/permissions";
import { ROLE_LABELS } from "../config/rolePermissions";

const UserContext = createContext(null);

export function UserProvider({ children }) {

    const { username, role } = useAuth();

    // Module-level visibility (Sidebar, ProtectedModule) - "accounts",
    // "gis", etc.
    function checkModuleAccess(moduleKey) {
        return hasModuleAccess(role, moduleKey);
    }

    // Action-level checks within a module a role can already see - e.g.
    // can("EDIT_ACCOUNTS"), can("MANAGE_TERRITORIES").
    function checkPermission(permission) {
        return hasPermission(role, permission);
    }


    const value = {

        currentUser: username
            ? { username, geoSalesRole: role, roleLabel: ROLE_LABELS[role] || role }
            : null,

        role,

        loading: false,

        hasPermission: checkModuleAccess,

        can: checkPermission

    };


    return (

        <UserContext.Provider value={value}>

            {children}

        </UserContext.Provider>

    );

}


export function useUser() {

    const context = useContext(UserContext);

    if (!context) {

        throw new Error(
            "useUser must be used inside UserProvider"
        );

    }

    return context;

}
