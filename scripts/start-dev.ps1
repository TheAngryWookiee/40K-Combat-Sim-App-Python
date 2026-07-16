$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$preferredFrontendPort = 5173
$preferredBackendPort = 8010

function Test-PortAvailable {
  param(
    [int]$Port,
    [string]$HostName = "127.0.0.1"
  )

  $listener = $null
  try {
    $address = [System.Net.IPAddress]::Parse($HostName)
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

Write-Host "Starting backend at http://127.0.0.1:$backendPort"
Write-Host "Starting frontend at http://127.0.0.1:$frontendPort"
Write-Host "Press Ctrl+C to stop both."

$backendJob = Start-Job -Name "40k-api" -ArgumentList $root, $backendPort -ScriptBlock {
  param($rootPath, $port)
  Set-Location $rootPath
  & powershell -ExecutionPolicy Bypass -File (Join-Path $rootPath "scripts/run-backend.ps1") -Reload -Port $port 2>&1 | ForEach-Object {
    "[api] $_"
  }
}

$frontendJob = Start-Job -Name "40k-frontend" -ArgumentList $root, $frontendPort, $backendPort -ScriptBlock {
  param($rootPath, $port, $apiPort)
  Set-Location (Join-Path $rootPath "frontend")
  $env:VITE_API_BASE_URL = "http://127.0.0.1:$apiPort"
  $vite = Join-Path $rootPath "frontend\node_modules\.bin\vite.cmd"
  & $vite --host 127.0.0.1 --port $port --strictPort 2>&1 | ForEach-Object {
    "[web] $_"
  }
}

$frontendUrl = "http://127.0.0.1:$frontendPort"
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
