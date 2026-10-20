#!/usr/bin/env bash
# Sends a UTF-8 text file to the Telegram group through the bot.
# Reads TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID from the environment (set them in the
# cloud environment's settings, never in a file or prompt). The token is never printed.
# Usage: bash ads-tracker/scripts/send-telegram.sh report.txt
set -u
file="${1:?usage: send-telegram.sh <message-file>}"
if [ -z "${TELEGRAM_BOT_TOKEN:-}" ] || [ -z "${TELEGRAM_CHAT_ID:-}" ]; then
  echo "TELEGRAM_NOT_SET: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing from the environment."
  exit 2
fi
body=$(python3 - "$file" <<'PY'
import json, os, sys
text = open(sys.argv[1], encoding="utf-8").read()
if len(text) > 4000:
    text = text[:4000] + "\n…（内容太长，已截断）"
print(json.dumps({"chat_id": os.environ["TELEGRAM_CHAT_ID"], "text": text, "disable_web_page_preview": True}, ensure_ascii=False))
PY
) || { echo "TELEGRAM_FAILED could not read the message file"; exit 1; }
resp=$(curl -sS -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  -H 'Content-Type: application/json; charset=utf-8' --data-binary "$body" 2>&1)
resp="${resp//${TELEGRAM_BOT_TOKEN}/<token>}"
if printf '%s' "$resp" | grep -q '"ok":true'; then
  echo "TELEGRAM_SENT $(printf '%s' "$resp" | grep -o '"message_id":[0-9]*')"
else
  echo "TELEGRAM_FAILED $resp"
  exit 1
fi
