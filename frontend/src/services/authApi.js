import { API_BASE_URL } from "../config/apiBase";

export async function login(username, password) {

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
    });

    if (!response.ok) {

        const errorData = await response.json().catch(() => ({}));

        throw new Error(
            errorData.detail ||
            "Login failed"
        );

    }

    return await response.json();
}
