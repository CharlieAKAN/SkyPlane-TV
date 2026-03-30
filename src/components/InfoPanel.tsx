import { useState, lazy, Suspense } from 'react';
import { Map, CloudSun } from 'lucide-react';
import type { AircraftState } from '../hooks/useOpenSky';
import type { MetarData } from '../hooks/useMetar';
import type { BoundingBox, ScheduledLivery } from '../types';
import { MetarPanel } from './MetarPanel';
import { SchedulePanel } from './SchedulePanel';
import { CalendarClock } from 'lucide-react';

// Lazy-load Leaflet — keeps the initial JS bundle lean and unblocking
const FlightMap = lazy(() => import('./FlightMap').then(m => ({ default: m.FlightMap })));

const MapFallback = () => (
  <div className="w-full h-full flex items-center justify-center text-neutral-700 text-sm">
    <span className="animate-spin h-4 w-4 border-2 border-neutral-700 border-t-blue-500 rounded-full" />
  </div>
);

interface InfoPanelProps {
  aircraftStates: AircraftState[];
  metar: MetarData | null;
  metarLoading: boolean;
  airportCode: string | undefined;
  bbox: BoundingBox | undefined;
  mobile?: boolean;
  scheduledLiveries: ScheduledLivery[];
}

type Tab = 'map' | 'weather' | 'schedule';

export function InfoPanel({ aircraftStates, metar, metarLoading, airportCode, bbox, mobile, scheduledLiveries }: InfoPanelProps) {
  const [tab, setTab] = useState<Tab>('map');

  if (mobile) {
    return (
      <div className="flex flex-col bg-neutral-950 border-t border-white/10" style={{ height: 280 }}>
        {/* Tab bar */}
        <div className="flex shrink-0 border-b border-white/10" role="tablist">
          {(['map', 'weather', 'schedule'] as Tab[]).map(t => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              aria-label={t === 'map' ? 'Live flight map' : t === 'weather' ? 'Airport weather' : 'Today\'s Schedule'}
              onClick={() => setTab(t)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold tracking-wider uppercase transition-colors ${
                tab === t
                  ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-500/5'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {t === 'map' ? <Map size={13} aria-hidden /> : t === 'weather' ? <CloudSun size={13} aria-hidden /> : <CalendarClock size={13} aria-hidden />}
              {t === 'map' ? 'Live Map' : t === 'weather' ? 'Weather' : 'Schedule'}
            </button>
          ))}
        </div>
        {/* Tab content */}
        <div className="flex-1 min-h-0 overflow-hidden" role="tabpanel">
          {tab === 'map'
            ? <Suspense fallback={<MapFallback />}><FlightMap aircraftStates={aircraftStates} bbox={bbox} /></Suspense>
            : tab === 'weather'
            ? <MetarPanel metar={metar} loading={metarLoading} airportCode={airportCode} />
            : <SchedulePanel scheduledLiveries={scheduledLiveries} airportCode={airportCode} />
          }
        </div>
      </div>
    );
  }

  // Desktop sidebar
  return (
    <div className="hidden md:flex flex-col w-[280px] xl:w-[320px] shrink-0 bg-neutral-950/80 border-l border-white/10 overflow-hidden">
      {/* Map — top third */}
      <div className="flex-[0.4] min-h-[30%] p-2 pb-1">
        <Suspense fallback={<MapFallback />}>
          <FlightMap aircraftStates={aircraftStates} bbox={bbox} />
        </Suspense>
      </div>

      {/* Divider */}
      <div className="shrink-0 h-px bg-white/10 mx-2" />

      {/* METAR — middle third */}
      <div className="flex-[0.3] min-h-[25%] overflow-hidden border-b border-white/10">
        <MetarPanel metar={metar} loading={metarLoading} airportCode={airportCode} />
      </div>

      {/* Schedule - bottom third */}
      <div className="flex-[0.3] min-h-[35%] overflow-hidden">
        <SchedulePanel scheduledLiveries={scheduledLiveries} airportCode={airportCode} />
      </div>
    </div>
  );
}
