// Small Leaflet child components used by the GIS Map view.
// Split out of mapview.jsx (Phase 9) - no behavior change, just moved.

import { useEffect, useRef } from "react";
import { useMap } from 'react-leaflet';
import L from "leaflet";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";

export function FitToRoute({ stops }) {
  const map = useMap();
  if (stops.length > 1) {
    map.fitBounds(stops.map(s => [s.lat, s.lng]), { padding: [60, 60] });
  }
  return null;
}

export function FitToRecords({ records }) {
    const map = useMap();

    useEffect(() => {
        const validRecords = records.filter(
            r =>
                Number.isFinite(Number(r.lat)) &&
                Number.isFinite(Number(r.lng))
        );

        if (!validRecords.length) {
            return;
        }

        const bounds = validRecords.map(r => [
            Number(r.lat),
            Number(r.lng)
        ]);

        map.fitBounds(bounds, {
            padding: [40, 40],
            maxZoom: 12
        });
    }, [records, map]);

    return null;
}

// Lets the user draw or edit one territory's boundary polygon directly on
// the map, using the leaflet-draw plugin. Only active while a territory
// is selected for editing; otherwise renders nothing. Reports the current
// drawn/edited shape up to the parent as GeoJSON on every change, so the
// parent's "Save Boundary" button always has the latest shape without
// needing an imperative getter.
export function TerritoryDrawControl({ initialGeoJSON, onChange }) {
  const map = useMap();
  const featureGroupRef = useRef(null);
  const drawControlRef = useRef(null);

  useEffect(() => {

    const featureGroup = new L.FeatureGroup();
    map.addLayer(featureGroup);
    featureGroupRef.current = featureGroup;

    if (initialGeoJSON) {
      try {
        L.geoJSON(initialGeoJSON).eachLayer(layer => {
          featureGroup.addLayer(layer);
        });
        if (featureGroup.getLayers().length > 0) {
          map.fitBounds(featureGroup.getBounds(), { padding: [40, 40] });
        }
      } catch (err) {
        console.error("Failed to load existing territory boundary:", err);
      }
    }

    const drawControl = new L.Control.Draw({
      position: 'topright',
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          shapeOptions: { color: '#0B2E4F' }
        },
        marker: false,
        circle: false,
        circlemarker: false,
        polyline: false,
        rectangle: false
      },
      edit: {
        featureGroup,
        remove: true
      }
    });

    map.addControl(drawControl);
    drawControlRef.current = drawControl;

    function reportChange() {
      const layers = featureGroup.getLayers();
      if (layers.length === 0) {
        onChange(null);
        return;
      }
      // Only one boundary per territory - keep just the most recent shape.
      while (layers.length > 1) {
        featureGroup.removeLayer(layers[0]);
        layers.shift();
      }
      onChange(layers[0].toGeoJSON().geometry);
    }

    map.on(L.Draw.Event.CREATED, e => {
      featureGroup.addLayer(e.layer);
      reportChange();
    });
    map.on(L.Draw.Event.EDITED, reportChange);
    map.on(L.Draw.Event.DELETED, reportChange);

    return () => {
      map.off(L.Draw.Event.CREATED);
      map.off(L.Draw.Event.EDITED);
      map.off(L.Draw.Event.DELETED);
      map.removeControl(drawControl);
      map.removeLayer(featureGroup);
    };

  }, [map]);

  return null;
}
