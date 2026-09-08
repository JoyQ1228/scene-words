$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$pythonExe = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
if (!(Test-Path -LiteralPath $pythonExe)) {
    python -m venv .venv
    if ($LASTEXITCODE -ne 0) { throw 'Python 3.11+ is required.' }
}
& $pythonExe -c "import importlib.util, sys; sys.exit(0 if all(importlib.util.find_spec(m) for m in ('fastapi', 'uvicorn')) else 1)"
if ($LASTEXITCODE -ne 0) {
    & $pythonExe -m pip install -r requirements.txt
    if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
}
if (!(Test-Path -LiteralPath 'frontend\dist\index.html')) {
    npm.cmd ci --prefix frontend --cache .npm-cache
    if ($LASTEXITCODE -ne 0) { throw 'Frontend installation failed.' }
    npm.cmd run build --prefix frontend
    if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' }
}
Write-Host 'Scene Words: http://127.0.0.1:8765  (Ctrl+C to stop)' -ForegroundColor Green
& $pythonExe -m uvicorn backend.app:app --host 127.0.0.1 --port 8765
