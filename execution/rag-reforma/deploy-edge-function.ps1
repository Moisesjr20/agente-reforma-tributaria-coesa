# deploy-edge-function.ps1 — Fase 4, Script 5
# Deploy da Edge Function ask-reforma no Supabase
#
# Pre-requisito: Supabase CLI instalado
#   winget install Supabase.CLI
#   ou: npm i -g supabase
#
# Uso:
#   .\execution\rag-reforma\deploy-edge-function.ps1

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Carregar .env
$envFile = Join-Path $PSScriptRoot "..\..\\.env"
if (Test-Path $envFile) {
    Get-Content $envFile | Where-Object { $_ -match "^\s*[^#]" -and $_ -match "=" } | ForEach-Object {
        $key, $val = $_ -split "=", 2
        [System.Environment]::SetEnvironmentVariable($key.Trim(), $val.Trim(), "Process")
    }
    Write-Host "  .env carregado" -ForegroundColor Green
}

$projectRef = "hbfckolzpkdkzwjyvrah"

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  Deploy — ask-reforma Edge Function" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Link do projeto
Write-Host "[1/3] Vinculando projeto Supabase..." -ForegroundColor Yellow
supabase link --project-ref $projectRef

# 2. Setar secrets
Write-Host ""
Write-Host "[2/3] Configurando secrets..." -ForegroundColor Yellow
supabase secrets set `
    OPENROUTER_API_KEY=$env:OPENROUTER_API_KEY `
    OPENROUTER_MODEL_SIMPLE=$env:OPENROUTER_MODEL_SIMPLE `
    OPENROUTER_MODEL_COMPLEX=$env:OPENROUTER_MODEL_COMPLEX `
    ROUTER_COMPLEXITY_CHAR_THRESHOLD=$env:ROUTER_COMPLEXITY_CHAR_THRESHOLD `
    ROUTER_COMPLEXITY_SIMILARITY_THRESHOLD=$env:ROUTER_COMPLEXITY_SIMILARITY_THRESHOLD

Write-Host "  Secrets configurados" -ForegroundColor Green

# 3. Deploy
Write-Host ""
Write-Host "[3/3] Fazendo deploy da função..." -ForegroundColor Yellow
supabase functions deploy ask-reforma --no-verify-jwt

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  Deploy concluido!" -ForegroundColor Green
Write-Host ""
Write-Host "  Endpoint publico:" -ForegroundColor White
Write-Host "  https://$projectRef.supabase.co/functions/v1/ask-reforma" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Teste rapido:" -ForegroundColor White
Write-Host '  curl -X POST https://$projectRef.supabase.co/functions/v1/ask-reforma \' -ForegroundColor Gray
Write-Host '    -H "Content-Type: application/json" \' -ForegroundColor Gray
Write-Host '    -d "{\"question\": \"O que e o split payment?\"}"' -ForegroundColor Gray
Write-Host "=================================================" -ForegroundColor Cyan
