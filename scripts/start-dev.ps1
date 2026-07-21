$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$preferredFrontendPort = 5173
$preferredBackendPort = 8010
$localHostName = "localhost"

function Test-PortAvailable {
  param(
    [int]$Port,
    [string]$HostName = "localhost"
  )

  $activeListeners = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners()
  if ($activeListeners | Where-Object { $_.Port -eq $Port }) {
    return $false
  }

  $listener = $null
  try {
    if ($HostName -eq "localhost") {
      $address = [System.Net.IPAddress]::Loopback
    }
    else {
      $address = [System.Net.IPAddress]::Parse($HostName)
    }
    $listener = [System.Net.Sockets.TcpListener]::new($address, $Port)
    $listener.Start()
    return $true
  }
  catch {
    return $false
  }
  finally {
    if ($listener) {
      $listener.Stop()
    }
  }
}

function Get-AvailablePort {
  param(
    [int]$StartPort,
    [int]$Attempts = 25
  )

  for ($offset = 0; $offset -lt $Attempts; $offset++) {
    $candidate = $StartPort + $offset
    if (Test-PortAvailable -Port $candidate) {
      return $candidate
    }
  }

  throw "No available local port found from $StartPort through $($StartPort + $Attempts - 1)."
}

$backendPort = Get-AvailablePort -StartPort $preferredBackendPort
$frontendPort = Get-AvailablePort -StartPort $preferredFrontendPort

Write-Host "Starting backend at http://${localHostName}:${backendPort}"
Write-Host "Starting frontend at http://${localHostName}:${frontendPort}"
Write-Host "Press Ctrl+C to stop both."

$backendJob = Start-Job -Name "40k-api" -ArgumentList $root, $backendPort -ScriptBlock {
  param($rootPath, $port)
  Set-Location $rootPath
  & powershell -ExecutionPolicy Bypass -File (Join-Path $rootPath "scripts/run-backend.ps1") -Reload -Port $port 2>&1 | ForEach-Object {
    "[api] $_"
  }
}

$frontendJob = Start-Job -Name "40k-frontend" -ArgumentList $root, $frontendPort, $backendPort, $localHostName -ScriptBlock {
  param($rootPath, $port, $apiPort, $hostName)
  $frontendPath = Join-Path $rootPath "frontend"
  Set-Location $frontendPath
  $env:VITE_API_BASE_URL = "http://${hostName}:${apiPort}"

  # Clear stale optimizer caches so workspace-hoisted packages resolve cleanly.
  @(".vite", ".vite-temp") | ForEach-Object {
    $cachePath = Join-Path (Join-Path $frontendPath "node_modules") $_
    if (Test-Path $cachePath) {
      Remove-Item -LiteralPath $cachePath -Recurse -Force -ErrorAction SilentlyContinue
    }
  }

  & npm --workspace frontend exec vite -- --host $hostName --port $port --strictPort 2>&1 | ForEach-Object {
    "[web] $_"
  }
}

$frontendUrl = "http://${localHostName}:${frontendPort}"
$openedFrontend = $false

try {
  while ($true) {
    Receive-Job -Job $backendJob, $frontendJob

    if (-not $openedFrontend) {
      try {
        $response = Invoke-WebRequest -UseBasicParsing $frontendUrl -TimeoutSec 1
        if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
          Start-Process $frontendUrl
          $openedFrontend = $true
          Write-Host "Opened $frontendUrl"
        }
      }
      catch {
        # Vite is still starting.
      }
    }

    $stoppedJob = @($backendJob, $frontendJob) | Where-Object {
      $_.State -in @("Completed", "Failed", "Stopped")
    } | Select-Object -First 1

    if ($stoppedJob) {
      Receive-Job -Job $backendJob, $frontendJob
      throw "$($stoppedJob.Name) stopped with state $($stoppedJob.State)."
    }

    Start-Sleep -Milliseconds 500
  }
}
finally {
  Stop-Job -Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
  Remove-Job -Job $backendJob, $frontendJob -Force -ErrorAction SilentlyContinue
  Write-Host "Stopped dev servers."
}
