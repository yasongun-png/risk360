# Risk360'i localhost uzerinden servis eden, kurulum gerektirmeyen basit statik
# dosya sunucusu. Node/Python kurulu olmayan makinelerde file:// yerine gercek
# bir origin (http://localhost:PORT) kullanmak icin: her ayri origin kendi
# localStorage kotasina sahip oldugundan, file:// tarafinda dolan kota burada
# sifirdan baslar.
#
# Calistirmak icin:
#   powershell -ExecutionPolicy Bypass -File serve.ps1
# sonra tarayicida http://localhost:8080/ adresini acin.

param(
    [int]$Port = 8080
)

$root = $PSScriptRoot
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")

try {
    $listener.Start()
} catch {
    Write-Host "Sunucu baslatilamadi: $($_.Exception.Message)"
    Write-Host "Port $Port kullanimda olabilir; farkli bir port ile deneyin: -Port 8081"
    exit 1
}

Write-Host "Risk360 http://localhost:$Port/ adresinde yayinda. Durdurmak icin Ctrl+C."

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
}

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response

    try {
        $localPath = $request.Url.LocalPath
        if ($localPath -eq "/") { $localPath = "/index.html" }
        $relative = $localPath.TrimStart("/") -replace "/", [System.IO.Path]::DirectorySeparatorChar
        $filePath = Join-Path $root $relative

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath)
            $contentType = $mimeTypes[$ext]
            if (-not $contentType) { $contentType = "application/octet-stream" }
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentType = $contentType
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $notFound = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $localPath")
            $response.OutputStream.Write($notFound, 0, $notFound.Length)
        }
    } catch {
        $response.StatusCode = 500
    } finally {
        $response.OutputStream.Close()
    }
}
