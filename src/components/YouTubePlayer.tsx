import YouTube, { type YouTubeProps } from 'react-youtube';

interface YouTubePlayerProps {
  videoId: string;
}

export function YouTubePlayer({ videoId }: YouTubePlayerProps) {
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
      // Reduce adaptive quality switching that causes jitter on live streams
      vq: 'hd1080',
      // Suppress annotations/cards which cause repaints
      iv_load_policy: 3,
      // No related videos overlay
      rel: 0,
      // Hide extra controls
      modestbranding: 1,
      host: 'https://www.youtube-nocookie.com',
    },
  };

  return (
    // w-full h-full — no aspect-video, just fill the flex-1 parent
    <div className="w-full h-full bg-black relative">
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
