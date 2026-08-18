import { useEffect, useState } from "react";
import {
    getGISAccounts,
    getGISLeads,
    getGISDiscovery,
    getGISTerritories,
    getGISRoutes,
    getGISFieldVisits
} from "../../services/salesforceApi";

export default function GISMap() {

    const [accounts, setAccounts] = useState([]);
    const [leads, setLeads] = useState([]);
    const [discovery, setDiscovery] = useState([]);
    const [territories, setTerritories] = useState([]);
    const [routes, setRoutes] = useState([]);
    const [fieldVisits, setFieldVisits] = useState([]);

    const [loading, setLoading] = useState(true);

    const [selectedType, setSelectedType] =
        useState("accounts");

    useEffect(() => {

        async function loadGISData() {

            console.log("=== GIS MAP: START API CALL ===");

            try {

                const [
                    accountsData,
                    leadsData,
                    discoveryData,
                    territoriesData,
                    routesData,
                    visitsData
                ] = await Promise.all([

                    getGISAccounts(),

                    getGISLeads(),

                    getGISDiscovery(),

                    getGISTerritories(),

                    getGISRoutes(),

                    getGISFieldVisits()

                ]);


                console.log(
                    "=== GIS ACCOUNTS ==="
                );

                console.log(accountsData);


                console.log(
                    "=== GIS LEADS ==="
                );

                console.log(leadsData);


                console.log(
                    "=== GIS DISCOVERY ==="
                );

                console.log(discoveryData);


                console.log(
                    "=== GIS TERRITORIES ==="
                );

                console.log(territoriesData);


                console.log(
                    "=== GIS ROUTES ==="
                );

                console.log(routesData);


                console.log(
                    "=== GIS FIELD VISITS ==="
                );

                console.log(visitsData);


                setAccounts(
                    Array.isArray(accountsData)
                        ? accountsData
                        : []
                );

                setLeads(
                    Array.isArray(leadsData)
                        ? leadsData
                        : []
                );

                setDiscovery(
                    Array.isArray(discoveryData)
                        ? discoveryData
                        : []
                );

                setTerritories(
                    Array.isArray(territoriesData)
                        ? territoriesData
                        : []
                );

                setRoutes(
                    Array.isArray(routesData)
                        ? routesData
                        : []
                );

                setFieldVisits(
                    Array.isArray(visitsData)
                        ? visitsData
                        : []
                );


            } catch (error) {

                console.error(
                    "GIS API Error:",
                    error
                );

            } finally {

                setLoading(false);

            }

        }

        loadGISData();

    }, []);


    /*
     * SELECTED DATA
     */

    const getSelectedData = () => {

        switch (selectedType) {

            case "accounts":
                return accounts;

            case "leads":
                return leads;

            case "discovery":
                return discovery;

            case "territories":
                return territories;

            case "routes":
                return routes;

            case "fieldVisits":
                return fieldVisits;

            default:
                return [];

        }

    };


    const selectedData = getSelectedData();


    /*
     * EXTRACT COORDINATES
     */

    const getLatitude = (item) => {

        return (
            item.Location__Latitude__s ??
            item.latitude ??
            item.Latitude ??
            item.lat ??
            null
        );

    };


    const getLongitude = (item) => {

        return (
            item.Location__Longitude__s ??
            item.longitude ??
            item.Longitude ??
            item.lng ??
            null
        );

    };


    /*
     * SUMMARY
     */

    const totalMapped = [

        ...accounts,

        ...leads,

        ...discovery,

        ...territories,

        ...routes,

        ...fieldVisits

    ].filter(item => {

        const lat = getLatitude(item);
        const lng = getLongitude(item);

        return (
            lat !== null &&
            lng !== null
        );

    }).length;


    return (

        <div
            style={{
                minHeight: "100vh",
                background: "#f4f6f9",
                padding: "25px"
            }}
        >

            {/* HEADER */}

            <div
                style={{
                    marginBottom: "20px"
                }}
            >

                <h1
                    style={{
                        margin: 0,
                        color: "#0B2E4F"
                    }}
                >
                    GIS Map
                </h1>

                <p
                    style={{
                        marginTop: "6px",
                        color: "#666"
                    }}
                >
                    Geographic view of GeoSales 360 data
                </p>

            </div>


            {/* SUMMARY CARDS */}

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns:
                        "repeat(4, 1fr)",
                    gap: "15px",
                    marginBottom: "20px"
                }}
            >

                <SummaryCard
                    title="Accounts"
                    value={accounts.length}
                />

                <SummaryCard
                    title="Leads"
                    value={leads.length}
                />

                <SummaryCard
                    title="Territories"
                    value={territories.length}
                />

                <SummaryCard
                    title="Mapped Records"
                    value={totalMapped}
                />

            </div>


            {/* FILTER BUTTONS */}

            <div
                style={{
                    background: "#fff",
                    padding: "15px",
                    borderRadius: "10px",
                    marginBottom: "20px",
                    boxShadow:
                        "0 2px 8px rgba(0,0,0,0.08)"
                }}
            >

                <div
                    style={{
                        display: "flex",
                        gap: "10px",
                        flexWrap: "wrap"
                    }}
                >

                    <GISButton
                        label="Accounts"
                        value="accounts"
                        selected={selectedType}
                        onClick={setSelectedType}
                    />

                    <GISButton
                        label="Leads"
                        value="leads"
                        selected={selectedType}
                        onClick={setSelectedType}
                    />

                    <GISButton
                        label="Discovery"
                        value="discovery"
                        selected={selectedType}
                        onClick={setSelectedType}
                    />

                    <GISButton
                        label="Territories"
                        value="territories"
                        selected={selectedType}
                        onClick={setSelectedType}
                    />

                    <GISButton
                        label="Routes"
                        value="routes"
                        selected={selectedType}
                        onClick={setSelectedType}
                    />

                    <GISButton
                        label="Field Visits"
                        value="fieldVisits"
                        selected={selectedType}
                        onClick={setSelectedType}
                    />

                </div>

            </div>


            {/* MAP AREA */}

            <div
                style={{
                    background: "#fff",
                    borderRadius: "10px",
                    minHeight: "450px",
                    boxShadow:
                        "0 2px 8px rgba(0,0,0,0.08)",
                    overflow: "hidden"
                }}
            >

                <div
                    style={{
                        padding: "15px",
                        borderBottom:
                            "1px solid #eee",
                        display: "flex",
                        justifyContent:
                            "space-between",
                        alignItems: "center"
                    }}
                >

                    <div>

                        <strong>
                            {getTitle(selectedType)}
                        </strong>

                        <div
                            style={{
                                fontSize: "12px",
                                color: "#777",
                                marginTop: "4px"
                            }}
                        >
                            {selectedData.length} records
                        </div>

                    </div>

                </div>


                {loading ? (

                    <div
                        style={{
                            height: "380px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#777"
                        }}
                    >
                        Loading GIS data...
                    </div>

                ) : (

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns:
                                "1fr 360px",
                            minHeight: "380px"
                        }}
                    >

                        {/* MAP PLACEHOLDER */}

                        <div
                            style={{
                                position: "relative",
                                background:
                                    "linear-gradient(135deg, #e8f1f7, #d9e8ef)",
                                minHeight: "380px"
                            }}
                        >

                            <div
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    backgroundImage:
                                        "linear-gradient(#ffffff55 1px, transparent 1px), linear-gradient(90deg, #ffffff55 1px, transparent 1px)",
                                    backgroundSize:
                                        "40px 40px"
                                }}
                            />


                            {/* MAP TITLE */}

                            <div
                                style={{
                                    position: "absolute",
                                    top: "20px",
                                    left: "20px",
                                    background: "#fff",
                                    padding: "10px 15px",
                                    borderRadius: "8px",
                                    boxShadow:
                                        "0 2px 8px rgba(0,0,0,0.15)",
                                    zIndex: 2
                                }}
                            >

                                <strong>
                                    Hyderabad GIS View
                                </strong>

                                <div
                                    style={{
                                        fontSize: "12px",
                                        color: "#777",
                                        marginTop: "3px"
                                    }}
                                >
                                    {selectedData.length}{" "}
                                    {getTitle(selectedType)}
                                </div>

                            </div>


                            {/* MARKERS */}

                            {selectedData.map(
                                (item, index) => {

                                    const lat =
                                        getLatitude(item);

                                    const lng =
                                        getLongitude(item);

                                    if (
                                        lat === null ||
                                        lng === null
                                    ) {
                                        return null;
                                    }


                                    /*
                                     * Convert coordinates
                                     * into approximate screen
                                     * positions.
                                     */

                                    const left =
                                        Math.min(
                                            90,
                                            Math.max(
                                                10,
                                                ((Number(lng) -
                                                    78.3) /
                                                    0.5) *
                                                    80
                                            )
                                        );

                                    const top =
                                        Math.min(
                                            90,
                                            Math.max(
                                                10,
                                                100 -
                                                    ((Number(lat) -
                                                        17.1) /
                                                        0.55) *
                                                        80
                                            )
                                        );


                                    return (

                                        <div
                                            key={
                                                item.Id ||
                                                item.id ||
                                                index
                                            }
                                            title={
                                                item.Name ||
                                                item.name ||
                                                "GIS Record"
                                            }
                                            style={{
                                                position:
                                                    "absolute",
                                                left:
                                                    `${left}%`,
                                                top:
                                                    `${top}%`,
                                                transform:
                                                    "translate(-50%, -50%)",
                                                zIndex: 3
                                            }}
                                        >

                                            <div
                                                style={{
                                                    width: "18px",
                                                    height: "18px",
                                                    borderRadius:
                                                        "50%",
                                                    background:
                                                        "#d32f2f",
                                                    border:
                                                        "3px solid #fff",
                                                    boxShadow:
                                                        "0 2px 6px rgba(0,0,0,0.3)"
                                                }}
                                            />

                                        </div>

                                    );

                                }
                            )}

                        </div>


                        {/* RECORD LIST */}

                        <div
                            style={{
                                borderLeft:
                                    "1px solid #eee",
                                overflowY: "auto",
                                maxHeight: "450px"
                            }}
                        >

                            <div
                                style={{
                                    padding: "15px",
                                    fontWeight: "600",
                                    borderBottom:
                                        "1px solid #eee"
                                }}
                            >
                                Records
                            </div>


                            {selectedData.length === 0 ? (

                                <div
                                    style={{
                                        padding: "30px",
                                        textAlign: "center",
                                        color: "#777"
                                    }}
                                >
                                    No records found.
                                </div>

                            ) : (

                                selectedData.map(
                                    (item, index) => (

                                        <div
                                            key={
                                                item.Id ||
                                                item.id ||
                                                index
                                            }
                                            style={{
                                                padding: "14px",
                                                borderBottom:
                                                    "1px solid #eee"
                                            }}
                                        >

                                            <div
                                                style={{
                                                    fontWeight: "600",
                                                    color: "#0B2E4F"
                                                }}
                                            >
                                                {
                                                    item.Name ||
                                                    item.name ||
                                                    "Unnamed Record"
                                                }
                                            </div>


                                            <div
                                                style={{
                                                    fontSize: "12px",
                                                    color: "#666",
                                                    marginTop: "5px"
                                                }}
                                            >
                                                ID:{" "}
                                                {
                                                    item.Id ||
                                                    item.id ||
                                                    "-"
                                                }
                                            </div>


                                            <div
                                                style={{
                                                    fontSize: "12px",
                                                    color: "#666"
                                                }}
                                            >
                                                Lat:{" "}
                                                {
                                                    getLatitude(item) ??
                                                    "-"
                                                }
                                            </div>


                                            <div
                                                style={{
                                                    fontSize: "12px",
                                                    color: "#666"
                                                }}
                                            >
                                                Lng:{" "}
                                                {
                                                    getLongitude(item) ??
                                                    "-"
                                                }
                                            </div>

                                        </div>

                                    )
                                )

                            )}

                        </div>

                    </div>

                )}

            </div>

        </div>

    );

}


