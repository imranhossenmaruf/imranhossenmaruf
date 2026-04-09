const https = require('https');

// ── Helpers ──────────────────────────────────────────────────────────────────
function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, data: d }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function githubGet(path) {
  return request({
    hostname: 'api.github.com', path,
    headers: { 'Authorization': `token ${process.env.GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'strava-updater' }
  });
}

function githubPut(path, body) {
  const b = JSON.stringify(body);
  return request({
    hostname: 'api.github.com', path, method: 'PUT',
    headers: { 'Authorization': `token ${process.env.GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json', 'User-Agent': 'strava-updater', 'Content-Length': Buffer.byteLength(b) }
  }, b);
}

async function getFileSha(path) {
  const r = await githubGet(path);
  return r.data.sha && !r.data.message ? r.data.sha : null;
}

// ── Strava Token Refresh ──────────────────────────────────────────────────────
async function refreshToken() {
  const body = JSON.stringify({
    client_id: process.env.STRAVA_CLIENT_ID,
    client_secret: process.env.STRAVA_CLIENT_SECRET,
    refresh_token: process.env.STRAVA_REFRESH_TOKEN,
    grant_type: 'refresh_token'
  });
  const r = await request({
    hostname: 'www.strava.com', path: '/api/v3/oauth/token', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
  }, body);
  if (!r.data.access_token) throw new Error('Token refresh failed: ' + JSON.stringify(r.data));
  return r.data.access_token;
}

// ── Strava Stats Fetch ────────────────────────────────────────────────────────
async function fetchStats(token) {
  const r = await request({
    hostname: 'www.strava.com', path: '/api/v3/athletes/159259381/stats',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!r.data.all_run_totals) throw new Error('Stats fetch failed: ' + JSON.stringify(r.data));
  return r.data;
}

// ── Format helpers ────────────────────────────────────────────────────────────
function km(m) { return (m / 1000).toFixed(1); }
function hrs(s) { return (s / 3600).toFixed(1); }
function pace(totalMeters, totalSeconds) {
  if (!totalMeters || !totalSeconds) return 'N/A';
  const secPerKm = totalSeconds / (totalMeters / 1000);
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ── Generate SVG Cards ────────────────────────────────────────────────────────
function generateCardTotal(stats) {
  const all = stats.all_run_totals;
  const totalKm = km(all.distance);
  const totalHrs = hrs(all.elapsed_time);
  const totalRuns = all.count;
  const goalKm = 500;
  const pct = Math.min(100, (parseFloat(totalKm) / goalKm * 100)).toFixed(1);
  const barWidth = Math.round(455 * parseFloat(pct) / 100);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="495" height="215" viewBox="0 0 495 215">
  <defs>
    <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FC4C02" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#1a1b27" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="clip"><rect rx="8" width="495" height="215"/></clipPath>
  </defs>
  <rect rx="8" width="495" height="215" fill="#1a1b27" stroke="#FC4C02" stroke-width="1" stroke-opacity="0.6"/>
  <rect width="495" height="215" fill="url(#g1)" clip-path="url(#clip)"/>
  <circle cx="30" cy="32" r="14" fill="#FC4C02"/>
  <text x="30" y="37" text-anchor="middle" font-size="14" fill="white" font-family="Arial">🏃</text>
  <text x="52" y="26" font-size="15" font-weight="bold" fill="#FC4C02" font-family="Segoe UI,Arial">Strava Running Stats</text>
  <text x="52" y="42" font-size="11" fill="#6e7681" font-family="Segoe UI,Arial">All-time Performance</text>
  <line x1="20" y1="54" x2="475" y2="54" stroke="#FC4C02" stroke-opacity="0.3" stroke-width="1"/>
  <rect x="20" y="66" width="140" height="64" rx="6" fill="#161b22" stroke="#FC4C02" stroke-opacity="0.2" stroke-width="1"/>
  <text x="90" y="86" text-anchor="middle" font-size="10" fill="#8b949e" font-family="Segoe UI,Arial">Total Distance</text>
  <text x="90" y="110" text-anchor="middle" font-size="22" font-weight="bold" fill="#FC4C02" font-family="Segoe UI,Arial">${totalKm}</text>
  <text x="90" y="124" text-anchor="middle" font-size="10" fill="#8b949e" font-family="Segoe UI,Arial">km</text>
  <rect x="178" y="66" width="140" height="64" rx="6" fill="#161b22" stroke="#7aa2f7" stroke-opacity="0.2" stroke-width="1"/>
  <text x="248" y="86" text-anchor="middle" font-size="10" fill="#8b949e" font-family="Segoe UI,Arial">Total Runs</text>
  <text x="248" y="110" text-anchor="middle" font-size="22" font-weight="bold" fill="#7aa2f7" font-family="Segoe UI,Arial">${totalRuns}</text>
  <text x="248" y="124" text-anchor="middle" font-size="10" fill="#8b949e" font-family="Segoe UI,Arial">activities</text>
  <rect x="336" y="66" width="140" height="64" rx="6" fill="#161b22" stroke="#9ece6a" stroke-opacity="0.2" stroke-width="1"/>
  <text x="406" y="86" text-anchor="middle" font-size="10" fill="#8b949e" font-family="Segoe UI,Arial">Total Time</text>
  <text x="406" y="110" text-anchor="middle" font-size="22" font-weight="bold" fill="#9ece6a" font-family="Segoe UI,Arial">${totalHrs}</text>
  <text x="406" y="124" text-anchor="middle" font-size="10" fill="#8b949e" font-family="Segoe UI,Arial">hours</text>
  <text x="20" y="153" font-size="10" fill="#8b949e" font-family="Segoe UI,Arial">Distance goal progress (${goalKm} km)</text>
  <rect x="20" y="159" width="455" height="6" rx="3" fill="#161b22"/>
  <rect x="20" y="159" width="${barWidth}" height="6" rx="3" fill="#FC4C02"/>
  <text x="475" y="169" text-anchor="end" font-size="10" fill="#FC4C02" font-family="Segoe UI,Arial">${pct}%</text>
  <text x="20" y="195" font-size="9" fill="#484f58" font-family="Segoe UI,Arial">strava.com/athletes/159259381 · Auto-updated daily</text>
  <text x="475" y="195" text-anchor="end" font-size="9" fill="#FC4C02" font-family="Segoe UI,Arial" font-weight="bold">STRAVA</text>
</svg>`;
}

function generateCard2026(stats) {
  const ytd = stats.ytd_run_totals;
  const ytdKm = km(ytd.distance);
  const ytdHrs = hrs(ytd.elapsed_time);
  const ytdRuns = ytd.count;
  const ytdElev = Math.round(ytd.elevation_gain || 0);
  const avgPace = pace(ytd.distance, ytd.moving_time);
  const year = new Date().getFullYear();

  return `<svg xmlns="http://www.w3.org/2000/svg" width="495" height="215" viewBox="0 0 495 215">
  <defs>
    <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#bb9af7" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#1a1b27" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="clip2"><rect rx="8" width="495" height="215"/></clipPath>
  </defs>
  <rect rx="8" width="495" height="215" fill="#1a1b27" stroke="#bb9af7" stroke-width="1" stroke-opacity="0.6"/>
  <rect width="495" height="215" fill="url(#g2)" clip-path="url(#clip2)"/>
  <circle cx="30" cy="32" r="14" fill="#bb9af7"/>
  <text x="30" y="37" text-anchor="middle" font-size="14" fill="white" font-family="Arial">📅</text>
  <text x="52" y="26" font-size="15" font-weight="bold" fill="#bb9af7" font-family="Segoe UI,Arial">${year} Running Summary</text>
  <text x="52" y="42" font-size="11" fill="#6e7681" font-family="Segoe UI,Arial">January – Present · ${ytdHrs}h total</text>
  <line x1="20" y1="54" x2="475" y2="54" stroke="#bb9af7" stroke-opacity="0.3" stroke-width="1"/>
  <rect x="20" y="66" width="100" height="64" rx="6" fill="#161b22" stroke="#bb9af7" stroke-opacity="0.2" stroke-width="1"/>
  <text x="70" y="86" text-anchor="middle" font-size="9" fill="#8b949e" font-family="Segoe UI,Arial">Distance</text>
  <text x="70" y="107" text-anchor="middle" font-size="19" font-weight="bold" fill="#bb9af7" font-family="Segoe UI,Arial">${ytdKm}</text>
  <text x="70" y="122" text-anchor="middle" font-size="9" fill="#8b949e" font-family="Segoe UI,Arial">km</text>
  <rect x="132" y="66" width="100" height="64" rx="6" fill="#161b22" stroke="#7aa2f7" stroke-opacity="0.2" stroke-width="1"/>
  <text x="182" y="86" text-anchor="middle" font-size="9" fill="#8b949e" font-family="Segoe UI,Arial">Runs</text>
  <text x="182" y="107" text-anchor="middle" font-size="19" font-weight="bold" fill="#7aa2f7" font-family="Segoe UI,Arial">${ytdRuns}</text>
  <text x="182" y="122" text-anchor="middle" font-size="9" fill="#8b949e" font-family="Segoe UI,Arial">activities</text>
  <rect x="244" y="66" width="100" height="64" rx="6" fill="#161b22" stroke="#e0af68" stroke-opacity="0.2" stroke-width="1"/>
  <text x="294" y="86" text-anchor="middle" font-size="9" fill="#8b949e" font-family="Segoe UI,Arial">Avg Pace</text>
  <text x="294" y="104" text-anchor="middle" font-size="16" font-weight="bold" fill="#e0af68" font-family="Segoe UI,Arial">${avgPace}</text>
  <text x="294" y="122" text-anchor="middle" font-size="9" fill="#8b949e" font-family="Segoe UI,Arial">min/km</text>
  <rect x="356" y="66" width="120" height="64" rx="6" fill="#161b22" stroke="#9ece6a" stroke-opacity="0.2" stroke-width="1"/>
  <text x="416" y="86" text-anchor="middle" font-size="9" fill="#8b949e" font-family="Segoe UI,Arial">Elevation</text>
  <text x="416" y="107" text-anchor="middle" font-size="19" font-weight="bold" fill="#9ece6a" font-family="Segoe UI,Arial">${ytdElev}</text>
  <text x="416" y="122" text-anchor="middle" font-size="9" fill="#8b949e" font-family="Segoe UI,Arial">m gained</text>
  <text x="20" y="153" font-size="10" fill="#8b949e" font-family="Segoe UI,Arial">Weekly average: ${(parseFloat(ytdKm) / Math.max(1, ytdRuns / 4)).toFixed(1)} km/run · Running time this year: ${ytdHrs} hours</text>
  <rect x="20" y="160" width="18" height="12" rx="2" fill="#bb9af7" opacity="0.5"/>
  <rect x="42" y="157" width="18" height="15" rx="2" fill="#bb9af7" opacity="0.6"/>
  <rect x="64" y="162" width="18" height="10" rx="2" fill="#bb9af7" opacity="0.5"/>
  <rect x="86" y="155" width="18" height="17" rx="2" fill="#bb9af7" opacity="0.8"/>
  <rect x="108" y="160" width="18" height="12" rx="2" fill="#bb9af7" opacity="0.5"/>
  <rect x="130" y="153" width="18" height="19" rx="2" fill="#bb9af7"/>
  <rect x="152" y="158" width="18" height="14" rx="2" fill="#bb9af7" opacity="0.6"/>
  <rect x="174" y="161" width="18" height="11" rx="2" fill="#bb9af7" opacity="0.5"/>
  <rect x="196" y="156" width="18" height="16" rx="2" fill="#bb9af7" opacity="0.7"/>
  <rect x="218" y="163" width="18" height="9" rx="2" fill="#bb9af7" opacity="0.4"/>
  <rect x="240" y="159" width="18" height="13" rx="2" fill="#bb9af7" opacity="0.6"/>
  <rect x="262" y="154" width="18" height="18" rx="2" fill="#bb9af7" opacity="0.9"/>
  <text x="20" y="200" font-size="9" fill="#484f58" font-family="Segoe UI,Arial">strava.com/athletes/159259381 · Auto-updated daily</text>
  <text x="475" y="200" text-anchor="end" font-size="9" fill="#bb9af7" font-family="Segoe UI,Arial" font-weight="bold">${year}</text>
</svg>`;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🔄 Refreshing Strava token...');
  const token = await refreshToken();

  console.log('📊 Fetching athlete stats...');
  const stats = await fetchStats(token);

  const all = stats.all_run_totals;
  const ytd = stats.ytd_run_totals;
  console.log(`All-time: ${km(all.distance)} km, ${all.count} runs, ${hrs(all.elapsed_time)} hrs`);
  console.log(`YTD: ${km(ytd.distance)} km, ${ytd.count} runs, ${hrs(ytd.elapsed_time)} hrs, ${Math.round(ytd.elevation_gain || 0)}m elev`);

  // Generate SVG cards
  const svgTotal = generateCardTotal(stats);
  const svg2026 = generateCard2026(stats);
  const year = new Date().getFullYear();

  // Get SHAs
  const repo = '/repos/imranhossenmaruf/imranhossenmaruf/contents';
  const [shaSvgTotal, shaSvg2026, readmeData] = await Promise.all([
    getFileSha(`${repo}/strava-card-total.svg`),
    getFileSha(`${repo}/strava-card-2026.svg`),
    githubGet(`${repo}/README.md`),
  ]);

  // Push SVG cards
  const bodyTotal = { message: `chore: Update Strava all-time stats card [skip ci]`, content: Buffer.from(svgTotal).toString('base64') };
  if (shaSvgTotal) bodyTotal.sha = shaSvgTotal;
  await githubPut(`${repo}/strava-card-total.svg`, bodyTotal);
  console.log('✅ strava-card-total.svg updated');

  const body2026 = { message: `chore: Update Strava ${year} stats card [skip ci]`, content: Buffer.from(svg2026).toString('base64') };
  if (shaSvg2026) body2026.sha = shaSvg2026;
  await githubPut(`${repo}/strava-card-2026.svg`, body2026);
  console.log(`✅ strava-card-2026.svg updated`);

  // Update README section (between markers)
  const readmeContent = Buffer.from(readmeData.data.content, 'base64').toString('utf8');
  const marker_start = '<!--START_SECTION:strava-->';
  const marker_end = '<!--END_SECTION:strava-->';
  const newSection = `${marker_start}\n<p align="center">\n  <img width="49%" src="https://raw.githubusercontent.com/imranhossenmaruf/imranhossenmaruf/main/strava-card-total.svg" alt="Strava Total Stats" />\n  <img width="49%" src="https://raw.githubusercontent.com/imranhossenmaruf/imranhossenmaruf/main/strava-card-2026.svg" alt="Strava ${year} Stats" />\n</p>\n${marker_end}`;

  const start = readmeContent.indexOf(marker_start);
  const end = readmeContent.indexOf(marker_end) + marker_end.length;

  if (start === -1 || end === -1) {
    console.log('⚠️ Strava markers not found in README, skipping README update');
    return;
  }

  const newReadme = readmeContent.slice(0, start) + newSection + readmeContent.slice(end);
  await githubPut(`${repo}/README.md`, {
    message: `chore: Update Strava stats with real data [skip ci]`,
    content: Buffer.from(newReadme).toString('base64'),
    sha: readmeData.data.sha
  });
  console.log('✅ README.md updated with latest Strava data');
  console.log('\n🎉 All done!');
}

main().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
