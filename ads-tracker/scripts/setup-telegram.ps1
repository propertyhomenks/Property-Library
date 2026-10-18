# One-step Telegram setup: asks for your bot token (hidden as you paste), saves it,
# finds the group's chat ID and sends a test message.
# Before running: add the bot to the group and send /start@<your_bot_name> in the group.
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$secure = Read-Host '贴上 BotFather 给你的 bot token，然后按 Enter（贴上时不会显示）' -AsSecureString
$token = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)).Trim()
if ($token -notmatch '^\d{8,10}:[A-Za-z0-9_-]{30,40}$') { Write-Host '这不像 bot token。token 是数字开头、中间一个冒号、后面一串字母数字。请重跑一次。' -ForegroundColor Red; exit 2 }

try {
    $me = Invoke-RestMethod "https://api.telegram.org/bot$token/getMe"
} catch {
    Write-Host 'Telegram 不认这个 token（可能已经 /revoke 过）。请到 BotFather 复制最新的 token 再重跑。' -ForegroundColor Red; exit 1
}
[Environment]::SetEnvironmentVariable('TELEGRAM_BOT_TOKEN', $token, 'User')
Write-Host "Token 已保存。Bot：@$($me.result.username)" -ForegroundColor Green

$u = Invoke-RestMethod "https://api.telegram.org/bot$token/getUpdates"
$chats = @($u.result | ForEach-Object { if ($_.message) { $_.message.chat } elseif ($_.my_chat_member) { $_.my_chat_member.chat } elseif ($_.channel_post) { $_.channel_post.chat } } | Where-Object { $_ } | Sort-Object id -Unique)
$groups = @($chats | Where-Object { $_.type -in @('group', 'supergroup') })
$pick = if ($groups.Count) { $groups[0] } elseif ($chats.Count) { $chats[0] } else { $null }
if (-not $pick) { Write-Host "还找不到群。请在群里发 /start@$($me.result.username) 然后重跑这个脚本。" -ForegroundColor Yellow; exit 3 }

[Environment]::SetEnvironmentVariable('TELEGRAM_CHAT_ID', [string]$pick.id, 'User')
Write-Host "Chat 已保存：$($pick.title)$($pick.first_name)（$($pick.id)）" -ForegroundColor Green

$body = @{ chat_id = $pick.id; text = '✅ 广告日报 bot 连接成功，每天 9:00 会在这里发 Ng Kar Siong 的数据。' } | ConvertTo-Json -Compress
Invoke-RestMethod -Method Post -Uri "https://api.telegram.org/bot$token/sendMessage" -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($body)) | Out-Null
Write-Host '测试讯息已发到群里。可以回 Claude 说「好了」。' -ForegroundColor Green
