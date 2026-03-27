import { useState } from 'react';
import { Map, CloudSun } from 'lucide-react';
import { FlightMap } from './FlightMap';
import { MetarPanel } from './MetarPanel';
import type { AircraftState } from '../hooks/useOpenSky';
import type { MetarData } from '../hooks/useMetar';
import type { BoundingBox } from '../types';

interface InfoPanelProps {
  aircraftStates: AircraftState[];
  metar: MetarData | null;
  metarLoading: boolean;
  airportCode: string | undefined;
  bbox: BoundingBox | undefined;
  /** On mobile, render as tabs below the player */
  mobile?: boolean;
}

type Tab = 'map' | 'weather';

export function InfoPanel({ aircraftStates, metar, metarLoading, airportCode, bbox, mobile }: InfoPanelProps) {
  const [tab, setTab] = useState<Tab>('map');

  if (mobile) {
    // ── Mobile: tabs strip ────────────────────────────────────────────────
    return (
      <div className="flex flex-col bg-neutral-950 border-t border-white/10" style={{ height: 280 }}>
        {/* Tab bar */}
        <div className="flex shrink-0 border-b border-white/10">
          {(['map', 'weather'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold tracking-wider uppercase transition-colors ${
                tab === t
                  ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-500/5'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {t === 'map' ? <Map size={13} /> : <CloudSun size={13} />}
              {t === 'map' ? 'Live Map' : 'Weather'}
            </button>
          ))}
        </div>
        {/* Tab content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {tab === 'map'
            ? <FlightMap aircraftStates={aircraftStates} bbox={bbox} />
            : <MetarPanel metar={metar} loading={metarLoading} airportCode={airportCode} />
          }
        </div>
      </div>
    );
  }

  // ── Desktop: vertical sidebar ───────────────────────────────────────────
  return (
    <div className="hidden md:flex flex-col w-[280px] xl:w-[320px] shrink-0 bg-neutral-950/80 border-l border-white/10 overflow-hidden">
      {/* Map — top half */}
      <div className="flex-1 min-h-0 p-2 pb-1">
        <FlightMap aircraftStates={aircraftStates} bbox={bbox} />
      </div>

      {/* Divider */}
      <div className="shrink-0 h-px bg-white/10 mx-2" />

      {/* METAR — bottom half */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <MetarPanel metar={metar} loading={metarLoading} airportCode={airportCode} />
      </div>
    </div>
  );
}
