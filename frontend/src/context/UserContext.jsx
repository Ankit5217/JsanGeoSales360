import { createContext, useContext } from "react";
import { useAuth } from "./AuthContext";
import { hasPermission } from "../config/permissions";

const UserContext = createContext(null);

export function UserProvider({ children }) {

    const { username, role } = useAuth();

    function checkPermission(permission) {

        if (!role) {
            return false;
        }

        return hasPermission(role, permission);

    }


    const value = {

        currentUser: username
            ? { username, geoSalesRole: role }
            : null,

        role,

        loading: false,

        hasPermission: checkPermission

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
