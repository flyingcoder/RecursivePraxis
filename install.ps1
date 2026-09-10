<#
.SYNOPSIS
  RecursivePraxis CLI installer for Windows.

.DESCRIPTION
  Installs the `lambda` executable and nothing else. It does not touch any host
  agent: no .claude\, no .cursor\, no .agents\, no .opencode\. Nothing reaches a
  host agent until a human runs `lambda init`.

  Never requires elevation. Everything lands under the current user's profile,
  and PATH is modified at User scope only — never machine-wide.

.EXAMPLE
  # Read before running:
  Invoke-WebRequest https://raw.githubusercontent.com/flyingcoder/RecursivePraxis/main/install.ps1 -OutFile install.ps1
  Get-Content install.ps1 | more
  .\install.ps1

.EXAMPLE
  # Pin a version (recommended in CI):
  $env:LAMBDA_VERSION = 'v0.2.0'; .\install.ps1

.EXAMPLE
  # Remove the CLI (host-agent files are left alone; use `lambda uninstall` for those):
  .\install.ps1 -Uninstall
#>
#Requires -Version 5.1

[CmdletBinding()]
param(
  [switch]$Uninstall
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Repo        = if ($env:LAMBDA_REPO) { $env:LAMBDA_REPO } else { 'flyingcoder/RecursivePraxis' }
$InstallDir  = if ($env:LAMBDA_INSTALL_DIR) { $env:LAMBDA_INSTALL_DIR } else { Join-Path $env:LOCALAPPDATA 'RecursivePraxis' }
$BinDir      = if ($env:LAMBDA_BIN_DIR) { $env:LAMBDA_BIN_DIR } else { Join-Path $InstallDir 'bin' }
$MinNodeMajor = 20

function Write-Info  { param([string]$Message) Write-Host $Message }
function Write-Warn  { param([string]$Message) Write-Warning $Message }
function Stop-Fatal  { param([string]$Message) Write-Error $Message; exit 1 }

# --- uninstall ---------------------------------------------------------------

function Invoke-Uninstall {
  $removed = $false

  if (Test-Path $InstallDir) {
    Remove-Item -Recurse -Force $InstallDir
    Write-Info "removed $InstallDir"
    $removed = $true
  }

  # Strip our bin directory from the *user* PATH, leaving every other entry
  # exactly as it was.
  $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
  if ($userPath) {
    $kept = ($userPath -split ';' | Where-Object { $_ -and $_.TrimEnd('\') -ne $BinDir.TrimEnd('\') })
    $newPath = ($kept -join ';')
    if ($newPath -ne $userPath) {
      [Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
      Write-Info "removed $BinDir from the user PATH"
      $removed = $true
    }
  }

  if (-not $removed) { Write-Info "nothing to remove (no $InstallDir, no PATH entry)" }

  Write-Info ''
  Write-Info 'Host-agent files were NOT touched. There were two installs, so there are two'
  Write-Info 'removals: this script removed the CLI; `lambda uninstall` removes the skill and'
  Write-Info 'command files it generated. Run that first if you have not already — it needs'
  Write-Info 'the binary this just deleted.'
  exit 0
}

if ($Uninstall) { Invoke-Uninstall }

# --- 1. detect platform ------------------------------------------------------

$arch = switch ($env:PROCESSOR_ARCHITECTURE) {
  'AMD64' { 'x64' }
  'ARM64' { 'arm64' }
  default { Stop-Fatal "unsupported architecture: $($env:PROCESSOR_ARCHITECTURE) (expected AMD64 or ARM64)" }
}
$target = "win32-$arch"

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { Stop-Fatal "node is required (>= $MinNodeMajor) and was not found on PATH" }
$nodeMajor = [int](& node -p 'process.versions.node.split(".")[0]')
if ($nodeMajor -lt $MinNodeMajor) { Stop-Fatal "node >= $MinNodeMajor is required; found $(& node -v)" }

# --- 2. resolve version ------------------------------------------------------

$version = $env:LAMBDA_VERSION
if (-not $version) {
  # Follow the releases/latest redirect rather than calling the API, which is
  # rate-limited for unauthenticated callers. Where the redirect target cannot
  # be read (the response object differs between PowerShell 5.1 and 7+), fall
  # back to the API rather than guessing a tag.
  $resolved = $null
  try {
    $response = Invoke-WebRequest -Uri "https://github.com/$Repo/releases/latest" -MaximumRedirection 5 -UseBasicParsing
    $uri = if ($response.BaseResponse.PSObject.Properties['ResponseUri']) {
      $response.BaseResponse.ResponseUri.AbsoluteUri          # Windows PowerShell 5.1
    } elseif ($response.BaseResponse.PSObject.Properties['RequestMessage']) {
      $response.BaseResponse.RequestMessage.RequestUri.AbsoluteUri  # PowerShell 7+
    } else { $null }
    if ($uri -and $uri -match '/tag/(.+)$') { $resolved = $Matches[1] }
  } catch {
    $resolved = $null
  }

  if (-not $resolved) {
    $api = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest" -UseBasicParsing
    $resolved = $api.tag_name
  }
  $version = $resolved
}
if (-not $version) { Stop-Fatal 'could not resolve the latest release; set $env:LAMBDA_VERSION explicitly' }
if ($version -notmatch '^v') { $version = "v$version" }

# --- 3. download and verify --------------------------------------------------

$tarball = "lambda-$target.tar.gz"
$base    = "https://github.com/$Repo/releases/download/$version"
$tmp     = Join-Path ([System.IO.Path]::GetTempPath()) ([System.IO.Path]::GetRandomFileName())
New-Item -ItemType Directory -Path $tmp -Force | Out-Null

try {
  Write-Info "installing lambda $version ($target)"
  Invoke-WebRequest -Uri "$base/$tarball"    -OutFile (Join-Path $tmp $tarball) -UseBasicParsing
  Invoke-WebRequest -Uri "$base/SHA256SUMS"  -OutFile (Join-Path $tmp 'SHA256SUMS') -UseBasicParsing

  # Fail closed on a hash mismatch. HTTPS authenticates the host, not the
  # artifact.
  $line = Get-Content (Join-Path $tmp 'SHA256SUMS') |
    Where-Object { $_ -match [regex]::Escape($tarball) } |
    Select-Object -First 1
  if (-not $line) { Stop-Fatal "$tarball is not listed in SHA256SUMS for $version — refusing to install" }

  $expected = ($line -split '\s+')[0].ToLowerInvariant()
  $actual   = (Get-FileHash -Algorithm SHA256 -Path (Join-Path $tmp $tarball)).Hash.ToLowerInvariant()
  if ($actual -ne $expected) {
    Stop-Fatal "checksum mismatch for ${tarball}: expected $expected, got $actual. Refusing to install."
  }

  $extract = Join-Path $tmp 'extract'
  New-Item -ItemType Directory -Path $extract -Force | Out-Null
  & tar -xzf (Join-Path $tmp $tarball) -C $extract
  if ($LASTEXITCODE -ne 0) { Stop-Fatal "could not extract $tarball (tar is bundled with Windows 10 1803 and later)" }

  # --- 4. place --------------------------------------------------------------

  $dest = Join-Path (Join-Path $InstallDir 'versions') $version
  New-Item -ItemType Directory -Path (Join-Path $InstallDir 'versions') -Force | Out-Null
  if (Test-Path $dest) { Remove-Item -Recurse -Force $dest }
  Move-Item -Path $extract -Destination $dest

  # --- 5. shim ---------------------------------------------------------------

  # A .cmd shim rather than a symlink: creating a symlink on Windows needs
  # Developer Mode or elevation, and this installer asks for neither.
  New-Item -ItemType Directory -Path $BinDir -Force | Out-Null
  $shim = Join-Path $BinDir 'lambda.cmd'
  @(
    '@echo off',
    "node `"$(Join-Path $dest 'dist\cli.js')`" %*"
  ) | Set-Content -Path $shim -Encoding ASCII

  # --- 6. prune older versions ----------------------------------------------

  Get-ChildItem (Join-Path $InstallDir 'versions') -Directory |
    Where-Object { $_.FullName -ne $dest } |
    ForEach-Object { Remove-Item -Recurse -Force $_.FullName }

  # --- 7. PATH ---------------------------------------------------------------

  Write-Info "installed to $dest"
  Write-Info "shim        $shim"

  $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
  $entries  = if ($userPath) { $userPath -split ';' } else { @() }
  if (-not ($entries | Where-Object { $_.TrimEnd('\') -eq $BinDir.TrimEnd('\') })) {
    # User scope only. Never machine-wide, never elevated.
    [Environment]::SetEnvironmentVariable('Path', (($entries + $BinDir) -join ';').Trim(';'), 'User')
    Write-Info "added $BinDir to the user PATH — open a new terminal for it to take effect"
  }

  $shadow = Get-Command lambda -ErrorAction SilentlyContinue
  if ($shadow -and $shadow.Source -and $shadow.Source -ne $shim) {
    Write-Warn "another 'lambda' earlier on PATH will shadow this one: $($shadow.Source)"
  }

  Write-Info ''
  Write-Info 'Installed the CLI and nothing else — no host agent was touched.'
  Write-Info ''
  Write-Info 'Next:  lambda init      configure host agents (four questions)'
  Write-Info '       lambda doctor    verify an existing install'
}
finally {
  if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue }
}
