#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SYSTEMD_USER_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
SERVICE_NAME="void-update-python-weekly.service"
TIMER_NAME="void-update-python-weekly.timer"

# Ensure PY_TRADING_PATH default unless provided by caller
: "${PY_TRADING_PATH:=/Users/yashasnaidu/Kvantcode/python}"

use_systemd=false
if command -v systemctl >/dev/null 2>&1; then
  if systemctl --user show-environment >/dev/null 2>&1; then
    use_systemd=true
  fi
fi

if $use_systemd; then
  mkdir -p "$SYSTEMD_USER_DIR"
  install -m 0644 "$SCRIPT_DIR/systemd/$SERVICE_NAME" "$SYSTEMD_USER_DIR/$SERVICE_NAME"
  install -m 0644 "$SCRIPT_DIR/systemd/$TIMER_NAME" "$SYSTEMD_USER_DIR/$TIMER_NAME"

  # Add environment overrides via a drop-in to avoid editing the unit file
  OVERRIDE_DIR="$SYSTEMD_USER_DIR/${SERVICE_NAME%.service}.d"
  mkdir -p "$OVERRIDE_DIR"
  cat > "$OVERRIDE_DIR/override.conf" <<EOF
[Service]
Environment=PY_TRADING_PATH=$PY_TRADING_PATH
Environment=UPDATE_IF_OLD=1
EOF

  systemctl --user daemon-reload
  systemctl --user enable --now "$TIMER_NAME"
  echo "Enabled systemd user timer: $TIMER_NAME (runs weekly Monday 03:00)."
  echo "PY_TRADING_PATH=$PY_TRADING_PATH"
else
  # Fallback to cron (weekly Monday 03:00)
  CRON_LINE="0 3 * * 1 PY_TRADING_PATH=$PY_TRADING_PATH UPDATE_IF_OLD=1 /usr/bin/env bash \"$SCRIPT_DIR/update-python-weekly.sh\" >/dev/null 2>&1"
  # Install or update crontab entry idempotently
  (crontab -l 2>/dev/null | grep -v 'update-python-weekly.sh' || true; echo "$CRON_LINE") | crontab -
  echo "Installed cron entry for weekly updates (Monday 03:00)."
  echo "PY_TRADING_PATH=$PY_TRADING_PATH"
fi
