import YouTube, { type YouTubeProps } from 'react-youtube';
import { useEffect, useRef, useState } from 'react';

interface YouTubePlayerProps {
  videoId: string;
}

export function YouTubePlayer({ videoId }: YouTubePlayerProps) {
  const [switching, setSwitching] = useState(false);
  const prevVideoId = useRef<string>('');

  // Trigger TV static effect when videoId changes
  useEffect(() => {
    if (!videoId) return;
    if (prevVideoId.current === videoId) return;
    if (prevVideoId.current !== '') {
      // A real channel switch — fire the effect
      setSwitching(true);
      const t = setTimeout(() => setSwitching(false), 600);
      return () => clearTimeout(t);
    }
    prevVideoId.current = videoId;
  }, [videoId]);

  // Update ref after render when switching completes
  useEffect(() => {
    if (!switching) {
      prevVideoId.current = videoId;
    }
  }, [switching, videoId]);

  const onPlayerReady: YouTubeProps['onReady'] = (event) => {
    event.target.playVideo();
  };

  const opts: YouTubeProps['opts'] = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,
      mute: 1,
      playsinline: 1,
      vq: 'hd1080',
      iv_load_policy: 3,
      rel: 0,
      modestbranding: 1,
      host: 'https://www.youtube-nocookie.com',
    },
  };

  return (
    <div className="w-full h-full bg-black relative overflow-hidden">
      {/* TV static channel-change overlay */}
      {switching && (
        <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden">
          {/* Static noise layer */}
          <div
            className="absolute inset-0 opacity-90"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
              backgroundSize: '150px 150px',
              animation: 'tv-noise 0.6s steps(1) forwards',
            }}
          />
          {/* Horizontal scanline compress */}
          <div
            className="absolute inset-x-0 bg-white"
            style={{
              animation: 'tv-scanline 0.6s ease-in-out forwards',
            }}
          />
        </div>
      )}

      {/* Loading state */}
      {!videoId && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-neutral-600">
          <div className="w-10 h-10 border-2 border-neutral-700 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-sm font-medium tracking-widest uppercase">Loading signal...</span>
        </div>
      )}

      {videoId && (
        <YouTube
          videoId={videoId}
          opts={opts}
          onReady={onPlayerReady}
          className="w-full h-full"
          iframeClassName="w-full h-full"
        />
      )}
    </div>
  );
}
