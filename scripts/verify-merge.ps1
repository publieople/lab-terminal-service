#Requires -Version 7.0
<#
.SYNOPSIS
    「并入主书演练」：把终端服务部这一章拷到一个干净的主书骨架里，跑 mkdocs build --strict，数断链。

.DESCRIPTION
    做四件事（对应《并入主书说明》§五）：
      1. 在系统临时目录建一个干净工作区；
      2. 把本仓库 docs\部门\终端服务部\ 整棵拷成 <临时>\docs\部门\终端服务部\；
      3. 用 nav.片段.yml 生成一个最小的 mkdocs.yml，在该工作区跑 mkdocs build --strict；
      4. 统计断链/未找到文档条数与警告总条数，逐条列出「哪个文件 → 哪个目标」。

    退出码：0 = 可以并入（断链 0 且构建通过）；1 = 有断链或构建失败。

.PARAMETER Keep
    保留临时工作区并打印路径（排查用）。

.EXAMPLE
    pwsh scripts\verify-merge.ps1

.EXAMPLE
    pwsh scripts\verify-merge.ps1 -Keep
#>
[CmdletBinding()]
param(
    [switch]$Keep
)

$ErrorActionPreference = 'Stop'
# 原生命令的非零退出码由脚本自己判断，不要变成 PowerShell 异常。
if (Test-Path variable:PSNativeCommandUseErrorActionPreference) {
    $PSNativeCommandUseErrorActionPreference = $false
}

$script:RepoRoot = Split-Path -Parent $PSScriptRoot
$script:Work = $null
$script:SysTemp = $null

