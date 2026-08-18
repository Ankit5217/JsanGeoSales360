import { useEffect, useState } from "react";
import { useUser } from "../context/UserContext";
import {
    getUsers,
    updateUserRole
} from "../services/usersApi";


export default function AdminUsers() {
    const { hasPermission } = useUser();

    const [users, setUsers] = useState([]);

    const [loading, setLoading] = useState(true);

    const [updatingUser, setUpdatingUser] =
        useState(null);

    if (!hasPermission("userRoles")) {
    return (
        <div style={{ padding: "30px" }}>
            <h2>Access Denied</h2>
            <p>
                You do not have permission to manage user roles.
            </p>
        </div>
    );
}

    const roleOptions = [

        "Sales Manager",

        "Field Sales Representative",

        "Sales Executive",

        "GIS Analyst",

        "Administrator"

    ];


    useEffect(() => {

        async function loadUsers() {

            try {

                const data =
                    await getUsers();

                console.log(
                    "GeoSales Users:",
                    data
                );

                setUsers(data);

            } catch (error) {

                console.error(
                    "User loading error:",
                    error
                );

            } finally {

                setLoading(false);

            }

        }


        loadUsers();

    }, []);


async function handleRoleChange(userId, newRole) {

    console.log("1. Role change started");
    console.log("User ID:", userId);
    console.log("New Role:", newRole);

    try {

        setUpdatingUser(userId);

        const result = await updateUserRole(
            userId,
            newRole
        );

        console.log("2. Backend response:", result);

        if (!result || result.success !== true) {
            throw new Error(
                result?.error ||
                "Role update failed"
            );
        }

        console.log("3. Salesforce role update successful");

        // Reload actual data from Salesforce
        const updatedUsers = await getUsers();

        console.log(
            "4. Users after refresh:",
            updatedUsers
        );

        setUsers(updatedUsers);

        alert("User role updated successfully.");

    } catch (error) {

        console.error(
            "❌ Role update error:",
            error
        );

        alert(
            error.message ||
            "Failed to update user role."
        );

    } finally {

        setUpdatingUser(null);

    }
}

    if (loading) {

        return (

            <div
                style={{
                    padding: "30px"
                }}
            >
                Loading users...
            </div>

        );

    }


    return (

        <div
            style={{
                padding: "25px",
                background: "#f4f6f9",
                minHeight: "100vh"
            }}
        >

            <h2
                style={{
                    color: "#0B2E4F"
                }}
            >
                User Roles
            </h2>


            <div
                style={{
                    background: "#fff",
                    borderRadius: "10px",
                    padding: "20px",
                    boxShadow:
                        "0 2px 8px rgba(0,0,0,0.08)"
                }}
            >

                <table
                    style={{
                        width: "100%",
                        borderCollapse:
                            "collapse"
                    }}
                >

                    <thead>

                        <tr
                            style={{
                                background:
                                    "#f4f6f9"
                            }}
                        >

                            <th>Name</th>

                            <th>Email</th>

                            <th>Profile</th>

                            <th>
                                GeoSales Role
                            </th>

                        </tr>

                    </thead>


                    <tbody>

                        {users.map(user => (

                            <tr
                                key={user.id}
                            >

                                <td>
                                    {user.name}
                                </td>


                                <td>
                                    {user.email}
                                </td>


                                <td>
                                    {user.profile}
                                </td>


                                <td>

                                    <select
                                        value={
                                            user.geoSalesRole ||
                                            ""
                                        }
                                        disabled={
                                            updatingUser ===
                                            user.id
                                        }
                                        onChange={(e) =>
                                            handleRoleChange(
                                                user.id,
                                                e.target.value
                                            )
                                        }
                                        style={{
                                            padding:
                                                "8px 10px",

                                            borderRadius:
                                                "6px",

                                            border:
                                                "1px solid #ccc",

                                            minWidth:
                                                "220px",

                                            background:
                                                updatingUser ===
                                                user.id
                                                    ? "#eee"
                                                    : "#fff"
                                        }}
                                    >

                                        <option value="">
                                            Not Assigned
                                        </option>


                                        {roleOptions.map(
                                            role => (

                                                <option
                                                    key={role}
                                                    value={role}
                                                >
                                                    {role}
                                                </option>

                                            )
                                        )}

                                    </select>


                                    {updatingUser ===
                                        user.id && (

                                        <span
                                            style={{
                                                marginLeft:
                                                    "10px",

                                                color:
                                                    "#666",

                                                fontSize:
                                                    "12px"
                                            }}
                                        >
                                            Updating...
                                        </span>

                                    )}

                                </td>

                            </tr>

                        ))}

                    </tbody>

                </table>

            </div>

        </div>

    );

}