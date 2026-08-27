import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import ModuleRenderer from "./components/ModuleRenderer";
import Login from "./components/Login";
import OfflineBanner from "./components/OfflineBanner";
import { UserProvider } from "./context/UserContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { startOfflineSync } from "./offline/syncEngine";
import useIsMobile from "./hooks/useIsMobile";

const MODULE_LABELS = {
    dashboard: "Dashboard",
    accounts: "Accounts",
    leads: "Leads",
    opportunities: "Opportunities",
    discovery: "Discovery",
    territories: "Territories",
    routes: "Routes",
    fieldVisits: "Field Visits",
    evidence: "Evidence",
    gis: "GIS Map",
    userRoles: "User Roles"
};


function AppShell() {

    const [activeModule, setActiveModule] =
        useState("dashboard");
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const { isAuthenticated, checkedStorage } = useAuth();
    const isMobile = useIsMobile();

    // Started once, regardless of auth state, so a queued item that only
    // needs a fresh login still drains automatically the moment one exists -
    // the sync engine reads the current token itself on each attempt.
    useEffect(() => {
        return startOfflineSync();
    }, []);

    if (!checkedStorage) {
        return null;
    }

    return (

        <>

            {/* Rendered outside the auth gate on purpose - a forced logout
                (e.g. an expired token mid-sync) must not hide a "sign in
                again to sync N items" notice along with everything else. */}
            <OfflineBanner />

            {!isAuthenticated ? (

                <Login />

            ) : (

                <UserProvider>

                    <div
                        style={{
                            display: "flex",
                            width: "100%",
                            minHeight: "100vh",
                            background: "var(--gs-bg)"
                        }}
                    >

                        <Sidebar
                            activeModule={activeModule}
                            onModuleChange={setActiveModule}
                            isOpen={sidebarOpen}
                            onClose={() => setSidebarOpen(false)}
                        />


                        <div
                            style={{
                                flex: 1,
                                minWidth: 0,
                                minHeight: "100vh"
                            }}
                        >

                            {isMobile && (
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "12px",
                                        padding: "12px 16px",
                                        background: "var(--gs-navy)",
                                        color: "var(--gs-ink-on-navy)",
                                        position: "sticky",
                                        top: 0,
                                        zIndex: 30
                                    }}
                                >
                                    <button
                                        onClick={() => setSidebarOpen(true)}
                                        aria-label="Open menu"
                                        style={{
                                            border: "1px solid rgba(255,255,255,0.18)",
                                            background: "transparent",
                                            color: "inherit",
                                            borderRadius: "6px",
                                            padding: "6px 10px",
                                            fontSize: "16px",
                                            lineHeight: 1,
                                            cursor: "pointer"
                                        }}
                                    >
                                        ☰
                                    </button>
                                    <div
                                        style={{
                                            fontFamily: "var(--gs-font-display)",
                                            fontSize: "15px",
                                            fontWeight: 700
                                        }}
                                    >
                                        {MODULE_LABELS[activeModule] || "GeoSales 360"}
                                    </div>
                                </div>
                            )}

                            <ModuleRenderer
                                activeModule={activeModule}
                            />

                        </div>

                    </div>

                </UserProvider>

            )}

        </>

    );

}


function App() {

    return (
        <AuthProvider>
            <AppShell />
        </AuthProvider>
    );

}


export default App;
