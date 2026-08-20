import { createContext, useContext, useEffect, useState } from "react";
import { login as loginRequest } from "../services/authApi";
import { getToken, setToken, clearToken } from "../config/apiBase";

const AuthContext = createContext(null);

// Reads the username/role/expiry out of a JWT's payload without verifying
// its signature — fine for UI display purposes only. The backend still
// verifies the signature on every real API call; this never grants access
// to anything, it just tells the UI who's (probably) logged in.
function decodeToken(token) {

    try {

        const payload = token.split(".")[1];
        const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
        const data = JSON.parse(json);

        if (data.exp && data.exp * 1000 < Date.now()) {
            return null;
        }

        return {
            username: data.sub,
            role: data.role
        };

    } catch {
        return null;
    }

}

export function AuthProvider({ children }) {

    const [authUser, setAuthUser] = useState(null);
    const [checkedStorage, setCheckedStorage] = useState(false);

    useEffect(() => {

        const existingToken = getToken();

        if (existingToken) {

            const decoded = decodeToken(existingToken);

            if (decoded) {
                setAuthUser({ token: existingToken, ...decoded });
            } else {
                clearToken();
            }

        }

        setCheckedStorage(true);

    }, []);

    useEffect(() => {

        function handleAuthLogout() {
            setAuthUser(null);
        }

        window.addEventListener("auth:logout", handleAuthLogout);

        return () => {
            window.removeEventListener("auth:logout", handleAuthLogout);
        };

    }, []);

    async function login(username, password) {

        const data = await loginRequest(username, password);

        setToken(data.access_token);

        setAuthUser({
            token: data.access_token,
            username: data.username,
            role: data.role
        });

        return data;
    }

    function logout() {
        clearToken();
        setAuthUser(null);
    }

    const value = {
        isAuthenticated: !!authUser,
        username: authUser?.username || null,
        role: authUser?.role || null,
        checkedStorage,
        login,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );

}

export function useAuth() {

    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth must be used inside AuthProvider");
    }

    return context;

}
