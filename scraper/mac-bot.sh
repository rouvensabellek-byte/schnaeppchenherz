#!/bin/bash
# Läuft per launchd auf dem Mac (eis.de sperrt die Server von GitHub aus).
# Arbeitet in einem eigenen Klon, damit dein Arbeitsordner unangetastet bleibt.
set -u
BOT="$HOME/Library/Application Support/schnaeppchenherz-bot"
NODE="$HOME/.local/share/fnm/aliases/default/bin/node"
export GIT_SSH_COMMAND="ssh -i '$BOT/deploy_key' -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new"
export NTFY_TOPIC="$(cat "$BOT/ntfy_topic")"
# Optional: SMS-Zugangsdaten (TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM, SMS_TO) als KEY=Wert-Zeilen
[ -f "$BOT/sms.env" ] && set -a && . "$BOT/sms.env" && set +a

cd "$BOT/repo" || exit 1
echo "== $(date)"

for attempt in 1 2; do
  git fetch -q origin main && git reset -q --hard origin/main || exit 1
  "$NODE" scraper/scrape.mjs || exit 1
  git add data
  git diff --cached --quiet && exit 0
  git -c user.name="deal-bot (Mac)" -c user.email="deal-bot@users.noreply.github.com" \
    commit -q -m "Daten $(date -u +'%Y-%m-%d %H:%M') (Mac)"
  git push -q origin main && exit 0
  echo "Push abgelehnt, neuer Versuch"
done
exit 1
