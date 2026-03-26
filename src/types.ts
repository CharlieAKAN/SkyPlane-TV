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
  currentVideoId: string;
  isLive: boolean;
  bbox: BoundingBox;
}

export interface FlightAlert {
  id: string;
  callsign: string;
  type: 'EMERGENCY' | 'RARE_AIRCRAFT';
  message: string;
  timestamp: number;
}
