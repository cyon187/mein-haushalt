# Baut windows\HaushaltRose.exe mit dem in Windows enthaltenen C#-Compiler (kein SDK nötig).
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$web = Split-Path $here

# App-Symbol aus icon.svg rendern (Edge headless): iPhone-Symbole ohne Ecken (iOS rundet selbst), Windows-Symbol mit runden Ecken
$edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
$tmp = Join-Path $env:TEMP 'haushalt-rose-icon'
New-Item -ItemType Directory -Force $tmp | Out-Null
function Render([int]$rx, [int]$size, [string]$out) {
  $svg = (Get-Content "$web\icon.svg" -Raw -Encoding UTF8).Replace('rx="RX"', "rx=""$rx""").Replace('<svg ', "<svg width=""$size"" height=""$size"" ")
  $html = Join-Path $tmp 'icon.html'
  [System.IO.File]::WriteAllText($html, "<!doctype html><html><body style='margin:0;overflow:hidden;background:transparent'>$svg</body></html>")
  if (Test-Path $out) { Remove-Item $out }
  Start-Process $edge -Wait -WindowStyle Hidden -ArgumentList '--headless=new', '--disable-gpu', '--hide-scrollbars', "--user-data-dir=$tmp\profile",
    '--default-background-color=00000000', "--window-size=$size,$size", "--screenshot=$out", ('file:///' + $html.Replace('\', '/'))
  if (-not (Test-Path $out)) { throw "Symbol $size px konnte nicht erzeugt werden" }
}
Render 0 180 "$web\icon-180.png"
Render 0 512 "$web\icon-512.png"
$sizes = 256, 48, 32, 16
$pngs = foreach ($s in $sizes) { Render 112 $s "$tmp\$s.png"; , [System.IO.File]::ReadAllBytes("$tmp\$s.png") }

# .ico mit allen Größen (PNG-Inhalt, ab Windows Vista unterstützt)
$ico = New-Object System.IO.MemoryStream
$w = New-Object System.IO.BinaryWriter $ico
$w.Write([uint16]0); $w.Write([uint16]1); $w.Write([uint16]$sizes.Count)
$offset = 6 + 16 * $sizes.Count
for ($i = 0; $i -lt $sizes.Count; $i++) {
  $b = [byte]($sizes[$i] % 256)   # 256 wird als 0 geschrieben
  $w.Write($b); $w.Write($b); $w.Write([byte]0); $w.Write([byte]0)
  $w.Write([uint16]1); $w.Write([uint16]32); $w.Write([uint32]$pngs[$i].Length); $w.Write([uint32]$offset)
  $offset += $pngs[$i].Length
}
foreach ($p in $pngs) { $w.Write($p) }
$w.Flush()
$icoBytes = $ico.ToArray()
# nur schreiben, wenn anders: der Explorer hält die angezeigte .ico oft gesperrt
$ico_ = "$here\HaushaltRose.ico"
if (-not (Test-Path $ico_) -or [Convert]::ToBase64String([System.IO.File]::ReadAllBytes($ico_)) -ne [Convert]::ToBase64String($icoBytes)) { [System.IO.File]::WriteAllBytes($ico_, $icoBytes) }

$csc = "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
$res = 'index.html', 'styles.css', 'calc.js', 'app.js', 'strom.js', 'zahlungen.js', 'einkauf.js', 'sparen.js', 'bilanz.js', 'geburtstage.js', 'icon-180.png', 'erinnerung.ics' | ForEach-Object { "/resource:$web\$_,$_" }
& $csc /nologo /target:winexe /optimize+ /reference:System.Management.dll "/win32icon:$here\HaushaltRose.ico" "/out:$here\HaushaltRose.exe" $res "$here\HaushaltRose.cs"
if ($LASTEXITCODE -ne 0) { throw "Build fehlgeschlagen" }
"Fertig: $here\HaushaltRose.exe"
