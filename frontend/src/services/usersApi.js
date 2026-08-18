const API_BASE = "http://127.0.0.1:8000";


// =====================================
// GET ALL SALESFORCE USERS
// =====================================

export async function getUsers() {

    const response = await fetch(
        `${API_BASE}/salesforce/users`
    );

    if (!response.ok) {

        const errorData =
            await response.json().catch(() => ({}));

        throw new Error(
            errorData.detail ||
            "Failed to fetch users"
        );
    }

    return await response.json();
}


// =====================================
// UPDATE USER ROLE
// =====================================

export async function updateUserRole(userId, role) {

    const response = await fetch(
        `${API_BASE}/salesforce/users/${userId}/role`,
        {
            method: "PUT",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                role: role
            })
        }
    );

    if (!response.ok) {

        const errorData =
            await response.json().catch(() => ({}));

        throw new Error(
            errorData.detail ||
            "Failed to update user role"
        );
    }

    return await response.json();
}