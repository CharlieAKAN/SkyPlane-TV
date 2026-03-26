import type { FlightAlert } from '../types';
import { AlertTriangle, Plane, X } from 'lucide-react';
import { useEffect } from 'react';

interface ToastAlertsProps {
  alerts: FlightAlert[];
  onDismiss: (id: string) => void;
}

export function ToastAlerts({ alerts, onDismiss }: ToastAlertsProps) {
  // Auto-dismiss alerts after 10 seconds
  useEffect(() => {
    if (alerts.length === 0) return;
    
    const timeouts = alerts.map(alert => 
      setTimeout(() => onDismiss(alert.id), 10000)
    );

    return () => timeouts.forEach(clearTimeout);
  }, [alerts, onDismiss]);

  if (alerts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full">
      {alerts.map((alert) => (
        <div 
          key={alert.id}
          className={`relative overflow-hidden rounded-xl border p-4 shadow-2xl backdrop-blur-md animate-in slide-in-from-right-8 duration-300 ${
            alert.type === 'EMERGENCY' 
              ? 'bg-red-950/80 border-red-500/50 text-red-100' 
              : 'bg-blue-950/80 border-blue-500/50 text-blue-100'
          }`}
        >
          <div className="flex gap-3 items-start">
            <div className={`mt-0.5 rounded-full p-1.5 ${alert.type === 'EMERGENCY' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
              {alert.type === 'EMERGENCY' ? <AlertTriangle size={18} /> : <Plane size={18} />}
            </div>
            
            <div className="flex-1 pr-6">
              <h4 className={`font-bold text-sm mb-1 ${alert.type === 'EMERGENCY' ? 'text-red-400' : 'text-blue-400'}`}>
                {alert.type === 'EMERGENCY' ? 'Emergency Squawk' : 'Rare Aircraft Alert'}
              </h4>
              <p className="text-sm leading-snug">
                {alert.message}
              </p>
            </div>
          </div>

          <button 
            onClick={() => onDismiss(alert.id)}
            className="absolute top-2 right-2 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
