# Sends a text file to your Telegram chat through your own bot.
# Reads TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID from your Windows user environment variables.
# The token is never printed.
# Usage: powershell -ExecutionPolicy Bypass -File send-telegram.ps1 -MessageFile report.txt
param(
    [Parameter(Mandatory = $true)][string]$MessageFile
)

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

function Get-Setting([string]$Name) {
    $v = [Environment]::GetEnvironmentVariable($Name, 'Process')
    if (-not $v) { $v = [Environment]::GetEnvironmentVariable($Name, 'User') }
    return $v
}

$token = Get-Setting 'TELEGRAM_BOT_TOKEN'
$chatId = Get-Setting 'TELEGRAM_CHAT_ID'
if (-not $token) { Write-Output 'TELEGRAM_NOT_SET: TELEGRAM_BOT_TOKEN is missing. Set it with setx (see ads-tracker/README.md).'; exit 2 }
if (-not $chatId) { Write-Output 'TELEGRAM_NOT_SET: TELEGRAM_CHAT_ID is missing. Run get-telegram-chat-id.ps1 first.'; exit 2 }

$text = [IO.File]::ReadAllText((Resolve-Path $MessageFile), [Text.Encoding]::UTF8)
if ($text.Length -gt 4000) { $text = $text.Substring(0, 4000) + "`n…（内容太长，已截断）" }

$body = @{ chat_id = $chatId; text = $text; disable_web_page_preview = $true } | ConvertTo-Json -Compress
$bytes = [Text.Encoding]::UTF8.GetBytes($body)
try {
    $r = Invoke-RestMethod -Method Post -Uri "https://api.telegram.org/bot$token/sendMessage" -ContentType 'application/json; charset=utf-8' -Body $bytes
    if ($r.ok) { Write-Output "TELEGRAM_SENT message_id=$($r.result.message_id)" } else { Write-Output "TELEGRAM_FAILED $($r.description)"; exit 1 }
} catch {
    $msg = $_.Exception.Message -replace [regex]::Escape($token), '<token>'
    Write-Output "TELEGRAM_FAILED $msg"
    exit 1
}
