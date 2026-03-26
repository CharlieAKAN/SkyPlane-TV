import fs from 'fs';
import path from 'path';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const CHANNELS_JSON_PATH = path.join(process.cwd(), 'public', 'channels.json');

async function main() {
  if (!YOUTUBE_API_KEY) {
    console.warn("⚠️ No YOUTUBE_API_KEY provided. Running in dry-run mode.");
  }

  try {
    const data = fs.readFileSync(CHANNELS_JSON_PATH, 'utf-8');
    const channels = JSON.parse(data);

    for (const channel of channels) {
      if (YOUTUBE_API_KEY) {
        // Query YouTube API to see if they are currently streaming live
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channel.youtubeChannelId}&type=video&eventType=live&key=${YOUTUBE_API_KEY}`;
        
        const res = await fetch(url);
        const result = await res.json();
        
        if (result.items && result.items.length > 0) {
          const videoId = result.items[0].id.videoId;
          
          // Step 2: VERIFY EMBEDDING IS ENABLED
          const videoCheckUrl = `https://www.googleapis.com/youtube/v3/videos?part=status&id=${videoId}&key=${YOUTUBE_API_KEY}`;
          const videoRes = await fetch(videoCheckUrl);
          const videoResult = await videoRes.json();
          const isEmbeddable = videoResult.items && videoResult.items.length > 0 && videoResult.items[0].status.embeddable;

          if (isEmbeddable) {
            channel.isLive = true;
            channel.currentVideoId = videoId;
            console.log(`[LIVE] ${channel.channelName} is streaming and allows embeds!`);
          } else {
            channel.isLive = false;
            console.log(`[BLOCKED] ${channel.channelName} is live, but creator disabled embeds. Showing VOD instead.`);
          }
        } else {
          channel.isLive = false;
          // If not live, we could ideally fetch their latest uploaded video.
          // For now, we will retain the last known currentVideoId so there's always a VOD.
          console.log(`[VOD] ${channel.channelName} is offline. Keeping existing VOD.`);
        }
      } else {
        // DRY RUN: Let's randomly fake a stream going offline or online to test UI bounds
        if (Math.random() > 0.8) {
          channel.isLive = !channel.isLive;
          console.log(`[DRY-RUN] Toggled status for ${channel.channelName} to ${channel.isLive ? 'LIVE' : 'VOD'}`);
        }
      }
    }

    fs.writeFileSync(CHANNELS_JSON_PATH, JSON.stringify(channels, null, 2));
    console.log("✅ Successfully updated channels.json");
  } catch (error) {
    console.error("❌ Error polling YouTube:", error);
    process.exit(1);
  }
}

main();
