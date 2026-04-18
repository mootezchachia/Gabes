# scripts/push-vercel-env.ps1
# Reads .env.local and pushes runtime vars into Vercel (prod + preview).
# Requires `npx vercel whoami` to already succeed (authenticated).
# Usage: powershell.exe -File scripts/push-vercel-env.ps1

$ErrorActionPreference = "Continue"

# Vars we want on Vercel at runtime. Skip CLI-only secrets like
# SUPABASE_DB_PASSWORD / SUPABASE_PROJECT_REF and empty slots.
$runtimeKeys = @(
  "NEXT_PUBLIC_MAPBOX_TOKEN",
  "NEXT_PUBLIC_CESIUM_ION_TOKEN",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENROUTER_API_KEY",
  "NTFY_URL",
  "NEXT_PUBLIC_NTFY_URL",
  "NEXT_PUBLIC_NTFY_TOPIC_PREFIX"
)

$envFile = Join-Path $PSScriptRoot "..\.env.local"
if (-not (Test-Path $envFile)) {
  Write-Host "ERROR: .env.local not found at $envFile" -ForegroundColor Red
  exit 1
}

$map = @{}
Get-Content $envFile | ForEach-Object {
  $line = $_.Trim()
  if ($line -eq "" -or $line.StartsWith("#")) { return }
  $idx = $line.IndexOf("=")
  if ($idx -lt 1) { return }
  $k = $line.Substring(0, $idx).Trim()
  $v = $line.Substring($idx + 1).Trim()
  if ($v -ne "") { $map[$k] = $v }
}

$envs = @("production", "preview")

foreach ($key in $runtimeKeys) {
  if (-not $map.ContainsKey($key)) {
    Write-Host "[skip] $key (not in .env.local)" -ForegroundColor DarkYellow
    continue
  }
  $value = $map[$key]
  foreach ($env in $envs) {
    Write-Host "==> $key @ $env" -ForegroundColor Cyan
    # Remove any existing value (silent if missing).
    & npx vercel env rm $key $env --yes 2>&1 | Out-Null
    # Add fresh value.
    $value | & npx vercel env add $key $env 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
      Write-Host "    ok" -ForegroundColor Green
    } else {
      Write-Host "    FAILED (exit $LASTEXITCODE)" -ForegroundColor Red
    }
  }
}

Write-Host "`nDone. Trigger a redeploy to pick them up." -ForegroundColor Green
