// Vercel Serverless Function - api/index.js
// Based on 6-1_start_good technology
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const express = require('express');
const app = express();

// 🚀 UTIC 자원 자동 프록시 (JS, CSS, 이미지 등 모든 상대 경로 요청을 UTIC로 중계)
app.use(['/js', '/css', '/images', '/map', '/jsp', '/common', '/img', '/include'], async (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) return next();
    const targetUrl = `https://www.utic.go.kr${req.originalUrl}`;
    try {
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.utic.go.kr/main/main.do'
            }
        });
        if (!response.ok) return next();
        const contentType = response.headers.get('content-type');
        const buffer = await response.arrayBuffer();
        res.setHeader('Content-Type', contentType);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        res.send(Buffer.from(buffer));
    } catch (e) {
        next();
    }
});

// 공통 JSON fetch 헬퍼
async function fetchJson(url, options = {}) {
    const resp = await fetch(url, options);
    if (!resp.ok) throw new Error(`Request failed ${resp.status} for ${url}`);
    return resp.json();
}

// Nominatim으로 위치 이름 가져오기
async function getLocationName(lat, lon) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=0`;
    try {
        const data = await fetchJson(url, { headers: { 'User-Agent': 'WebGIS-StreetView-Server/1.0' } });
        return data.display_name || '';
    } catch (e) { return ''; }
}

function extractLocationKeywords(locationName) {
    if (!locationName) return [];
    return locationName.split(',').map(p => p.trim()).filter(Boolean).slice(0, 2);
}

// API Routes
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/street-images', async (req, res) => {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return res.status(400).json({ error: 'Invalid coordinates' });
    // (Simplified for performance, keeping core logic)
    try {
        const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lon}&gsradius=5000&gslimit=10&format=json`;
        const searchData = await fetchJson(searchUrl);
        const geo = searchData?.query?.geosearch || [];
        res.json(geo.map(g => ({ title: g.title, lat: g.lat, lon: g.lon, distance: g.dist, source: 'wikimedia-geo' })));
    } catch (err) { res.status(500).json({ error: 'Search failed' }); }
});

app.get('/api/wayback-tile/:releaseId/:z/:x/:y', async (req, res) => {
    const { releaseId, z, x, y } = req.params;
    const url = `https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/${releaseId}/${z}/${y}/${x}`;
    try {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        res.setHeader('Content-Type', response.headers.get('content-type') || 'image/jpeg');
        res.send(Buffer.from(buffer));
    } catch (e) { res.status(500).send('Error'); }
});

app.get('/api/google-tile/:server/:layer/:z/:x/:y', async (req, res) => {
    const { server, layer, z, x, y } = req.params;
    const url = `https://mt${server}.google.com/vt/lyrs=${layer}&x=${x}&y=${y}&z=${z}`;
    try {
        const response = await fetch(url, { headers: { 'Referer': 'https://www.google.com/' } });
        const buffer = await response.arrayBuffer();
        res.setHeader('Content-Type', response.headers.get('content-type') || 'image/png');
        res.send(Buffer.from(buffer));
    } catch (e) { res.status(500).send('Error'); }
});

app.get('/api/cctv-proxy', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('URL required');
    try {
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.utic.go.kr/main/main.do'
            }
        });
        let html = await response.text();
        html = html.replace(/src=(['"])(https?:\/\/[^'"]+utic\.go\.kr\/[^'"]+)(['"])/gi, `src=$1/api/proxy?url=$2$3`);
        html = html.replace(/src=(['"])(['"])\s*\+\s*([^+'"]+)\s*\+\s*\2\s*\1/g, "src=$1$2/api/proxy?url=$2 + encodeURIComponent($3) + $2$1");

        // Injection: JSON.stringify()를 사용하여 한글/특수문자로 인한 SyntaxError 완전 방지
        const urlObj = new URL(targetUrl);
        const p = Object.fromEntries(urlObj.searchParams.entries());

        // cctvname은 이중 인코딩되어 있을 수 있으므로 안전하게 처리
        let cctvname = p.cctvname || '';
        try { cctvname = decodeURIComponent(cctvname); } catch (e) { }
        try { cctvname = decodeURIComponent(cctvname); } catch (e) { }

        // JSON.stringify()는 항상 유효한 JS 문자열을 생성함 (따옴표 포함)
        const cp = {
            cctvid: p.cctvid || '',
            cctvId: p.cctvid || '',
            cctvname: cctvname,
            kind: p.kind || '',
            cctvip: p.cctvip || '',
            cctvch: p.cctvch || '',
            cctvCh: p.cctvch || '',
            id: p.id || p.uid || '',
            uid: p.id || p.uid || ''
        };

        const inject = `<script>(function(){
  var cp = ${JSON.stringify(cp)};
  Object.assign(window, cp);
  window.getQueryString = window.getParameterByName = function(n) {
    return cp[n] || cp[n.toLowerCase()] || '';
  };
})();</script>`;

        html = html.replace('<head>', '<head>' + inject).replace(/<video/gi, '<video crossorigin="anonymous"');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
    } catch (e) { res.status(500).send('Error: ' + e.message); }
});

app.get('/api/proxy', async (req, res) => {
    const targetUrl = req.query.url;
    try {
        const response = await fetch(targetUrl);
        const buffer = await response.arrayBuffer();
        res.setHeader('Content-Type', response.headers.get('content-type'));
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.send(Buffer.from(buffer));
    } catch (e) { res.status(500).send('Error'); }
});

module.exports = app;
