# MeetHalfway

**MeetHalfway**는 여러 참석자의 출발 위치를 하나의 공유 링크로 모은 뒤, 마감 시점에 **기하학적 중앙값(geometric median)** 을 기준점으로 삼고, 실제 음식점·카페 밀집 상권을 다시 탐색한 추천 지역 1~3위를 보여주는 GitHub Pages용 웹서비스입니다.

![MeetHalfway Social Preview](./repository-social-preview.png)

## Preview

생성자는 모임 이름, 자신의 이름, 출발 위치, 입력 마감을 정해 링크를 만듭니다. 참석자는 같은 링크에서 이름과 출발 위치를 추가합니다. 마감 후에는 수학적 중간점을 그대로 목적지로 쓰지 않고 주변 상권을 탐색해 추천 1·2·3 지역을 제시합니다. 추천 지역을 선택하면 지도가 해당 상권으로 확대되고 음식점·카페·간편식 등을 카테고리별로 볼 수 있습니다.

Supabase가 연결되지 않은 상태에서는 같은 브라우저에서 전체 흐름을 확인할 수 있는 LocalStorage 데모 모드로 동작합니다.

## Features

- 링크 기반 모임 생성/참여
- 이름 + 주소/장소 검색 및 위치 저장
- 생성자 조기 마감, 시간 자동 마감
- 기하학적 중앙값 기반 중간지점 계산
- Kakao Maps 기본 지원: 지도 + 주소/장소 검색 + 주변 음식점 검색
- OpenStreetMap 및 Google Maps 공급자 교체 지원
- 넓은 반경의 음식점·카페 데이터를 탐색해 실제 상권 중심 후보 3곳 추천
- 추천 지역 선택 시 지도 자동 확대 및 장소 마커 표시
- 음식점 / 카페 / 간편식·주점 카테고리 필터와 장소 리스트
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

현재 전달 패키지에는 Kakao JavaScript 지도 설정, Supabase Project URL, Supabase Publishable key, GitHub Pages 주소가 모두 채워져 있습니다. `.env`는 로컬 편의를 위해 포함되지만 Git에서는 제외되며, 브라우저에 공개되어도 되는 값은 `scripts/public-defaults.mjs`에도 들어 있어 GitHub Actions Variables가 비어 있어도 정상 빌드됩니다.

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
KAKAO_MAPS_JAVASCRIPT_KEY=(configured in this package)
```

Kakao Developers에서 해당 앱의 **JavaScript SDK 도메인**에 실제 웹사이트 origin을 등록해야 합니다.

개발 환경 예:

```text
http://localhost:5173
```

GitHub Pages 예:

```text
https://ko9ma7.github.io
```

프로젝트 주소가 `https://ko9ma7.github.io/meet-halfway/`여도 SDK 도메인은 origin 기준으로 등록합니다.

## Supabase Setup

실제 다중 사용자 공유를 켜려면:

1. Supabase 프로젝트 생성
2. SQL Editor에서 [`supabase/schema.sql`](./supabase/schema.sql) 전체 실행
3. `.env`에 Project URL과 Publishable key 입력

```env
SUPABASE_URL=(configured in this package)
SUPABASE_PUBLISHABLE_KEY=(configured browser publishable key)
```

현재 배포 패키지에는 Project URL과 Publishable key가 모두 설정되어 있습니다. `service_role`/`sb_secret_...` 키는 넣지 않습니다.

`supabase/schema.sql`은 프로젝트마다 최초 1회 SQL Editor에서 실행해야 합니다. `github-bootstrap.cmd`가 RPC 존재 여부를 검사하고, 미설치 상태이면 SQL을 Windows 클립보드에 복사한 뒤 해당 Supabase 프로젝트의 SQL Editor를 자동으로 엽니다. SQL을 실행하고 CMD로 돌아와 Enter를 누르면 재검사 후 배포를 계속합니다.

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

## Public configuration and security

Kakao JavaScript key, Supabase Project URL, Supabase Publishable key는 브라우저용 공개 설정입니다. 사용자가 개발자도구에서 확인할 수 있으므로 이 값 자체를 비밀로 간주하지 않습니다. 대신 Supabase 테이블 직접 접근을 막고 SECURITY DEFINER RPC만 허용하며, 관리/참가 토큰은 해시로 저장합니다. `sb_secret_...`, `service_role`, 데이터베이스 비밀번호, GitHub PAT 같은 비밀값은 절대로 이 프로젝트의 클라이언트 설정에 넣지 마세요.

