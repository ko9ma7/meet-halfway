# MeetHalfway

**MeetHalfway**는 여러 참석자의 출발 위치를 하나의 공유 링크로 모은 뒤, 마감 시점에 **기하학적 중앙값(geometric median)** 기반의 균형 중간지점과 주변 식당 밀집 후보를 보여주는 GitHub Pages용 웹서비스입니다.
일명 !! " 어! 중가""
![MeetHalfway Social Preview](./repository-social-preview.png)

## Preview

생성자는 모임 이름, 자신의 이름, 출발 위치, 입력 마감을 정해 링크를 만듭니다. 참석자는 같은 링크에서 이름과 출발 위치를 추가합니다. 마감 후에는 지도에 참석자 출발점, 중간지점, 식당, 추천 후보 지역이 함께 표시됩니다.

Supabase가 연결되지 않은 상태에서는 같은 브라우저에서 전체 흐름을 확인할 수 있는 LocalStorage 데모 모드로 동작합니다.

## Features

- 링크 기반 모임 생성/참여
- 이름 + 주소/장소 검색 및 위치 저장
- 생성자 조기 마감, 시간 자동 마감
- 기하학적 중앙값 기반 중간지점 계산
- Kakao Maps 기본 지원: 지도 + 주소/장소 검색 + 주변 음식점 검색
- OpenStreetMap 및 Google Maps 공급자 교체 지원
- 식당 밀집도 + 중심 근접도 + 참가자 거리 균형으로 후보 지역 최대 3곳 추천
- 한국어 / English / 日本語 / 中文
- Aurora / Ocean / Forest / Sunset 컬러 스타일
- Light / Dark / System 테마
- 반응형 UI, Toast, Dialog, Loading/Empty/Error 상태
- favicon, PWA manifest, OG/Twitter metadata, 404, robots.txt, sitemap.xml
- GitHub Actions Pages 자동 배포
- Windows `github-bootstrap.cmd` 원클릭 Repository/Pages/Release 설정

## Tech Stack

- HTML5 / CSS3 / Vanilla JavaScript ES Modules
- Node.js built-in build/check scripts
- Kakao Maps JavaScript API (`services` library)
- Optional Leaflet + OpenStreetMap / Nominatim / Overpass
- Optional Google Maps / Geocoding / Places
- Supabase REST RPC for shared persistence
- GitHub Pages + GitHub Actions

## Architecture

```text
GitHub Pages
├─ MeetHalfway UI
├─ Map Provider Adapter
│  ├─ Kakao Maps (default)
│  ├─ OpenStreetMap
│  └─ Google Maps
├─ Address / Places Adapter
└─ Repository Adapter
   ├─ Supabase RPC  → multi-user shared links
   └─ LocalStorage  → local demo mode
```

GitHub Pages는 정적 호스팅이므로 여러 브라우저가 같은 링크에 쓰는 데이터를 자체 저장할 수 없습니다. 실제 공동 입력만 Supabase RPC를 사용하고, 화면/계산/지도는 정적 프론트엔드에서 동작합니다.

## Project Structure

```text
/
├─ .github/workflows/deploy.yml
├─ public/
├─ scripts/
├─ src/
│  ├─ i18n.js
│  ├─ config.js
│  ├─ main.js
│  ├─ styles.css
│  └─ lib/
│     ├─ kakaoMaps.js
│     ├─ googleMaps.js
│     ├─ map.js
│     ├─ geocoding.js
│     ├─ places.js
│     ├─ geo.js
│     └─ repository modules...
├─ supabase/schema.sql
├─ ADMIN_SETUP.md
├─ GITHUB_PAGES.md
├─ .env.example
├─ github-bootstrap.cmd
├─ repository-social-preview.png
└─ index.html
```

## Quick Start

현재 전달 패키지의 로컬 `.env`에는 요청한 Kakao JavaScript 지도 키가 설정되어 있습니다. `.env`는 `.gitignore` 대상이라 원본 Repository에는 자동 커밋되지 않습니다.

```bash
npm run check
npm run dev
```

브라우저에서:

```text
http://localhost:5173/
```

## Kakao Maps Setup

`.env`의 핵심 설정:

```env
MAP_PROVIDER=kakao
KAKAO_MAPS_JAVASCRIPT_KEY=YOUR_KAKAO_JAVASCRIPT_KEY
```

Kakao Developers에서 해당 앱의 **JavaScript SDK 도메인**에 실제 웹사이트 origin을 등록해야 합니다.

개발 환경 예:

```text
http://localhost:5173
```

GitHub Pages 예:

```text
https://USERNAME.github.io
```

프로젝트 주소가 `https://USERNAME.github.io/meet-halfway/`여도 SDK 도메인은 origin 기준으로 등록합니다.

## Supabase Setup

실제 다중 사용자 공유를 켜려면:

