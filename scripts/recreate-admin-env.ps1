$ErrorActionPreference = "Stop"

function Read-EnvFile {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        throw "Missing environment file: $Path"
    }

    $values = @{}
    Get-Content $Path | ForEach-Object {
        if ($_ -match '^\s*([^#=]+?)\s*=\s*(.*)\s*$') {
            $value = $matches[2].Trim()
            if ($value.Length -ge 2 -and $value.StartsWith('"') -and $value.EndsWith('"')) {
                $value = $value.Substring(1, $value.Length - 2)
            }
            $values[$matches[1].Trim()] = $value
        }
    }
    return $values
}

function New-RandomSecret {
    param([int]$Bytes = 32)

    $buffer = [byte[]]::new($Bytes)
    $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $generator.GetBytes($buffer)
    $generator.Dispose()
    return [Convert]::ToBase64String($buffer).Replace('+', '-').Replace('/', '_').TrimEnd('=')
}

$rootEnv = Read-EnvFile ".env"
foreach ($name in @("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY")) {
    if (-not $rootEnv[$name]) {
        throw "Missing $name in .env"
    }
}

$adminEnv = @(
    "SUPABASE_URL=$($rootEnv['SUPABASE_URL'])"
    "SUPABASE_SERVICE_ROLE_KEY=$($rootEnv['SUPABASE_SERVICE_ROLE_KEY'])"
    "ADMIN_ACCESS_CODE=$(New-RandomSecret -Bytes 24)"
    "SESSION_SECRET=$(New-RandomSecret -Bytes 48)"
    "PORT=3001"
)
$adminEnv -join [Environment]::NewLine | Set-Content -Path "admin/.env" -Encoding ASCII

foreach ($path in @(".env", "admin/.env")) {
    icacls $path /inheritance:r /grant:r "$($env:USERNAME):(F)" | Out-Null
}

Write-Host "Recreated admin/.env with a new access code and session secret."
Write-Host "The access code is stored in admin/.env and was not printed."