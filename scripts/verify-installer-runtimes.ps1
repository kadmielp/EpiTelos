$ErrorActionPreference = 'Stop'

$project = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$resources = Join-Path $project 'src-tauri\resources\local_gguf'
$nsisScript = Join-Path $project 'src-tauri\target\release\nsis\x64\installer.nsi'
$version = (Get-Content (Join-Path $project 'package.json') -Raw | ConvertFrom-Json).version
$installer = Join-Path $project "src-tauri\target\release\bundle\nsis\EpiTelos_${version}_x64-setup.exe"

if (!(Test-Path -LiteralPath $nsisScript -PathType Leaf)) { throw "NSIS script was not generated: $nsisScript" }
if (!(Test-Path -LiteralPath $installer -PathType Leaf)) { throw "Installer was not generated: $installer" }

$scriptText = [System.IO.File]::ReadAllText($nsisScript)
$checked = 0
foreach ($backend in @('cpu', 'cuda', 'vulkan')) {
    $backendDir = Join-Path $resources $backend
    $files = @(Get-ChildItem -LiteralPath $backendDir -File | Where-Object { $_.Extension -eq '.dll' -or $_.Name -eq 'llama-server.exe' })
    if (!($files | Where-Object Name -eq 'llama-server.exe')) { throw "Missing $backend llama-server.exe in build resources" }
    if (!($files | Where-Object Name -eq 'llama-server-impl.dll')) { throw "Missing $backend llama-server-impl.dll in build resources" }
    foreach ($file in $files) {
        $entry = "/oname=resources\local_gguf\$backend\$($file.Name)`""
        if (!$scriptText.Contains($entry)) { throw "Installer omits $backend/$($file.Name) at the app's runtime path" }
        $checked++
    }
}

Write-Host "Verified $checked GGUF runtime files in $installer"
