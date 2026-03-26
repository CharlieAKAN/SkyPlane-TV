import { useState } from 'react';
import type { Channel } from './types';
import { YouTubePlayer } from './components/YouTubePlayer';
import { ChannelGrid } from './components/ChannelGrid';
import { Plane, ExternalLink } from 'lucide-react';
import { useOpenSky } from './hooks/useOpenSky';
import { ToastAlerts } from './components/ToastAlerts';

function App() {
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const { alerts, dismissAlert } = useOpenSky(activeChannel);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex flex-col font-sans selection:bg-blue-500/30">
      <ToastAlerts alerts={alerts} onDismiss={dismissAlert} />
      {/* Header */}
      <header className="sticky top-0 z-50 bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-800/80 px-4 md:px-8 py-4 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl border border-blue-500/30 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
            <Plane size={24} className="transform -rotate-45" />
          </div>
          <div>
            <h1 className="text-xl font-black bg-gradient-to-r from-white via-blue-100 to-neutral-400 bg-clip-text text-transparent tracking-tight">
              SpotterTV Guide
            </h1>
            <p className="text-[10px] text-blue-400/80 font-bold tracking-[0.2em] uppercase mt-0.5">Live Aviation Network</p>
          </div>
        </div>
        
        <a 
          href="https://forms.google.com/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 group px-4 py-2 bg-neutral-800/50 hover:bg-neutral-800 text-sm font-bold rounded-xl transition-all border border-neutral-700 hover:border-neutral-600 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]"
        >
          Submit Channel
          <ExternalLink size={14} className="text-neutral-500 group-hover:text-blue-400 transition-colors" />
        </a>
      </header>

      <main className="flex-1 flex flex-col items-center">
        {/* Top Section - Player */}
        <section className="w-full max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8 pb-2">
          <div className="mb-4 flex items-center justify-between px-1">
            <h2 className="text-xl font-bold flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              Now Playing: <span className="text-white ml-1">{activeChannel?.channelName || 'Loading Engine...'}</span>
            </h2>
          </div>
          
          <YouTubePlayer videoId={activeChannel?.currentVideoId || ''} />
        </section>

        {/* Bottom Section - TV Guide Grid */}
        <section className="w-full max-w-[1600px] mx-auto mt-6 px-4 md:px-6 lg:px-8 pb-16">
          <div className="flex items-center justify-between mb-6 px-1">
            <h3 className="text-sm font-black text-neutral-500 uppercase tracking-widest">Available Streams</h3>
            <div className="h-[1px] bg-gradient-to-r from-neutral-800 to-transparent flex-1 ml-6 hidden sm:block"></div>
          </div>
          
          <ChannelGrid 
            selectedChannel={activeChannel} 
            onSelectChannel={setActiveChannel} 
          />
        </section>
      </main>
    </div>
  );
}

export default App;
