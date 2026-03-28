import { useState, useEffect, useRef } from 'react';
import type { FlightAlert, Channel } from '../types';

export interface AircraftState {
  icao24: string;
  callsign: string;
  lat: number;
  lon: number;
  altitude: number;    // meters
  velocity: number;    // m/s
  heading: number;     // degrees
  verticalRate: number; // m/s
  onGround: boolean;
  squawk: string;
  country: string;
}

export function useOpenSky(activeChannel: Channel | null) {
  const [alerts, setAlerts] = useState<FlightAlert[]>([]);
  const [aircraftStates, setAircraftStates] = useState<AircraftState[]>([]);
  const seenFlights = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Reset aircraft when channel changes
    setAircraftStates([]);

    // Only poll OpenSky if the channel is currently live and has bounds
    if (!activeChannel?.bbox || !activeChannel.isLive) return;

    const fetchFlights = async () => {
      try {
        const bbox = activeChannel.bbox!;
        const { lamin, lomin, lamax, lomax } = bbox;
        const res = await fetch(
          `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`
        );

        if (!res.ok) {
          if (res.status === 429) console.warn("OpenSky API rate limit reached.");
          return;
        }

        const data = await res.json();
        const states: any[][] = data.states || [];

        // Build aircraft state array for the map
        const parsed: AircraftState[] = states
          .filter(s => s[6] != null && s[5] != null) // must have lat/lon
          .map(s => ({
            icao24: s[0],
            callsign: (s[1] || '').trim(),
            lat: s[6],
            lon: s[5],
            altitude: s[7] ?? s[13] ?? 0,
            velocity: s[9] ?? 0,
            heading: s[10] ?? 0,
            verticalRate: s[11] ?? 0,
            onGround: s[8] ?? false,
            squawk: s[14] ?? '',
            country: s[2] ?? 'Unknown',
          }));

        setAircraftStates(parsed);

        // Alert logic
        parsed.forEach(aircraft => {
          const flightId = `${aircraft.icao24}-${activeChannel.airportCode}`;
          if (seenFlights.current.has(flightId)) return;

          let newAlert: FlightAlert | null = null;

          if (aircraft.squawk === '7700') {
            newAlert = {
              id: `${flightId}-7700`,
              callsign: aircraft.callsign,
              type: 'EMERGENCY',
              message: `🚨 Emergency Squawk 7700 near ${activeChannel.airportCode}! (${aircraft.callsign})`,
              timestamp: Date.now(),
            };
          } else if (['UAE', 'QFA', 'BAW', 'SIA'].some(p => aircraft.callsign.startsWith(p)) && Math.random() > 0.95) {
            newAlert = {
              id: `${flightId}-rare`,
              callsign: aircraft.callsign,
              type: 'RARE_AIRCRAFT',
              message: `✈️ Heavy Aircraft on approach at ${activeChannel.airportCode}! (${aircraft.callsign})`,
              timestamp: Date.now(),
            };
          }

          if (newAlert) {
            setAlerts(prev => [...prev, newAlert!]);
            seenFlights.current.add(flightId);
          }
        });

      } catch (err) {
        console.error("Failed to poll OpenSky:", err);
      }
    };

    fetchFlights();
    const interval = setInterval(fetchFlights, 60 * 1000); // 60s — stay within OpenSky free tier
    return () => clearInterval(interval);

  }, [activeChannel]);

  const dismissAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  return { alerts, dismissAlert, aircraftStates };
}
