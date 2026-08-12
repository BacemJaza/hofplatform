# Sync local env files to Vercel projects (run once after deploy).
# Usage from repo root:
#   powershell -ExecutionPolicy Bypass -File scripts/sync-vercel-env.ps1
#
# Requires a real Supabase secret/service-role key in admin/.env
# (SUPABASE_SERVICE_ROLE_KEY). Never sync the publishable/anon key into
# that slot — product/order writes will fail under RLS.

$ErrorActionPreference = "Stop"
$scope = "bacemjazas-projects"

function Read-EnvFile {
    param([string]$Path)
    $map = @{}
    if (-not (Test-Path $Path)) { return $map }
    Get-Content $Path | ForEach-Object {
        if ($_ -match '^\s*([^#=]+?)\s*=\s*"?([^"#]*)"?\s*$') {
            $map[$matches[1].Trim()] = $matches[2].Trim()
        }
    }
    return $map
}

function Assert-ServiceRoleKey {
    param(
        [string]$Key,
        [string]$PublishableKey
    )
    if (-not $Key) {
        throw "Missing SUPABASE_SERVICE_ROLE_KEY. Put the Supabase secret/service_role key in admin/.env before syncing."
    }
    if ($Key.StartsWith("sb_publishable_")) {
        throw "SUPABASE_SERVICE_ROLE_KEY looks like a publishable key (sb_publishable_…). Use the secret/service_role key instead."
    }
    if ($PublishableKey -and $Key -eq $PublishableKey) {
        throw "SUPABASE_SERVICE_ROLE_KEY must not equal the publishable/anon key. Admin writes require the secret key."
    }
}

function Add-VercelEnv {
    param(
        [string]$ProjectDir,
        [hashtable]$Vars
    )

    Push-Location $ProjectDir
    try {
        foreach ($envName in @("production", "development")) {
            foreach ($name in $Vars.Keys) {
                Write-Host "Adding $name to $(Split-Path $ProjectDir -Leaf) ($envName)..."
                vercel env add $name $envName --value $Vars[$name] --force --yes --scope $scope 2>&1 | Out-Host
            }
        }
    } finally {
        Pop-Location
    }
}

# Platform env (from root .env)
$platformEnv = Read-EnvFile ".env"
$adminEnv = Read-EnvFile "admin/.env"

$publishable =
    $platformEnv["SUPABASE_PUBLISHABLE_KEY"]
if (-not $publishable) { $publishable = $platformEnv["VITE_SUPABASE_PUBLISHABLE_KEY"] }

# Prefer admin/.env — that is where the real secret key lives.
$serviceRole = $adminEnv["SUPABASE_SERVICE_ROLE_KEY"]
if (-not $serviceRole) { $serviceRole = $platformEnv["SUPABASE_SERVICE_ROLE_KEY"] }

Assert-ServiceRoleKey -Key $serviceRole -PublishableKey $publishable

$supabaseUrl = $platformEnv["SUPABASE_URL"]
if (-not $supabaseUrl) { $supabaseUrl = $adminEnv["SUPABASE_URL"] }
if (-not $supabaseUrl) { throw "Missing SUPABASE_URL in .env or admin/.env" }

Add-VercelEnv -ProjectDir "." -Vars @{
    "VITE_SUPABASE_URL"             = $platformEnv["VITE_SUPABASE_URL"]
    "VITE_SUPABASE_PUBLISHABLE_KEY" = $platformEnv["VITE_SUPABASE_PUBLISHABLE_KEY"]
    "SUPABASE_URL"                  = $supabaseUrl
    "SUPABASE_PUBLISHABLE_KEY"      = $publishable
    "SUPABASE_SERVICE_ROLE_KEY"     = $serviceRole
    "HOF_API_KEY"                   = $platformEnv["HOF_API_KEY"]
    "OWNER_NOTIFICATION_EMAIL"      = $platformEnv["OWNER_NOTIFICATION_EMAIL"]
}

# Admin env
$adminAccessCode = if ($env:ADMIN_ACCESS_CODE) {
    $env:ADMIN_ACCESS_CODE
} elseif ($adminEnv["ADMIN_ACCESS_CODE"]) {
    $adminEnv["ADMIN_ACCESS_CODE"]
} else {
    "houseofflags-admin"
}

$sessionSecret = if ($env:SESSION_SECRET) {
    $env:SESSION_SECRET
} elseif ($adminEnv["SESSION_SECRET"]) {
    $adminEnv["SESSION_SECRET"]
} else {
    [guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N")
}

Add-VercelEnv -ProjectDir "admin" -Vars @{
    "SUPABASE_URL"              = $supabaseUrl
    "SUPABASE_SERVICE_ROLE_KEY" = $serviceRole
    "ADMIN_ACCESS_CODE"         = $adminAccessCode
    "SESSION_SECRET"            = $sessionSecret
}

Write-Host ""
Write-Host "Done. Redeploy both projects:"
Write-Host "  cd . && vercel deploy --prod --yes --scope $scope"
Write-Host "  cd admin && vercel deploy --prod --yes --scope $scope"
Write-Host ""
Write-Host "Admin login access code: $adminAccessCode"
