export interface BoundingBox {
  lamin: number;
  lamax: number;
  lomin: number;
  lomax: number;
}

export interface Channel {
  channelName: string;
  youtubeChannelId: string;
  airportCode: string;
  currentVideoId?: string;
  isLive?: boolean;
  bbox?: BoundingBox;
  streamStatus?: 'live' | 'upcoming' | 'vod';
  streamTitle?: string;
}

export interface FlightAlert {
  id: string;
  callsign: string;
  type: 'EMERGENCY' | 'VIP_MILITARY' | 'HEAVY_AIRCRAFT' | 'SPECIAL_LIVERY';
  message: string;
  timestamp: number;
  isRead: boolean;
}

export interface ScheduledLivery {
  id: string;
  desc: string;
  icon: string;
  icao24: string;
  scheduledTime: number; 
  status: 'en_route' | 'arriving' | 'arrived';
}
