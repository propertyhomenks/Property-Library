# Finds your Telegram chat ID and saves it as TELEGRAM_CHAT_ID.
# First send any message (for example /start) to your bot in Telegram, then run this.
# Reads TELEGRAM_BOT_TOKEN from your Windows user environment variables. The token is never printed.
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$token = [Environment]::GetEnvironmentVariable('TELEGRAM_BOT_TOKEN', 'Process')
if (-not $token) { $token = [Environment]::GetEnvironmentVariable('TELEGRAM_BOT_TOKEN', 'User') }
if (-not $token) { Write-Output 'TELEGRAM_BOT_TOKEN is missing. Run: setx TELEGRAM_BOT_TOKEN "your-token" and open a new terminal.'; exit 2 }

try {
    $me = Invoke-RestMethod "https://api.telegram.org/bot$token/getMe"
    Write-Output "Bot: @$($me.result.username)"
    $u = Invoke-RestMethod "https://api.telegram.org/bot$token/getUpdates"
} catch {
    Write-Output ('Telegram refused the token: ' + ($_.Exception.Message -replace [regex]::Escape($token), '<token>'))
    exit 1
}

$chats = @($u.result | ForEach-Object { if ($_.message) { $_.message.chat } elseif ($_.channel_post) { $_.channel_post.chat } } | Where-Object { $_ } | Sort-Object id -Unique)
if ($chats.Count -eq 0) { Write-Output 'No messages found yet. Send /start to your bot in Telegram, then run this again.'; exit 3 }

$chats | ForEach-Object { Write-Output ("chat_id={0}  type={1}  name={2}{3}" -f $_.id, $_.type, $_.first_name, $_.title) }
$pick = $chats[0]
[Environment]::SetEnvironmentVariable('TELEGRAM_CHAT_ID', [string]$pick.id, 'User')
Write-Output "Saved TELEGRAM_CHAT_ID=$($pick.id). The daily report will go to this chat."
