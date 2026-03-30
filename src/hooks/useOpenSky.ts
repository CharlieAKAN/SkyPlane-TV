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

import { SPECIAL_LIVERIES } from '../data/liveries';

export function useOpenSky(activeChannel: Channel | null, allChannels: Channel[] = []) {
  const [alerts, setAlerts] = useState<FlightAlert[]>([]);
  const [aircraftStates, setAircraftStates] = useState<AircraftState[]>([]);
  const seenFlights = useRef<Set<string>>(new Set());
  const initializedAirports = useRef<Set<string>>(new Set());
  const latestStates = useRef<Map<string, AircraftState[]>>(new Map());

  const activeChannelRef = useRef(activeChannel);
  const allChannelsRef = useRef(allChannels);

  useEffect(() => {
    activeChannelRef.current = activeChannel;
    if (activeChannel) {
      setAircraftStates(latestStates.current.get(activeChannel.airportCode) || []);
    } else {
      setAircraftStates([]);
    }
  }, [activeChannel]);

  useEffect(() => {
    allChannelsRef.current = allChannels;
  }, [allChannels]);

  const [startedPolling, setStartedPolling] = useState(false);
  useEffect(() => {
    if (allChannels.length > 0 && !startedPolling) {
      setStartedPolling(true);
    }
  }, [allChannels, startedPolling]);

  useEffect(() => {
    if (!startedPolling) return;

    const fetchFlights = async () => {
      try {
        const channelsToPoll = allChannelsRef.current.filter(c => c.bbox != null);
        if (channelsToPoll.length === 0) return;

        const uniqueAirports = new Map<string, Channel>();
        for (const c of channelsToPoll) {
          if (!uniqueAirports.has(c.airportCode)) {
            uniqueAirports.set(c.airportCode, c);
          }
        }

        const fifteenMinsAgo = Date.now() - 15 * 60 * 1000;
        let newAlertsList: FlightAlert[] = [];
        let updatedActiveStates: AircraftState[] | null = null;

        for (const channel of uniqueAirports.values()) {
          const bbox = channel.bbox!;
          const { lamin, lomin, lamax, lomax } = bbox;
          
          const res = await fetch(
            `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`
          );

          if (!res.ok) {
            if (res.status === 429) console.warn(`OpenSky API rate limit reached for ${channel.airportCode}.`);
            continue;
          }

          const data = await res.json();
          const states: any[][] = data.states || [];

          const parsed: AircraftState[] = states
            .filter(s => s[6] != null && s[5] != null)
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

          latestStates.current.set(channel.airportCode, parsed);

          if (activeChannelRef.current?.airportCode === channel.airportCode) {
            updatedActiveStates = parsed;
          }

          const isFirstPoll = !initializedAirports.current.has(channel.airportCode);

          parsed.forEach(aircraft => {
            const flightId = `${aircraft.icao24}-${channel.airportCode}`;
            if (seenFlights.current.has(flightId)) return;

            seenFlights.current.add(flightId);

            if (isFirstPoll) return;

            let newAlert: FlightAlert | null = null;
            const icaoUpper = aircraft.icao24.toUpperCase();
            const livery = SPECIAL_LIVERIES[icaoUpper];

            if (livery) {
              newAlert = {
                id: `${flightId}-livery`,
                callsign: aircraft.callsign,
                type: 'SPECIAL_LIVERY',
                message: `${livery.icon} ${livery.desc} spotted near ${channel.airportCode}!`,
                timestamp: Date.now(),
                isRead: false,
              };
            } else if (aircraft.squawk === '7700') {
              newAlert = {
                id: `${flightId}-7700`,
                callsign: aircraft.callsign,
                type: 'EMERGENCY',
                message: `🚨 Emergency Squawk 7700 near ${channel.airportCode}! (${aircraft.callsign})`,
                timestamp: Date.now(),
                isRead: false,
              };
            } else if (aircraft.squawk === '7600') {
              newAlert = {
                id: `${flightId}-7600`,
                callsign: aircraft.callsign,
                type: 'EMERGENCY',
                message: `⚠️ Radio Failure (7600) near ${channel.airportCode} (${aircraft.callsign})`,
                timestamp: Date.now(),
                isRead: false,
              };
            } else if (aircraft.squawk === '7500') {
              newAlert = {
                id: `${flightId}-7500`,
                callsign: aircraft.callsign,
                type: 'EMERGENCY',
                message: `🛑 Unlawful Interference (7500) near ${channel.airportCode} (${aircraft.callsign})`,
                timestamp: Date.now(),
                isRead: false,
              };
            } else if (['RCH', 'RRR', 'SAM', 'AF1', 'CFC'].some(p => aircraft.callsign.startsWith(p))) {
              newAlert = {
                id: `${flightId}-vip`,
                callsign: aircraft.callsign,
                type: 'VIP_MILITARY',
                message: `🎖️ Military/VIP Aircraft detected near ${channel.airportCode}! (${aircraft.callsign})`,
                timestamp: Date.now(),
                isRead: false,
              };
            } else if (['UAE', 'QFA', 'BAW', 'SIA', 'QTR'].some(p => aircraft.callsign.startsWith(p)) && aircraft.altitude < 3000) {
              newAlert = {
                id: `${flightId}-heavy`,
                callsign: aircraft.callsign,
                type: 'HEAVY_AIRCRAFT',
                message: `✈️ Heavy Airliner on approach/departure at ${channel.airportCode}! (${aircraft.callsign})`,
                timestamp: Date.now(),
                isRead: false,
              };
            }

            if (newAlert) {
              newAlertsList.push(newAlert);
            }
          });

          initializedAirports.current.add(channel.airportCode);
        }

        if (updatedActiveStates !== null) {
          setAircraftStates(updatedActiveStates);
        }

        if (newAlertsList.length > 0) {
          setAlerts(prev => [...prev.filter(a => a.timestamp > fifteenMinsAgo), ...newAlertsList]);
        } else {
          setAlerts(prev => prev.filter(a => a.timestamp > fifteenMinsAgo));
        }

      } catch (err) {
        console.error("Failed to poll OpenSky:", err);
      }
    };

    fetchFlights();
    const interval = setInterval(fetchFlights, 60 * 1000);
    return () => clearInterval(interval);

  }, [startedPolling]);

  const markAlertsRead = () => {
    setAlerts(prev => prev.map(a => ({ ...a, isRead: true })));
  };

  const addAlert = (alert: FlightAlert) => {
    setAlerts(prev => {
      // Prevent duplicates within 15 mins
      if (prev.some(a => a.id === alert.id)) return prev;
      return [alert, ...prev];
    });
  };

  return { alerts, markAlertsRead, aircraftStates, addAlert };
}
