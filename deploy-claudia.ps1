Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

$SERVER     = "claudia@192.168.1.130"
$DEPLOY_DIR = "/home/claudia/n8n-dashboard"   # ajustar si el directorio es diferente
$KEY_PATH   = Resolve-Path "~/.ssh/id_rsa"

Write-Host "==> Pushing to GitHub..." -ForegroundColor Cyan
git add -A
$commitResult = git commit -m "deploy: $(Get-Date -Format 'yyyy-MM-dd HH:mm')" 2>&1
if ($LASTEXITCODE -ne 0) { Write-Host "Nothing to commit, deploying current HEAD" -ForegroundColor Yellow }
git push

Write-Host "==> Connecting to $SERVER..." -ForegroundColor Cyan
Import-Module Posh-SSH

# Lee la contraseña de la variable de entorno DEPLOY_PASS para no hardcodearla
# Antes de ejecutar: $env:DEPLOY_PASS = "tu_contraseña"
$rawPass = if ($env:DEPLOY_PASS) { $env:DEPLOY_PASS } else { Read-Host "Contraseña SSH para claudia@192.168.1.130" -AsSecureString | ConvertFrom-SecureString | ConvertTo-SecureString }
$pass    = if ($rawPass -is [securestring]) { $rawPass } else { ConvertTo-SecureString $rawPass -AsPlainText -Force }
$cred    = New-Object System.Management.Automation.PSCredential("claudia", $pass)
$session = New-SSHSession -ComputerName "192.168.1.130" -Credential $cred -KeyFile $KEY_PATH -AcceptKey -Force

if (-not $session) {
    Write-Host "ERROR: No se pudo conectar al servidor." -ForegroundColor Red
    exit 1
}

Write-Host "  -> git pull" -ForegroundColor Gray
Invoke-SSHCommand -SessionId $session.SessionId -Command "cd $DEPLOY_DIR && git pull" |
    Select-Object -ExpandProperty Output

Write-Host "  -> node server.js (restart)" -ForegroundColor Gray
# Para producción se asume que el proceso corre con pm2. Ajustar si usa docker/systemd.
Invoke-SSHCommand -SessionId $session.SessionId -Command "
    cd $DEPLOY_DIR
    if command -v pm2 &>/dev/null; then
        pm2 restart n8n-dashboard 2>/dev/null || pm2 start server.js --name n8n-dashboard
    else
        pkill -f 'node server.js' 2>/dev/null; nohup node server.js > /tmp/n8n-dash.log 2>&1 &
    fi
" | Select-Object -ExpandProperty Output

Write-Host "  -> Comprobando proceso..." -ForegroundColor Gray
Start-Sleep -Seconds 3
Invoke-SSHCommand -SessionId $session.SessionId -Command 'ps aux | grep "node server.js" | grep -v grep' |
    Select-Object -ExpandProperty Output

Remove-SSHSession -SessionId $session.SessionId | Out-Null

Write-Host ""
Write-Host "Deploy completado. http://192.168.1.130:3000" -ForegroundColor Green
