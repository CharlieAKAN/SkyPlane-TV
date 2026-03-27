import type { MetarData } from '../hooks/useMetar';
import { Wind, Eye, Cloud, Thermometer, Gauge, AlertTriangle } from 'lucide-react';

interface MetarPanelProps {
  metar: MetarData | null;
  loading: boolean;
  airportCode: string | undefined;
}

const CATEGORY_STYLES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  VFR:    { label: 'VFR',    bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  MVFR:   { label: 'MVFR',   bg: 'bg-blue-500/20',    text: 'text-blue-400',    border: 'border-blue-500/30' },
  IFR:    { label: 'IFR',    bg: 'bg-red-500/20',     text: 'text-red-400',     border: 'border-red-500/30' },
  LIFR:   { label: 'LIFR',   bg: 'bg-purple-500/20',  text: 'text-purple-400',  border: 'border-purple-500/30' },
  UNKNOWN:{ label: '—',      bg: 'bg-neutral-800/40', text: 'text-neutral-400', border: 'border-neutral-700' },
};

function windDirection(deg: number | null): string {
  if (deg === null) return 'Calm';
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16] + ` (${deg}°)`;
}

interface StatRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}
function StatRow({ icon, label, value }: StatRowProps) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-2 text-neutral-500 text-xs">
        {icon}
        <span>{label}</span>
      </div>
      <span className="text-xs font-semibold text-neutral-200 text-right">{value}</span>
    </div>
  );
}

export function MetarPanel({ metar, loading, airportCode }: MetarPanelProps) {
  const cat = CATEGORY_STYLES[metar?.flightCategory ?? 'UNKNOWN'];

  if (loading && !metar) {
    return (
      <div className="flex-1 flex items-center justify-center gap-2 text-neutral-600 text-sm">
        <span className="animate-spin h-4 w-4 border-2 border-neutral-700 border-t-blue-500 rounded-full" />
        Fetching weather...
      </div>
    );
  }

  if (!metar) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-neutral-600 text-sm p-4 text-center">
        <AlertTriangle size={20} className="text-neutral-700" />
        <span>No METAR available{airportCode ? ` for ${airportCode}` : ''}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-3 h-full overflow-y-auto [scrollbar-width:none]">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">
          Weather · {metar.icao}
        </div>
        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider border ${cat.bg} ${cat.text} ${cat.border}`}>
          {cat.label}
        </span>
      </div>

      {/* Stats */}
      <div className="flex flex-col">
        <StatRow
          icon={<Wind size={12} />}
          label="Wind"
          value={metar.windSpeed === 0 ? 'Calm' : `${windDirection(metar.windDir)} @ ${metar.windSpeed}${metar.windGust ? ` G${metar.windGust}` : ''} kts`}
        />
        <StatRow
          icon={<Eye size={12} />}
          label="Visibility"
          value={metar.visibility != null ? `${metar.visibility} SM` : '—'}
        />
        <StatRow
          icon={<Cloud size={12} />}
          label="Ceiling"
          value={metar.ceiling != null ? `${metar.ceiling.toLocaleString()} ft AGL` : 'Unlimited / Clear'}
        />
        <StatRow
          icon={<Thermometer size={12} />}
          label="Temp / Dew"
          value={metar.temp != null ? `${metar.temp}°C / ${metar.dewpoint ?? '—'}°C` : '—'}
        />
        <StatRow
          icon={<Gauge size={12} />}
          label="Altimeter"
          value={metar.altimeter != null ? `${metar.altimeter.toFixed(2)} inHg` : '—'}
        />
        {metar.conditions && (
          <StatRow
            icon={<Cloud size={12} />}
            label="Conditions"
            value={metar.conditions}
          />
        )}
      </div>

      {/* Raw METAR */}
      <div className="mt-auto">
        <div className="text-[9px] text-neutral-600 uppercase tracking-widest mb-1">Raw METAR</div>
        <div className="text-[10px] font-mono text-neutral-500 bg-neutral-900 rounded-lg p-2 break-all leading-relaxed border border-neutral-800">
          {metar.raw}
        </div>
      </div>
    </div>
  );
}
