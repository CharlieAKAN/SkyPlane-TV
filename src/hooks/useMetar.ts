import { useState, useEffect } from 'react';

export interface MetarData {
  raw: string;
  icao: string;
  flightCategory: 'VFR' | 'MVFR' | 'IFR' | 'LIFR' | 'UNKNOWN';
  windDir: number | null;
  windSpeed: number;
  windGust: number | null;
  visibility: number | null;
  ceiling: number | null;
  temp: number | null;
  dewpoint: number | null;
  altimeter: number | null;
  conditions: string;
  observationTime: string;
}

// Fetch from metar.json — written by the GitHub Actions poller every 15 min.
// This avoids CORS entirely since it's served from the same origin.
const METAR_URL = `https://cdn.jsdelivr.net/gh/CharlieAKAN/SkyPlane-TV@main/public/metar.json`;

export function useMetar(airportCode: string | undefined) {
  const [metar, setMetar] = useState<MetarData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!airportCode) return;

    const fetchMetar = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${METAR_URL}?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) { console.warn('metar.json fetch failed:', res.status); return; }
        const data: Record<string, MetarData> = await res.json();
        const entry = data[airportCode.toUpperCase()];
        setMetar(entry ?? null);
      } catch (err) {
        console.error('useMetar error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetar();
    const interval = setInterval(fetchMetar, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [airportCode]);

  return { metar, loading };
}
