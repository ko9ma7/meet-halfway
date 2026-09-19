$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

# MeetHalfway GitHub bootstrap for Windows PowerShell 5.1+.
# Expected failures from probe commands are handled explicitly so a missing
# repository/page/release is treated as a state to create, not as a fatal error.

$RepoName = 'meet-halfway'
$RepoDescription = 'Eo?JungGan - where should we meet? Three practical midpoint areas with nearby food and cafes'
$Visibility = 'public'
$InitialTag = 'v1.5.0'
$Topics = @('github-pages','javascript','kakao-map','supabase','meeting-planner','multilingual','openstreetmap')

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

function Write-Step([string]$Text) { Write-Host "[STEP] $Text" -ForegroundColor Cyan }
function Write-Ok([string]$Text) { Write-Host "[OK]   $Text" -ForegroundColor Green }
function Write-Warn([string]$Text) { Write-Host "[WARN] $Text" -ForegroundColor Yellow }
function Stop-Fail([string]$Text) { Write-Host "[ERROR] $Text" -ForegroundColor Red; exit 1 }

function Require-Command([string]$Name, [string]$HelpText) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        Stop-Fail "$Name is not installed. $HelpText"
    }
}

function Run-Native([string]$Label, [scriptblock]$Command) {
    Write-Step $Label
    & $Command
    if ($LASTEXITCODE -ne 0) { Stop-Fail "$Label failed (exit code $LASTEXITCODE)." }
}

# Run a native command where a non-zero exit code is an expected probe result.
# Suppress stderr and temporarily relax ErrorActionPreference because Windows
# PowerShell can convert redirected native stderr into a terminating ErrorRecord.
function Test-NativeSuccess([scriptblock]$Command) {
    $previousPreference = $ErrorActionPreference
    $exitCode = 1
    try {
        $ErrorActionPreference = 'SilentlyContinue'
        & $Command *> $null
        $exitCode = $LASTEXITCODE
    }
    catch {
        $exitCode = 1
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }
    return ($exitCode -eq 0)
}

function Get-NativeOutputSafe([scriptblock]$Command) {
    $previousPreference = $ErrorActionPreference
    $output = $null
    $exitCode = 1
    try {
        $ErrorActionPreference = 'SilentlyContinue'
        $output = & $Command 2>$null
        $exitCode = $LASTEXITCODE
    }
    catch {
        $output = $null
        $exitCode = 1
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }
    return [PSCustomObject]@{ ExitCode = $exitCode; Output = $output }
}

function Load-DotEnv([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) {
        Write-Warn '.env not found. Map/data GitHub Variables will only be set when values exist in the current environment.'
        return
    }
    foreach ($raw in Get-Content -LiteralPath $Path -Encoding UTF8) {
        $line = $raw.Trim()
        if ([string]::IsNullOrWhiteSpace($line) -or $line.StartsWith('#')) { continue }
        $idx = $line.IndexOf('=')
        if ($idx -lt 1) { continue }
        $name = $line.Substring(0, $idx).Trim()
        $value = $line.Substring($idx + 1).Trim()
        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        [Environment]::SetEnvironmentVariable($name, $value, 'Process')
    }
    Write-Ok 'Local .env loaded.'
}

function Set-DotEnvValue([string]$Path, [string]$Name, [string]$Value) {
    $lines = @()
    if (Test-Path -LiteralPath $Path) { $lines = @(Get-Content -LiteralPath $Path -Encoding UTF8) }
    $updated = $false
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match ('^' + [regex]::Escape($Name) + '=')) {
            $lines[$i] = "$Name=$Value"
            $updated = $true
            break
        }
    }
    if (-not $updated) { $lines += "$Name=$Value" }
    Set-Content -LiteralPath $Path -Value $lines -Encoding UTF8
}

function Get-SupabaseClientKey() {
    if (-not [string]::IsNullOrWhiteSpace($env:SUPABASE_PUBLISHABLE_KEY)) { return $env:SUPABASE_PUBLISHABLE_KEY }
    return $env:SUPABASE_ANON_KEY
}

