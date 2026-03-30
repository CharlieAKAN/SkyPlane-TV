import { useState, useEffect, useMemo, useRef } from 'react';
import { SPECIAL_LIVERIES } from '../data/liveries';
import type { ScheduledLivery, FlightAlert } from '../types';

// Simple deterministic PRNG
function mulberry32(a: number) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

function getSeed(airportCode: string, date: Date) {
  const dateStr = `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
  let hash = 0;
  const str = airportCode + dateStr;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
  }
  return hash;
}

export function useSchedule(
  airportCode: string | undefined, 
  isLive: boolean, 
  onAlert: (alert: FlightAlert) => void
) {
  const [scheduledFlights, setScheduledFlights] = useState<ScheduledLivery[]>([]);
  const alertedIds = useRef<Set<string>>(new Set());

  // Generate the deterministic schedule for today
  const dailySchedule = useMemo(() => {
    if (!airportCode) return [];
    
    const now = new Date();
    const seed = getSeed(airportCode, now);
    const rng = mulberry32(seed);

    const keys = Object.keys(SPECIAL_LIVERIES);
    // Shuffle keys manually
    for (let i = keys.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [keys[i], keys[j]] = [keys[j], keys[i]];
    }

    // Pick 3-5 liveries for the day
    const count = Math.floor(rng() * 3) + 3; // 3, 4, or 5
    const selected = keys.slice(0, count);

    // Get start of the day in user's local time
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    const flights: ScheduledLivery[] = selected.map(icao24 => {
      const livery = SPECIAL_LIVERIES[icao24];
      
      // Assign a random time throughout the day (between 6am and 10pm)
      const hourOffset = 6 + (rng() * 16); 
      const scheduledTime = startOfDay + Math.floor(hourOffset * 60 * 60 * 1000);
      
      return {
        id: `${airportCode}-${icao24}-${startOfDay}`,
        desc: livery.desc,
        icon: livery.icon,
        icao24,
        scheduledTime,
        status: 'en_route' as const,
      };
    }).sort((a, b) => a.scheduledTime - b.scheduledTime);

    return flights;
  }, [airportCode]);

  useEffect(() => {
    if (!airportCode || dailySchedule.length === 0) return;

    const checkSchedule = () => {
      const now = Date.now();
      
      const updated = dailySchedule.map(flight => {
        const timeDiff = flight.scheduledTime - now;
        let status: 'en_route' | 'arriving' | 'arrived' = 'en_route';

        if (timeDiff <= 0) {
          status = 'arrived';
        } else if (timeDiff <= 15 * 60 * 1000) { // 15 mins
          status = 'arriving';
          
          // Trigger alert if it's Live and we haven't alerted yet
          if (isLive && !alertedIds.current.has(flight.id)) {
            alertedIds.current.add(flight.id);
            onAlert({
              id: `${flight.id}-alert`,
              callsign: 'SCHEDULED',
              type: 'SPECIAL_LIVERY',
              message: `${flight.icon} Upcoming: ${flight.desc} arriving in ${Math.ceil(timeDiff / 60000)}m!`,
              timestamp: Date.now(),
              isRead: false,
            });
          }
        }
        
        return { ...flight, status };
      });
      
      setScheduledFlights(updated);
    };

    checkSchedule();
    const interval = setInterval(checkSchedule, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [airportCode, dailySchedule, isLive, onAlert]);

  return scheduledFlights;
}
