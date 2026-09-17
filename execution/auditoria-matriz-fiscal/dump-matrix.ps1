<#
  dump-matrix.ps1 — Camada 3 (extração determinística)

  Converte a aba "MATRIZ REFORMA" de uma planilha COESA (.xlsx) em um JSON
  determinístico, consumido pelo motor de auditoria (audit.mjs).

  Uso:
    pwsh execution/auditoria-matriz-fiscal/dump-matrix.ps1 `
      -Xlsx "C:\caminho\COESA_Matriz_Fiscal_Reforma_LO_Restaurante.xlsx" `
      -Out  ".tmp/auditoria/matrix.json"

  Sem dependências externas: usa System.IO.Compression + XmlReader.
  O .xlsx é dado privado do cliente -> a saída vai para .tmp/ (efêmero).
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory)][string]$Xlsx,
  [string]$Out = ".tmp/auditoria/matrix.json",
  [string]$SheetName = "MATRIZ REFORMA",
  [int]$HeaderRow = 4
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $Xlsx)) { throw "Planilha não encontrada: $Xlsx" }

Add-Type -AssemblyName System.IO.Compression.FileSystem

function Convert-ColToNum([string]$col) {
  $n = 0
  foreach ($ch in $col.ToCharArray()) { $n = $n * 26 + ([int][char]$ch - 64) }
  return $n
}

# 1. Extrair o zip para um diretório temporário
$tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("coesa_matrix_" + [System.IO.Path]::GetRandomFileName())
[System.IO.Compression.ZipFile]::ExtractToDirectory($Xlsx, $tmp)

try {
  # 2. Descobrir qual sheetN.xml corresponde ao nome da aba pedida
  [xml]$wb = Get-Content (Join-Path $tmp "xl\workbook.xml") -Raw
  [xml]$rels = Get-Content (Join-Path $tmp "xl\_rels\workbook.xml.rels") -Raw
  $sheet = $wb.workbook.sheets.sheet | Where-Object { $_.name -eq $SheetName }
  if (-not $sheet) { throw "Aba '$SheetName' não encontrada no workbook." }
  $rid = $sheet.id
  $rel = $rels.Relationships.Relationship | Where-Object { $_.Id -eq $rid }
  $target = ($rel.Target -replace '^/xl/', '' -replace '^xl/', '')
  $sheetPath = Join-Path $tmp ("xl\" + ($target -replace '/', '\'))
  if (-not (Test-Path $sheetPath)) { throw "Arquivo da aba não localizado: $sheetPath" }

  # 3. Parsear as linhas (streaming, tolera arquivos grandes)
  $reader = [System.Xml.XmlReader]::Create($sheetPath)
  $rows = New-Object System.Collections.Generic.List[object]
  $cur = @{}; $curRow = 0; $cellRef = ""; $maxCol = 0
  while ($reader.Read()) {
    if ($reader.NodeType -eq [System.Xml.XmlNodeType]::Element) {
      switch ($reader.LocalName) {
        "row" { $cur = @{}; $curRow = [int]$reader.GetAttribute("r") }
        "c" { $cellRef = $reader.GetAttribute("r") }
        "v" {
          if (-not $reader.IsEmptyElement) {
            $v = $reader.ReadElementContentAsString()
            $ci = Convert-ColToNum ([regex]::Match($cellRef, '^([A-Z]+)').Groups[1].Value)
            if ($ci -gt $maxCol) { $maxCol = $ci }
            $cur[$ci] = $v
          }
        }
        "t" {
          if (-not $reader.IsEmptyElement) {
            $t = $reader.ReadElementContentAsString()
            $ci = Convert-ColToNum ([regex]::Match($cellRef, '^([A-Z]+)').Groups[1].Value)
            if ($ci -gt $maxCol) { $maxCol = $ci }
            $cur[$ci] = $t
          }
        }
      }
    }
    elseif ($reader.NodeType -eq [System.Xml.XmlNodeType]::EndElement -and $reader.LocalName -eq "row") {
      $rows.Add([pscustomobject]@{ R = $curRow; Cells = $cur })
    }
  }
  $reader.Close()

  # 4. Cabeçalhos (linha $HeaderRow) e dados (linhas seguintes)
  $headerRowObj = $rows | Where-Object { $_.R -eq $HeaderRow } | Select-Object -First 1
  if (-not $headerRowObj) { throw "Linha de cabeçalho $HeaderRow não encontrada." }
  $headers = @{}
  for ($c = 1; $c -le $maxCol; $c++) {
    $headers[$c] = if ($headerRowObj.Cells.ContainsKey($c)) { $headerRowObj.Cells[$c] } else { "col$c" }
  }

  $items = New-Object System.Collections.Generic.List[object]
  foreach ($row in $rows) {
    if ($row.R -le $HeaderRow) { continue }
    $obj = [ordered]@{ __row = $row.R }
    $hasData = $false
    for ($c = 1; $c -le $maxCol; $c++) {
      $key = [string]$headers[$c]
      $val = if ($row.Cells.ContainsKey($c)) { [string]$row.Cells[$c] } else { "" }
      if ($val -ne "") { $hasData = $true }
      $obj[$key] = $val
    }
    if ($hasData) { $items.Add([pscustomobject]$obj) }
  }

  # 5. Gravar JSON
  $outDir = Split-Path $Out -Parent
  if ($outDir -and -not (Test-Path $outDir)) { New-Item -ItemType Directory -Force $outDir | Out-Null }
  $payload = [ordered]@{
    sheet   = $SheetName
    source  = (Split-Path $Xlsx -Leaf)
    columns = @(1..$maxCol | ForEach-Object { [string]$headers[$_] })
    count   = $items.Count
    items   = $items
  }
  $payload | ConvertTo-Json -Depth 6 | Set-Content -Path $Out -Encoding UTF8
  Write-Output "OK: $($items.Count) itens -> $Out"
}
finally {
  Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
}