function Ensure-SupabaseConfiguration([string]$EnvPath) {
    $clientKey = Get-SupabaseClientKey
    $hasUrl = -not [string]::IsNullOrWhiteSpace($env:SUPABASE_URL)
    $hasKey = -not [string]::IsNullOrWhiteSpace($clientKey)

    if ($hasKey -and -not $hasUrl) {
        Write-Warn 'Supabase publishable key is configured, but the Project URL is still missing.'
        Write-Host '       Open Supabase Dashboard > Connect and copy Project URL (example: https://xxxxx.supabase.co).' -ForegroundColor Yellow
        $enteredUrl = (Read-Host 'Supabase Project URL (Enter = deploy in local/demo mode)').Trim()
        if (-not [string]::IsNullOrWhiteSpace($enteredUrl)) {
            if (-not $enteredUrl.StartsWith('https://')) { Stop-Fail 'Supabase Project URL must start with https://.' }
            $enteredUrl = $enteredUrl.TrimEnd('/')
            [Environment]::SetEnvironmentVariable('SUPABASE_URL', $enteredUrl, 'Process')
            Set-DotEnvValue $EnvPath 'SUPABASE_URL' $enteredUrl
            $hasUrl = $true
            Write-Ok 'Supabase Project URL saved to local .env.'
        }
    }

    if ($hasUrl -and -not $hasKey) {
        $enteredKey = (Read-Host 'Supabase Publishable key (sb_publishable_...)').Trim()
        if (-not [string]::IsNullOrWhiteSpace($enteredKey)) {
            [Environment]::SetEnvironmentVariable('SUPABASE_PUBLISHABLE_KEY', $enteredKey, 'Process')
            Set-DotEnvValue $EnvPath 'SUPABASE_PUBLISHABLE_KEY' $enteredKey
            $clientKey = $enteredKey
            $hasKey = $true
            Write-Ok 'Supabase Publishable key saved to local .env.'
        }
    }

    if ($hasUrl -and $hasKey) {
        Write-Ok 'Supabase URL and browser publishable key are configured.'
    } else {
        Write-Warn 'Supabase shared persistence is incomplete. Deployment will work, but meetings are stored only in local/demo mode.'
    }
}

function Test-SupabaseSchemaOnce() {
    $clientKey = Get-SupabaseClientKey
    if ([string]::IsNullOrWhiteSpace($env:SUPABASE_URL) -or [string]::IsNullOrWhiteSpace($clientKey)) { return $false }

    $uri = $env:SUPABASE_URL.TrimEnd('/') + '/rest/v1/rpc/get_meeting'
    try {
        $headers = @{ apikey = $clientKey }
        Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -ContentType 'application/json' -Body '{"p_share_id":"__meet_halfway_setup_probe__"}' -TimeoutSec 20 | Out-Null
        return $true
    }
    catch {
        # A missing meeting should still return 200/null when the RPC exists.
        # Any exception here means the project/key/schema could not be verified.
        return $false
    }
}

