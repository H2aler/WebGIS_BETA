// Vercel Serverless Function - api/index.js
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const express = require('express');
const app = express();

// CORS 허용
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});

// 🚀 UTIC 자원 자동 프록시 (JS, CSS, 이미지 등 UTIC 자원을 중계)
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
    } catch (e) { next(); }
});

// 공통 JSON fetch 헬퍼
async function fetchJson(url, options = {}) {
    const resp = await fetch(url, options);
    if (!resp.ok) throw new Error(`Request failed ${resp.status}`);
    return resp.json();
}

// ── API Routes ──────────────────────────────────────────────────

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/street-images', async (req, res) => {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon))
        return res.status(400).json({ error: 'Invalid coordinates' });
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

// 🚀 CCTV 전용 프록시 (SyntaxError 완전 방지 버전)
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

        // ─ [핵심 수정] ─
        // <script> 블록을 먼저 추출하여 플레이스홀더로 교체 → src 교체 적용 → 복원
        // 이렇게 하면 JS 코드 내부의 문자열에는 절대 손대지 않아 SyntaxError 방지
        const scriptBlocks = [];
        html = html.replace(/<script[\s\S]*?<\/script>/gi, (match) => {
            scriptBlocks.push(match);
            return `<!--SCRIPT_BLOCK_${scriptBlocks.length - 1}-->`;
        });

        // HTML 속성 내 src만 교체 (JS 코드가 없으므로 안전)
        html = html.replace(/src=(['"])(https?:\/\/[^'"]*utic\.go\.kr[^'"]+)(['"])/gi,
            `src=$1/api/proxy?url=$2$3`);

        // 스크립트 블록 복원
        html = html.replace(/<!--SCRIPT_BLOCK_(\d+)-->/g,
            (_, i) => scriptBlocks[parseInt(i)]);

        // ─ 파라미터 주입 (JSON.stringify로 한글/특수문자 완전 이스케이프) ─
        const urlObj = new URL(targetUrl);
        const p = Object.fromEntries(urlObj.searchParams.entries());

        let cctvname = p.cctvname || '';
        try { cctvname = decodeURIComponent(cctvname); } catch (e) { }
        try { cctvname = decodeURIComponent(cctvname); } catch (e) { }

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

        html = html.replace('<head>', '<head>' + inject)
            .replace(/<video/gi, '<video crossorigin="anonymous"');

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
    } catch (e) {
        res.status(500).send('CCTV Proxy Error: ' + e.message);
    }
});

// 🔗 범용 리소스 프록시
app.get('/api/proxy', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('URL required');
    try {
        const response = await fetch(targetUrl);
        const buffer = await response.arrayBuffer();
        res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.send(Buffer.from(buffer));
    } catch (e) { res.status(500).send('Proxy Error: ' + e.message); }
});

module.exports = app;
