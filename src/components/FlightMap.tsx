import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { AircraftState } from '../hooks/useOpenSky';
import type { BoundingBox } from '../types';

// Fix leaflet default icon paths broken by bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Create a rotated plane SVG icon based on flight phase
function createPlaneIcon(ac: AircraftState) {
  let color = '#3b82f6'; // Level (Blue)
  if (ac.onGround) color = '#6b7280'; // Ground (Gray)
  else if (ac.verticalRate > 0.5) color = '#22c55e'; // Climbing (Green)
  else if (ac.verticalRate < -0.5) color = '#f59e0b'; // Descending (Amber)

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
         style="transform: rotate(${ac.heading}deg); filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
      <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
            fill="${color}" stroke="white" stroke-width="0.5"/>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

// Sub-component that re-fits the map when the bbox changes
function MapBoundsSetter({ bbox }: { bbox: BoundingBox }) {
  const map = useMap();
  const prevBbox = useRef<BoundingBox | null>(null);
  useEffect(() => {
    if (!bbox) return;
    const b = JSON.stringify(bbox);
    if (b === JSON.stringify(prevBbox.current)) return;
    prevBbox.current = bbox;
    map.fitBounds([
      [bbox.lamin, bbox.lomin],
      [bbox.lamax, bbox.lomax],
    ]);
  }, [bbox, map]);
  return null;
}

interface FlightMapProps {
  aircraftStates: AircraftState[];
  bbox: BoundingBox | undefined;
}

export function FlightMap({ aircraftStates, bbox }: FlightMapProps) {
  const [secondsAgo, setSecondsAgo] = useState(0);

  // Auto-refresh countdown tracker
  useEffect(() => {
    setSecondsAgo(0);
    const interval = setInterval(() => setSecondsAgo(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [aircraftStates]);

  const center: [number, number] = bbox
    ? [(bbox.lamin + bbox.lamax) / 2, (bbox.lomin + bbox.lomax) / 2]
    : [0, 0];

  return (
    <div className="w-full h-full rounded-xl overflow-hidden relative group">
      {/* Dark overlay label */}
      <div className="absolute top-2 left-2 z-[1000] bg-black/70 backdrop-blur-sm px-2.5 py-1.5 rounded-lg text-xs font-bold border border-white/10 flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          {secondsAgo < 5 && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>}
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
        </span>
        <div className="flex flex-col leading-none">
          <span className="text-blue-400 tracking-widest uppercase text-[10px]">Live Traffic</span>
          <span className="text-neutral-400 text-[9px]">
            {aircraftStates.length > 0 ? `Updated ${secondsAgo}s ago` : 'Waiting for radar...'}
          </span>
        </div>
      </div>
      
      <MapContainer
        center={center}
        zoom={11}
        zoomControl={false}
        scrollWheelZoom={false}
        style={{ width: '100%', height: '100%' }}
        className="z-0"
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        {bbox && <MapBoundsSetter bbox={bbox} />}
        {aircraftStates.map(ac => {
          // Calculate vertical trend visually
          const isClimbing = ac.verticalRate > 0.5;
          const isDescending = ac.verticalRate < -0.5;
          const trendIcon = isClimbing ? '↗' : isDescending ? '↘' : '→';
          const trendColor = isClimbing ? 'text-green-400' : isDescending ? 'text-amber-400' : 'text-blue-400';

          return (
            <Marker
              key={ac.icao24}
              position={[ac.lat, ac.lon]}
              icon={createPlaneIcon(ac)}
            >
              <Tooltip
                direction="top"
                offset={[0, -12]}
                opacity={0.98}
                permanent={false}
              >
                <div className="text-xs font-mono min-w-[140px]">
                  <div className="flex justify-between items-center border-b border-white/10 pb-1 mb-1">
                    <span className="font-black text-blue-400 text-sm">
                      {ac.callsign || ac.icao24}
                    </span>
                    <span className="text-[10px] text-neutral-400 px-1.5 py-0.5 bg-neutral-800 rounded">
                      {ac.country}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-1 text-[11px]">
                    <div className="text-neutral-400">Status</div>
                    <div className={ac.onGround ? 'text-neutral-300' : trendColor}>
                      {ac.onGround ? '🛞 Ground' : `✈️ In Air ${trendIcon}`}
                    </div>

                    {!ac.onGround && (
                      <>
                        <div className="text-neutral-400">Altitude</div>
                        <div className="text-neutral-100">{Math.round(ac.altitude * 3.28084).toLocaleString()} ft</div>
                        
                        <div className="text-neutral-400">Speed</div>
                        <div className="text-neutral-100">{Math.round(ac.velocity * 1.944)} kts</div>

                        <div className="text-neutral-400">V/Rate</div>
                        <div className={trendColor}>
                          {ac.verticalRate > 0 ? '+' : ''}{Math.round(ac.verticalRate * 196.85)} ft/m
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>
      {aircraftStates.length === 0 && secondsAgo > 2 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[999]">
          <div className="bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2 text-neutral-500 text-sm font-medium border border-white/10 text-center shadow-2xl">
            <span className="block mb-1">📡 Scanning airspace...</span>
            <span className="text-[10px] text-neutral-600 block max-w-xs leading-tight">
              OpenSky API might take a moment to report local traffic, or airspace may be empty.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
