import fs from 'fs';
import path from 'path';
import { OpenAI } from 'openai';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const CHANNELS_JSON_PATH = path.join(process.cwd(), 'public', 'channels.json');
const METAR_JSON_PATH = path.join(process.cwd(), 'public', 'metar.json');
const AIRPORTS_JSON_PATH = path.join(process.cwd(), 'scripts', 'airports.json');

// IATA → ICAO mapping for METAR lookups
const IATA_TO_ICAO = {
  LAX: 'KLAX', ORD: 'KORD', JFK: 'KJFK', MIA: 'KMIA',
  LAS: 'KLAS', SFO: 'KSFO', ATL: 'KATL', DFW: 'KDFW',
  SEA: 'KSEA', BOS: 'KBOS', DEN: 'KDEN', PHX: 'KPHX',
  LHR: 'EGLL', MAN: 'EGCC', CDG: 'LFPG', FRA: 'EDDF',
  AMS: 'EHAM', MAD: 'LEMD', BCN: 'LEBL', FCO: 'LIRF',
  DXB: 'OMDB', SIN: 'WSSS', HND: 'RJTT', NRT: 'RJAA',
  SYD: 'YSSY', MEL: 'YMML', HKG: 'VHHH',
};

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

/**
 * Fetch the exact live video ID by scraping the channel's /live page (0 quota),
 * then check its status via Videos API (1 quota).
 * If no live stream is found, fallback to RSS feed to get the latest VOD/Upcoming videos.
 */