1. Supabase 프로젝트 생성
2. SQL Editor에서 [`supabase/schema.sql`](./supabase/schema.sql) 전체 실행
3. `.env` 입력

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=YOUR_ANON_PUBLIC_KEY
```

`service_role` key는 넣지 않습니다.

## Languages & Styles

지원 언어:

```text
Auto / 한국어 / English / 日本語 / 中文
```

지원 스타일:

```text
Aurora / Ocean / Forest / Sunset
```

테마:

```text
System / Light / Dark
```

사용자 선택은 LocalStorage에 저장됩니다. 기본값은 `.env`의 `DEFAULT_LANGUAGE`, `DEFAULT_STYLE`로 지정할 수 있습니다.

## Meeting Algorithm

### Balanced midpoint

단순 위·경도 평균이 아니라 Weiszfeld 방식의 기하학적 중앙값을 계산합니다. 멀리 떨어진 한 참가자가 결과를 과도하게 끌어당기는 현상을 줄이기 위한 선택입니다.

### Candidate areas

주변 음식점 위치를 격자로 집계하고 다음 요소를 합성합니다.

- 식당 밀집도 50%
- 중간지점 근접도 35%
- 참가자 거리 편차 15%

현재 이동 공정성은 직선거리 기준입니다. 실제 대중교통 시간 기반으로 확장하려면 별도 Directions/Route API 결과를 `src/lib/geo.js`의 평가 입력으로 연결합니다.

## Configuration

| Variable | 기본값 | 설명 |
|---|---:|---|
| `MAP_PROVIDER` | `kakao` | `kakao`, `osm`, `google` |
| `KAKAO_MAPS_JAVASCRIPT_KEY` | - | Kakao JavaScript Key |
| `GOOGLE_MAPS_API_KEY` | - | Google 모드 사용 시 |
| `SUPABASE_URL` | - | 공유 저장소 Project URL |
| `SUPABASE_ANON_KEY` | - | 브라우저용 anon/public key |
| `PUBLIC_SITE_URL` | placeholder | canonical/OG/sitemap URL |
| `GEOCODING_COUNTRY_CODES` | `kr` | OSM geocoding 국가 제한 |
| `OVERPASS_RADIUS_METERS` | `2500` | 식당 탐색 반경 |
| `DEFAULT_LANGUAGE` | `auto` | 기본 언어 |
| `DEFAULT_STYLE` | `aurora` | 기본 스타일 |

## Build

```bash
npm ci
npm run check
npm run build
npm run preview
```

빌드 결과는 `dist/`에 생성됩니다.

## GitHub Pages Deployment

### Windows one-click

1. 다운로드한 ZIP 안에서 CMD를 바로 실행하지 마세요. 먼저 **압축 풀기 / Extract All**로 전체 파일을 폴더에 풉니다.
2. 압축을 푼 `meet-halfway` 폴더에서 `github-bootstrap.cmd`를 더블클릭합니다.
3. Windows가 다운로드 파일을 차단하면 ZIP 파일을 우클릭 → **속성(Properties)** → **차단 해제(Unblock)** → 적용 후 다시 압축을 풉니다.

```cmd
github-bootstrap.cmd
```

`github-bootstrap.cmd`는 Windows 호환 ASCII/CRLF 런처이며, 실제 배포 로직은 `scripts/github-bootstrap.ps1`에서 실행됩니다. 런처는 가능한 범위에서 다운로드 차단 표시(Mark-of-the-Web)도 해제합니다.

스크립트는 `.env`를 읽고 다음을 수행합니다.

```text
도구/로그인 확인
→ Build 검증
→ Repository meet-halfway 생성 또는 재사용
→ About Description / Homepage / Topics 설정
→ Issues ON, Wiki/Projects OFF
→ Actions Variables 등록
→ Commit / Push
→ GitHub Pages Actions 활성화
→ Deploy workflow 확인
→ v1.0.0 Tag / Release 생성
```

자세한 내용: [`GITHUB_PAGES.md`](./GITHUB_PAGES.md)

관리자 설정: [`ADMIN_SETUP.md`](./ADMIN_SETUP.md)

## Recommended GitHub Repository Metadata

```text
Name: meet-halfway
Description: MeetHalfway - shared meeting links that calculate a balanced midpoint and nearby restaurant areas
Homepage: https://USERNAME.github.io/meet-halfway/
Topics: github-pages, javascript, kakao-map, supabase, meeting-planner, multilingual, openstreetmap
Initial tag: v1.0.0
Initial commit: feat: launch MeetHalfway
```

Repository Settings → General → Social preview에서 `repository-social-preview.png`를 업로드합니다.

## Privacy & Security

출발 위치는 공유 링크를 아는 사람에게 표시될 수 있습니다. 정확한 집 주소보다 역/건물/랜드마크를 권장합니다.

Kakao JavaScript Key와 Supabase anon key는 브라우저에서 사용하는 공개 런타임 키입니다. 따라서 데이터 보호는 키 은닉이 아니라 **허용 도메인 제한, Supabase RLS/RPC 권한 설계**로 수행합니다. 강한 권한을 가진 `service_role`, Private Key, 비밀번호는 절대 프론트엔드에 넣지 않습니다.

## Custom Domain

GitHub Pages의 Custom domain과 DNS를 설정한 뒤 Enforce HTTPS를 활성화하고 `PUBLIC_SITE_URL`을 변경합니다. 필요하면 `public/CNAME`을 추가합니다. Kakao Developers의 JavaScript SDK 도메인에도 새 도메인을 추가해야 합니다.

## License

MIT License — [`LICENSE`](./LICENSE)


## Bootstrap repository-not-found behavior

On a first deployment, `ko9ma7/meet-halfway` (or your own `<owner>/meet-halfway`) does not exist yet. The bootstrap script treats that `404 / repository not found` response as an expected probe result and creates the repository automatically. Older package revisions could stop at this probe because Windows PowerShell promoted GitHub CLI stderr to a terminating error. The current script handles probe failures explicitly.
