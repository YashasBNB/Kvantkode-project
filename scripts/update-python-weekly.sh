#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export UPDATE_IF_OLD=1
# Override if needed
: "${PY_TRADING_PATH:=/Users/yashasnaidu/Kvantcode/python}"
exec node "$SCRIPT_DIR/update-python-weekly.js"
