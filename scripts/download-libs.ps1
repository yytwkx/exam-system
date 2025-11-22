Param(
    [switch]$Force
)

function Write-Step($message) {
    Write-Host "==> $message" -ForegroundColor Cyan
}

function Invoke-FileDownload {
    Param(
        [Parameter(Mandatory=$true)][string]$Url,
        [Parameter(Mandatory=$true)][string]$Destination,
        [switch]$ForceDownload
    )

    if ((-not $ForceDownload) -and (Test-Path $Destination)) {
        Write-Host "    - 已存在: $Destination" -ForegroundColor DarkGray
        return
    }

    $directory = Split-Path $Destination -Parent
    if (-not (Test-Path $directory)) {
        New-Item -ItemType Directory -Path $directory -Force | Out-Null
    }

    Write-Host "    - 下载 $Url"
    Invoke-WebRequest -Uri $Url -OutFile $Destination
    Write-Host "    - 保存至 $Destination" -ForegroundColor Green
}

# 计算路径
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir   = Split-Path -Parent $scriptDir
$libsDir   = Join-Path $rootDir 'libs'
$fontsDir  = Join-Path $libsDir 'fonts'

New-Item -ItemType Directory -Path $libsDir -Force | Out-Null
New-Item -ItemType Directory -Path $fontsDir -Force | Out-Null

Write-Step "下载 Tailwind CSS JavaScript版本"
Invoke-FileDownload -Url 'https://cdn.tailwindcss.com' `
              -Destination (Join-Path $libsDir 'tailwindcss.min.js') `
              -ForceDownload:$Force

Write-Step "下载 Font Awesome 4.7.0 资源"
$fontFiles = @(
    @{ Name = 'fontawesome-webfont.eot';  Url = 'https://cdn.jsdelivr.net/npm/font-awesome@4.7.0/fonts/fontawesome-webfont.eot?v=4.7.0' },
    @{ Name = 'fontawesome-webfont.woff2';Url = 'https://cdn.jsdelivr.net/npm/font-awesome@4.7.0/fonts/fontawesome-webfont.woff2?v=4.7.0' },
    @{ Name = 'fontawesome-webfont.woff'; Url = 'https://cdn.jsdelivr.net/npm/font-awesome@4.7.0/fonts/fontawesome-webfont.woff?v=4.7.0' },
    @{ Name = 'fontawesome-webfont.ttf';  Url = 'https://cdn.jsdelivr.net/npm/font-awesome@4.7.0/fonts/fontawesome-webfont.ttf?v=4.7.0' },
    @{ Name = 'fontawesome-webfont.svg';  Url = 'https://cdn.jsdelivr.net/npm/font-awesome@4.7.0/fonts/fontawesome-webfont.svg?v=4.7.0' }
)

foreach ($font in $fontFiles) {
    Invoke-FileDownload -Url $font.Url `
                  -Destination (Join-Path $fontsDir $font.Name) `
                  -ForceDownload:$Force
}

$faCss = Join-Path $libsDir 'font-awesome.min.css'
Invoke-FileDownload -Url 'https://cdn.jsdelivr.net/npm/font-awesome@4.7.0/css/font-awesome.min.css' `
              -Destination $faCss `
              -ForceDownload:$Force

# 调整 CSS 中的字体路径，改为相对 libs/fonts
if (Test-Path $faCss) {
    (Get-Content $faCss) `
        -replace '\.\./fonts/', 'fonts/' `
        -replace '\?v=4\.7\.0', '' `
        | Set-Content $faCss
    Write-Host "    - 已更新 font-awesome.min.css 字体引用路径" -ForegroundColor Green
}

Write-Step 'Download SheetJS (xlsx.full.min.js)'
Invoke-FileDownload -Url 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js' `
              -Destination (Join-Path $libsDir 'xlsx.full.min.js') `
              -ForceDownload:$Force

Write-Step 'Dependencies downloaded.'
Write-Host 'Copy the libs directory together with the code before going offline.' -ForegroundColor Yellow

