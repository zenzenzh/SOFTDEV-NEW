param(
  [int]$Port = 8083,
  [string]$DeviceId = ""
)

$sdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
$adb = Join-Path $sdk "platform-tools\adb.exe"

if (-not (Test-Path $adb)) {
  Write-Error "adb.exe was not found at '$adb'. Install Android SDK Platform-Tools first."
  exit 1
}

& $adb start-server | Out-Null

if ([string]::IsNullOrWhiteSpace($DeviceId)) {
  $deviceLine = (& $adb devices) |
    Select-String "^\S+\s+device$" |
    Where-Object { $_.Line -notmatch "^emulator-" } |
    Select-Object -First 1

  if (-not $deviceLine) {
    Write-Error "No physical Android device detected. Connect your phone with USB debugging enabled."
    exit 1
  }

  $DeviceId = ($deviceLine.Line -split "\s+")[0]
}

Write-Host "Using device: $DeviceId"
& $adb -s $DeviceId reverse "tcp:$Port" "tcp:$Port"

if ($LASTEXITCODE -ne 0) {
  Write-Error "Failed to set adb reverse for port $Port."
  exit 1
}

$url = "exp://127.0.0.1:$Port/?platform=android&dev=true&hot=false"
Write-Host "Opening $url"
& $adb -s $DeviceId shell am start -a android.intent.action.VIEW -d $url

if ($LASTEXITCODE -ne 0) {
  Write-Error "Failed to launch Expo Go URL on device $DeviceId."
  exit 1
}

Write-Host "Expo Go launch command sent successfully."
