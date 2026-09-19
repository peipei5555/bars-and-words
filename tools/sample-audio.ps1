# 音声を作り、試聴ページを開く。-All を付けると全語、付けなければ最初の6語だけ。
# キーは画面に表示せず、この実行の間だけ使う（ファイルにも環境変数にも残さない）。
param([switch]$All)
$ErrorActionPreference = 'Stop'
$v2 = Split-Path -Parent $PSScriptRoot
Set-Location $v2

Write-Host ''
Write-Host 'OpenAI の APIキーを貼り付けて Enter（画面には表示されません）'
$secure = Read-Host -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $env:OPENAI_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
}

try {
  if ($All) { node tools\generate-audio.mjs } else { node tools\generate-audio.mjs --sample 6 }
  if ($LASTEXITCODE -ne 0) { throw '生成に失敗しました（上のメッセージを確認）' }
} finally {
  Remove-Item Env:OPENAI_API_KEY -ErrorAction SilentlyContinue
}

Start-Process (Join-Path $v2 'audio\preview.html')
Write-Host ''
Write-Host '試聴ページを開きました。この窓は閉じてOKです。'
Read-Host 'Enterで閉じる'
