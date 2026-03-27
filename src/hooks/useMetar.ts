import { useState, useEffect } from 'react';

// IATA → ICAO mapping for METAR lookups
const IATA_TO_ICAO: Record<string, string> = {
  LAX: 'KLAX', ORD: 'KORD', JFK: 'KJFK', MIA: 'KMIA',
  LAS: 'KLAS', SFO: 'KSFO', ATL: 'KATL', DFW: 'KDFW',
  SEA: 'KSEA', BOS: 'KBOS', DEN: 'KDEN', PHX: 'KPHX',
  LHR: 'EGLL', MAN: 'EGCC', CDG: 'LFPG', FRA: 'EDDF',
  AMS: 'EHAM', MAD: 'LEMD', BCN: 'LEBL', FCO: 'LIRF',
  DXB: 'OMDB', SIN: 'WSSS', HND: 'RJTT', NRT: 'RJAA',
  SYD: 'YSSY', MEL: 'YMML', HKG: 'VHHH',
};

export interface MetarData {
  raw: string;
  icao: string;
  flightCategory: 'VFR' | 'MVFR' | 'IFR' | 'LIFR' | 'UNKNOWN';
  windDir: number | null;
  windSpeed: number;
  windGust: number | null;
  visibility: number | null;     // statute miles
  ceiling: number | null;        // feet AGL
  temp: number | null;           // Celsius
  dewpoint: number | null;
  altimeter: number | null;      // inHg
  conditions: string;
  observationTime: string;
}

function parseMetar(raw: any): MetarData {
  // Find lowest ceiling layer (BKN, OVC, OVX)
  const ceilingLayer = (raw.clouds ?? []).find((s: any) =>
    ['BKN', 'OVC', 'OVX'].includes(s.cover)
  );

  // altim from the API is in hPa — convert to inHg
  const altimHpa = raw.altim ?? null;
  const altimInHg = altimHpa != null ? altimHpa * 0.02953 : null;

  // visib can be a string like "6+" or a number
  const visibRaw = raw.visib;
  const visibility = visibRaw != null ? parseFloat(String(visibRaw)) : null;

  return {
    raw: raw.rawOb ?? '',
    icao: raw.icaoId ?? '',
    flightCategory: raw.fltCat ?? 'UNKNOWN',
    windDir: raw.wdir === 'VRB' ? null : (raw.wdir ?? null),
    windSpeed: raw.wspd ?? 0,
    windGust: raw.wgst ?? null,
    visibility,
    ceiling: ceilingLayer?.base ?? null,
    temp: raw.temp ?? null,
    dewpoint: raw.dewp ?? null,
    altimeter: altimInHg != null ? Math.round(altimInHg * 100) / 100 : null,
    conditions: raw.wxString ?? '',
    observationTime: raw.reportTime ?? '',
  };
}

export function useMetar(airportCode: string | undefined) {
  const [metar, setMetar] = useState<MetarData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!airportCode) return;
    const icao = IATA_TO_ICAO[airportCode.toUpperCase()];
    if (!icao) return;

    const fetchMetar = async () => {
      setLoading(true);
      try {
        // Primary: direct API (works on deployed HTTPS origins)
        const directUrl = `https://aviationweather.gov/api/data/metar?ids=${icao}&format=json&hours=1`;

        let res = await fetch(directUrl, { cache: 'no-store' }).catch(() => null);

        // Fallback: CORS proxy (dev / localhost)
        if (!res || !res.ok) {
          const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(directUrl)}`;
          res = await fetch(proxyUrl, { cache: 'no-store' }).catch(() => null);
        }

        if (!res || !res.ok) return;
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setMetar(parseMetar(data[0]));
        }
      } catch (err) {
        console.error('METAR fetch error:', err);
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
