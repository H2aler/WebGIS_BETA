// 간단한 백엔드 서버 (Express)
// 역할: 프론트엔드 대신 Wikimedia API를 호출해 CORS 없이 거리/위치 이미지를 제공

const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// 공통 JSON fetch 헬퍼
async function fetchJson(url, options = {}) {
  const resp = await fetch(url, options);
  if (!resp.ok) {
    throw new Error(`Request failed ${resp.status} for ${url}`);
  }
  return resp.json();
}

// Nominatim으로 위치 이름 가져오기
async function getLocationName(lat, lon) {
  const url =
    'https://nominatim.openstreetmap.org/reverse?' +
    `format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=0`;

  try {
    const data = await fetchJson(url, {
      headers: {
        'User-Agent': 'WebGIS-StreetView-Server/1.0',
      },
    });
    return data.display_name || '';
  } catch (e) {
    console.error('[getLocationName] 오류:', e);
    return '';
  }
}

// 위치 이름에서 주요 키워드 추출
function extractLocationKeywords(locationName) {
  if (!locationName) return [];
  const parts = locationName
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  const keywords = [];
  if (parts[0]) keywords.push(parts[0]); // 가장 구체적인 이름
  if (parts[1]) keywords.push(parts[1]); // 도시/지역

  // 너무 일반적인 국가/문자열 제거
  return keywords.filter((k) => k.length > 1);
}

// Wikimedia 텍스트 검색 (파일 네임스페이스)
async function searchWikimediaByText(query, limit = 6) {
  const encoded = encodeURIComponent(query);
  const searchUrl =
    'https://commons.wikimedia.org/w/api.php?' +
    `action=query&list=search&srsearch=${encoded}&srnamespace=6&srlimit=${limit}&format=json`;

  const searchData = await fetchJson(searchUrl);
  const pages = searchData?.query?.search || [];
  if (!pages.length) return [];

  const pageIds = pages.map((p) => p.pageid).join('|');
  const imageInfoUrl =
    'https://commons.wikimedia.org/w/api.php?' +
    `action=query&pageids=${pageIds}&prop=imageinfo&iiprop=url|thumburl&iiurlwidth=640&format=json`;

  const imageData = await fetchJson(imageInfoUrl);
  const result = [];
  const imagePages = imageData?.query?.pages || {};

  for (const id in imagePages) {
    const page = imagePages[id];
    if (!page.imageinfo || !page.imageinfo.length) continue;
    const info = page.imageinfo[0];
    result.push({
      url: info.thumburl || info.url,
      fullUrl: info.url,
      title: (page.title || '').replace(/^File:/, ''),
      description: '',
      lat: null,
      lon: null,
      distance: null,
    });
  }

  return result;
}

// Openverse 공개 이미지 검색 (거리/도시 사진 보강용, API 키 불필요)
async function searchOpenverseImages(query, limit = 8) {
  const encoded = encodeURIComponent(`${query} street city`);
  const url = `https://api.openverse.engineering/v1/images/?q=${encoded}&page_size=${limit}`;

  try {
    const data = await fetchJson(url);
    const results = data?.results || [];
    if (!Array.isArray(results) || !results.length) return [];

    return results
      .filter((item) => item.url || item.thumbnail)
      .map((item) => ({
        url: item.thumbnail || item.url,
        fullUrl: item.url || item.thumbnail,
        title: item.title || query,
        description: item.description || item.alt || '',
        lat: null,
        lon: null,
        distance: null,
        source: 'openverse',
      }));
  } catch (e) {
    console.error('[searchOpenverseImages] 오류:', e);
    return [];
  }
}

