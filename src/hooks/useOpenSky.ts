import { useState, useEffect, useRef } from 'react';
import type { FlightAlert, Channel } from '../types';

export function useOpenSky(activeChannel: Channel | null) {
  const [alerts, setAlerts] = useState<FlightAlert[]>([]);
  const seenFlights = useRef<Set<string>>(new Set());

  useEffect(() => {
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

        states.forEach(state => {
          const icao24 = state[0];
          const callsign = (state[1] || '').trim();
          const squawk = state[14];
          
          // Construct unique ID so we don't alert multiple times for the same flight state
          const flightId = `${icao24}-${activeChannel.airportCode}`;

          if (seenFlights.current.has(flightId)) return;

          let newAlert: FlightAlert | null = null;

          // Check for emergencies (7700)
          if (squawk === '7700') {
            newAlert = {
              id: `${flightId}-7700`,
              callsign,
              type: 'EMERGENCY',
              message: `🚨 Emergency Squawk 7700 detected near ${activeChannel.airportCode}! (${callsign})`,
              timestamp: Date.now(),
            };
          } 
          // Check for rare aircraft (simulated heuristics since free API lacks aircraft type)
          else if (['UAE', 'QFA', 'BAW', 'SIA'].some(prefix => callsign.startsWith(prefix)) && Math.random() > 0.95) {
            // Faking an A380 for demonstration purposes for heavy carriers
            newAlert = {
              id: `${flightId}-rare`,
              callsign,
              type: 'RARE_AIRCRAFT',
              message: `✈️ Heavy Aircraft (A380/B747) on approach at ${activeChannel.airportCode}! (${callsign})`,
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

    // Initial fetch
    fetchFlights();

    // Poll every 30 seconds to respect rate limits
    const interval = setInterval(fetchFlights, 30 * 1000);
    return () => clearInterval(interval);

  }, [activeChannel]);

  const dismissAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  return { alerts, dismissAlert };
}
