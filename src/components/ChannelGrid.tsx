import { useEffect, useRef, useState } from 'react';
import type { Channel } from '../types';
import { ChannelCard } from './ChannelCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ChannelGridProps {
  selectedChannel: Channel | null;
  onSelectChannel: (channel: Channel) => void;
}

export function ChannelGrid({ selectedChannel, onSelectChannel }: ChannelGridProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll the carousel — no state, just imperatively read/write scrollLeft
  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'right' ? 300 : -300, behavior: 'smooth' });
  };

  // Allow horizontal scroll via mouse wheel
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      el.scrollLeft += e.deltaY + e.deltaX;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        // Fetch directly from same origin — no CDN caching issues.
        // cache: 'no-store' + timestamp forces a fresh hit every poll.
        const res = await fetch(`${import.meta.env.BASE_URL}channels.json?t=${Date.now()}`, {
          cache: 'no-store',
        });
        if (!res.ok) throw new Error('Failed to fetch channels');
        const data: Channel[] = await res.json();

        // Sort: live first → upcoming → vod/offline
        const order = { live: 0, upcoming: 1, vod: 2 };
        const sorted = [...data].sort((a, b) => {
          const aOrder = order[a.streamStatus ?? 'vod'] ?? 2;
          const bOrder = order[b.streamStatus ?? 'vod'] ?? 2;
          return aOrder - bOrder;
        });

        setChannels(sorted);

        if (!selectedChannel) {
          // First load: auto-select first live channel
          const firstLive = sorted.find(c => c.isLive) || sorted[0];
          onSelectChannel(firstLive);
        } else {
          // Subsequent polls: refresh the active channel object with latest data
          // so useOpenSky always sees the current isLive/bbox values
          const updated = sorted.find(c => c.youtubeChannelId === selectedChannel.youtubeChannelId);
          if (updated) onSelectChannel(updated);
        }
      } catch (error) {
        console.error("Error fetching channels:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChannels();
    const interval = setInterval(fetchChannels, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center gap-3 text-neutral-500 font-medium">
        <span className="animate-spin h-5 w-5 border-2 border-neutral-600 border-t-blue-500 rounded-full" />
        Loading aviation channels...
      </div>
    );
  }

  return (
    <div className="relative h-full">

      {/* Left arrow — always shown, always clickable */}
      <button
        onClick={() => scroll('left')}
        className="absolute left-1 top-1/2 -translate-y-1/2 z-20 h-10 w-10 flex items-center justify-center rounded-full bg-neutral-800/90 border border-neutral-700 hover:bg-neutral-700 hover:border-neutral-500 transition-all shadow-xl text-neutral-300 hover:text-white"
        aria-label="Scroll channels left"
      >
        <ChevronLeft size={20} />
      </button>

      {/* Right arrow — always shown, always clickable */}
      <button
        onClick={() => scroll('right')}
        className="absolute right-1 top-1/2 -translate-y-1/2 z-20 h-10 w-10 flex items-center justify-center rounded-full bg-neutral-800/90 border border-neutral-700 hover:bg-neutral-700 hover:border-neutral-500 transition-all shadow-xl text-neutral-300 hover:text-white"
        aria-label="Scroll channels right"
      >
        <ChevronRight size={20} />
      </button>

      {/* Scrollable carousel — padded so arrows don't overlap cards */}
      <div
        ref={scrollRef}
        className="h-full flex flex-row gap-3 overflow-x-auto overflow-y-hidden px-14 py-3 items-stretch
                   [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {channels.map((channel) => (
          <ChannelCard
            key={channel.youtubeChannelId}
            channel={channel}
            isSelected={selectedChannel?.youtubeChannelId === channel.youtubeChannelId}
            onSelect={onSelectChannel}
          />
        ))}
      </div>
    </div>
  );
}