async function fetchBestVideo(channelId) {
  let liveVideoId = null;
  
  // Step 1: Rapid 0-quota scrape of the /live URL
  // YouTube redirects or canonicalizes this to the actively featured live stream.
  try {
    const liveHtmlRes = await fetch(`https://www.youtube.com/channel/${channelId}/live`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Cookie': 'SOCS=CAI'
      }
    });
    const html = await liveHtmlRes.text();
    const match = html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]+)">/);
    if (match && match[1]) {
      liveVideoId = match[1];
    }
  } catch (err) {
    console.error(`  -> HTML scrape failed for ${channelId}:`, err.message);
  }

  // Step 2: Get recent video IDs from the free RSS feed (no API key needed) as a fallback/addition
  const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  let videoIds = [];
  try {
    const rssRes = await fetch(rssUrl);
    if (!rssRes.ok) throw new Error(`RSS ${rssRes.status}`);
    const xml = await rssRes.text();
    const matches = [...xml.matchAll(/<yt:videoId>([^<]+)<\/yt:videoId>/g)];
    videoIds = matches.map(m => m[1]).slice(0, 10);
  } catch (err) {
    console.error(`  -> RSS fetch failed for ${channelId}:`, err.message);
  }

  // Combine the scraped live ID and the RSS IDs (deduplicated)
  const allIdsCandid = [];
  if (liveVideoId) allIdsCandid.push(liveVideoId);
  for (const id of videoIds) {
    if (!allIdsCandid.includes(id)) allIdsCandid.push(id);
  }

  if (allIdsCandid.length === 0) {
    console.log(`  -> No videos found through any method for ${channelId}`);
    return null;
  }

  // Step 3: Batch-check all IDs in one Videos API call (1 quota unit)
  const ids = allIdsCandid.join(',');
  const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails,status&id=${ids}&key=${YOUTUBE_API_KEY}`;
  let items = [];
  try {
    const apiRes = await fetch(apiUrl);
    const apiData = await apiRes.json();
    items = apiData.items || [];
  } catch (err) {
    console.error(`  -> Videos API failed:`, err.message);
    return null;
  }

  // Step 4: Find best result — prefer live > upcoming > vod
  const live = items.find(v =>
    v.liveStreamingDetails &&
    v.liveStreamingDetails.actualStartTime &&
    !v.liveStreamingDetails.actualEndTime
  );
  if (live) {
    return {
      id: { videoId: live.id },
      snippet: live.snippet,
      status: live.status,
      streamStatus: 'live',
    };
  }

  const upcoming = items.find(v =>
    v.liveStreamingDetails &&
    v.liveStreamingDetails.scheduledStartTime &&
    !v.liveStreamingDetails.actualStartTime
  );
  if (upcoming) {
    return {
      id: { videoId: upcoming.id },
      snippet: upcoming.snippet,
      status: upcoming.status,
      streamStatus: 'upcoming',
    };
  }

  // Fallback: latest video (prefer the scraped one if it wasn't live but still valid, or first RSS)
  const latest = items[0];
  if (latest) {
    return {
      id: { videoId: latest.id },
      snippet: latest.snippet,
      status: latest.status,
      streamStatus: 'vod',
    };
  }

  return null;
}

function isEmbeddable(videoItem) {
  return videoItem?.status?.embeddable !== false;
}

async function fetchAllMetar(channels) {
  // Collect unique IATA codes that have an ICAO mapping
  const iataSet = [...new Set(
    channels.map(c => c.airportCode).filter(Boolean)
  )];
  const icaos = iataSet.map(iata => IATA_TO_ICAO[iata]).filter(Boolean);

  if (icaos.length === 0) {
    console.log('No ICAO codes to fetch METAR for.');
    return {};
  }

  const ids = icaos.join(',');
  const url = `https://aviationweather.gov/api/data/metar?ids=${ids}&format=json&hours=1`;
  console.log(`\nFetching METAR for: ${ids}`);

  try {
    const res = await fetch(url);
    if (!res.ok) { console.warn(`METAR API returned ${res.status}`); return {}; }
    const data = await res.json();

    const metarMap = {};
    for (const m of data) {
      // Key by IATA for easy frontend lookup
      const iata = Object.entries(IATA_TO_ICAO).find(([, v]) => v === m.icaoId)?.[0];
      if (iata) {
        const ceilingLayer = (m.clouds ?? []).find(s => ['BKN','OVC','OVX'].includes(s.cover));
        const altimHpa = m.altim ?? null;
        metarMap[iata] = {
          raw: m.rawOb ?? '',
          icao: m.icaoId ?? '',
          flightCategory: m.fltCat ?? 'UNKNOWN',
          windDir: m.wdir === 'VRB' ? null : (m.wdir ?? null),
          windSpeed: m.wspd ?? 0,
          windGust: m.wgst ?? null,
          visibility: m.visib != null ? parseFloat(String(m.visib)) : null,
          ceiling: ceilingLayer?.base ?? null,
          temp: m.temp ?? null,
          dewpoint: m.dewp ?? null,
          altimeter: altimHpa != null ? Math.round(altimHpa * 0.02953 * 100) / 100 : null,
          conditions: m.wxString ?? '',
          observationTime: m.reportTime ?? '',
        };
        console.log(`  -> METAR ${iata} (${m.icaoId}): ${m.fltCat ?? '?'} ${m.rawOb ?? ''}`);
      }
    }
    return metarMap;
  } catch (err) {
    console.error('METAR fetch error:', err);
    return {};
  }
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

      // ── Always update live status from search result (most reliable source) ──
      if (channel.isLive !== isLive || channel.streamStatus !== bestVideo.streamStatus) {
        channel.isLive = isLive;
        channel.streamStatus = bestVideo.streamStatus;
        hasUpdates = true;
      }
      channel.streamTitle = title;

      // ── Only update videoId if the video is actually embeddable ──
      if (isEmbeddable(bestVideo)) {
        if (channel.currentVideoId !== videoId || !channel.airportCode) {
          channel.currentVideoId = videoId;
          hasUpdates = true;

          console.log(`  -> New video detected: ${title} (${videoId})`);
          console.log(`  -> Asking AI to extract location...`);
          
          const extractedCode = await extractAirportCode(title, description, knownAirports);
          
          if (extractedCode) {
            console.log(`  -> AI thinks it's at: ${extractedCode}`);
            if (airportsData[extractedCode]) {
              channel.airportCode = extractedCode;
              channel.bbox = { ...airportsData[extractedCode] };
              console.log(`  -> Mapped ${extractedCode} to bounding box successfully!`);
            } else {
              console.log(`  -> Note: Airport Code ${extractedCode} not in airports.json.`);
            }
          } else {
             console.log(`  -> AI couldn't determine location. Keeping existing bounding box.`);
          }
        } else {
           console.log(`  -> Video ID (${videoId}) hasn't changed. Skipping OpenAI request.`);
        }
      } else {
        // Video not embeddable — keep existing videoId but status is already set correctly above
        console.log(`  -> [BLOCKED] Video ${videoId} is not embeddable. Status preserved, keeping existing videoId.`);
      }
    } else {
      channel.isLive = false;
      channel.streamStatus = 'vod'; // Properly fallback to visually align UI
      console.log(`  -> No usable videos found/fetch failed for ${channel.channelName}. Marking VOD.`);
    }
  }

  // Write channels.json
  fs.writeFileSync(CHANNELS_JSON_PATH, JSON.stringify(channelsData, null, 2));
  console.log('\n✅ Saved channels.json');

  // Fetch and write metar.json (no CORS issues in Node.js!)
  const metarData = await fetchAllMetar(channelsData);
  fs.writeFileSync(METAR_JSON_PATH, JSON.stringify(metarData, null, 2));
  console.log('✅ Saved metar.json');
}

main();
