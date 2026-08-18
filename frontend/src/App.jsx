// import MapView from './components/MapView';
// import './App.css';

// function App() {
//   return <MapView />;
// }

// export default App;

import { useState } from "react";
import Sidebar from "./components/Sidebar";
import ModuleRenderer from "./components/ModuleRenderer";
import { UserProvider } from "./context/UserContext";


function App() {

    const [activeModule, setActiveModule] =
        useState("dashboard");


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


export default App;