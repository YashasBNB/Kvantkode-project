param(
    [string]$PyTradingPath = "C:\\Users\\$env:USERNAME\\Kvantcode\\python",
    [string]$TaskName = "Void Update Python Weekly"
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$updateScript = Join-Path $scriptDir 'update-python-weekly.ps1'

# Build action to run PowerShell with our script
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$updateScript`""

# Weekly at Monday 3:00 AM
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 3:00am

# Pass environment via registered task (Win10+ supports)
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel LeastPrivilege
$settings = New-ScheduledTaskSettingsSet -Compatibility Win8 -StartWhenAvailable -AllowStartIfOnBatteries

# Register or update
try {
    if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    }
    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings | Out-Null
    # Set environment by wrapping in a small runner that exports env then calls the script
    $runner = Join-Path $scriptDir 'update-python-weekly-runner.ps1'
    $envBlock = @"
$Env:PY_TRADING_PATH = '$PyTradingPath'
$Env:UPDATE_IF_OLD = '1'
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$updateScript"
"@
    $envBlock | Set-Content -Path $runner -Encoding UTF8
    # Update task action to use runner
    $newAction = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runner`""
    Set-ScheduledTask -TaskName $TaskName -Action $newAction | Out-Null
    Write-Host "Scheduled Task '$TaskName' registered for weekly Monday 03:00 with PY_TRADING_PATH=$PyTradingPath"
} catch {
    Write-Error $_
    throw
}
