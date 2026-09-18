$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

# MeetHalfway GitHub bootstrap for Windows PowerShell 5.1+.
# Expected failures from probe commands are handled explicitly so a missing
# repository/page/release is treated as a state to create, not as a fatal error.

$RepoName = 'meet-halfway'
$RepoDescription = 'MeetHalfway - shared meeting links that calculate a balanced midpoint and nearby restaurant areas'
$Visibility = 'public'
$InitialTag = 'v1.0.0'
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

    Load-DotEnv (Join-Path $ProjectRoot '.env')

    Require-Command 'git' 'Install Git for Windows: https://git-scm.com/'
    Require-Command 'node' 'Install Node.js LTS: https://nodejs.org/'
    Require-Command 'npm' 'Install Node.js LTS: https://nodejs.org/'
    Require-Command 'gh' 'Install GitHub CLI with: winget install --id GitHub.cli'

    Write-Ok ((git --version) -join ' ')
    Write-Ok ('Node ' + ((node --version) -join ' '))
    Write-Ok ('npm ' + ((npm --version) -join ' '))

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

    # Force the actual deployment URL for the local production build even when
    # the checked-in/local .env still contains the USERNAME placeholder.
    $env:PUBLIC_SITE_URL = $DeployUrl.TrimEnd('/')

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
        Run-Native 'Creating Git commit' { git commit -m 'feat: launch MeetHalfway' }
    } else {
        Write-Ok 'No new changes to commit.'
    }

    Run-Native 'Pushing main branch' { git push -u origin main }

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

    $existingTags = @(git tag --list $InitialTag)
    if ($existingTags -notcontains $InitialTag) {
        Run-Native "Creating tag $InitialTag" { git tag -a $InitialTag -m 'Initial release' }
        Run-Native "Pushing tag $InitialTag" { git push origin $InitialTag }
    } else {
        Write-Ok "$InitialTag already exists."
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
    Write-Host ' MeetHalfway bootstrap completed' -ForegroundColor Green
    Write-Host " Repository : https://github.com/$FullRepo" -ForegroundColor Green
    Write-Host " Pages URL  : $DeployUrl" -ForegroundColor Green
    Write-Host '============================================================' -ForegroundColor Green
    Write-Host ''
    Write-Warn 'For Kakao Maps, register your GitHub Pages origin in Kakao Developers > JavaScript SDK domains.'
    if ([string]::IsNullOrWhiteSpace($env:SUPABASE_URL) -or [string]::IsNullOrWhiteSpace($env:SUPABASE_ANON_KEY)) {
        Write-Warn 'Supabase is not configured. The site will use local/demo persistence until Supabase variables are added.'
    }
}
catch {
    Write-Host ''
    Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
    Write-Host 'See ADMIN_SETUP.md and GITHUB_PAGES.md for recovery steps.' -ForegroundColor Yellow
    exit 1
}
