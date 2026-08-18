import { createContext, useContext, useEffect, useState } from "react";
import { getUsers } from "../services/usersApi";
import { hasPermission } from "../config/permissions";

const UserContext = createContext(null);

export function UserProvider({ children }) {

    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {

        async function loadCurrentUser() {

            try {

                const users = await getUsers();

                console.log("Users loaded for permissions:", users);

                /*
                 * TEMPORARY:
                 * Until we connect Salesforce login/session
                 * to the React application, use the first
                 * Salesforce user for testing.
                 */
 if (users && users.length > 0) {

    console.log("Selected test user:", users[0]);

    console.log(
        "Selected GeoSales Role:",
        users[0]?.geoSalesRole
    );

    const selectedUser = users[0];

console.log("Selected test user:", selectedUser);

setCurrentUser({
    ...selectedUser,
    geoSalesRole: selectedUser.GeoSales_Role__c
});

}

            } catch (error) {

                console.error(
                    "Failed to load current user:",
                    error
                );

            } finally {

                setLoading(false);

            }

        }

        loadCurrentUser();

    }, []);


    function checkPermission(permission) {

        if (!currentUser) {
            return false;
        }

        return hasPermission(
            currentUser.geoSalesRole,
            permission
        );

    }


    const value = {

        currentUser,

        role:
            currentUser?.geoSalesRole || null,

        loading,

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