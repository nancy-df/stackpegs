import { useEffect, useState } from "react";

const QUERY = "(min-width: 1024px)";

// True at the width where the four-column layout applies (Tailwind's lg breakpoint).
export function useIsDesktop(): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(QUERY).matches);

  useEffect(() => {
    const media = window.matchMedia(QUERY);
    const onChange = () => setMatches(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return matches;
}