/* =========================
   SUMMARY CARD
========================= */

function SummaryCard({
    title,
    value
}) {

    return (

        <div
            style={{
                background: "#fff",
                padding: "18px",
                borderRadius: "10px",
                boxShadow:
                    "0 2px 8px rgba(0,0,0,0.08)"
            }}
        >

            <div
                style={{
                    color: "#666",
                    fontSize: "13px"
                }}
            >
                {title}
            </div>

            <div
                style={{
                    marginTop: "8px",
                    color: "#0B2E4F",
                    fontSize: "25px",
                    fontWeight: "700"
                }}
            >
                {value}
            </div>

        </div>

    );

}


/* =========================
   GIS BUTTON
========================= */

function GISButton({
    label,
    value,
    selected,
    onClick
}) {

    const isSelected =
        selected === value;

    return (

        <button
            onClick={() => onClick(value)}
            style={{
                padding: "9px 16px",
                borderRadius: "6px",
                border: "1px solid #ccc",
                cursor: "pointer",
                background: isSelected
                    ? "#0B2E4F"
                    : "#fff",
                color: isSelected
                    ? "#fff"
                    : "#333",
                fontWeight: "600"
            }}
        >
            {label}
        </button>

    );

}


/* =========================
   TITLE
========================= */

function getTitle(type) {

    switch (type) {

        case "accounts":
            return "Accounts";

        case "leads":
            return "Leads";

        case "discovery":
            return "Discovery Candidates";

        case "territories":
            return "Territories";

        case "routes":
            return "Routes";

        case "fieldVisits":
            return "Field Visits";

        default:
            return "GIS Records";

    }

}