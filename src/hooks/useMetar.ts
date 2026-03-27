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
  return {
    raw: raw.raw_text ?? raw.metar_id ?? '',
    icao: raw.station_id ?? '',
    flightCategory: raw.flight_category ?? 'UNKNOWN',
    windDir: raw.wind_dir_degrees ?? null,
    windSpeed: raw.wind_speed_kt ?? 0,
    windGust: raw.wind_gust_kt ?? null,
    visibility: raw.visibility_statute_mi ?? null,
    ceiling: raw.sky_condition?.find((s: any) => ['BKN', 'OVC', 'OVX'].includes(s.sky_cover))?.cloud_base_ft_agl ?? null,
    temp: raw.temp_c ?? null,
    dewpoint: raw.dewpoint_c ?? null,
    altimeter: raw.altim_in_hg ?? null,
    conditions: raw.wx_string ?? '',
    observationTime: raw.observation_time ?? '',
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
