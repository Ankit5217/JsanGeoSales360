export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
export const WS_URL = API_BASE_URL.replace(/^http/, "ws") + "/ws";

const TOKEN_KEY = "gs360_token";

export function getToken() {
    return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
    sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
    sessionStorage.removeItem(TOKEN_KEY);
}

// Drop-in replacement for fetch() that attaches the login token.
// On a 401 (missing/expired token), clears the stored token and fires
// "auth:logout" so AuthContext can bounce the user back to the login screen.
export async function authFetch(url, options = {}) {
    const token = getToken();

    const response = await fetch(url, {
        ...options,
        headers: {
            ...(options.headers || {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
    });

    if (response.status === 401) {
        clearToken();
        window.dispatchEvent(new Event("auth:logout"));
    }

    return response;
}
