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
      const isEmbeddable = await checkEmbeddable(videoId);
      if (isEmbeddable) {
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
      console.log(`  -> No videos found for ${channel.channelName}.`);
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
