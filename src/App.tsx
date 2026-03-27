import { useState } from 'react';
import type { Channel } from './types';
import { YouTubePlayer } from './components/YouTubePlayer';
import { ChannelGrid } from './components/ChannelGrid';
import { InfoPanel } from './components/InfoPanel';
import { Plane, ExternalLink, Radio } from 'lucide-react';
import { useOpenSky } from './hooks/useOpenSky';
import { useMetar } from './hooks/useMetar';
import { ToastAlerts } from './components/ToastAlerts';

function App() {
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const { alerts, dismissAlert, aircraftStates } = useOpenSky(activeChannel);
  const { metar, loading: metarLoading } = useMetar(activeChannel?.airportCode);

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-black text-neutral-50 font-sans selection:bg-blue-500/30">
      <ToastAlerts alerts={alerts} onDismiss={dismissAlert} />

      {/* Header */}
      <header className="z-50 bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-800/60 px-4 md:px-8 py-3 flex items-center justify-between shrink-0 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl border border-blue-500/30 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
            <Plane size={22} className="transform -rotate-45" />
          </div>
          <div>
            <h1 className="text-lg font-black bg-gradient-to-r from-white via-blue-100 to-neutral-400 bg-clip-text text-transparent tracking-tight">
              SpotterTV Guide
            </h1>
            <p className="text-[10px] text-blue-400/80 font-bold tracking-[0.2em] uppercase">Live Aviation Network</p>
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

        <a
          href="https://forms.google.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 group px-3 py-1.5 bg-neutral-800/50 hover:bg-neutral-800 text-sm font-bold rounded-xl transition-all border border-neutral-700 hover:border-neutral-600"
        >
          Submit Channel
          <ExternalLink size={13} className="text-neutral-500 group-hover:text-blue-400 transition-colors" />
        </a>
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
