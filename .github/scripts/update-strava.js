/**
 * update-strava.js  — GitHub Action daily updater
 * Generates:  strava-card-total.svg
 *             strava-card-2026.svg
 *             strava-card-7days.svg
 * All pushed to repo root via GitHub API.
 */

const https = require('https');
const fs    = require('fs');

// ── Helpers ─────────────────────────────────────────────────────────────────
function post(host, path, body) {
  return new Promise((res, rej) => {
    const b = JSON.stringify(body);
    const req = https.request({ hostname: host, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b) } }, r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
    });
    req.on('error', rej); req.write(b); req.end();
  });
}

function stravaGet(path, token) {
  return new Promise((res, rej) => {
    https.get({ hostname: 'www.strava.com', path,
      headers: { Authorization: 'Bearer ' + token } }, r => {
      let d = ''; r.on('data', c => d += c);
      r.on('end', () => { try { res(JSON.parse(d)); } catch { res({}); } });
    }).on('error', rej);
  });
}

function ghGet(path) {
  return new Promise(resolve => {
    https.get({ hostname: 'api.github.com', path,
      headers: { Authorization: 'token ' + process.env.GITHUB_TOKEN,
        Accept: 'application/vnd.github.v3+json', 'User-Agent': 'strava-updater' } }, r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve({}); } });
    });
  });
}

function ghPut(path, body) {
  return new Promise(resolve => {
    const b = JSON.stringify(body);
    const req = https.request({ hostname: 'api.github.com', path, method: 'PUT',
      headers: { Authorization: 'token ' + process.env.GITHUB_TOKEN,
        Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json',
        'User-Agent': 'strava-updater', 'Content-Length': Buffer.byteLength(b) } }, r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve({}); } });
    });
    req.on('error', () => resolve({})); req.write(b); req.end();
  });
}

async function pushSvg(name, content, message) {
  const repo = '/repos/imranhossenmaruf/imranhossenmaruf/contents/' + name;
  const cur  = await ghGet(repo);
  const sha  = cur.sha && !cur.message ? cur.sha : undefined;
  const r    = await ghPut(repo, { message, content: Buffer.from(content).toString('base64'), ...(sha && { sha }) });
  console.log(r.commit ? '✅ pushed ' + name : '❌ failed ' + name, r.commit?.sha?.slice(0,7) || '');
}