자세한 내용은 [`SECURITY.md`](./SECURITY.md)를 참고하세요.

## Configuration

| Variable | 기본값 | 설명 |
|---|---:|---|
| `MAP_PROVIDER` | `kakao` | `kakao`, `osm`, `google` |
| `KAKAO_MAPS_JAVASCRIPT_KEY` | configured | Kakao JavaScript Key |
| `GOOGLE_MAPS_API_KEY` | - | Google 모드 사용 시 |
| `SUPABASE_URL` | configured | 공유 저장소 Project URL |
| `SUPABASE_PUBLISHABLE_KEY` | configured | 브라우저용 Publishable key (`sb_publishable_...`) |
| `SUPABASE_ANON_KEY` | - | 구형 프로젝트 호환용 legacy anon key (선택) |
| `PUBLIC_SITE_URL` | `https://ko9ma7.github.io/meet-halfway` | canonical/OG/sitemap URL |
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

스크립트는 이미 채워진 공개 런타임 설정을 읽고 다음을 수행합니다.

```text
Supabase RPC 검사(미설치 시 SQL Editor 보조)
→ 도구/로그인 확인
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
Homepage: https://ko9ma7.github.io/meet-halfway/
Topics: github-pages, javascript, kakao-map, supabase, meeting-planner, multilingual, openstreetmap
Initial tag: v1.0.0
Initial commit: feat: launch MeetHalfway
```

Repository Settings → General → Social preview에서 `repository-social-preview.png`를 업로드합니다.

## Privacy & Security

출발 위치는 공유 링크를 아는 사람에게 표시될 수 있습니다. 정확한 집 주소보다 역/건물/랜드마크를 권장합니다.

Kakao JavaScript Key와 Supabase Publishable key는 브라우저에서 사용하는 공개 런타임 키입니다. 따라서 데이터 보호는 키 은닉이 아니라 **허용 도메인 제한, Supabase RLS/RPC 권한 설계**로 수행합니다. 강한 권한을 가진 `service_role`, Private Key, 비밀번호는 절대 프론트엔드에 넣지 않습니다.

## Custom Domain

GitHub Pages의 Custom domain과 DNS를 설정한 뒤 Enforce HTTPS를 활성화하고 `PUBLIC_SITE_URL`을 변경합니다. 필요하면 `public/CNAME`을 추가합니다. Kakao Developers의 JavaScript SDK 도메인에도 새 도메인을 추가해야 합니다.

## License

MIT License — [`LICENSE`](./LICENSE)


## Bootstrap repository-not-found behavior

On a first deployment, `ko9ma7/meet-halfway` (or your own `<owner>/meet-halfway`) does not exist yet. The bootstrap script treats that `404 / repository not found` response as an expected probe result and creates the repository automatically. Older package revisions could stop at this probe because Windows PowerShell promoted GitHub CLI stderr to a terminating error. The current script handles probe failures explicitly.


### Existing GitHub repository / non-fast-forward

If `ko9ma7/meet-halfway` (or your chosen repository) already contains commits, the bootstrap now fetches `origin/main` and creates a non-destructive history-reconciliation merge that keeps the current local MeetHalfway project files unchanged. It then performs a normal push. No `--force` push is used, and existing remote commits remain in Git history.

## Kakao Maps fallback and deployment diagnostics

If the Kakao Maps Web SDK cannot load because the Kakao app is missing a JavaScript SDK domain, the map product is disabled, or the wrong key type is used, MeetHalfway automatically falls back to OpenStreetMap/Nominatim/Overpass so meeting creation and Supabase verification can continue.

For Kakao Maps itself, verify all three settings in Kakao Developers:

1. Kakao Map > Usage settings > State = ON
2. App > Platform Key > the configured key is a JavaScript key
3. JavaScript SDK domain includes `https://ko9ma7.github.io`

The GitHub bootstrap is idempotent for an existing `v1.0.0` tag. A pre-existing remote release tag is kept instead of causing deployment to fail after a successful Pages deployment.
