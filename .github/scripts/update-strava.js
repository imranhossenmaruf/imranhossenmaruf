const https = require('https');
const fs = require('fs');

const CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.STRAVA_REFRESH_TOKEN;

function post(path, body) {
  return new Promise((resolve, reject) => {
    const b = JSON.stringify(body);
    const req = https.request({ hostname: 'www.strava.com', path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b) } }, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } });
    });
    req.on('error', reject); req.write(b); req.end();
  });
}

function get(path, token) {
  return new Promise((resolve, reject) => {
    https.get({ hostname: 'www.strava.com', path, headers: { Authorization: 'Bearer ' + token } }, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } });
    }).on('error', reject);
  });
}

function badge(label, value, color) {
  const l = encodeURIComponent(label).replace(/%20/g, '%20');
  const v = encodeURIComponent(value).replace(/%20/g, '%20');
  return `https://img.shields.io/badge/${l}-${v}-${color}?style=flat-square&labelColor=1a1b27`;
}

async function main() {
  const tokenData = await post('/api/v3/oauth/token', {
    client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
    refresh_token: REFRESH_TOKEN, grant_type: 'refresh_token'
  });
  const accessToken = tokenData.access_token;
  const athlete = await get('/api/v3/athlete', accessToken);
  const stats = await get('/api/v3/athletes/' + athlete.id + '/stats', accessToken);

  const totalKm = ((stats.all_run_totals?.distance || 0) / 1000).toFixed(1);
  const ytdKm = ((stats.ytd_run_totals?.distance || 0) / 1000).toFixed(1);
  const totalRuns = stats.all_run_totals?.count || 0;
  const ytdRuns = stats.ytd_run_totals?.count || 0;
  const ytdElev = Math.round(stats.ytd_run_totals?.elevation_gain || 0);
  const allSecs = stats.all_run_totals?.moving_time || 0;
  const allHours = Math.floor(allSecs / 3600);
  const ytdSecs = stats.ytd_run_totals?.moving_time || 0;
  const ytdHours = (ytdSecs / 3600).toFixed(1);
  const ytdAvgPaceKm = ytdRuns > 0 ? (ytdSecs / 60 / (parseFloat(ytdKm) || 1)) : 0;
  const ytdAvgPaceMin = Math.floor(ytdAvgPaceKm);
  const ytdAvgPaceSec = Math.round((ytdAvgPaceKm - ytdAvgPaceMin) * 60);
  const paceStr = ytdRuns > 0 ? ytdAvgPaceMin + 'm ' + String(ytdAvgPaceSec).padStart(2,'0') + 's' : 'N/A';

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const year = new Date().getFullYear();

  const section = `<!--START_SECTION:strava-->
<p align="center">
  <img src="${badge('Total%20Distance', totalKm + '%20km', 'FC4C02')}" alt="Total Distance" height="24"/>
  <img src="${badge('Total%20Runs', totalRuns + '%20runs', 'FC4C02')}" alt="Total Runs" height="24"/>
  <img src="${badge('All%20Time', allHours + '%20hours', 'FC4C02')}" alt="All Time" height="24"/>
</p>
<p align="center">
  <img src="${badge(year + '%20Distance', ytdKm + '%20km', 'bb9af7')}" alt="YTD Distance" height="24"/>
  <img src="${badge(year + '%20Runs', ytdRuns + '%20runs', 'bb9af7')}" alt="YTD Runs" height="24"/>
  <img src="${badge(year + '%20Time', ytdHours + '%20hours', 'bb9af7')}" alt="YTD Time" height="24"/>
</p>
<p align="center">
  <img src="${badge('Avg%20Pace', paceStr.replace(/:/g, '%3A').replace(/ /g,'%20'), 'e0af68')}" alt="Avg Pace" height="24"/>
  <img src="${badge('Elevation%20' + year, ytdElev + '%20m', '9ece6a')}" alt="Elevation" height="24"/>
  <img src="${badge('View%20Profile', 'Strava', 'FC4C02')}&logo=strava&logoColor=white" alt="Strava" height="24"/>
</p>

<p align="right"><sub>🔄 Auto-updated: ${today}</sub></p>
<!--END_SECTION:strava-->`;

  let readme = fs.readFileSync('README.md', 'utf8');
  const start = '<!--START_SECTION:strava-->';
  const end = '<!--END_SECTION:strava-->';
  const si = readme.indexOf(start);
  const ei = readme.indexOf(end) + end.length;
  if (si !== -1 && ei > start.length) {
    readme = readme.slice(0, si) + section + readme.slice(ei);
  }
  fs.writeFileSync('README.md', readme);
  console.log('Updated! Total:', totalKm, 'km | YTD:', ytdKm, 'km');
}
main().catch(console.error);
