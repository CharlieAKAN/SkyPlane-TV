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
      mute: 1, // Autoplay usually requires mute
      playsinline: 1,
      host: 'https://www.youtube-nocookie.com'
    },
  };

  return (
    <div className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10 relative group">
      {!videoId && (
        <div className="absolute inset-0 flex items-center justify-center text-neutral-500">
          Loading signal...
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
