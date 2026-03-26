import { useEffect, useState } from 'react';
import type { Channel } from '../types';
import { ChannelCard } from './ChannelCard';

interface ChannelGridProps {
  selectedChannel: Channel | null;
  onSelectChannel: (channel: Channel) => void;
}

export function ChannelGrid({ selectedChannel, onSelectChannel }: ChannelGridProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}channels.json?t=${new Date().getTime()}`);
        if (!res.ok) throw new Error('Failed to fetch channels');
        const data: Channel[] = await res.json();
        setChannels(data);
        
        if (!selectedChannel && data.length > 0) {
          const firstLive = data.find(c => c.isLive) || data[0];
          onSelectChannel(firstLive);
        }
      } catch (error) {
        console.error("Error fetching channels:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChannels();
    const interval = setInterval(fetchChannels, 5 * 60 * 1000); // 5 mins
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="h-64 flex gap-3 items-center justify-center text-neutral-500 font-medium">
        <span className="animate-spin h-5 w-5 border-2 border-neutral-600 border-t-blue-500 rounded-full"></span>
        Loading aviation channels...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {channels.map((channel) => (
        <ChannelCard 
          key={channel.youtubeChannelId} 
          channel={channel} 
          isSelected={selectedChannel?.youtubeChannelId === channel.youtubeChannelId}
          onSelect={onSelectChannel}
        />
      ))}
    </div>
  );
}
