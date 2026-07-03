$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$frontendPort = "5173"
$backendPort = "8000"
$venvPython = Join-Path $root ".venv\Scripts\python.exe"
$python = if (Test-Path $venvPython) { $venvPython } else { "python" }

Write-Host "Starting backend at http://127.0.0.1:$backendPort"
Write-Host "Starting frontend at http://127.0.0.1:$frontendPort"
Write-Host "Press Ctrl+C to stop both."

$backendJob = Start-Job -Name "40k-api" -ArgumentList $root, $python, $backendPort -ScriptBlock {
  param($rootPath, $pythonExe, $port)
  Set-Location $rootPath
  & $pythonExe -m uvicorn api:app --reload --host 127.0.0.1 --port $port 2>&1 | ForEach-Object {
    "[api] $_"
  }
}

$frontendJob = Start-Job -Name "40k-frontend" -ArgumentList $root, $frontendPort -ScriptBlock {
  param($rootPath, $port)
  $null = $port
  Set-Location $rootPath
  & npm --workspace frontend run dev 2>&1 | ForEach-Object {
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
