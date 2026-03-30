import { Plane, CalendarClock } from 'lucide-react';
import type { ScheduledLivery } from '../types';

interface SchedulePanelProps {
  scheduledLiveries: ScheduledLivery[];
  airportCode: string | undefined;
}

export function SchedulePanel({ scheduledLiveries, airportCode }: SchedulePanelProps) {
  if (!airportCode) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <p className="text-neutral-500 text-sm">Select a channel to view today's schedule.</p>
      </div>
    );
  }

  const now = Date.now();

  const getStatusDisplay = (flight: ScheduledLivery) => {
    if (flight.status === 'arrived') {
      return <span className="text-neutral-500 text-xs font-bold uppercase tracking-wider">Arrived</span>;
    }
    if (flight.status === 'arriving') {
      const mins = Math.ceil((flight.scheduledTime - now) / 60000);
      return (
        <span className="flex items-center gap-1.5 text-blue-400 text-xs font-bold uppercase tracking-wider">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          In {mins} min
        </span>
      );
    }
    
    // en_route
    const date = new Date(flight.scheduledTime);
    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return <span className="text-neutral-400 text-xs font-bold uppercase tracking-wider">ETA: {timeString}</span>;
  };

  return (
    <div className="flex flex-col h-full bg-neutral-950/80">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 bg-neutral-900/50 sticky top-0 shrink-0">
        <CalendarClock size={14} className="text-blue-400" />
        <h3 className="font-bold text-xs text-blue-100 tracking-wide uppercase">Today's Schedule</h3>
        <span className="ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/20 text-[10px] font-black tracking-widest text-blue-300">
          {airportCode}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {scheduledLiveries.length === 0 ? (
          <p className="text-neutral-500 text-xs text-center py-4">No special liveries scheduled today.</p>
        ) : (
          scheduledLiveries.map((flight) => (
            <div 
              key={flight.id} 
              className={`relative overflow-hidden rounded-xl border p-3 transition-all
                ${flight.status === 'arrived' 
                  ? 'bg-neutral-900/30 border-neutral-800/50 opacity-70' 
                  : flight.status === 'arriving'
                  ? 'bg-gradient-to-br from-blue-900/20 to-neutral-900/50 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                  : 'bg-neutral-800/30 border-white/5 hover:bg-neutral-800/50 hover:border-white/10'
                }
              `}
            >
              <div className="flex items-start gap-3 relative z-10 w-full min-w-0">
                <div className={`shrink-0 mt-0.5 rounded-full p-2 border ${
                  flight.status === 'arrived' ? 'bg-neutral-900 border-neutral-700/50' :
                  flight.status === 'arriving' ? 'bg-blue-950/50 border-blue-500/50' : 
                  'bg-neutral-900/80 border-neutral-700'
                }`}>
                  <span className="text-lg leading-none flex items-center justify-center w-5 h-5">{flight.icon}</span>
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center min-h-[36px]">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className={`font-bold text-xs truncate max-w-full ${
                      flight.status === 'arrived' ? 'text-neutral-400' :
                      flight.status === 'arriving' ? 'text-blue-300' : 'text-neutral-300'
                    }`}>
                      {flight.desc}
                    </h4>
                  </div>
                  <div className="flex items-center justify-between">
                     <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-black flex items-center gap-1">
                        <Plane size={10} className={flight.status === 'en_route' ? 'opacity-50' : ''} />
                        Expect Visually
                     </span>
                     {getStatusDisplay(flight)}
                  </div>
                </div>
              </div>
              
              {/* Background gradient effect for arriving planes */}
              {flight.status === 'arriving' && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-blue-500/0 opacity-50 animate-pulse pointer-events-none" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
