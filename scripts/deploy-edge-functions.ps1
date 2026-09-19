# Deploy Edge Functions to project ernfsjeedocpzmnlshqt (requires SUPABASE_ACCESS_TOKEN or `supabase login`).
$ErrorActionPreference = "Stop"
$ProjectRef = "ernfsjeedocpzmnlshqt"

if (-not $env:SUPABASE_ACCESS_TOKEN) {
  Write-Error "Set SUPABASE_ACCESS_TOKEN (Dashboard -> Account -> Access Tokens) or run: npx supabase login"
}

$functions = @(
  "send-checkout-success-email",
  "gateway-diagnostic-hello"
)

foreach ($fn in $functions) {
  Write-Host "Deploying $fn ..."
  npx supabase functions deploy $fn `
    --project-ref $ProjectRef `
    --use-api `
    --no-verify-jwt `
    --yes
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "Done. Verify:"
Write-Host "  curl -i -X OPTIONS https://$ProjectRef.supabase.co/functions/v1/gateway-diagnostic-hello"
