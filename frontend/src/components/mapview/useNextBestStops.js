import { useState, useMemo, useCallback } from "react";
import { getCurrentPosition, calculateNextBestStopScore } from "./mapviewUtils";

const MAX_SUGGESTIONS = 5;

// Ranks mapRecords by calculateNextBestStopScore() against the rep's
// current position. Knows nothing about routing - callers decide what to
// do with the ranked list (mapview.jsx wires "Add to route" separately).
export function useNextBestStops(mapRecords) {
  const [currentPosition, setCurrentPosition] = useState(null);
  const [positionError, setPositionError] = useState("");
  const [positionLoading, setPositionLoading] = useState(false);

  const refreshPosition = useCallback(async () => {
    setPositionLoading(true);
    setPositionError("");

    try {
      const position = await getCurrentPosition();

      setCurrentPosition({
        lat: position.coords.latitude,
        lng: position.coords.longitude
      });
    } catch (error) {
      console.error("Smart Suggestions location error:", error);

      if (error.code === 1) {
        setPositionError("Location permission denied. Enable GPS access in your browser and retry.");
      } else if (error.code === 2) {
        setPositionError("Unable to determine your location. Move to an open area and retry.");
      } else if (error.code === 3) {
        setPositionError("Location request timed out. Try again.");
      } else {
        setPositionError(error.message || "Unable to determine your location.");
      }
    } finally {
      setPositionLoading(false);
    }
  }, []);

  const suggestions = useMemo(() => {
    if (!currentPosition) return [];

    return mapRecords
      .map(record => {
        const result = calculateNextBestStopScore(record, currentPosition);
        return result ? { record, ...result } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_SUGGESTIONS);
  }, [mapRecords, currentPosition]);

  return {
    currentPosition,
    positionError,
    positionLoading,
    refreshPosition,
    suggestions
  };
}
