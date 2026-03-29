import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';

export function LiveViewers() {
  const [viewers, setViewers] = useState(0);

  useEffect(() => {
    // 1. Get from localStorage or generate a believable baseline
    const saved = localStorage.getItem('__skyspotting_live');
    let baseViewers = 0;
    
    if (saved) {
      try {
        const { count, timestamp } = JSON.parse(saved);
        // If they refreshed within the last 15 minutes, keep the illusion going
        if (Date.now() - timestamp < 15 * 60 * 1000) {
          baseViewers = count;
        }
      } catch (e) { /* ignore */ }
    }

    if (baseViewers === 0) {
      // Base amount between 1400 and 2200
      baseViewers = Math.floor(Math.random() * 800) + 1400;
    }

    setViewers(baseViewers);

    // 2. Twitch-style fluctuation every 3 to 6 seconds
    const interval = setInterval(() => {
      setViewers(prev => {
        let change = 0;
        const diceRoll = Math.random();
        
        if (diceRoll > 0.90) {
          // 10% chance of a massive jump/drop (e.g. host/raid or stream crash) => -200 to +250
          change = Math.floor(Math.random() * 450) - 200;
        } else if (diceRoll > 0.70) {
          // 20% chance of a medium jump/drop => -50 to +70
          change = Math.floor(Math.random() * 120) - 50;
        } else {
          // 70% chance of standard Twitch fluctuation => -5 to +12
          change = Math.floor(Math.random() * 18) - 5;
        }

        const newCount = Math.max(800, prev + change); // Never drop below 800 entirely
        
        // Save to localStorage so it persists on rapid refresh
        localStorage.setItem('__skyspotting_live', JSON.stringify({
          count: newCount,
          timestamp: Date.now()
        }));

        return newCount;
      });
    }, Math.floor(Math.random() * 3000) + 3000);

    return () => clearInterval(interval);
  }, []);

  if (viewers === 0) return null;

  return (
    <div 
      className="flex items-center gap-1 sm:gap-1.5 px-2 py-1.5 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold transition-all border border-green-500/30 bg-green-500/10 text-green-400 shadow-[0_0_12px_rgba(34,197,94,0.15)] select-none cursor-default"
      title="Live users currently utilizing SkySpotting TV"
    >
      <span className="relative flex h-2 w-2 mr-0.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
      </span>
      <Users size={12} className="opacity-80" />
      <span className="hidden sm:inline">{viewers.toLocaleString()}</span>
      <span className="hidden md:inline font-semibold opacity-90 tracking-wide">watching</span>
      <span className="sm:hidden">{viewers.toLocaleString()}</span>
    </div>
  );
}
