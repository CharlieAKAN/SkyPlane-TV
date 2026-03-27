import { useEffect, useRef } from 'react';
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

// Create a rotated plane SVG icon based on heading
function createPlaneIcon(heading: number, onGround: boolean) {
  const color = onGround ? '#6b7280' : '#3b82f6';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
         style="transform: rotate(${heading}deg);">
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
  const center: [number, number] = bbox
    ? [(bbox.lamin + bbox.lamax) / 2, (bbox.lomin + bbox.lomax) / 2]
    : [0, 0];

  return (
    <div className="w-full h-full rounded-xl overflow-hidden relative">
      {/* Dark overlay label */}
      <div className="absolute top-2 left-2 z-[1000] bg-black/70 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-bold text-blue-400 tracking-widest uppercase border border-white/10">
        Live Traffic
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
        {aircraftStates.map(ac => (
          <Marker
            key={ac.icao24}
            position={[ac.lat, ac.lon]}
            icon={createPlaneIcon(ac.heading, ac.onGround)}
          >
            <Tooltip
              direction="top"
              offset={[0, -12]}
              opacity={0.95}
              permanent={false}
            >
              <div className="text-xs font-mono">
                <div className="font-bold text-blue-400">{ac.callsign || ac.icao24}</div>
                <div className="text-neutral-300">
                  {ac.onGround ? '🛞 On Ground' : `✈ ${Math.round(ac.altitude * 3.28084).toLocaleString()} ft`}
                </div>
                {!ac.onGround && (
                  <div className="text-neutral-400">{Math.round(ac.velocity * 1.944)} kts</div>
                )}
              </div>
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>
      {aircraftStates.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[999]">
          <div className="bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2 text-neutral-500 text-sm font-medium border border-white/10">
            No traffic data yet...
          </div>
        </div>
      )}
    </div>
  );
}
