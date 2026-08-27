import { useState, useEffect } from "react";

const MOBILE_QUERY = "(max-width: 768px)";

export default function useIsMobile() {
    const [isMobile, setIsMobile] = useState(
        () => typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches
    );

    useEffect(() => {
        const mql = window.matchMedia(MOBILE_QUERY);
        const handleChange = e => setIsMobile(e.matches);
        mql.addEventListener("change", handleChange);
        return () => mql.removeEventListener("change", handleChange);
    }, []);

    return isMobile;
}
