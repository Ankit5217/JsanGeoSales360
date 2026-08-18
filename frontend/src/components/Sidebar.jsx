import React from "react";
import { useUser } from "../context/UserContext";

export default function Sidebar({ activeModule, onModuleChange }) {
        const {
        currentUser,
        role,
        hasPermission
    } = useUser();

    console.log("Sidebar User:", currentUser);
    console.log("Sidebar Role:", role);
    console.log(
        "Sidebar Accounts Permission:",
        hasPermission("accounts")
    );
    console.log(
        "Sidebar User Roles Permission:",
        hasPermission("userRoles")
    );

    const modules = [
        {
            key: "dashboard",
            label: "Dashboard",
            icon: "📊",
            permission: "dashboard"
        },
        {
            key: "accounts",
            label: "Accounts",
            icon: "🏢",
            permission: "accounts"
        },
        {
            key: "leads",
            label: "Leads",
            icon: "👤",
            permission: "leads"
        },
        {
            key: "opportunities",
            label: "Opportunities",
            icon: "💰",
            permission: "opportunities"
        },
        {
            key: "discovery",
            label: "Discovery",
            icon: "🔍",
            permission: "discovery"
        },
        {
            key: "territories",
            label: "Territories",
            icon: "🗺️",
            permission: "territories"
        },
        {
            key: "routes",
            label: "Routes",
            icon: "🚗",
            permission: "routes"
        },
        {
            key: "fieldVisits",
            label: "Field Visits",
            icon: "📍",
            permission: "fieldVisits"
        },
        {
            key: "evidence",
            label: "Evidence",
            icon: "📷",
            permission: "evidence"
        },
        {
            key: "gis",
            label: "GIS Map",
            icon: "🌍",
            permission: "gis"
        },
        {
            key: "userRoles",
            label: "User Roles",
            icon: "🔐",
            permission: "userRoles"
        }
    ];

    const allowedModules = modules.filter(
        module => hasPermission(module.permission)
    );

    return (
        <div
            style={{
                width: "240px",
                minHeight: "100vh",
                background: "#0B2E4F",
                color: "#fff",
                padding: "20px 0",
                boxSizing: "border-box"
            }}
        >

            <div
                style={{
                    padding: "0 20px 25px",
                    fontSize: "20px",
                    fontWeight: "bold",
                    borderBottom: "1px solid rgba(255,255,255,0.15)"
                }}
            >
                JSAN GeoSales 360
            </div>

            <div
                style={{
                    padding: "20px 10px"
                }}
            >

                {allowedModules.map(module => (

                    <button
                        key={module.key}
                        onClick={() =>
                            onModuleChange(module.key)
                        }
                        style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            padding: "12px 15px",
                            marginBottom: "6px",
                            border: "none",
                            borderRadius: "8px",
                            background:
                                activeModule === module.key
                                    ? "rgba(255,255,255,0.18)"
                                    : "transparent",
                            color: "#fff",
                            cursor: "pointer",
                            textAlign: "left",
                            fontSize: "14px"
                        }}
                    >

                        <span
                            style={{
                                fontSize: "18px"
                            }}
                        >
                            {module.icon}
                        </span>

                        <span>
                            {module.label}
                        </span>

                    </button>

                ))}

            </div>

        </div>
    );
}