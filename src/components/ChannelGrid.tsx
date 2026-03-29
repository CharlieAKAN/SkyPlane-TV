import { useEffect, useRef } from 'react';
import type { Channel } from '../types';
import { ChannelCard } from './ChannelCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ChannelGridProps {
  channels: Channel[];
  loading: boolean;
  selectedChannel: Channel | null;
  onSelectChannel: (channel: Channel) => void;
}

export function ChannelGrid({ channels, loading, selectedChannel, onSelectChannel }: ChannelGridProps) {
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
