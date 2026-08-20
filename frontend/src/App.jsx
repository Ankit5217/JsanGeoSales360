// import MapView from './components/MapView';
// import './App.css';

// function App() {
//   return <MapView />;
// }

// export default App;

import { useState } from "react";
import Sidebar from "./components/Sidebar";
import ModuleRenderer from "./components/ModuleRenderer";
import Login from "./components/Login";
import { UserProvider } from "./context/UserContext";
import { AuthProvider, useAuth } from "./context/AuthContext";


function AppShell() {

    const [activeModule, setActiveModule] =
        useState("dashboard");

    const { isAuthenticated, checkedStorage } = useAuth();

    if (!checkedStorage) {
        return null;
    }

    if (!isAuthenticated) {
        return <Login />;
    }

    return (

        <UserProvider>

            <div
                style={{
                    display: "flex",
                    minHeight: "100vh"
                }}
            >

                <Sidebar
                    activeModule={activeModule}
                    onModuleChange={setActiveModule}
                />


                <div
                    style={{
                        flex: 1,
                        minWidth: 0
                    }}
                >

                    <ModuleRenderer
                        activeModule={activeModule}
                    />

                </div>

            </div>

        </UserProvider>

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