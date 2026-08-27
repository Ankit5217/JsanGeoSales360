import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import ModuleRenderer from "./components/ModuleRenderer";
import Login from "./components/Login";
import OfflineBanner from "./components/OfflineBanner";
import { UserProvider } from "./context/UserContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { startOfflineSync } from "./offline/syncEngine";


function AppShell() {

    const [activeModule, setActiveModule] =
        useState("dashboard");

    const { isAuthenticated, checkedStorage } = useAuth();

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
                        />


                        <div
                            style={{
                                flex: 1,
                                minWidth: 0,
                                minHeight: "100vh"
                            }}
                        >

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
