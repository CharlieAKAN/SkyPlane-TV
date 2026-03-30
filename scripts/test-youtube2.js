async function test() {
  const res = await fetch('https://www.youtube.com/channel/UCYDCnc3YBEqxfuhvQ4rxqSA/live');
  const t = await res.text();
  const canonical = t.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]+)">/);
  console.log('Canonical Match:', canonical ? canonical[1] : null);
  const videoId = t.match(/"videoId":"(.*?)"/);
  console.log('VideoId Match:', videoId ? videoId[1] : null);
}
test();
