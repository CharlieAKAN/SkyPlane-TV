import { useState } from 'react';
import type { Channel } from './types';
import { YouTubePlayer } from './components/YouTubePlayer';
import { ChannelGrid } from './components/ChannelGrid';
import { InfoPanel } from './components/InfoPanel';
import { ExternalLink, Radio, Bell } from 'lucide-react';
import { useOpenSky } from './hooks/useOpenSky';
import { useMetar } from './hooks/useMetar';
import { ToastAlerts } from './components/ToastAlerts';
import { AlertsDrawer } from './components/AlertsDrawer';
import { LiveViewers } from './components/LiveViewers';

function App() {
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { alerts, markAlertsRead, aircraftStates } = useOpenSky(activeChannel);
  const { metar, loading: metarLoading } = useMetar(activeChannel?.airportCode);

  const unreadAlertsCount = alerts.filter(a => !a.isRead).length;

  return (
    <div className="h-[100dvh] w-screen overflow-hidden flex flex-col bg-black text-neutral-50 font-sans selection:bg-blue-500/30">
      <ToastAlerts alerts={alerts} />
      <AlertsDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        alerts={alerts} 
        markAlertsRead={markAlertsRead} 
      />

      {/* Header */}
      <header className="z-50 bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-800/60 px-4 md:px-8 py-3 flex items-center justify-between shrink-0 shadow-2xl">
        <div className="flex items-center gap-3">
          <picture>
            <source srcSet={`${import.meta.env.BASE_URL}logo.webp`} type="image/webp" />
            <img
              src={`${import.meta.env.BASE_URL}logo.png`}
              alt="SkySpotting TV"
              width={40}
              height={40}
              fetchPriority="high"
              className="h-10 w-10 object-contain drop-shadow-[0_0_10px_rgba(59,130,246,0.4)]"
            />
          </picture>
          <div>
            <h1 className="text-base sm:text-lg font-black bg-gradient-to-r from-white via-blue-100 to-neutral-400 bg-clip-text text-transparent tracking-tight whitespace-nowrap">
              SkySpotting TV
            </h1>
            <p className="text-[9px] sm:text-[10px] text-blue-400/80 font-bold tracking-[0.2em] uppercase whitespace-nowrap">Live Aviation Network</p>
          </div>
        </div>

        {/* Now Playing — center, desktop only */}
        <div className="hidden md:flex items-center gap-2 text-sm font-semibold text-neutral-300">
          {activeChannel?.isLive ? (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
          ) : (
            <Radio size={14} className="text-neutral-500" />
          )}
          <span className="text-neutral-400">Now Playing:</span>
          <span className="text-white truncate max-w-xs">{activeChannel?.channelName || 'Loading...'}</span>
          {activeChannel?.airportCode && (
            <span className="ml-1 px-2 py-0.5 rounded text-xs font-bold bg-blue-500/20 border border-blue-500/30 text-blue-300">
              {activeChannel.airportCode}
            </span>
          )}
        </div>

        {/* Header action buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Live Viewers Tracker */}
          <LiveViewers />

          {/* Buy Me a Coffee */}
          <a
            href="https://buymeacoffee.com/charlieakan"
            target="_blank"
            rel="noopener noreferrer"
            title="Buy Me a Coffee"
            className="flex items-center justify-center sm:justify-start gap-1.5 w-8 h-8 sm:w-auto sm:px-3 sm:py-1.5 rounded-xl text-xs font-black tracking-wide transition-all border border-yellow-500/40 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 hover:border-yellow-500/60 shadow-[0_0_12px_rgba(234,179,8,0.15)] hover:shadow-[0_0_18px_rgba(234,179,8,0.25)]"
          >
            <span className="text-sm sm:text-xs text-center -mt-0.5 sm:mt-0">☕</span>
            <span className="hidden sm:inline">Buy Me a Coffee</span>
          </a>

          {/* Submit Channel - Hidden on small mobile */}
          <a
            href="https://forms.gle/AEjkq9zcPg768maE8"
            target="_blank"
            rel="noopener noreferrer"
            title="Submit Channel"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border border-neutral-700 bg-neutral-800/50 text-neutral-300 hover:bg-neutral-800 hover:border-neutral-600 hover:text-white"
          >
            <ExternalLink size={12} />
            <span className="hidden md:inline">Submit Channel</span>
          </a>

          {/* Report Bug - Hidden on small mobile */}
          <a
            href="https://forms.gle/owzqH1nj7wnKZ2EF9"
            target="_blank"
            rel="noopener noreferrer"
            title="Report a Bug"
            className="hidden sm:flex items-center justify-center w-8 h-8 rounded-xl text-xs font-bold transition-all border border-neutral-700 bg-neutral-800/50 text-neutral-500 hover:bg-red-950/50 hover:border-red-800/60 hover:text-red-400"
          >
            🐛
          </a>

          {/* Alerts Bell */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="relative flex items-center justify-center ml-1 w-8 h-8 rounded-xl transition-all border border-neutral-700 bg-neutral-800/50 text-neutral-300 hover:bg-neutral-800 hover:border-neutral-500 hover:text-white"
          >
            <Bell size={16} />
            {unreadAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 text-[8px] font-bold text-white flex items-center justify-center">
                  {unreadAlertsCount > 9 ? '9+' : unreadAlertsCount}
                </span>
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main content area */}
      <main className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">

        {/* ── Left / Primary column: video + mobile info panel ── */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">

          {/* Video player — fills all space above mobile tabs / channel dock */}
          <div className="flex-1 min-h-0 bg-black">
            <YouTubePlayer videoId={activeChannel?.currentVideoId || ''} />
          </div>

          {/* Mobile-only: Map + Weather tabs below video */}
          <div className="md:hidden shrink-0">
            <InfoPanel
              mobile
              aircraftStates={aircraftStates}
              metar={metar}
              metarLoading={metarLoading}
              airportCode={activeChannel?.airportCode}
              bbox={activeChannel?.bbox}
            />
          </div>

          {/* Channel Dock */}
          <div className="shrink-0 h-44 border-t border-white/10 bg-neutral-950/90 backdrop-blur-sm">
            <ChannelGrid
              selectedChannel={activeChannel}
              onSelectChannel={setActiveChannel}
            />
          </div>
        </div>

        {/* ── Right sidebar: desktop flight map + METAR ── */}
        <InfoPanel
          aircraftStates={aircraftStates}
          metar={metar}
          metarLoading={metarLoading}
          airportCode={activeChannel?.airportCode}
          bbox={activeChannel?.bbox}
        />
      </main>
    </div>
  );
}

export default App;
