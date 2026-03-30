import fs from 'fs';
const channelId = 'UCYDCnc3YBEqxfuhvQ4rxqSA';
async function test() {
  const res1 = await fetch(`https://www.youtube.com/channel/${channelId}/live`);
  const html = await res1.text();
  const match = html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]+)">/);
  console.log('Live Scrape Match:', match ? match[1] : null);

  const res2 = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
  const xml = await res2.text();
  const matches = [...xml.matchAll(/<yt:videoId>([^<]+)<\/yt:videoId>/g)];
  console.log('RSS IDs:', matches.map(m => m[1]).slice(0, 5));
}
test();
