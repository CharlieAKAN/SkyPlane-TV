import type { Channel } from '../types';
import { PlaneTakeoff, Radio, Clock } from 'lucide-react';

interface ChannelCardProps {
  channel: Channel;
  isSelected: boolean;
  onSelect: (channel: Channel) => void;
}

export function ChannelCard({ channel, isSelected, onSelect }: ChannelCardProps) {
  return (
    <div
      onClick={() => onSelect(channel)}
      // Fixed width so they line up side-by-side in the carousel
      className={`relative cursor-pointer group transition-all duration-300 rounded-xl overflow-hidden border shrink-0 w-64 flex flex-col justify-between ${
        isSelected
          ? 'border-blue-500 bg-neutral-800 shadow-[0_0_20px_rgba(59,130,246,0.35)]'
          : 'border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 hover:border-neutral-600'
      }`}
    >
      {/* Selected indicator bar */}
      {isSelected && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500" />
      )}

      <div className="p-3 flex flex-col gap-2 h-full">
        {/* Airport badge + channel name */}
        <div className="flex items-start justify-between gap-2">
          <h3 className={`text-sm font-bold leading-snug line-clamp-2 transition-colors ${
            isSelected ? 'text-blue-300' : 'text-neutral-100 group-hover:text-blue-400'
          }`}>
            {channel.channelName}
          </h3>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold shrink-0 bg-neutral-950/80 border border-neutral-700">
            <PlaneTakeoff size={10} className="text-blue-500" />
            <span className="text-neutral-300">{channel.airportCode || '—'}</span>
          </div>
        </div>

        {/* Stream title if available */}
        {channel.streamTitle && (
          <p className="text-[11px] text-neutral-500 line-clamp-1 leading-snug">
            {channel.streamTitle}
          </p>
        )}

        {/* Status badge */}
        <div className="flex items-center gap-2 mt-auto">
          {channel.isLive ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-red-500/30 bg-red-500/10 text-red-400 text-[10px] font-black tracking-widest uppercase">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
              </span>
              Live
            </div>
          ) : channel.streamStatus === 'upcoming' ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400 text-[10px] font-black tracking-widest uppercase">
              <Clock size={10} />
              Upcoming
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-neutral-600/30 bg-neutral-700/20 text-neutral-500 text-[10px] font-black tracking-widest uppercase">
              <Radio size={10} />
              VOD
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
