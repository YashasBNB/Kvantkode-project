$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Path $MyInvocation.MyCommand.Path -Parent
$env:UPDATE_IF_OLD = "1"
if (-not $env:PY_TRADING_PATH) {
  $env:PY_TRADING_PATH = "C:\\Users\\$env:USERNAME\\Kvantcode\\python"
}
node "$scriptDir\update-python-weekly.js"
