# Requires emscripten in PATH (emcc).
# Outputs morph.js + morph.wasm in /wasm/build

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $PSScriptRoot "build"

if (!(Test-Path $outDir)) {
  New-Item -ItemType Directory -Path $outDir | Out-Null
}

emcc `
  "$PSScriptRoot/morph.cpp" `
  -O3 `
  -s WASM=1 `
  -s MODULARIZE=1 `
  -s EXPORT_ES6=1 `
  -s SINGLE_FILE=1 `
  -s ENVIRONMENT=web `
  -s ALLOW_MEMORY_GROWTH=1 `
  -s EXPORTED_FUNCTIONS="[_compute_mapping,_malloc,_free]" `
  -s EXPORTED_RUNTIME_METHODS="['ccall','cwrap','getValue','setValue']" `
  -o "$outDir/morph.js"
