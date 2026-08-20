param(
  [string]$InputPng = "$PSScriptRoot\..\assets\icon.png",
  [string]$OutputIco = "$PSScriptRoot\..\assets\icon.ico"
)

if (-not (Test-Path $InputPng)) {
  Write-Error "Input PNG not found: $InputPng"
  exit 1
}

Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile($InputPng)
$hIcon = $bmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$fs = [System.IO.File]::Open($OutputIco, [System.IO.FileMode]::Create)
$icon.Save($fs)
$fs.Close()

# cleanup
[System.Runtime.Interopservices.Marshal]::DestroyIcon($hIcon)
$bmp.Dispose()
$icon.Dispose()

Write-Output "Wrote $OutputIco"
