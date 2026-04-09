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
  const longestKm = ((stats.biggest_run_distance || 0) / 1000).toFixed(1);
  const ytdElev = Math.round(stats.ytd_run_totals?.elevation_gain || 0);
  const allSecs = stats.all_run_totals?.moving_time || 0;
  const allHours = Math.floor(allSecs / 3600);
  const ytdSecs = stats.ytd_run_totals?.moving_time || 0;
  const ytdHours = (ytdSecs / 3600).toFixed(1);
  const ytdAvgPaceKm = ytdRuns > 0 ? (ytdSecs / 60 / (parseFloat(ytdKm) || 1)).toFixed(2) : '0';
  const ytdAvgPaceMin = Math.floor(ytdAvgPaceKm);
  const ytdAvgPaceSec = Math.round((ytdAvgPaceKm - ytdAvgPaceMin) * 60);
  const paceStr = ytdRuns > 0 ? ytdAvgPaceMin + ':' + String(ytdAvgPaceSec).padStart(2,'0') + ' /km' : 'N/A';

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const stravaSection = `<!--START_SECTION:strava-->
| 🏃 Strava Running Stats | |
|---|---|
| 🗺️ **Total Distance** | **${totalKm} km** |
| 📅 **This Year** | ${ytdKm} km (${ytdRuns} runs) |
| 🔢 **Total Runs** | ${totalRuns} runs |
| ⛰️ **Elevation (2025)** | ${ytdElev} m |
| ⏱️ **Total Time** | ${allHours} hours |
| 🕐 **This Year Time** | ${ytdHours} hours |
| ⚡ **Avg Pace (2025)** | ${paceStr} |
| 🔗 **Profile** | [Imran on Strava](https://www.strava.com/athletes/159259381) |

*Last updated: ${today}*
<!--END_SECTION:strava-->`;

  let readme = fs.readFileSync('README.md', 'utf8');
  const startMarker = '<!--START_SECTION:strava-->';
  const endMarker = '<!--END_SECTION:strava-->';
  const startIdx = readme.indexOf(startMarker);
  const endIdx = readme.indexOf(endMarker) + endMarker.length;
  if (startIdx !== -1 && endIdx > startMarker.length) {
    readme = readme.slice(0, startIdx) + stravaSection + readme.slice(endIdx);
  } else {
    readme += '\n\n' + stravaSection;
  }
  fs.writeFileSync('README.md', readme, 'utf8');
  console.log('README updated! Total:', totalKm, 'km | YTD:', ytdKm, 'km');
}
main().catch(console.error);
