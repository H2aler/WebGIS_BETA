# 🌍 WebGIS - 지능형 공간정보 및 C-ITS 통합 서비스 플랫폼

![WebGIS Main Banner](https://img.shields.io/badge/WebGIS-Advanced_System-blue?style=for-the-badge&logo=openlayers)
![Tech Stack](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript)
![Framework](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite)
![Mobile](https://img.shields.io/badge/Capacitor-Android-119EFF?style=for-the-badge&logo=capacitor)

**WebGIS**는 OpenLayers와 MapLibre GL 기술을 결합하여 2D 지도의 정밀함과 3D 지도의 시각적 경험을 동시에 제공하는 고성능 웹 지도 플랫폼입니다. 단순한 지도 보기를 넘어 실시간 교통 정보(C-ITS), 지능형 측정 도구, AI 기반 위치 분석 등 전문적인 GIS 기능을 누구나 쉽게 사용할 수 있도록 설계되었습니다.

---

## 🚀 주요 혁신 기능

### 1. 🚥 차세대 지능형 교통 시스템 (C-ITS)
- **전국 실시간 CCTV**: 전국 주요 도로의 CCTV 위치를 지도상에 시각화하고, 클릭 시 실시간 스트리밍 영상을 즉시 확인할 수 있습니다. (UTIC/ITS 연동)
- **C-ITS 프리미엄 레이어**: 교통 흐름과 안전 정보를 한눈에 파악할 수 있는 전용 지도 스타일을 제공합니다.

### 2. 🏙️ 2D/3D 하이브리드 엔진
- **심리스 모드 전환**: OpenLayers(2D)와 MapLibre GL(3D) 간의 자유로운 전환이 가능합니다.
- **3D 지형 및 건물**: 3D 모드에서 실제 지형의 높낮이와 건물의 입체감을 실감 나게 구현합니다.
- **다양한 레이어**: OSM, 위성, 하이브리드, 지형도, Google Street View 선 표시 등 10종 이상의 레이어를 지원합니다.

### 3. 📏 전문가용 스마트 측정 도구
- **지오데식(Geodesic) 계산**: 단순 평면 거리가 아닌 지구의 곡률을 반영한 정밀 거리/면적 계산을 수행합니다.
- **구간별 측정 배지**: 측정 중 각 구간의 거리와 방위각을 실시간으로 표시하여 분석 효율을 높입니다.
- **스마트 멀티 라우팅**: 검색 결과 간의 경로를 자동으로 연결하고 총 거리를 계산하는 지능형 경로 측정 기능을 제공합니다.

### 4. 🤖 AI 기반 위치 지능 (GeoSpy Style)
- **이미지 위치 추정**: 사진 업로드 시 GPS 메타데이터(Exif) 추출뿐만 아니라, AI 시각 분석(Landmark 인식, OCR 텍스트 추출)을 통해 사진이 촬영된 장소를 정밀하게 추정합니다.
- **위치 기반 콘텐츠**: 지도를 클릭하면 해당 위치 주변의 실제 사진과 관련 뉴스를 실시간으로 큐레이션하여 보여줍니다.

### 5. ⏳ 시계열 위성 분석 (Wayback)
- **과거 위성 지도**: Esri Wayback 데이터를 활용하여 2014년부터 현재까지의 연도별 위성 변화를 타임라인으로 탐색할 수 있습니다. 도시 개발이나 지형 변화 분석에 최적화되어 있습니다.

### 6. 📱 크로스 플랫폼 지원
- **반응형 웹 UI**: 데스크탑부터 스마트폰까지 최적화된 레이아웃을 제공합니다.
- **Android 전용 앱**: Capacitor를 통해 Android 앱으로 빌드되어 태블릿과 모바일 기기에서 네이티브 경험을 제공합니다.

---

## 🛠️ 기술 스택

### Frontend
- **Core**: HTML5, CSS3, JavaScript (ES6+, Vanilla JS)
- **Map Engines**: [OpenLayers](https://openlayers.org/), [MapLibre GL JS](https://maplibre.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **AI Libraries**: TensorFlow.js (Object Detection), Tesseract.js (OCR), Exif.js

### Backend (Proxy Server)
- **Runtime**: Node.js, Express
- **Function**: CORS 이슈 해결을 위한 위성 타일 및 API 프록시 처리
- **APIs**: Nominatim (Search), OSRM (Routing), Wikipedia/Wikimedia (Images)

### Mobile
- **Cross-platform**: [Capacitor JS](https://capacitorjs.com/)
- **Target OS**: Android

---

## 📂 프로젝트 구조

```text
Upgrade_WebGIS/
├── android/             # Android 네이티브 소스 (Capacitor)
├── server/              # Node.js 백엔드 프록시 서버
├── index.html           # 메인 UI 구조
├── main.js              # 지도 엔진 및 핵심 비즈니스 로직
├── styles.css           # 프리미엄 디자인 시스템
├── vite.config.js       # Vite 빌드 설정
└── package.json         # 의존성 및 스크립트 관리
```

---

## ⚙️ 실행 방법

### 1. 환경 준비
최신 버전의 [Node.js](https://nodejs.org/)가 설치되어 있어야 합니다.

### 2. 설치 및 로컬 실행
```bash
# 저장소 클론
git clone https://github.com/H2aler/WebGIS_BETA.git
cd WebGIS_BETA

# 의존성 설치
npm install

# 개발 서버 및 백엔드 실행
npm run dev      # 프론트엔드 (http://localhost:5173)
npm run server   # 백엔드 프록시 (http://localhost:3000)
```

### 3. 모바일 빌드 (선택 사항)
```bash
# 웹 빌드
npm run build

# Android 프로젝트 동기화
npx cap sync

# Android Studio에서 열기
npx cap open android
```

---

## ⚖️ Copyright & License

> [!IMPORTANT]
> **본 프로젝트의 모든 권한은 개발자(H2aler)에게 독점적으로 귀속됩니다.**

- **소유권**: 본 소프트웨어와 관련된 모든 코드, 디자인, 지능형 로직 및 데이터 처리 방식에 대한 지식재산권은 **H2aler**의 소유입니다.
- **제한 사항**: 저작권자의 명시적인 서면 허가 없이는 본 프로젝트의 전체 또는 일부를 상업적 목적으로 무단 전재, 복제, 배포하거나 2차 저작물을 작성할 수 없습니다.
- **오픈소스 활용**: 본 프로젝트는 교육 및 포트폴리오 열람용으로 공개되어 있으나, 이를 기반으로 한 서비스 배포나 상업적 이용은 법적 제재를 받을 수 있습니다.

상세한 내용은 [LICENSE](file:///c:/Users/USER/Documents/0Upgrade_WebGIS/LICENSE) 파일을 참조하시기 바랍니다.

---
**Author**: [H2aler](https://github.com/H2aler)  
**Email**: max30105@gmail.com


---
> 본 프로젝트는 **WebGIS**의 새로운 표준을 제시하며, 지속적인 업데이트를 통해 더욱 정교한 공간정보 기술을 구현해 나갑니다.
