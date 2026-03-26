import type { Channel } from '../types';
import { PlaneTakeoff, Radio } from 'lucide-react';

interface ChannelCardProps {
  channel: Channel;
  isSelected: boolean;
  onSelect: (channel: Channel) => void;
}

export function ChannelCard({ channel, isSelected, onSelect }: ChannelCardProps) {
  return (
    <div 
      onClick={() => onSelect(channel)}
      className={`relative cursor-pointer group transition-all duration-300 rounded-xl overflow-hidden border ${
        isSelected 
          ? 'border-blue-500 bg-neutral-800 shadow-[0_0_15px_rgba(59,130,246,0.3)]' 
          : 'border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800 hover:border-neutral-700'
      }`}
    >
      <div className="p-5 flex flex-col gap-4 h-full">
        <div className="flex justify-between items-start gap-3">
          <h3 className="text-base font-bold text-neutral-100 group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
            {channel.channelName}
          </h3>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold tracking-wider shrink-0 bg-neutral-950 border border-neutral-800 backdrop-blur-sm">
            <PlaneTakeoff size={12} className="text-blue-500" />
            <span className="text-neutral-300">{channel.airportCode}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-auto">
          {channel.isLive ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-red-500/20 bg-red-500/10 text-red-500 text-[10px] font-black tracking-widest uppercase">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              Live
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-neutral-500/20 bg-neutral-500/10 text-neutral-400 text-[10px] font-black tracking-widest uppercase">
              <Radio size={12} />
              Pre-Recorded
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
