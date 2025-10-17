# test_chat.ps1 - Test rapido del endpoint de chat

Write-Host "Test Chat Endpoint" -ForegroundColor Cyan

# 1. Health check
Write-Host "`n1. Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri http://localhost:8000/health -UseBasicParsing
    Write-Host "OK Health: $($health.StatusCode)" -ForegroundColor Green
    Write-Host $health.Content
} catch {
    Write-Host "FAILED Health: $_" -ForegroundColor Red
    exit 1
}

# 2. Chat test
Write-Host "`n2. Chat Message Test..." -ForegroundColor Yellow

$body = @{
    user_id = "test_user"
    session_id = "test_session_$(Get-Date -Format 'HHmmss')"
    message = "Hola, estoy probando el chat desde PowerShell"
} | ConvertTo-Json

Write-Host "Enviando: $body" -ForegroundColor Gray

try {
    $response = Invoke-WebRequest `
        -Uri http://localhost:8000/api/v1/chat/message `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -UseBasicParsing `
        -TimeoutSec 10

    Write-Host "OK Chat Response: $($response.StatusCode)" -ForegroundColor Green
    $json = $response.Content | ConvertFrom-Json
    Write-Host "`nRespuesta del agente:" -ForegroundColor Cyan
    Write-Host $json.response -ForegroundColor White
    Write-Host "`nConversation ID: $($json.conversation_id)" -ForegroundColor Gray
} catch {
    Write-Host "FAILED Chat: $_" -ForegroundColor Red
    Write-Host "StatusCode: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    exit 1
}

Write-Host "`nTodos los tests pasaron!" -ForegroundColor Green