function Ensure-SupabaseSchema() {
    $clientKey = Get-SupabaseClientKey
    if ([string]::IsNullOrWhiteSpace($env:SUPABASE_URL) -or [string]::IsNullOrWhiteSpace($clientKey)) {
        Write-Warn 'Supabase is not fully configured. Shared persistence validation is skipped.'
        return
    }

    Write-Step 'Checking Supabase RPC schema'
    if (Test-SupabaseSchemaOnce) {
        Write-Ok 'Supabase RPC schema is reachable.'
        return
    }

    $schemaPath = Join-Path $ProjectRoot 'supabase\schema.sql'
    if (-not (Test-Path -LiteralPath $schemaPath)) {
        Stop-Fail 'supabase/schema.sql is missing from the project.'
    }

    Write-Warn 'MeetHalfway tables/RPC functions are not reachable yet.'
    Write-Warn 'The publishable key can use the RPC after it exists, but it cannot create database tables/functions.'

    try {
        $schemaText = Get-Content -LiteralPath $schemaPath -Raw -Encoding UTF8
        if (Get-Command Set-Clipboard -ErrorAction SilentlyContinue) {
            Set-Clipboard -Value $schemaText
        } elseif (Get-Command clip.exe -ErrorAction SilentlyContinue) {
            $schemaText | clip.exe
        }
        Write-Ok 'supabase/schema.sql copied to the Windows clipboard.'
    }
    catch {
        Write-Warn 'Could not copy schema.sql automatically. Open the file manually if needed.'
    }

    $projectRef = ''
    try {
        $hostName = ([Uri]$env:SUPABASE_URL).Host
        if ($hostName -match '^([a-z0-9-]+)\.supabase\.co$') { $projectRef = $Matches[1] }
    }
    catch { $projectRef = '' }

    if (-not [string]::IsNullOrWhiteSpace($projectRef)) {
        $sqlEditorUrl = "https://supabase.com/dashboard/project/$projectRef/sql/new"
        Write-Host "[INFO] Opening Supabase SQL Editor: $sqlEditorUrl" -ForegroundColor Cyan
        try { Start-Process $sqlEditorUrl | Out-Null } catch { Write-Warn 'Could not open the browser automatically.' }
    } else {
        Write-Host '[INFO] Open your Supabase project > SQL Editor > New query.' -ForegroundColor Cyan
    }

    Write-Host ''
    Write-Host 'Paste the copied SQL, click Run once, wait for success, then return here.' -ForegroundColor Yellow
    [void](Read-Host 'Press Enter after schema.sql has finished successfully')

    Write-Step 'Rechecking Supabase RPC schema'
    if (Test-SupabaseSchemaOnce) {
        Write-Ok 'Supabase RPC schema is ready.'
        return
    }

    Stop-Fail 'Supabase schema is still not reachable. Confirm the SQL ran in the correct project, then run github-bootstrap.cmd again.'
}

function Set-GhVariable([string]$Name, [string]$Value, [string]$Repository) {
    if ([string]::IsNullOrWhiteSpace($Value)) { return }
    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'SilentlyContinue'
        $Value | gh variable set $Name --repo $Repository
        $code = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }
    if ($code -ne 0) { Write-Warn "Could not set GitHub variable: $Name" }
}

