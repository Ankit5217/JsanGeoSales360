import { useUser } from "../context/UserContext";
import ProtectedModule from "./ProtectedModule";
import MapView from "./mapview";
import AdminUsers from "./AdminUsers";
import Dashboard from "./modules/Dashboard";
import Accounts from "./modules/Accounts";
import Leads from "./modules/Leads";
import Opportunities from "./modules/Opportunities";
import Discovery from "./modules/Discovery";
import Territories from "./modules/Territories";
import Routes from "./modules/Routes";
import FieldVisits from "./modules/FieldVisits";
import Evidence from "./modules/Evidence";
import GISMap from "./modules/GISMap";

// export default function ModuleRenderer({ activeModule }) {

//     const modulePermissions = {
//         dashboard: "dashboard",
//         accounts: "accounts",
//         leads: "leads",
//         opportunities: "opportunities",
//         discovery: "discovery",
//         territories: "territories",
//         routes: "routes",
//         fieldVisits: "fieldVisits",
//         evidence: "evidence",
//         gis: "gis",
//         userRoles: "userRoles",
//         accounts: "accounts",

//         leads: "leads",

//         opportunities: "opportunities",

//         discovery: "discovery",

//         territories: "territories",

//         routes: "routes",

//         fieldVisits: "fieldVisits",

//         evidence: "evidence",

//     };

//     const permission =
//         modulePermissions[activeModule];

//     if (!permission) {
//         return (
//             <div style={{ padding: "30px" }}>
//                 <h2>Module Not Found</h2>
//             </div>
//         );
//     }

// return (
//     <ProtectedModule permission={permission}>

//         {activeModule === "dashboard" ? (

//             <Dashboard />

//         ) : activeModule === "userRoles" ? (

//             <AdminUsers />

//         ) : (

//             <MapView
//                 activeModule={activeModule}
//             />

//         )}

//     </ProtectedModule>
// );
// }

export default function ModuleRenderer({
    activeModule
}) {

    const modulePermissions = {

        dashboard: "dashboard",
        accounts: "accounts",
        leads: "leads",
        opportunities: "opportunities",
        discovery: "discovery",
        territories: "territories",
        routes: "routes",
        fieldVisits: "fieldVisits",
        evidence: "evidence",
        gis: "gis",
        userRoles: "userRoles"

    };


    const permission =
        modulePermissions[activeModule];


    if (!permission) {

        return (
            <div
                style={{
                    padding: "30px"
                }}
            >

                <h2>
                    Module Not Found
                </h2>

            </div>
        );

    }


    let ModuleComponent;


    switch (activeModule) {

        case "dashboard":

            ModuleComponent = Dashboard;

            break;


        case "accounts":

            ModuleComponent = Accounts;

            break;


        case "leads":

            ModuleComponent = Leads;

            break;


        case "territories":

        ModuleComponent = Territories;

        break;

        case "routes":

        ModuleComponent = Routes;

        break;

        case "fieldVisits":

        ModuleComponent = FieldVisits;

        break;

        case "evidence":

        ModuleComponent = Evidence;

        break;

        case "gis":
        ModuleComponent = MapView;
        break;


        case "userRoles":

            ModuleComponent = AdminUsers;

            break;


        default:

            ModuleComponent = () => (

                <div
                    style={{
                        padding: "30px"
                    }}
                >

                    <h1
                        style={{
                            color: "#0B2E4F"
                        }}
                    >
                        {activeModule}
                    </h1>

                    <p>
                        This module is under development.
                    </p>

                </div>

            );

            break;

    }


    return (

        <ProtectedModule
            permission={permission}
        >

            <ModuleComponent />

        </ProtectedModule>

    );

}