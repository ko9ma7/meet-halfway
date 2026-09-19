# GitHub Pages 배포

## Windows에서 먼저 확인

- ZIP 파일 안에서 `github-bootstrap.cmd`를 직접 실행하지 않습니다.
- ZIP을 우클릭해 **압축 풀기(Extract All)** 한 뒤, 압축을 푼 프로젝트 폴더에서 CMD를 실행합니다.
- “인터넷 보안 설정으로 파일을 복사할 수 없습니다” 같은 Windows 보안 메시지가 나오면 다운로드한 ZIP을 우클릭 → **속성(Properties)** → **차단 해제(Unblock)** → 적용한 뒤 다시 압축을 풉니다.
- 수정된 `github-bootstrap.cmd`는 ASCII + CRLF 형식의 짧은 런처이며, `scripts/github-bootstrap.ps1`을 `ExecutionPolicy Bypass`로 실행합니다.

## Automatic deployment

1. Git, Node.js LTS, GitHub CLI 설치
2. 프로젝트 폴더에서 `github-bootstrap.cmd` 실행
3. 최초 실행 시 GitHub CLI 로그인
4. 완료 후 출력되는 Pages URL 확인

자동 처리 범위:

- Repository 생성/재사용
- Repository Description / Homepage / Topics 설정
- Issues 활성화, Wiki/Projects 비활성화
- `.env`의 런타임 설정을 GitHub Actions Variables로 등록
- `npm ci`, `npm run check`, `npm run build`
- `main` Push
- Pages를 GitHub Actions 방식으로 활성화
- Workflow 상태 확인
- `v1.5.0` Tag / Release 생성


## Supabase requirement

공유 링크를 여러 브라우저에서 실제로 저장하려면 다음 3가지가 모두 필요합니다.

1. `SUPABASE_URL` — `https://xxxxx.supabase.co` 형태의 Project URL
2. `SUPABASE_PUBLISHABLE_KEY` — 브라우저용 `sb_publishable_...` 키
3. `supabase/schema.sql` — Supabase SQL Editor에서 최초 1회 실행

현재 패키지에는 Kakao JavaScript key, Supabase Project URL, Supabase Publishable key가 모두 설정되어 있습니다. `github-bootstrap.cmd`는 배포 전에 `get_meeting` RPC를 호출해 스키마 설치 여부를 점검합니다. 스키마가 없으면 `supabase/schema.sql`을 클립보드에 복사하고 해당 프로젝트의 SQL Editor를 자동으로 연 뒤, 실행 완료 후 재검사합니다.

## Kakao Maps requirement

GitHub Pages URL의 origin을 Kakao Developers > JavaScript SDK domain에 등록해야 합니다.

Project Pages가 아래 주소라면:

```text
https://ko9ma7.github.io/meet-halfway/
```

등록할 origin은 일반적으로:

```text
https://ko9ma7.github.io
```

입니다.

## Custom domain

`public/CNAME`에 도메인을 한 줄로 기록한 뒤 GitHub Pages Custom domain에 같은 값을 등록합니다.

```text
meet.example.com
```

DNS 연결 후 Enforce HTTPS를 활성화하고 `.env`의 `PUBLIC_SITE_URL`도 변경합니다.


## Bootstrap repository-not-found behavior

On a first deployment, `ko9ma7/meet-halfway` (or your own `<owner>/meet-halfway`) does not exist yet. The bootstrap script treats that `404 / repository not found` response as an expected probe result and creates the repository automatically. Older package revisions could stop at this probe because Windows PowerShell promoted GitHub CLI stderr to a terminating error. The current script handles probe failures explicitly.


### Existing GitHub repository / non-fast-forward

If `ko9ma7/meet-halfway` (or your chosen repository) already contains commits, the bootstrap now fetches `origin/main` and creates a non-destructive history-reconciliation merge that keeps the current local 어?중간 project files unchanged. It then performs a normal push. No `--force` push is used, and existing remote commits remain in Git history.