// ── SVG Generators ───────────────────────────────────────────────────────────
function makeCardTotal({ totalKm, totalRuns, totalHrs, longestKm, goalKm = 500 }) {
  const pct      = Math.min(100, (parseFloat(totalKm) / goalKm * 100)).toFixed(1);
  const barWidth = Math.round(790 * parseFloat(pct) / 100);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="860" height="220" viewBox="0 0 860 220">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#FC4C02" stop-opacity="0.18"/>
    <stop offset="100%" stop-color="#1a1b27" stop-opacity="0"/>
  </linearGradient>
  <clipPath id="c"><rect rx="10" width="860" height="220"/></clipPath>
</defs>
<rect rx="10" width="860" height="220" fill="#1a1b27" stroke="#FC4C02" stroke-width="1.2" stroke-opacity="0.7"/>
<rect width="860" height="220" fill="url(#bg)" clip-path="url(#c)"/>
<circle cx="38" cy="36" r="22" fill="#FC4C02" opacity="0.15" stroke="#FC4C02" stroke-width="1"/>
<text x="38" y="42" text-anchor="middle" font-size="20" font-family="Segoe UI,Arial">🏃</text>
<text x="70" y="28" font-size="17" font-weight="bold" fill="#FC4C02" font-family="Segoe UI,Arial">Strava Running Stats</text>
<text x="70" y="46" font-size="11" fill="#565f89" font-family="Segoe UI,Arial">All-time Performance · strava.com/athletes/159259381</text>
<line x1="24" y1="58" x2="836" y2="58" stroke="#FC4C02" stroke-opacity="0.25" stroke-width="1"/>
<rect x="24"  y="70" width="190" height="78" rx="8" fill="#161b22" stroke="#FC4C02"  stroke-opacity="0.25" stroke-width="1"/>
<rect x="228" y="70" width="190" height="78" rx="8" fill="#161b22" stroke="#7aa2f7" stroke-opacity="0.25" stroke-width="1"/>
<rect x="432" y="70" width="190" height="78" rx="8" fill="#161b22" stroke="#9ece6a" stroke-opacity="0.25" stroke-width="1"/>
<rect x="636" y="70" width="200" height="78" rx="8" fill="#161b22" stroke="#bb9af7" stroke-opacity="0.25" stroke-width="1"/>
<text x="119" y="96"  text-anchor="middle" font-size="11" fill="#8b949e" font-family="Segoe UI,Arial">Total Distance</text>
<text x="119" y="124" text-anchor="middle" font-size="28" font-weight="bold" fill="#FC4C02" font-family="Segoe UI,Arial">${totalKm}</text>
<text x="119" y="140" text-anchor="middle" font-size="11" fill="#8b949e" font-family="Segoe UI,Arial">km</text>
<text x="323" y="96"  text-anchor="middle" font-size="11" fill="#8b949e" font-family="Segoe UI,Arial">Total Runs</text>
<text x="323" y="124" text-anchor="middle" font-size="28" font-weight="bold" fill="#7aa2f7" font-family="Segoe UI,Arial">${totalRuns}</text>
<text x="323" y="140" text-anchor="middle" font-size="11" fill="#8b949e" font-family="Segoe UI,Arial">activities</text>
<text x="527" y="96"  text-anchor="middle" font-size="11" fill="#8b949e" font-family="Segoe UI,Arial">Total Time</text>
<text x="527" y="124" text-anchor="middle" font-size="28" font-weight="bold" fill="#9ece6a" font-family="Segoe UI,Arial">${totalHrs}</text>
<text x="527" y="140" text-anchor="middle" font-size="11" fill="#8b949e" font-family="Segoe UI,Arial">hours</text>
<text x="736" y="96"  text-anchor="middle" font-size="11" fill="#8b949e" font-family="Segoe UI,Arial">Longest Run</text>
<text x="736" y="124" text-anchor="middle" font-size="28" font-weight="bold" fill="#bb9af7" font-family="Segoe UI,Arial">${longestKm}</text>
<text x="736" y="140" text-anchor="middle" font-size="11" fill="#8b949e" font-family="Segoe UI,Arial">km</text>
<text x="24" y="166" font-size="10" fill="#8b949e" font-family="Segoe UI,Arial">Annual distance goal progress · ${totalKm} / ${goalKm} km</text>
<rect x="24" y="172" width="790" height="8" rx="4" fill="#161b22"/>
<rect x="24" y="172" width="${barWidth}" height="8" rx="4" fill="#FC4C02"/>
<text x="814" y="180" text-anchor="end" font-size="10" fill="#FC4C02" font-family="Segoe UI,Arial" font-weight="bold">${pct}%</text>
<text x="24"  y="208" font-size="9" fill="#484f58" font-family="Segoe UI,Arial">Auto-updated daily by GitHub Actions</text>
<text x="836" y="208" text-anchor="end" font-size="10" fill="#FC4C02" font-family="Segoe UI,Arial" font-weight="bold" letter-spacing="1">STRAVA</text>
</svg>`;
}

function makeCard2026({ ytdKm, ytdRuns, ytdHrs, avgPace, ytdElev, year = 2026 }) {
  const heights = [0,8,14,0,18,22,12, 0,16,10,0,20,25,8, 0,14,18,0,22,19,10, 0,18,12,0,24,20,16];
  const bars = heights.map((h, i) => {
    const x = 24 + i * 29;
    const colors = ['#bb9af7','#7aa2f7','#e0af68','#9ece6a'];
    const col = h > 0 ? colors[Math.floor(i/7) % 4] : '#1e2030';
    return `<rect x="${x}" y="${178 - h}" width="22" height="${Math.max(h,2)}" rx="3" fill="${col}" opacity="${h>0?0.75:0.3}"/>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="860" height="220" viewBox="0 0 860 220">
<defs>
  <linearGradient id="bg2" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#bb9af7" stop-opacity="0.18"/>
    <stop offset="100%" stop-color="#1a1b27" stop-opacity="0"/>
  </linearGradient>
  <clipPath id="c2"><rect rx="10" width="860" height="220"/></clipPath>
</defs>
<rect rx="10" width="860" height="220" fill="#1a1b27" stroke="#bb9af7" stroke-width="1.2" stroke-opacity="0.7"/>
<rect width="860" height="220" fill="url(#bg2)" clip-path="url(#c2)"/>
<circle cx="38" cy="36" r="22" fill="#bb9af7" opacity="0.15" stroke="#bb9af7" stroke-width="1"/>
<text x="38" y="42" text-anchor="middle" font-size="20" font-family="Segoe UI,Arial">📅</text>
<text x="70" y="28" font-size="17" font-weight="bold" fill="#bb9af7" font-family="Segoe UI,Arial">${year} Running Summary</text>
<text x="70" y="46" font-size="11" fill="#565f89" font-family="Segoe UI,Arial">January – Present · ${ytdHrs}h total running time</text>
<line x1="24" y1="58" x2="836" y2="58" stroke="#bb9af7" stroke-opacity="0.25" stroke-width="1"/>
<rect x="24"  y="70" width="190" height="78" rx="8" fill="#161b22" stroke="#bb9af7" stroke-opacity="0.25" stroke-width="1"/>
<rect x="228" y="70" width="190" height="78" rx="8" fill="#161b22" stroke="#7aa2f7" stroke-opacity="0.25" stroke-width="1"/>
<rect x="432" y="70" width="190" height="78" rx="8" fill="#161b22" stroke="#e0af68" stroke-opacity="0.25" stroke-width="1"/>
<rect x="636" y="70" width="200" height="78" rx="8" fill="#161b22" stroke="#9ece6a" stroke-opacity="0.25" stroke-width="1"/>
<text x="119" y="96"  text-anchor="middle" font-size="11" fill="#8b949e" font-family="Segoe UI,Arial">Distance ${year}</text>
<text x="119" y="124" text-anchor="middle" font-size="28" font-weight="bold" fill="#bb9af7" font-family="Segoe UI,Arial">${ytdKm}</text>
<text x="119" y="140" text-anchor="middle" font-size="11" fill="#8b949e" font-family="Segoe UI,Arial">km</text>
<text x="323" y="96"  text-anchor="middle" font-size="11" fill="#8b949e" font-family="Segoe UI,Arial">Runs ${year}</text>
<text x="323" y="124" text-anchor="middle" font-size="28" font-weight="bold" fill="#7aa2f7" font-family="Segoe UI,Arial">${ytdRuns}</text>
<text x="323" y="140" text-anchor="middle" font-size="11" fill="#8b949e" font-family="Segoe UI,Arial">activities</text>
<text x="527" y="96"  text-anchor="middle" font-size="11" fill="#8b949e" font-family="Segoe UI,Arial">Avg Pace</text>
<text x="527" y="120" text-anchor="middle" font-size="24" font-weight="bold" fill="#e0af68" font-family="Segoe UI,Arial">${avgPace}</text>
<text x="527" y="140" text-anchor="middle" font-size="11" fill="#8b949e" font-family="Segoe UI,Arial">min / km</text>
<text x="736" y="96"  text-anchor="middle" font-size="11" fill="#8b949e" font-family="Segoe UI,Arial">Elevation</text>
<text x="736" y="124" text-anchor="middle" font-size="28" font-weight="bold" fill="#9ece6a" font-family="Segoe UI,Arial">${ytdElev}</text>
<text x="736" y="140" text-anchor="middle" font-size="11" fill="#8b949e" font-family="Segoe UI,Arial">m gained</text>
<text x="24" y="166" font-size="10" fill="#8b949e" font-family="Segoe UI,Arial">Weekly rhythm</text>
${bars}
<text x="24"  y="212" font-size="9" fill="#484f58" font-family="Segoe UI,Arial">Auto-updated daily by GitHub Actions</text>
<text x="836" y="212" text-anchor="end" font-size="10" fill="#bb9af7" font-family="Segoe UI,Arial" font-weight="bold" letter-spacing="1">${year}</text>
</svg>`;
}

function makeCard7Days({ days, streak, weeklyKm, weeklyRuns }) {
  const maxKm  = Math.max(...days.map(d => d.km), 1);
  const maxBarH = 80;
  const avgKm  = weeklyRuns > 0 ? (weeklyKm / weeklyRuns).toFixed(1) : '0.0';

  const bars = days.map((d, i) => {
    const x      = 52 + i * 110;
    const barH   = d.km > 0 ? Math.max(12, Math.round((d.km / maxKm) * maxBarH)) : 0;
    const barY   = 185 - barH;
    const isRest = d.km === 0;
    const c0     = i % 2 === 0 ? '#7aa2f7' : '#bb9af7';
    const c1     = i % 2 === 0 ? '#3d59a1' : '#7c5cbf';

    if (isRest) {
      return `<rect x="${x}" y="181" width="70" height="4" rx="2" fill="#1e2030"/>
<text x="${x+35}" y="172" text-anchor="middle" font-size="10" fill="#484f58" font-family="Segoe UI,Arial">Rest</text>
<text x="${x+35}" y="200" text-anchor="middle" font-size="11" font-weight="bold" fill="#484f58" font-family="Segoe UI,Arial">${d.label}</text>
<text x="${x+35}" y="214" text-anchor="middle" font-size="9" fill="#484f58" font-family="Segoe UI,Arial">${d.date}</text>`;
    }
    return `<defs><linearGradient id="b${i}" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stop-color="${c0}"/>
<stop offset="100%" stop-color="${c1}" stop-opacity="0.8"/>
</linearGradient></defs>
<rect x="${x}" y="${barY}" width="70" height="${barH}" rx="5" fill="url(#b${i})"/>
<text x="${x+35}" y="${barY-18}" text-anchor="middle" font-size="9" fill="#8b949e" font-family="Segoe UI,Arial">km</text>
<text x="${x+35}" y="${barY-6}" text-anchor="middle" font-size="11" font-weight="bold" fill="${c0}" font-family="Segoe UI,Arial">${d.km.toFixed(1)}</text>
<text x="${x+35}" y="200" text-anchor="middle" font-size="11" font-weight="bold" fill="#c0caf5" font-family="Segoe UI,Arial">${d.label}</text>
<text x="${x+35}" y="214" text-anchor="middle" font-size="9" fill="#484f58" font-family="Segoe UI,Arial">${d.date}</text>
<rect x="${x+25}" y="220" width="20" height="4" rx="2" fill="${c0}" opacity="0.5"/>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="860" height="260" viewBox="0 0 860 260">
<defs>
  <linearGradient id="bg3" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#7aa2f7" stop-opacity="0.12"/>
    <stop offset="100%" stop-color="#1a1b27" stop-opacity="0"/>
  </linearGradient>
  <clipPath id="c3"><rect rx="10" width="860" height="260"/></clipPath>
</defs>
<rect rx="10" width="860" height="260" fill="#1a1b27" stroke="#7aa2f7" stroke-width="1.2" stroke-opacity="0.7"/>
<rect width="860" height="260" fill="url(#bg3)" clip-path="url(#c3)"/>
<circle cx="38" cy="36" r="22" fill="#7aa2f7" opacity="0.15" stroke="#7aa2f7" stroke-width="1"/>
<text x="38" y="42" text-anchor="middle" font-size="20" font-family="Segoe UI,Arial">📊</text>
<text x="70" y="28" font-size="17" font-weight="bold" fill="#7aa2f7" font-family="Segoe UI,Arial">Last 7 Days Report</text>
<text x="70" y="46" font-size="11" fill="#565f89" font-family="Segoe UI,Arial">Daily running breakdown · Updated every 24 hours</text>
<rect x="678" y="14" width="158" height="42" rx="8" fill="#e0af68" opacity="0.12" stroke="#e0af68" stroke-width="1" stroke-opacity="0.5"/>
<text x="757" y="30" text-anchor="middle" font-size="10" fill="#e0af68" font-family="Segoe UI,Arial">🔥 CURRENT STREAK</text>
<text x="757" y="48" text-anchor="middle" font-size="15" font-weight="bold" fill="#e0af68" font-family="Segoe UI,Arial">${streak} day${streak !== 1 ? 's' : ''}</text>
<line x1="24" y1="62" x2="836" y2="62" stroke="#7aa2f7" stroke-opacity="0.2" stroke-width="1"/>
<rect x="24"  y="68" width="220" height="30" rx="6" fill="#161b22" stroke="#7aa2f7" stroke-opacity="0.2" stroke-width="1"/>
<text x="42"  y="88" font-size="13" font-weight="bold" fill="#7aa2f7" font-family="Segoe UI,Arial">⚡ ${weeklyKm} km</text>
<text x="130" y="88" font-size="11" fill="#565f89" font-family="Segoe UI,Arial">this week</text>
<rect x="258" y="68" width="170" height="30" rx="6" fill="#161b22" stroke="#bb9af7" stroke-opacity="0.2" stroke-width="1"/>
<text x="276" y="88" font-size="13" font-weight="bold" fill="#bb9af7" font-family="Segoe UI,Arial">🏃 ${weeklyRuns} runs</text>
<rect x="442" y="68" width="200" height="30" rx="6" fill="#161b22" stroke="#9ece6a" stroke-opacity="0.2" stroke-width="1"/>
<text x="460" y="88" font-size="13" font-weight="bold" fill="#9ece6a" font-family="Segoe UI,Arial">📈 ${avgKm} km/run avg</text>
<line x1="40" y1="185" x2="820" y2="185" stroke="#7aa2f7" stroke-opacity="0.15" stroke-width="1"/>
${bars}
<text x="24"  y="250" font-size="9" fill="#484f58" font-family="Segoe UI,Arial">Auto-updated daily by GitHub Actions · strava.com/athletes/159259381</text>
<text x="836" y="250" text-anchor="end" font-size="9" fill="#7aa2f7" font-family="Segoe UI,Arial">Last 7 Days</text>
</svg>`;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  // 1. Get Strava access token
  const tokenData = await post('www.strava.com', '/api/v3/oauth/token', {
    client_id:     process.env.STRAVA_CLIENT_ID,
    client_secret: process.env.STRAVA_CLIENT_SECRET,
    refresh_token: process.env.STRAVA_REFRESH_TOKEN,
    grant_type:    'refresh_token',
  });
  const token = tokenData.access_token;
  if (!token) { console.error('❌ Token failed', tokenData); process.exit(1); }
  console.log('✅ Got Strava token');

  // 2. Fetch all-time stats
  const stats = await stravaGet('/api/v3/athletes/159259381/stats', token);
  const totalKm   = ((stats.all_run_totals?.distance  || 0) / 1000).toFixed(1);
  const totalRuns = stats.all_run_totals?.count || 0;
  const totalTime = stats.all_run_totals?.moving_time || 0;
  const totalHrs  = (totalTime / 3600).toFixed(1);
  const longestKm = ((stats.biggest_run_distance || 0) / 1000).toFixed(1);
  const ytdKm     = ((stats.ytd_run_totals?.distance  || 0) / 1000).toFixed(1);
  const ytdRuns   = stats.ytd_run_totals?.count || 0;
  const ytdTime   = stats.ytd_run_totals?.moving_time || 0;
  const ytdHrs    = (ytdTime / 3600).toFixed(1);
  const ytdElev   = Math.round(stats.ytd_run_totals?.elevation_gain || 0).toString();
  const avgSec    = ytdRuns > 0 ? (ytdTime / ytdRuns) / ((parseFloat(ytdKm) / ytdRuns) || 1) : 367;
  const avgMin    = Math.floor(avgSec / 60);
  const avgSecR   = Math.round(avgSec % 60).toString().padStart(2, '0');
  const avgPace   = `${avgMin}:${avgSecR}`;
  console.log(`Stats: ${totalKm}km total, ${ytdKm}km YTD, ${ytdRuns} runs, pace ${avgPace}`);

  // 3. Fetch last 7 days activities
  const after       = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
  const activities  = await stravaGet(`/api/v3/athlete/activities?after=${after}&per_page=50`, token);
  const runs        = Array.isArray(activities) ? activities.filter(a => a.type === 'Run' || a.sport_type === 'Run') : [];
  console.log('Recent runs (7d):', runs.length, runs.map(r => r.start_date_local?.slice(0,10) + ' ' + (r.distance/1000).toFixed(1)+'km').join(', '));

  // 4. Build 7-day breakdown
  const dayNames   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const acts    = runs.filter(a => a.start_date_local && a.start_date_local.startsWith(dateStr));
    const km      = acts.reduce((s, a) => s + a.distance / 1000, 0);
    days.push({ label: dayNames[d.getDay()], date: monthNames[d.getMonth()] + ' ' + String(d.getDate()).padStart(2,'0'), km: parseFloat(km.toFixed(2)) });
  }

  // 5. Calculate streak (consecutive days with a run, going back from today)
  const allTime = await stravaGet('/api/v3/athlete/activities?per_page=100', token);
  const allRuns = Array.isArray(allTime) ? allTime.filter(a => a.type === 'Run' || a.sport_type === 'Run') : [];
  let streak = 0;
  const today = new Date();
  for (let i = 0; i <= 90; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    if (allRuns.some(a => a.start_date_local?.startsWith(ds))) {
      streak++;
    } else if (i > 0) break;
  }

  const weeklyKm   = days.reduce((s, d) => s + d.km, 0).toFixed(1);
  const weeklyRuns = days.filter(d => d.km > 0).length;
  console.log(`7-day: ${weeklyKm}km, ${weeklyRuns} runs, streak: ${streak}`);

  // 6. Generate SVGs
  const svgTotal = makeCardTotal({ totalKm, totalRuns, totalHrs, longestKm });
  const svg2026  = makeCard2026({ ytdKm, ytdRuns, ytdHrs, avgPace, ytdElev });
  const svg7Days = makeCard7Days({ days, streak, weeklyKm, weeklyRuns });

  // 7. Push to GitHub
  const date = new Date().toISOString().slice(0, 10);
  await pushSvg('strava-card-total.svg', svgTotal, `chore: update Strava all-time card [${date}]`);
  await pushSvg('strava-card-2026.svg',  svg2026,  `chore: update Strava 2026 card [${date}]`);
  await pushSvg('strava-card-7days.svg', svg7Days,  `chore: update Strava 7-day report [${date}]`);
  console.log('✅ All done!');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
