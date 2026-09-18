# 어?중간 — Administrator Setup

현재 패키지는 배포에 필요한 **브라우저 공개 설정값**이 이미 채워진 상태입니다.

## 현재 설정 완료

- Map provider: Kakao Maps
- Kakao JavaScript key: configured
- Supabase Project URL: configured
- Supabase Publishable key: configured
- GitHub Pages target: `https://ko9ma7.github.io/meet-halfway/`
- Languages: Auto / 한국어 / English / 日本語 / 中文
- Styles: Aurora / Ocean / Forest / Sunset
- Theme: System / Light / Dark

`sb_secret_...`, `service_role`, DB password 같은 서버 전용 비밀값은 의도적으로 포함하지 않습니다.

## 1. Supabase schema — 최초 1회

여러 기기에서 같은 모임 링크를 공유하려면 `supabase/schema.sql`의 테이블/RPC가 프로젝트에 있어야 합니다.

`github-bootstrap.cmd`가 자동으로 확인합니다. 스키마가 없으면:

1. `supabase/schema.sql` 전체 내용을 Windows 클립보드에 복사
2. 현재 Supabase 프로젝트의 SQL Editor를 브라우저로 열기
3. CMD에서 실행 대기
4. SQL Editor에 붙여넣고 **Run**
5. CMD로 돌아와 Enter
6. RPC를 다시 확인한 뒤 자동 배포 계속

Publishable key에는 DDL 권한이 없으므로 SQL의 최초 생성 자체를 브라우저 key만으로 자동화하는 것은 안전한 방법이 아닙니다.

## 2. Kakao Developers domain — 최초 1회

Kakao Developers에서 사용하는 앱의 **JavaScript SDK 허용 도메인**에 다음 origin을 등록합니다.

```text
https://ko9ma7.github.io
```

로컬 지도 테스트도 필요하면:

```text
http://localhost:5173
```

이 설정은 Kakao 계정의 앱 관리 권한이 필요하므로 프로젝트 CMD가 대신 변경할 수 없습니다.

## 3. One-click GitHub deployment

압축을 완전히 푼 뒤:

```cmd
github-bootstrap.cmd
```

자동 처리 범위:

```text
Supabase 연결/RPC 확인
→ Git / Node / npm / GitHub CLI 확인
→ GitHub 로그인 확인
→ 실제 Pages URL 확정
→ npm check / build
→ meet-halfway Repository 생성 또는 재사용
→ About / Homepage / Topics / Issues 설정
→ 공개 런타임 설정을 Repository Variables에 등록
→ Commit / Push
→ GitHub Pages를 Actions 방식으로 설정
→ Deploy workflow 실행/확인
→ v1.0.0 Tag / Release 생성
```

## 4. 공개 설정 파일

- `.env`: 다운로드 패키지의 로컬 설정, Git 제외
- `scripts/public-defaults.mjs`: 브라우저에 공개 가능한 배포 기본값
- `config.js`: 별도 빌드 없이 정적 실행할 때 사용하는 공개 설정

GitHub Actions Variables가 실수로 비어 있어도 공개 기본값으로 빌드되도록 구성되어 있습니다.

## 5. 보안

공개 가능한 값:

- Kakao JavaScript key
- Supabase Project URL
- Supabase Publishable key

절대 넣지 않는 값:

- Supabase `sb_secret_...`
- `service_role`
- 데이터베이스 비밀번호
- GitHub Personal Access Token
- 개인용 관리 비밀번호/복구키

Supabase는 RLS를 켜고 테이블 직접 권한을 회수했으며, 브라우저는 허용된 RPC만 호출합니다. 자세한 설명은 `SECURITY.md`를 참고하세요.

## 6. Repository presentation

```text
Repository: meet-halfway
About: 어?중간 - shared meeting links that calculate a balanced midpoint and nearby restaurant areas
Homepage: https://ko9ma7.github.io/meet-halfway/
Topics: github-pages, javascript, kakao-map, supabase, meeting-planner, multilingual, openstreetmap
```

`repository-social-preview.png`는 GitHub Repository Settings의 Social preview에 사용할 수 있습니다.


### Existing GitHub repository / non-fast-forward

If `ko9ma7/meet-halfway` (or your chosen repository) already contains commits, the bootstrap now fetches `origin/main` and creates a non-destructive history-reconciliation merge that keeps the current local 어?중간 project files unchanged. It then performs a normal push. No `--force` push is used, and existing remote commits remain in Git history.
