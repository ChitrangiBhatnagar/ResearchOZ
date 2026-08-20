$WshShell = New-Object -ComObject WScript.Shell
$ShortcutPath = "$env:PUBLIC\Desktop\ResearchOS.lnk"
$TargetPath = (Resolve-Path "$PSScriptRoot\..\launch-desktop.bat").Path
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $TargetPath
# Optional: set IconLocation to an .ico file placed at assets/icon.ico
$IconPath = Join-Path $PSScriptRoot '..\assets\icon.ico'
if (Test-Path $IconPath) { $Shortcut.IconLocation = (Resolve-Path $IconPath).Path }
$Shortcut.WorkingDirectory = (Resolve-Path "$PSScriptRoot\..").Path
$Shortcut.Save()
Write-Output "Created shortcut at $ShortcutPath"
