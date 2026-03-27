import fs from 'fs';
import path from 'path';
import { OpenAI } from 'openai';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const CHANNELS_JSON_PATH = path.join(process.cwd(), 'public', 'channels.json');
const AIRPORTS_JSON_PATH = path.join(process.cwd(), 'scripts', 'airports.json');

// Initialize OpenAI only if key exists
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

async function extractAirportCode(title, description, knownCodes) {
  if (!openai) {
    console.log("No OPENAI_API_KEY found, skipping AI extraction.");
    return null;
  }
  
  try {
    const prompt = `Analyze this plane spotting video title and description. Identify the airport they are streaming from. Return a JSON object with exactly one key "airportCode" containing the 3-letter IATA code. If unknown, return null. Known codes include: ${knownCodes.join(', ')}.
    
Title: ${title}
Description: ${description.substring(0, 500)}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(completion.choices[0].message.content);
    return result.airportCode || null;
  } catch (error) {
    console.error("OpenAI Extraction Error:", error);
    return null;
  }
}

async function fetchBestVideo(channelId) {
  // 1. Check for Live Streams
  let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&eventType=live&key=${YOUTUBE_API_KEY}`;
  let res = await fetch(url);
  let result = await res.json();
  if (result.items && result.items.length > 0) {
    return { ...result.items[0], streamStatus: 'live' };
  }

  // 2. Check for Upcoming (Scheduled) Streams
  url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&eventType=upcoming&key=${YOUTUBE_API_KEY}`;
  res = await fetch(url);
  result = await res.json();
  if (result.items && result.items.length > 0) {
    return { ...result.items[0], streamStatus: 'upcoming' };
  }

  // 3. Fallback to the latest VOD (Video on Demand)
  url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&order=date&maxResults=1&key=${YOUTUBE_API_KEY}`;
  res = await fetch(url);
  result = await res.json();
  if (result.items && result.items.length > 0) {
    return { ...result.items[0], streamStatus: 'vod' };
  }
  
  return null;
}

async function checkEmbeddable(videoId) {
  const url = `https://www.googleapis.com/youtube/v3/videos?part=status&id=${videoId}&key=${YOUTUBE_API_KEY}`;
  const res = await fetch(url);
  const result = await res.json();
  return result.items && result.items.length > 0 && result.items[0].status.embeddable;
}

async function main() {
  if (!YOUTUBE_API_KEY) {
    console.warn("⚠️ No YOUTUBE_API_KEY provided. Exiting.");
    process.exit(1);
  }
  if (!OPENAI_API_KEY) {
    console.warn("⚠️ No OPENAI_API_KEY provided. Location bounds will not be dynamically updated.");
  }

  const channelsData = JSON.parse(fs.readFileSync(CHANNELS_JSON_PATH, 'utf-8'));
  
  // Create an airports dictionary if it exists, otherwise empty
  let airportsData = {};
  if (fs.existsSync(AIRPORTS_JSON_PATH)) {
    airportsData = JSON.parse(fs.readFileSync(AIRPORTS_JSON_PATH, 'utf-8'));
  }
  const knownAirports = Object.keys(airportsData);

  let hasUpdates = false;

  for (const channel of channelsData) {
    console.log(`Polling YouTube for channel: ${channel.channelName}...`);
    const bestVideo = await fetchBestVideo(channel.youtubeChannelId);
    
    if (bestVideo) {
      const videoId = bestVideo.id.videoId;
      const title = bestVideo.snippet.title;
      const description = bestVideo.snippet.description;
      const isLive = bestVideo.streamStatus === 'live';

      const isEmbeddable = await checkEmbeddable(videoId);
      
      if (isEmbeddable) {
        // Did the basic status change?
        if (channel.isLive !== isLive || channel.streamStatus !== bestVideo.streamStatus) {
            channel.isLive = isLive;
            channel.streamStatus = bestVideo.streamStatus;
            hasUpdates = true;
        }

        channel.streamTitle = title;
        
        // Only ask OpenAI if the video ID changed (save tokens and time!)
        if (channel.currentVideoId !== videoId || !channel.airportCode) {
          channel.currentVideoId = videoId;
          hasUpdates = true;

          console.log(`  -> New video detected: ${title} (${videoId})`);
          console.log(`  -> Asking AI to extract location...`);
          
          const extractedCode = await extractAirportCode(title, description, knownAirports);
          
          if (extractedCode) {
            console.log(`  -> AI thinks it's at: ${extractedCode}`);
            if (airportsData[extractedCode]) {
              // Ensure bbox gets completely replaced
              channel.airportCode = extractedCode;
              channel.bbox = { ...airportsData[extractedCode] };
              console.log(`  -> Mapped ${extractedCode} to bounding box successfully!`);
            } else {
              console.log(`  -> Note: Airport Code ${extractedCode} not in airports.json. Using fallback or existing bbox.`);
            }
          } else {
             console.log(`  -> AI couldn't determine location or no API key. Keeping existing bounding box.`);
          }
        } else {
           console.log(`  -> Video ID (${videoId}) hasn't changed. Skipping OpenAI request.`);
        }
      } else {
        console.log(`  -> [BLOCKED] Video ${videoId} is not embeddable.`);
      }
    } else {
      channel.isLive = false;
      console.log(`  -> No videos found for ${channel.channelName}.`);
    }
  }

  // Write changes
  fs.writeFileSync(CHANNELS_JSON_PATH, JSON.stringify(channelsData, null, 2));
  console.log("✅ Successfully finished polling and saved channels.json");
}

main();
