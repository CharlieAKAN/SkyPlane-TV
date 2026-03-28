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

const SPECIAL_LIVERIES: Record<string, { desc: string; icon: string }> = {
  'A6B435': { desc: 'Alaska (N531AS) - Captain Marvel', icon: '🦸‍♀️' },
  'E8027D': { desc: 'LATAM (CC-BGM) - Harry Potter', icon: '🪄' },
  '75002B': { desc: 'AirAsia X (9M-XXU) - Sonic & Persona 5', icon: '🎮' },
  '750315': { desc: 'AirAsia X (9M-XXU) - Sonic & Persona 5', icon: '🎮' },
  'A6D05E': { desc: 'Alaska (N538AS) - Star Wars Galaxy Edge', icon: '🌌' },
  'A720EB': { desc: 'Alaska (N559AS) - Salmon People', icon: '🐟' },
  'A6C665': { desc: 'Alaska (N519AS) - Incredibles 2', icon: '🦸‍♂️' },
  '86E7BC': { desc: 'ANA (JA873A) - R2-D2 Star Wars', icon: '🤖' },
  '868338': { desc: 'ANA (JA743A) - C-3PO Star Wars', icon: '🤖' },
  '849313': { desc: 'ANA (JA743A) - C-3PO Star Wars', icon: '🤖' },
  'A41722': { desc: 'United (N36272) - Rise of Skywalker', icon: '⚔️' },
  'A6CA7F': { desc: 'Alaska (N537AS) - Pixar Pier', icon: '🎡' },
  'A74E7A': { desc: 'Alaska (N570AS) - Cars Land', icon: '🚗' },
  'A6DA39': { desc: 'Alaska (N596AS) - Tiana\'s Bayou Adventure', icon: '👑' },
  'C064B4': { desc: 'WestJet (C-GWSZ) - Sorcerer Mickey', icon: '✨' },
  '86EF06': { desc: 'ANA (JA894A) - Pikachu Jet NH', icon: '⚡' },
  '8691AA': { desc: 'ANA (JA784A) - Eevee Jet NH', icon: '🦊' },
  '861BA8': { desc: 'Air Do (JA607A) - Vulpix Jet', icon: '🦊' },
  '8990E4': { desc: 'China Airlines (B-18101) - Pikachu Jet CI', icon: '⭐' }
};

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

        // Keep 15 minutes of alert history, purge old ones
        const fifteenMinsAgo = Date.now() - 15 * 60 * 1000;
        let newAlertsList: FlightAlert[] = [];

        // Alert logic
        parsed.forEach(aircraft => {
          const flightId = `${aircraft.icao24}-${activeChannel.airportCode}`;
          if (seenFlights.current.has(flightId)) return;

          let newAlert: FlightAlert | null = null;
          const icaoUpper = aircraft.icao24.toUpperCase();
          const livery = SPECIAL_LIVERIES[icaoUpper];

          if (livery) {
            newAlert = {
              id: `${flightId}-livery`,
              callsign: aircraft.callsign,
              type: 'SPECIAL_LIVERY',
              message: `${livery.icon} ${livery.desc} spotted near ${activeChannel.airportCode}!`,
              timestamp: Date.now(),
              isRead: false,
            };
          } else if (aircraft.squawk === '7700') {
            newAlert = {
              id: `${flightId}-7700`,
              callsign: aircraft.callsign,
              type: 'EMERGENCY',
              message: `🚨 Emergency Squawk 7700 near ${activeChannel.airportCode}! (${aircraft.callsign})`,
              timestamp: Date.now(),
              isRead: false,
            };
          } else if (aircraft.squawk === '7600') {
            newAlert = {
              id: `${flightId}-7600`,
              callsign: aircraft.callsign,
              type: 'EMERGENCY',
              message: `⚠️ Radio Failure (7600) near ${activeChannel.airportCode} (${aircraft.callsign})`,
              timestamp: Date.now(),
              isRead: false,
            };
          } else if (aircraft.squawk === '7500') {
             newAlert = {
              id: `${flightId}-7500`,
              callsign: aircraft.callsign,
              type: 'EMERGENCY',
              message: `🛑 Unlawful Interference (7500) near ${activeChannel.airportCode} (${aircraft.callsign})`,
              timestamp: Date.now(),
              isRead: false,
            };
          } else if (['RCH', 'RRR', 'SAM', 'AF1', 'CFC'].some(p => aircraft.callsign.startsWith(p))) {
            newAlert = {
              id: `${flightId}-vip`,
              callsign: aircraft.callsign,
              type: 'VIP_MILITARY',
              message: `🎖️ Military/VIP Aircraft detected near ${activeChannel.airportCode}! (${aircraft.callsign})`,
              timestamp: Date.now(),
              isRead: false,
            };
          } else if (['UAE', 'QFA', 'BAW', 'SIA', 'QTR'].some(p => aircraft.callsign.startsWith(p)) && aircraft.altitude < 3000) {
            newAlert = {
              id: `${flightId}-heavy`,
              callsign: aircraft.callsign,
              type: 'HEAVY_AIRCRAFT',
              message: `✈️ Heavy Airliner on approach/departure at ${activeChannel.airportCode}! (${aircraft.callsign})`,
              timestamp: Date.now(),
              isRead: false,
            };
          }

          if (newAlert) {
            newAlertsList.push(newAlert);
            seenFlights.current.add(flightId);
          }
        });

        // Apply state: keep old alerts within 15 mins + new alerts
        if (newAlertsList.length > 0) {
          setAlerts(prev => [...prev.filter(a => a.timestamp > fifteenMinsAgo), ...newAlertsList]);
        } else {
          // just purge old ones routinely
          setAlerts(prev => prev.filter(a => a.timestamp > fifteenMinsAgo));
        }

      } catch (err) {
        console.error("Failed to poll OpenSky:", err);
      }
    };

    fetchFlights();
    const interval = setInterval(fetchFlights, 60 * 1000); // 60s
    return () => clearInterval(interval);

  }, [activeChannel]);

  const markAlertsRead = () => {
    setAlerts(prev => prev.map(a => ({ ...a, isRead: true })));
  };

  return { alerts, markAlertsRead, aircraftStates };
}
