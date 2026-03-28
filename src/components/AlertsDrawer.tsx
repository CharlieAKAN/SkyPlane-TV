import { Bell, X, AlertTriangle, Plane, ShieldAlert, Palette } from 'lucide-react';
import type { FlightAlert } from '../types';
import { useEffect } from 'react';

interface AlertsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: FlightAlert[];
  markAlertsRead: () => void;
}

export function AlertsDrawer({ isOpen, onClose, alerts, markAlertsRead }: AlertsDrawerProps) {
  // Mark alerts read when opened
  useEffect(() => {
    if (isOpen) markAlertsRead();
  }, [isOpen, markAlertsRead]);

  // Prevent background scrolling when open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const sortedAlerts = [...alerts].sort((a, b) => b.timestamp - a.timestamp);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'EMERGENCY': return <AlertTriangle size={18} />;
      case 'VIP_MILITARY': return <ShieldAlert size={18} />;
      case 'SPECIAL_LIVERY': return <Palette size={18} />;
      default: return <Plane size={18} />;
    }
  };

  const getAlertColors = (type: string) => {
    switch (type) {
      case 'EMERGENCY': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'VIP_MILITARY': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'SPECIAL_LIVERY': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div 
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-neutral-900 border-l border-neutral-800 z-[101] shadow-2xl transition-transform duration-300 transform ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } flex flex-col`}
      >
        <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-950/50">
          <div className="flex items-center gap-2">
            <Bell size={20} className="text-neutral-400" />
            <h2 className="text-lg font-bold text-neutral-100 tracking-tight">Alert History</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {sortedAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-neutral-500 gap-3">
              <Bell size={32} className="opacity-20" />
              <p className="text-sm">No alerts in the last 15 minutes.</p>
            </div>
          ) : (
            sortedAlerts.map(alert => (
              <div 
                key={alert.id}
                className="flex gap-3 items-start p-3 rounded-xl border border-neutral-800/60 bg-neutral-900/50 hover:bg-neutral-800 transition-colors"
              >
                <div className={`shrink-0 mt-0.5 rounded-full p-2 border ${getAlertColors(alert.type)}`}>
                  {getAlertIcon(alert.type)}
                </div>
                <div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <h4 className="font-bold text-sm text-neutral-200">
                      {alert.type === 'EMERGENCY' ? 'Emergency' : alert.type === 'VIP_MILITARY' ? 'VIP / Military' : alert.type === 'SPECIAL_LIVERY' ? 'Special Livery' : 'Heavy Aircraft'}
                    </h4>
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-400 leading-snug">
                    {alert.message}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
