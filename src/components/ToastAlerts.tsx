import type { FlightAlert } from '../types';
import { AlertTriangle, Plane, ShieldAlert, Palette, X } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ToastAlertsProps {
  alerts: FlightAlert[];
}

export function ToastAlerts({ alerts }: ToastAlertsProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Only show alerts < 10s old that haven't been manually dismissed
  const visibleAlerts = alerts.filter(a => 
    !dismissedIds.has(a.id) && (Date.now() - a.timestamp < 10000)
  );

  // Auto clean up very old dismissed IDs to prevent memory leak
  useEffect(() => {
    if (alerts.length === 0) setDismissedIds(new Set());
  }, [alerts.length]);

  if (visibleAlerts.length === 0) return null;

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => new Set(prev).add(id));
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'EMERGENCY': return <AlertTriangle size={18} />;
      case 'VIP_MILITARY': return <ShieldAlert size={18} />;
      case 'SPECIAL_LIVERY': return <Palette size={18} />;
      default: return <Plane size={18} />;
    }
  };

  const getAlertTitle = (type: string) => {
    switch (type) {
      case 'EMERGENCY': return 'Emergency Alert';
      case 'VIP_MILITARY': return 'VIP / Military Aircraft';
      case 'SPECIAL_LIVERY': return 'Special Livery Alert';
      default: return 'Heavy Aircraft Alert';
    }
  };

  const getAlertColors = (type: string) => {
    switch (type) {
      case 'EMERGENCY': return 'bg-red-950/80 border-red-500/50 text-red-100';
      case 'VIP_MILITARY': return 'bg-amber-950/80 border-amber-500/50 text-amber-100';
      case 'SPECIAL_LIVERY': return 'bg-purple-950/80 border-purple-500/50 text-purple-100';
      default: return 'bg-blue-950/80 border-blue-500/50 text-blue-100';
    }
  };

  const getIconColors = (type: string) => {
    switch (type) {
      case 'EMERGENCY': return 'bg-red-500/20 text-red-400';
      case 'VIP_MILITARY': return 'bg-amber-500/20 text-amber-400';
      case 'SPECIAL_LIVERY': return 'bg-purple-500/20 text-purple-400';
      default: return 'bg-blue-500/20 text-blue-400';
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {visibleAlerts.map((alert) => (
        <div 
          key={alert.id}
          className={`relative overflow-hidden rounded-xl border p-4 shadow-2xl backdrop-blur-md animate-in slide-in-from-right-8 duration-300 pointer-events-auto ${getAlertColors(alert.type)}`}
        >
          <div className="flex gap-3 items-start">
            <div className={`mt-0.5 rounded-full p-1.5 shrink-0 ${getIconColors(alert.type)}`}>
              {getAlertIcon(alert.type)}
            </div>
            
            <div className="flex-1 pr-6">
              <h4 className={`font-bold text-sm mb-1 ${alert.type === 'EMERGENCY' ? 'text-red-400' : alert.type === 'VIP_MILITARY' ? 'text-amber-400' : alert.type === 'SPECIAL_LIVERY' ? 'text-purple-400' : 'text-blue-400'}`}>
                {getAlertTitle(alert.type)}
              </h4>
              <p className="text-sm leading-snug font-medium">
                {alert.message}
              </p>
            </div>
          </div>

          <button 
            onClick={() => handleDismiss(alert.id)}
            className="absolute top-2 right-2 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
