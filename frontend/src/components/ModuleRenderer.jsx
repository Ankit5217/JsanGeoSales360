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
import LiveOps from "./modules/LiveOps";

const MODULE_PERMISSIONS = {
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
    userRoles: "userRoles",
    liveOps: "liveOps"
};

const MODULE_COMPONENTS = {
    dashboard: Dashboard,
    accounts: Accounts,
    leads: Leads,
    opportunities: Opportunities,
    discovery: Discovery,
    territories: Territories,
    routes: Routes,
    fieldVisits: FieldVisits,
    evidence: Evidence,
    gis: MapView,
    userRoles: AdminUsers,
    liveOps: LiveOps
};

function EmptyState({ title, message }) {
    return (
        <div style={{ padding: "48px 32px" }}>
            <h2 style={{ color: "var(--gs-navy)", fontSize: "20px" }}>{title}</h2>
            <p style={{ color: "var(--gs-ink-muted)", marginTop: "6px" }}>{message}</p>
        </div>
    );
}

export default function ModuleRenderer({ activeModule }) {
    const permission = MODULE_PERMISSIONS[activeModule];

    if (!permission) {
        return <EmptyState title="Module not found" message={`No module is registered for "${activeModule}".`} />;
    }

    const ModuleComponent = MODULE_COMPONENTS[activeModule];

    if (!ModuleComponent) {
        return <EmptyState title={activeModule} message="This module is under development." />;
    }

    return (
        <ProtectedModule permission={permission}>
            <ModuleComponent />
        </ProtectedModule>
    );
}