function Remove-TempWork {
    <# 只删"确实位于系统临时目录之下"的路径，避免手滑删掉别的东西。 #>
    param([string]$Path, [string]$TempRoot)

    if ([string]::IsNullOrWhiteSpace($Path)) { return }
    $full = [System.IO.Path]::GetFullPath($Path)
    $root = [System.IO.Path]::GetFullPath($TempRoot).TrimEnd('\', '/')
    $prefix = $root + [System.IO.Path]::DirectorySeparatorChar

    if (-not $full.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        Write-Warning "拒绝删除：$full 不在系统临时目录 $root 之下。"
        return
    }
    if (-not (Test-Path -LiteralPath $full)) { return }
    Remove-Item -LiteralPath $full -Recurse -Force -ErrorAction SilentlyContinue
}

function Invoke-Cleanup {
    if ($Keep) {
        if ($script:Work -and (Test-Path -LiteralPath $script:Work)) {
            Write-Host "（-Keep）临时工作区保留在：$($script:Work)"
        }
        return
    }
    if ($script:Work) { Remove-TempWork -Path $script:Work -TempRoot $script:SysTemp }
}

function Fail {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
    Invoke-Cleanup
    exit 1
}

Write-Host '=== 并入主书演练（verify-merge） ==='
Write-Host "仓库根：$script:RepoRoot"

$chapterSrc = Join-Path $script:RepoRoot 'docs\部门\终端服务部'
$navFragment = Join-Path $script:RepoRoot 'nav.片段.yml'
$venvMkDocs = Join-Path $script:RepoRoot '.venv\Scripts\mkdocs.exe'

if (-not (Test-Path -LiteralPath $chapterSrc -PathType Container)) {
    Fail "找不到章节目录：$chapterSrc"
}
if (-not (Test-Path -LiteralPath $navFragment -PathType Leaf)) {
    Fail "找不到导航片段：$navFragment"
}

# ---- 1. 干净工作区 ---------------------------------------------------------

$script:SysTemp = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath()).TrimEnd('\', '/')
$script:Work = Join-Path $script:SysTemp ('lab-terminal-service-merge-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory -Path $script:Work -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $script:Work 'docs\部门') -Force | Out-Null
Write-Host "临时工作区：$($script:Work)"

# ---- 2. 拷章 ---------------------------------------------------------------

$chapterDst = Join-Path $script:Work 'docs\部门\终端服务部'
Copy-Item -LiteralPath $chapterSrc -Destination $chapterDst -Recurse -Force

$copiedPages = @(Get-ChildItem -LiteralPath $chapterDst -Recurse -File -Filter '*.md' -ErrorAction SilentlyContinue)
Write-Host "拷入 .md 页面：$($copiedPages.Count) 个"
if ($copiedPages.Count -eq 0) {
    Write-Warning '章节目录里一个 .md 都没有；下面的断链统计会把 nav 里的每一条都报出来。'
}

# ---- 3. 生成最小 mkdocs.yml 并构建 -----------------------------------------

$navLines = @(
    Get-Content -LiteralPath $navFragment -Encoding utf8 |
        Where-Object { $_.Trim() -ne '' -and -not $_.TrimStart().StartsWith('#') }
)
if ($navLines.Count -eq 0) {
    Fail "nav.片段.yml 里没有可用的 nav 条目。"
}

$configLines = @(
    '# 本文件由 scripts\verify-merge.ps1 生成：只为验证「这一章并进主书后能不能过 --strict」。'
    '# 下面两项必须与本仓库 mkdocs.yml 保持一致，否则演练出来的锚点行为跟正式站不是一回事，'
    '# 等于验了个假的：'
    '#   - toc.slugify     中文标题在没有它的时候会退化成 `_2` 这种按顺序编号的兜底锚点；'
    '#   - validation.links.anchors  默认 info 不阻断构建，提到 warn 才会让坏锚点把构建打红。'
    'site_name: 终端服务部并入主书演练'
    'docs_dir: docs'
    'site_dir: site'
    'validation:'
    '  links:'
    '    anchors: warn'
    'markdown_extensions:'
    '  - toc:'
    '      slugify: !!python/object/apply:pymdownx.slugs.slugify {kwds: {case: lower}}'
    'nav:'
) + $navLines

$configPath = Join-Path $script:Work 'mkdocs.yml'
[System.IO.File]::WriteAllText(
    $configPath,
    (($configLines -join "`n") + "`n"),
    (New-Object System.Text.UTF8Encoding($false))
)
Write-Host "已生成最小配置：$configPath"

$mkdocsCmd = $null
if (Test-Path -LiteralPath $venvMkDocs -PathType Leaf) {
    $mkdocsCmd = @($venvMkDocs)
    Write-Host "使用虚拟环境里的 mkdocs：$venvMkDocs"
}
else {
    $py = Get-Command python -ErrorAction SilentlyContinue
    if (-not $py) { $py = Get-Command py -ErrorAction SilentlyContinue }
    if ($py) {
        $mkdocsCmd = @($py.Source, '-m', 'mkdocs')
        Write-Host "未找到 .venv\Scripts\mkdocs.exe，回退到：$($py.Source) -m mkdocs"
    }
}
if (-not $mkdocsCmd) {
    Fail @'
没有可用的 mkdocs。请先在仓库根建虚拟环境并装依赖：
    python -m venv .venv
    .\.venv\Scripts\python -m pip install -r requirements-docs.txt
然后重新运行：pwsh scripts\verify-merge.ps1
'@
}

$env:PYTHONIOENCODING = 'utf-8'
$exe = $mkdocsCmd[0]
$prefixArgs = @()
if ($mkdocsCmd.Count -gt 1) { $prefixArgs = $mkdocsCmd[1..($mkdocsCmd.Count - 1)] }

Write-Host '正在跑 mkdocs build --strict ...'
Push-Location -LiteralPath $script:Work
try {
    $rawOutput = & $exe @prefixArgs build --strict 2>&1
    $buildExit = $LASTEXITCODE
}
catch {
    $rawOutput = @($_.Exception.Message)
    $buildExit = 1
}
finally {
    Pop-Location -ErrorAction SilentlyContinue
}
if ($null -eq $buildExit) { $buildExit = 0 }

$outLines = @($rawOutput | ForEach-Object { [string]$_ })

# ---- 4. 统计 ---------------------------------------------------------------

$warningLines = @($outLines | Where-Object { $_ -match '^\s*WARNING\s*-' })
$errorLines = @($outLines | Where-Object { $_ -match '^\s*ERROR\s*-' })

$linkBroken = [System.Collections.Generic.List[object]]::new()
$anchorBroken = [System.Collections.Generic.List[object]]::new()
$navBroken = [System.Collections.Generic.List[object]]::new()
$seen = [System.Collections.Generic.HashSet[string]]::new()

foreach ($line in $outLines) {
    # 锚点这一类必须排在"链接目标"之前判断：mkdocs 报坏锚点时用的句子
    # 也含 "contains a link '...'"，下面那条更宽的正则会把它们一起吞掉，
    # 报出来就变成一段莫名其妙的文件名（`README.md#三组织与分工`），
    # 而且计数会和"警告总条数 0"自相矛盾——之前就是这么误导人的。
    $anchorMatch = [regex]::Match(
        $line,
        "Doc file '([^']*)' contains a link '([^']*)', but the doc '([^']*)' does not contain an anchor '([^']*)'"
    )
    if ($anchorMatch.Success) {
        $key = 'anchor|' + $anchorMatch.Groups[1].Value + '|' + $anchorMatch.Groups[4].Value
        if ($seen.Add($key)) {
            $anchorBroken.Add([pscustomobject]@{
                    From   = $anchorMatch.Groups[1].Value
                    Target = $anchorMatch.Groups[3].Value
                    Anchor = $anchorMatch.Groups[4].Value
                })
        }
        continue
    }

    $linkMatch = [regex]::Match(
        $line,
        "Doc file '([^']*)' contains (?:an unrecognized relative link|a link) '([^']*)'(?:,\s*but the target '([^']*)' is not found among documentation files)?"
    )
    if ($linkMatch.Success) {
        $from = $linkMatch.Groups[1].Value
        $link = $linkMatch.Groups[2].Value
        $to = $link
        if ($linkMatch.Groups[3].Success -and $linkMatch.Groups[3].Value) { $to = $linkMatch.Groups[3].Value }
        $key = "link|$from|$to"
        if ($seen.Add($key)) {
            $linkBroken.Add([pscustomobject]@{ From = $from; To = $to })
        }
        continue
    }

    $navMatch = [regex]::Match(
        $line,
        "A reference to '([^']*)' is included in the 'nav' configuration, which is not found in the documentation files"
    )
    if ($navMatch.Success) {
        $to = $navMatch.Groups[1].Value
        $key = "nav|$to"
        if ($seen.Add($key)) {
            $navBroken.Add([pscustomobject]@{ From = '(nav 配置)'; To = $to })
        }
    }
}

$broken = [System.Collections.Generic.List[object]]::new()
foreach ($x in $navBroken) { $broken.Add($x) }
foreach ($x in $linkBroken) { $broken.Add($x) }
foreach ($x in $anchorBroken) { $broken.Add($x) }

Write-Host ''
Write-Host '--- 构建结果 ---'
Write-Host "mkdocs 退出码：$buildExit"
Write-Host "警告总条数：$($warningLines.Count)"
Write-Host "错误总条数：$($errorLines.Count)"
Write-Host "断链/未找到文档：$($broken.Count) 处（nav $($navBroken.Count) · 链接目标 $($linkBroken.Count) · 锚点 $($anchorBroken.Count)）"

if ($navBroken.Count -gt 0) {
    Write-Host ''
    Write-Host 'nav 指向了不存在的文件：'
    foreach ($item in $navBroken) { Write-Host "  $($item.From)  →  $($item.To)" }
}

if ($linkBroken.Count -gt 0) {
    Write-Host ''
    Write-Host '链接的目标文件不存在（哪个文件 → 哪个目标）：'
    foreach ($item in $linkBroken) { Write-Host "  $($item.From)  →  $($item.To)" }
}

if ($anchorBroken.Count -gt 0) {
    Write-Host ''
    Write-Host '锚点不存在（标题被改过，或者标题里的汉字没有被正确转成锚点）：'
    foreach ($item in $anchorBroken) {
        Write-Host "  $($item.From)  →  $($item.Target) 的 $($item.Anchor)"
    }
    Write-Host '  提示：中文标题若得到 `_2` 这类按顺序编号的锚点，说明主书漏了 toc.slugify 配置。'
}

if ($broken.Count -gt 0) {
    Write-Host ''
    Write-Host "❌ 有 $($broken.Count) 处断链，先修完再并入主书。" -ForegroundColor Red
    Invoke-Cleanup
    exit 1
}

if ($buildExit -ne 0) {
    Write-Host ''
    Write-Host '构建输出最后 20 行：'
    $tail = $outLines | Select-Object -Last 20
    foreach ($line in $tail) { Write-Host "  $line" }

    if ($outLines -match 'No module named mkdocs') {
        Write-Host ''
        Write-Host '这个 Python 里没有装 mkdocs。先在仓库根建虚拟环境并装依赖：' -ForegroundColor Yellow
        Write-Host '  python -m venv .venv'
        Write-Host '  .\.venv\Scripts\python -m pip install -r requirements-docs.txt'
    }

    Write-Host ''
    Write-Host "❌ 构建未通过（退出码 $buildExit，$($warningLines.Count) 条警告），先看上面对应的问题。" -ForegroundColor Red
    Invoke-Cleanup
    exit 1
}

Write-Host ''
Write-Host '✅ 可以并入' -ForegroundColor Green
Invoke-Cleanup
exit 0
