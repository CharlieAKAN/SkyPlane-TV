import { useCallback, useEffect, useRef, useState } from 'react';
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
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Update arrow visibility based on scroll position
  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }, []);

  // Arrow button scroll
  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'right' ? 300 : -300, behavior: 'smooth' });
    // Smooth scroll is async — poll state once animation has settled (~300ms)
    setTimeout(updateScrollState, 320);
  };

  // Allow horizontal scroll via mouse wheel
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      el.scrollLeft += e.deltaY + e.deltaX;
      updateScrollState();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('scroll', updateScrollState);
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('scroll', updateScrollState);
    };
  }, [updateScrollState]);

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        // Fetch from jsDelivr (GitHub raw CDN) so we always get the latest committed
        // channels.json regardless of GitHub Pages deploy cache staleness.
        const CHANNELS_URL = `https://cdn.jsdelivr.net/gh/CharlieAKAN/SkyPlane-TV@main/public/channels.json`;
        const res = await fetch(`${CHANNELS_URL}?t=${new Date().getTime()}`, {
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

        if (!selectedChannel && sorted.length > 0) {
          const firstLive = sorted.find(c => c.isLive) || sorted[0];
          onSelectChannel(firstLive);
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

  // Check scroll arrows after channels load
  useEffect(() => {
    // Short delay so DOM has painted
    const t = setTimeout(updateScrollState, 100);
    return () => clearTimeout(t);
  }, [channels, updateScrollState]);

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

      {/* Left gradient fade — only when scrollable */}
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-neutral-950 to-transparent pointer-events-none z-10" />
      )}
      {/* Left arrow — always visible, disabled at start */}
      <button
        onClick={() => scroll('left')}
        disabled={!canScrollLeft}
        className={`absolute left-1 top-1/2 -translate-y-1/2 z-20 h-10 w-10 flex items-center justify-center rounded-full border transition-all shadow-xl ${
          canScrollLeft
            ? 'bg-neutral-800/90 border-neutral-700 hover:bg-neutral-700 hover:border-neutral-500 text-neutral-300 hover:text-white cursor-pointer'
            : 'bg-neutral-900/50 border-neutral-800 text-neutral-700 cursor-default opacity-40'
        }`}
      >
        <ChevronLeft size={20} />
      </button>

      {/* Right gradient fade — only when scrollable */}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-neutral-950 to-transparent pointer-events-none z-10" />
      )}
      {/* Right arrow — always visible, disabled at end */}
      <button
        onClick={() => scroll('right')}
        disabled={!canScrollRight}
        className={`absolute right-1 top-1/2 -translate-y-1/2 z-20 h-10 w-10 flex items-center justify-center rounded-full border transition-all shadow-xl ${
          canScrollRight
            ? 'bg-neutral-800/90 border-neutral-700 hover:bg-neutral-700 hover:border-neutral-500 text-neutral-300 hover:text-white cursor-pointer'
            : 'bg-neutral-900/50 border-neutral-800 text-neutral-700 cursor-default opacity-40'
        }`}
      >
        <ChevronRight size={20} />
      </button>

      {/* Scrollable carousel */}
      <div
        ref={scrollRef}
        className="h-full flex flex-row gap-3 overflow-x-auto overflow-y-hidden px-4 py-3 items-stretch
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
