$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSCommandPath
$frontendDir = Join-Path $root "react-frontend"
$backendDir = Join-Path $root "backend"
$backendEnvPath = Join-Path $backendDir ".env"
$cloudflaredExe = Join-Path $root "tools\cloudflared\cloudflared.exe"
$cloudflaredLogPath = Join-Path $root "cloudflared.log"
$publicUrlPath = Join-Path $root "public-url.txt"
$frontendUrl = "http://127.0.0.1:5173"

function Write-Step($message) {
  Write-Host ""
  Write-Host "==> $message" -ForegroundColor Cyan
}

function Update-EnvValue($path, $key, $value) {
  $content = Get-Content -Path $path -Raw
  $escapedKey = [regex]::Escape($key)
  $replacement = "${key}=${value}"

  if ($content -match "(?m)^${escapedKey}=") {
    $updated = [regex]::Replace($content, "(?m)^${escapedKey}=.*$", $replacement)
  } else {
    $trimmed = $content.TrimEnd("`r", "`n")
    $updated = if ($trimmed) { "$trimmed`r`n$replacement`r`n" } else { "$replacement`r`n" }
  }

  Set-Content -Path $path -Value $updated -NoNewline
}

function Wait-ForHttpEndpoint($url, $timeoutSeconds = 90) {
  $deadline = (Get-Date).AddSeconds($timeoutSeconds)

  while ((Get-Date) -lt $deadline) {
    try {
      Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5 | Out-Null
      return $true
    } catch {
      Start-Sleep -Seconds 2
    }
  }

  return $false
}

function Wait-ForTunnelUrl($logPath, $timeoutSeconds = 90) {
  $deadline = (Get-Date).AddSeconds($timeoutSeconds)
  $pattern = "https://[-a-z0-9]+\.trycloudflare\.com"

  while ((Get-Date) -lt $deadline) {
    foreach ($path in $logPath) {
      if (Test-Path $path) {
        $content = Get-Content -Path $path -Raw -ErrorAction SilentlyContinue
        if ([string]::IsNullOrWhiteSpace($content)) {
          continue
        }

        $matches = [regex]::Matches($content, $pattern)
        if ($matches.Count -gt 0) {
          return $matches[0].Value
        }
      }
    }

    Start-Sleep -Seconds 2
  }

  return ""
}

function Get-ProcessInfoForPort($port) {
  $connection = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -First 1
  if (!$connection) {
    return $null
  }

  $process = Get-CimInstance Win32_Process -Filter "ProcessId = $($connection.OwningProcess)" -ErrorAction SilentlyContinue
  if (!$process) {
    return $null
  }

  return [PSCustomObject]@{
    Port = $port
    ProcessId = $process.ProcessId
    CommandLine = $process.CommandLine
  }
}

function Stop-ProjectProcessOnPort($port, $marker) {
  $processInfo = Get-ProcessInfoForPort -port $port
  if (!$processInfo) {
    return
  }

  if ($processInfo.CommandLine -and $processInfo.CommandLine.ToLower().Contains($marker.ToLower())) {
    Write-Host "Stopping existing process on port $port ($($processInfo.ProcessId))" -ForegroundColor DarkYellow
    Stop-Process -Id $processInfo.ProcessId -Force
    Start-Sleep -Seconds 2
  } else {
    throw "Port $port is already in use by another process. Close it first, then run this script again."
  }
}

function Stop-ProjectCloudflaredProcess() {
  $existingProcesses = Get-Process cloudflared -ErrorAction SilentlyContinue | Where-Object {
    try {
      $_.Path -and ([System.IO.Path]::GetFullPath($_.Path) -eq [System.IO.Path]::GetFullPath($cloudflaredExe))
    } catch {
      $false
    }
  }

  foreach ($process in $existingProcesses) {
    Write-Host "Stopping existing Cloudflare tunnel ($($process.Id))" -ForegroundColor DarkYellow
    Stop-Process -Id $process.Id -Force
    Start-Sleep -Seconds 1
  }
}

if (!(Test-Path $cloudflaredExe)) {
  throw "cloudflared was not found at $cloudflaredExe. Install it first, then run this script again."
}

if (!(Test-Path $backendEnvPath)) {
  throw "Backend .env file was not found at $backendEnvPath."
}

Write-Step "Checking for existing local servers"
Stop-ProjectProcessOnPort -port 5173 -marker (Join-Path $frontendDir "node_modules")
Stop-ProjectProcessOnPort -port 5000 -marker "server.js"

Write-Step "Starting frontend on $frontendUrl"
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "cd /d `"$frontendDir`" && npm run dev"

if (!(Wait-ForHttpEndpoint -url $frontendUrl)) {
  throw "Frontend did not become reachable on $frontendUrl within the expected time."
}

Write-Step "Opening Cloudflare Quick Tunnel"
Stop-ProjectCloudflaredProcess
if (Test-Path $cloudflaredLogPath) {
  Remove-Item -Path $cloudflaredLogPath -Force
}

$tunnelProcess = Start-Process `
  -FilePath "powershell.exe" `
  -ArgumentList @(
    "-NoProfile",
    "-Command",
    "& '$cloudflaredExe' tunnel --url $frontendUrl --loglevel info --no-autoupdate *> '$cloudflaredLogPath'"
  ) `
  -PassThru `
  -WindowStyle Hidden

$publicUrl = Wait-ForTunnelUrl -logPath @($cloudflaredLogPath)
if (!$publicUrl) {
  try {
    if (!$tunnelProcess.HasExited) {
      Stop-Process -Id $tunnelProcess.Id -Force
    }
  } catch {
  }

  throw "Cloudflare tunnel URL could not be detected from the cloudflared logs."
}

Set-Content -Path $publicUrlPath -Value $publicUrl

Write-Step "Updating backend public verification URL"
Update-EnvValue -path $backendEnvPath -key "PUBLIC_APP_URL" -value $publicUrl
Update-EnvValue -path $backendEnvPath -key "FRONTEND_URL" -value $publicUrl

Write-Step "Starting backend with public email-link URL"
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "cd /d `"$backendDir`" && npm run dev"

Write-Host ""
Write-Host "Public HTTPS URL:" -ForegroundColor Green
Write-Host $publicUrl -ForegroundColor Green
Write-Host ""
Write-Host "Use this exact public URL on every phone/laptop for signup and login." -ForegroundColor Yellow
Write-Host "Keep the frontend, backend, and tunnel windows open during your presentation." -ForegroundColor Yellow
Write-Host "The current public URL was also written to $publicUrlPath" -ForegroundColor Yellow
