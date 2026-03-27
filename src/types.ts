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
  type: 'EMERGENCY' | 'RARE_AIRCRAFT';
  message: string;
  timestamp: number;
}