// CORS 허용 (개발용)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// 헬스체크
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Street View용 거리/위치 이미지 API
// 예: GET /api/street-images?lat=37.5&lon=126.9
app.get('/api/street-images', async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ error: '유효한 lat, lon 쿼리 파라미터가 필요합니다.' });
  }

  try {
    const results = [];

    // 1순위: 주변 지오태그 거리 사진 (좌표 기반, 가장 정확)
    try {
      const radius = 5000; // m
      const searchUrl =
        'https://commons.wikimedia.org/w/api.php?' +
        `action=query&list=geosearch&gscoord=${lat}|${lon}` +
        `&gsradius=${radius}&gslimit=20&format=json`;

      const searchData = await fetchJson(searchUrl);
      const geo = searchData?.query?.geosearch || [];

      if (geo.length) {
        const pageIds = geo.map((g) => g.pageid).join('|');
        const imageInfoUrl =
          'https://commons.wikimedia.org/w/api.php?' +
          `action=query&pageids=${pageIds}` +
          '&prop=imageinfo&iiprop=url|thumburl&iiurlwidth=640&format=json';

        const imageData = await fetchJson(imageInfoUrl);
        const pages = imageData?.query?.pages || {};

        for (const pageId in pages) {
          const page = pages[pageId];
          const geoItem = geo.find((g) => g.pageid === Number(pageId));
          if (!geoItem || !page.imageinfo || !page.imageinfo.length) continue;

          const info = page.imageinfo[0];
          results.push({
            url: info.thumburl || info.url,
            fullUrl: info.url,
            title: (page.title || '').replace(/^File:/, ''),
            description: '',
            lat: geoItem.lat,
            lon: geoItem.lon,
            distance: geoItem.dist || 0,
            source: 'wikimedia-geo',
          });
        }
      }
    } catch (e) {
      console.error('[street-images] 1순위(지오태그) 오류:', e);
    }

    // 2순위: 위치 이름 기반 텍스트 검색 (주소/지명 기준, 약간 덜 정확)
    try {
      const locationName = await getLocationName(lat, lon);
      const keywords = extractLocationKeywords(locationName);
      const textQueries = [];

      if (keywords[0]) {
        textQueries.push(`${keywords[0]} street`);
        textQueries.push(`${keywords[0]} road`);
      }
      if (keywords[1]) {
        textQueries.push(`${keywords[1]} street`);
      }

      for (const q of textQueries) {
        const textImages = await searchWikimediaByText(q, 4);
        textImages.forEach((img) => {
          // 중복 URL은 건너뛰기
          if (results.some((r) => r.fullUrl === img.fullUrl)) return;
          results.push({
            ...img,
            lat,
            lon,
            distance: null,
            source: 'wikimedia-text',
          });
        });
      }
    } catch (e) {
      console.error('[street-images] 2순위(텍스트 검색) 오류:', e);
    }

    // 3순위: Openverse 등 다른 공개 이미지 API (거리/도시 사진 보강)
    try {
      const locationName = await getLocationName(lat, lon);
      const keywords = extractLocationKeywords(locationName);
      const baseQuery = keywords[0] || locationName || '';

      if (baseQuery) {
        const extraImages = await searchOpenverseImages(baseQuery, 10);
        extraImages.forEach((img) => {
          if (results.some((r) => r.fullUrl === img.fullUrl)) return;
          // 좌표 정보는 없지만, 참고용으로 추가
          results.push({
            ...img,
            lat,
            lon,
            distance: null,
          });
        });
      }
    } catch (e) {
      console.error('[street-images] 3순위(Openverse) 오류:', e);
    }

    // 최종 결과 정렬: 거리 정보가 있는 것 우선, 그다음 나머지
    results.sort((a, b) => {
      const da = a.distance ?? Number.POSITIVE_INFINITY;
      const db = b.distance ?? Number.POSITIVE_INFINITY;
      return da - db;
    });

    // 디버그용 로그: 각 소스별 개수 확인
    const geoCount = results.filter((r) => r.source === 'wikimedia-geo').length;
    const textCount = results.filter((r) => r.source === 'wikimedia-text').length;
    const ovCount = results.filter((r) => r.source === 'openverse').length;
    console.log(
      `[street-images] lat=${lat.toFixed(6)}, lon=${lon.toFixed(6)} → total=${results.length}, ` +
      `geo=${geoCount}, text=${textCount}, openverse=${ovCount}`
    );

    res.json(results);
  } catch (err) {
    console.error('[/api/street-images] 오류:', err);
    res.status(500).json({ error: '이미지 검색 중 오류가 발생했습니다.' });
  }
});

app.get('/api/wayback-tile/:releaseId/:z/:x/:y', async (req, res) => {
  const { releaseId, z, x, y } = req.params;
  // Esri Wayback WMTS API - 올바른 URL 패턴
  // URL 형식: /arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/{releaseId}/{level}/{row}/{col}
  // {level} = z, {row} = y, {col} = x
  const url = `https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/${releaseId}/${z}/${y}/${x}`;

  console.log(`[Wayback Proxy] Fetching: ${url}`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`[Wayback Proxy] Failed (${response.status}): ${url}`);
      return res.status(response.status).send('Tile fetch failed');
    }

    const contentType = response.headers.get('content-type');
    const buffer = await response.arrayBuffer();

    res.setHeader('Content-Type', contentType || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24시간 캐싱
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('[wayback-proxy] 오류:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Google 위성 타일 프록시 (Walking Earth용)
app.get('/api/google-tile/:server/:layer/:z/:x/:y', async (req, res) => {
  const { server, layer, z, x, y } = req.params;
  // Google Maps 타일 URL 패턴
  // server: 0-3 (로드 밸런싱)
  // layer: s (위성), y (하이브리드), p (지형도), t (도로)
  const url = `https://mt${server}.google.com/vt/lyrs=${layer}&x=${x}&y=${y}&z=${z}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Referer': 'https://www.google.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      console.error(`[Google Tile Proxy] Failed (${response.status}): ${url}`);
      return res.status(response.status).send('Tile fetch failed');
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    const buffer = await response.arrayBuffer();

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24시간 캐싱
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('[google-tile-proxy] 오류:', error);
    res.status(500).send('Internal Server Error');
  }
});

// 3D 지형 타일 프록시 (Terrain elevation tiles)
app.get('/api/terrain-tile/:z/:x/:y', async (req, res) => {
  const { z, x, y } = req.params;
  const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`[Terrain Tile Proxy] Failed (${response.status}): ${url}`);
      return res.status(response.status).send('Tile fetch failed');
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    const buffer = await response.arrayBuffer();

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24시간 캐싱
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('[terrain-tile-proxy] 오류:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(PORT, () => {
  console.log(`✅ Street Images & Wayback Proxy 서버가 포트 ${PORT}에서 실행 중입니다.`);
});

