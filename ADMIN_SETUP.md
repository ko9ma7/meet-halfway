# MeetHalfway — Administrator Setup

이 문서는 관리자 설정만 빠르게 끝내기 위한 체크리스트입니다.

## 1. Map provider

기본값은 **Kakao Maps**입니다.

`.env`:

```env
MAP_PROVIDER=kakao
KAKAO_MAPS_JAVASCRIPT_KEY=YOUR_KAKAO_JAVASCRIPT_KEY
```

지원값:

- `kakao`: Kakao 지도 + 장소/주소 서비스
- `osm`: OpenStreetMap + Nominatim + Overpass (키 없음)
- `google`: Google Maps/Geocoding/Places

## 2. Kakao Developers domain registration

Kakao Developers에서 해당 앱의 **JavaScript SDK 도메인**에 실제 배포 도메인을 등록합니다.

GitHub Pages project site 예:

```text
https://USERNAME.github.io
```

Custom domain 예:

```text
https://meet.example.com
```

localhost 테스트가 필요하면 개발용 origin도 등록합니다.

```text
http://localhost:5173
```

## 3. Shared data storage

여러 사람이 같은 링크에 주소를 입력하려면 Supabase를 연결합니다.

1. Supabase 프로젝트 생성
2. `supabase/schema.sql` 전체 실행
3. `.env`에 Project URL과 anon/public key 입력

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=YOUR_ANON_PUBLIC_KEY
```

`service_role` 키는 절대 넣지 않습니다.

## 4. Language / appearance defaults

```env
DEFAULT_LANGUAGE=auto
DEFAULT_STYLE=aurora
```

언어:

- `auto`
- `ko`
- `en`
- `ja`
- `zh`

스타일:

- `aurora`
- `ocean`
- `forest`
- `sunset`

사용자는 화면 상단에서 언어, 스타일, Light/Dark/System을 직접 바꿀 수 있고 설정은 브라우저에 저장됩니다.

## 5. One-click GitHub deployment

Windows에서:

```cmd
github-bootstrap.cmd
```

스크립트는 `.env`를 읽어 공개 런타임 설정을 GitHub Actions Variables로 등록하고 Repository 생성/설정/Push/Pages 활성화/Release 생성을 수행합니다.

## 6. GitHub repository presentation

권장값:

```text
Repository: meet-halfway
About: MeetHalfway - shared meeting links that calculate a balanced midpoint and nearby restaurant areas
Homepage: https://USERNAME.github.io/meet-halfway/
Topics: github-pages, javascript, kakao-map, supabase, meeting-planner, multilingual, openstreetmap
```

`repository-social-preview.png`를 Repository Settings > General > Social preview에 업로드합니다.

## 7. Final checklist

- Kakao JavaScript SDK domain 등록
- `npm run check`
- `npm run build`
- Supabase 연결 시 실제 링크를 다른 브라우저에서 열어 참가 데이터 동기화 확인
- GitHub Pages HTTPS 확인
- 카카오톡/Discord/Slack 공유 Preview 확인
