import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';

export function LiveViewers() {
  const [viewers, setViewers] = useState(0);

  useEffect(() => {
    // Start with a believable base number of global viewers (e.g. 1400 - 2200)
    const baseViewers = Math.floor(Math.random() * 800) + 1400;
    setViewers(baseViewers);

    // Fluctuate the number every 3 to 7 seconds to look authentic
    const interval = setInterval(() => {
      // Random change between -6 and +9
      const change = Math.floor(Math.random() * 16) - 6;
      setViewers(prev => Math.max(100, prev + change));
    }, Math.floor(Math.random() * 4000) + 3000);

    return () => clearInterval(interval);
  }, []);

  if (viewers === 0) return null;

  return (
    <div 
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border border-green-500/30 bg-green-500/10 text-green-400 shadow-[0_0_12px_rgba(34,197,94,0.15)] select-none cursor-default"
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