try {
    # Remove Mark-of-the-Web from extracted project files where possible.
    Get-ChildItem -LiteralPath $ProjectRoot -Recurse -File -ErrorAction SilentlyContinue | Unblock-File -ErrorAction SilentlyContinue

    $EnvPath = Join-Path $ProjectRoot '.env'
    Load-DotEnv $EnvPath
    Ensure-SupabaseConfiguration $EnvPath

    Require-Command 'git' 'Install Git for Windows: https://git-scm.com/'
    Require-Command 'node' 'Install Node.js LTS: https://nodejs.org/'
    Require-Command 'npm' 'Install Node.js LTS: https://nodejs.org/'
    Require-Command 'gh' 'Install GitHub CLI with: winget install --id GitHub.cli'

    Write-Ok ((git --version) -join ' ')
    Write-Ok ('Node ' + ((node --version) -join ' '))
    Write-Ok ('npm ' + ((npm --version) -join ' '))

    Ensure-SupabaseSchema

    Write-Step 'Checking GitHub CLI authentication'
    if (-not (Test-NativeSuccess { gh auth status })) {
        Write-Warn 'GitHub CLI login is required. The login flow will start now.'
        Run-Native 'GitHub CLI login' { gh auth login }
    }

    $ownerResult = Get-NativeOutputSafe { gh api user --jq .login }
    if ($ownerResult.ExitCode -ne 0 -or $null -eq $ownerResult.Output) {
        Stop-Fail 'Could not determine the GitHub username. Run: gh auth status'
    }
    $GhOwner = (($ownerResult.Output | Select-Object -First 1).ToString()).Trim()
    if ([string]::IsNullOrWhiteSpace($GhOwner)) { Stop-Fail 'Could not determine the GitHub username.' }
    Write-Ok "GitHub user: $GhOwner"

    if ($RepoName -ieq "$GhOwner.github.io") {
        $DeployUrl = "https://$GhOwner.github.io/"
    } else {
        $DeployUrl = "https://$GhOwner.github.io/$RepoName/"
    }
    Write-Ok "Deploy URL: $DeployUrl"

    # Force the actual deployment URL for the local production build and keep
    # the local .env synchronized for future manual builds.
    $env:PUBLIC_SITE_URL = $DeployUrl.TrimEnd('/')
    Set-DotEnvValue $EnvPath 'PUBLIC_SITE_URL' $env:PUBLIC_SITE_URL

    # Git identity
    $nameResult = Get-NativeOutputSafe { git config --global --get user.name }
    $mailResult = Get-NativeOutputSafe { git config --global --get user.email }
    $GitUserName = if ($nameResult.ExitCode -eq 0) { (($nameResult.Output | Select-Object -First 1).ToString()).Trim() } else { '' }
    $GitUserEmail = if ($mailResult.ExitCode -eq 0) { (($mailResult.Output | Select-Object -First 1).ToString()).Trim() } else { '' }
    if ([string]::IsNullOrWhiteSpace($GitUserName)) {
        $GitUserName = Read-Host 'Git user.name'
        Run-Native 'Saving Git user.name' { git config --global user.name $GitUserName }
    }
    if ([string]::IsNullOrWhiteSpace($GitUserEmail)) {
        $GitUserEmail = Read-Host 'Git user.email'
        Run-Native 'Saving Git user.email' { git config --global user.email $GitUserEmail }
    }
    Write-Ok "Git identity: $GitUserName <$GitUserEmail>"

    if (-not (Test-Path -LiteralPath (Join-Path $ProjectRoot '.git'))) {
        Run-Native 'Initializing local Git repository' { git init }
    } else {
        Write-Ok 'Existing local Git repository detected.'
    }
    Run-Native 'Selecting main branch' { git branch -M main }

    if (-not (Test-Path -LiteralPath (Join-Path $ProjectRoot 'package.json'))) {
        Stop-Fail 'package.json was not found. Extract the entire ZIP first, then run github-bootstrap.cmd from the extracted project folder.'
    }

    if (Test-Path -LiteralPath (Join-Path $ProjectRoot 'package-lock.json')) {
        Run-Native 'Installing project dependencies' { npm ci }
    } else {
        Run-Native 'Installing project dependencies' { npm install }
    }
    Run-Native 'Running static checks' { npm run check }
    Run-Native 'Building production files' { npm run build }

    $FullRepo = "$GhOwner/$RepoName"
    $RemoteUrl = "https://github.com/$FullRepo.git"

    Write-Step 'Checking whether the GitHub repository already exists'
    if (Test-NativeSuccess { gh api "repos/$FullRepo" }) {
        Write-Ok "Existing GitHub repository detected: $FullRepo"
    } else {
        if ($Visibility -eq 'private') {
            Run-Native 'Creating GitHub repository' { gh repo create $FullRepo --private --description $RepoDescription }
        } else {
            Run-Native 'Creating GitHub repository' { gh repo create $FullRepo --public --description $RepoDescription }
        }
        Write-Ok "Created GitHub repository: $FullRepo"
    }

    $RemoteNames = @(git remote)
    if ($RemoteNames -notcontains 'origin') {
        Run-Native 'Adding origin remote' { git remote add origin $RemoteUrl }
    } else {
        $remoteResult = Get-NativeOutputSafe { git remote get-url origin }
        $CurrentRemote = if ($remoteResult.ExitCode -eq 0) { (($remoteResult.Output | Select-Object -First 1).ToString()).Trim() } else { '' }
        if ($CurrentRemote -ne $RemoteUrl) {
            Write-Warn "origin pointed to a different URL and will be updated: $CurrentRemote"
            Run-Native 'Updating origin remote' { git remote set-url origin $RemoteUrl }
        } else {
            Write-Ok "origin: $RemoteUrl"
        }
    }

    Write-Step 'Applying GitHub About metadata'
    gh repo edit $FullRepo --description $RepoDescription --homepage $DeployUrl --enable-issues --enable-wiki=false --enable-projects=false
    if ($LASTEXITCODE -ne 0) { Write-Warn 'Some About metadata could not be applied automatically.' }
    foreach ($topic in $Topics) {
        if (-not (Test-NativeSuccess { gh repo edit $FullRepo --add-topic $topic })) {
            Write-Warn "Could not add topic: $topic"
        }
    }
    Write-Ok 'Repository description, homepage and topics processed.'

    Write-Step 'Setting GitHub Actions repository variables'
    Set-GhVariable 'MAP_PROVIDER' $env:MAP_PROVIDER $FullRepo
    Set-GhVariable 'KAKAO_MAPS_JAVASCRIPT_KEY' $env:KAKAO_MAPS_JAVASCRIPT_KEY $FullRepo
    Set-GhVariable 'GOOGLE_MAPS_API_KEY' $env:GOOGLE_MAPS_API_KEY $FullRepo
    Set-GhVariable 'SUPABASE_URL' $env:SUPABASE_URL $FullRepo
    Set-GhVariable 'SUPABASE_PUBLISHABLE_KEY' $env:SUPABASE_PUBLISHABLE_KEY $FullRepo
    Set-GhVariable 'SUPABASE_ANON_KEY' $env:SUPABASE_ANON_KEY $FullRepo
    Set-GhVariable 'PUBLIC_SITE_URL' $env:PUBLIC_SITE_URL $FullRepo
    Set-GhVariable 'GEOCODING_COUNTRY_CODES' ($(if ($env:GEOCODING_COUNTRY_CODES) { $env:GEOCODING_COUNTRY_CODES } else { 'kr' })) $FullRepo
    Set-GhVariable 'OVERPASS_RADIUS_METERS' ($(if ($env:OVERPASS_RADIUS_METERS) { $env:OVERPASS_RADIUS_METERS } else { '2500' })) $FullRepo
    Set-GhVariable 'DEFAULT_LANGUAGE' ($(if ($env:DEFAULT_LANGUAGE) { $env:DEFAULT_LANGUAGE } else { 'auto' })) $FullRepo
    Set-GhVariable 'DEFAULT_STYLE' ($(if ($env:DEFAULT_STYLE) { $env:DEFAULT_STYLE } else { 'aurora' })) $FullRepo
    Write-Ok 'Repository variables processed.'

    # Enable Pages before pushing so the first workflow run can configure/deploy Pages.
    Write-Step 'Configuring GitHub Pages for GitHub Actions'
    if (Test-NativeSuccess { gh api "repos/$FullRepo/pages" }) {
        if (Test-NativeSuccess { gh api --method PUT "repos/$FullRepo/pages" -f build_type=workflow }) {
            Write-Ok 'GitHub Pages build type set to workflow.'
        } else {
            Write-Warn 'Pages exists, but build type could not be updated automatically.'
        }
    } else {
        if (Test-NativeSuccess { gh api --method POST "repos/$FullRepo/pages" -f build_type=workflow }) {
            Write-Ok 'GitHub Pages enabled.'
        } else {
            Write-Warn 'Pages could not be enabled through the API. The script will still push the project.'
            Write-Warn 'If deployment later fails, open GitHub > Settings > Pages and select GitHub Actions.'
        }
    }

    Run-Native 'Staging project files' { git add -A }
    git diff --cached --quiet
    if ($LASTEXITCODE -ne 0) {
        Run-Native 'Creating Git commit' { git commit -m 'feat: improve map-first place recommendations' }
    } else {
        Write-Ok 'No new changes to commit.'
    }

    # If the remote main branch already has history (for example from an earlier
    # bootstrap attempt or a README created on GitHub), connect that history to
    # the current local project before pushing. The `ours` merge strategy keeps
    # the current local working tree exactly as built while preserving the remote
    # commits as ancestry. This avoids non-fast-forward rejection without using
    # a destructive force push.
    Write-Step 'Reconciling existing remote main history'
    if (Test-NativeSuccess { git ls-remote --exit-code --heads origin main }) {
        Run-Native 'Fetching remote main branch' { git fetch origin main }
        if (Test-NativeSuccess { git merge-base --is-ancestor origin/main HEAD }) {
            Write-Ok 'Local main already contains the remote main history.'
        } else {
            Run-Native 'Connecting remote history while keeping the current project files' { git merge -s ours origin/main --allow-unrelated-histories -m 'chore: reconcile existing remote history' }
            Write-Ok 'Remote history connected. Current MeetHalfway project files were kept unchanged.'
        }
    } else {
        Write-Ok 'Remote main branch does not exist yet; first push will create it.'
    }

    Run-Native 'Pushing main branch' { git push -u origin main }

    # Re-check Pages after the first push. Some new repositories cannot create
    # the Pages configuration until the default branch exists.
    Write-Step 'Ensuring GitHub Pages after push'
    if (Test-NativeSuccess { gh api "repos/$FullRepo/pages" }) {
        if (Test-NativeSuccess { gh api --method PUT "repos/$FullRepo/pages" -f build_type=workflow }) {
            Write-Ok 'GitHub Pages is configured for Actions.'
        } else {
            Write-Warn 'Pages exists, but build type could not be updated automatically.'
        }
    } else {
        if (Test-NativeSuccess { gh api --method POST "repos/$FullRepo/pages" -f build_type=workflow }) {
            Write-Ok 'GitHub Pages enabled after initial push.'
        } else {
            Write-Warn 'GitHub Pages could not be enabled automatically.'
        }
    }

    # Explicit dispatch makes first deployment deterministic even when the push
    # event raced with initial Pages configuration. Concurrency cancels duplicates.
    Write-Step 'Starting GitHub Pages deployment workflow'
    if (Test-NativeSuccess { gh workflow run deploy.yml --repo $FullRepo --ref main }) {
        Write-Ok 'Deployment workflow dispatched.'
    } else {
        Write-Warn 'Could not dispatch deploy.yml explicitly; the push-triggered run may still be active.'
    }

    Write-Step 'Looking for the deployment workflow run'
    Start-Sleep -Seconds 5
    $runResult = Get-NativeOutputSafe { gh run list --repo $FullRepo --limit 1 --json databaseId --jq '.[0].databaseId' }
    $RunId = if ($runResult.ExitCode -eq 0 -and $null -ne $runResult.Output) { (($runResult.Output | Select-Object -First 1).ToString()).Trim() } else { '' }
    if (-not [string]::IsNullOrWhiteSpace($RunId)) {
        Write-Host "[INFO] Workflow run: $RunId"
        gh run watch $RunId --repo $FullRepo --exit-status
        if ($LASTEXITCODE -eq 0) {
            Write-Ok 'GitHub Pages deployment succeeded.'
        } else {
            Write-Warn "Deployment run did not succeed. Inspect with: gh run view $RunId --repo $FullRepo --log-failed"
        }
    } else {
        Write-Warn 'No deployment run was found yet. Check the Actions tab after a short wait.'
    }

    Write-Step "Checking release tag $InitialTag"
    if (Test-NativeSuccess { git ls-remote --exit-code --tags origin "refs/tags/$InitialTag" }) {
        Write-Ok "Remote tag $InitialTag already exists; keeping it unchanged."
    } else {
        $existingTags = @(git tag --list $InitialTag)
        if ($existingTags -notcontains $InitialTag) {
            Run-Native "Creating tag $InitialTag" { git tag -a $InitialTag -m 'Initial release' }
        }
        Run-Native "Pushing tag $InitialTag" { git push origin $InitialTag }
    }

    if (Test-NativeSuccess { gh release view $InitialTag --repo $FullRepo }) {
        Write-Ok 'GitHub Release already exists.'
    } else {
        Write-Step 'Creating GitHub Release'
        gh release create $InitialTag --repo $FullRepo --title $InitialTag --generate-notes
        if ($LASTEXITCODE -eq 0) { Write-Ok 'GitHub Release created.' }
        else { Write-Warn 'Release creation failed, but the tag is available.' }
    }

    Write-Host ''
    Write-Host '============================================================' -ForegroundColor Green
    Write-Host ' EO?JUNGAN bootstrap completed' -ForegroundColor Green
    Write-Host " Repository : https://github.com/$FullRepo" -ForegroundColor Green
    Write-Host " Pages URL  : $DeployUrl" -ForegroundColor Green
    Write-Host '============================================================' -ForegroundColor Green
    Write-Host ''
    Write-Warn 'For Kakao Maps, register your GitHub Pages origin in Kakao Developers > JavaScript SDK domains.'
    $finalSupabaseKey = Get-SupabaseClientKey
    if ([string]::IsNullOrWhiteSpace($env:SUPABASE_URL) -or [string]::IsNullOrWhiteSpace($finalSupabaseKey)) {
        Write-Warn 'Supabase is not fully configured. The site will use local/demo persistence until the Project URL and publishable key are added.'
    }
}
catch {
    Write-Host ''
    Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
    Write-Host 'See ADMIN_SETUP.md and GITHUB_PAGES.md for recovery steps.' -ForegroundColor Yellow
    exit 1
}
