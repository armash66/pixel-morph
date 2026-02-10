import createModule from "../wasm/build/morph.js";

const CANVAS_SIZE = 256;
const ANIMATION_MS = 3200;

const sourceCanvas = document.getElementById("sourceCanvas");
const outputCanvas = document.getElementById("outputCanvas");
const fileInput = document.getElementById("fileInput");

const sourceCtx = sourceCanvas.getContext("2d");
const outputCtx = outputCanvas.getContext("2d");

const TARGET_URL = "./assets/target.svg";

const targetCanvas = document.createElement("canvas");
targetCanvas.width = CANVAS_SIZE;
targetCanvas.height = CANVAS_SIZE;
const targetCtx = targetCanvas.getContext("2d");

let latestSourceRGB = null;
let latestTargetRGB = null;
let latestMapping = null;
let latestSourceRGBA = null;
let animationId = null;
let animationStart = 0;

let wasmApi = null;
let wasmReady = false;

function clearCanvas(ctx) {
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  ctx.fillStyle = "#0b0d12";
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
}

function drawImageToCanvas(img, ctx) {
  clearCanvas(ctx);
  const scale = Math.min(CANVAS_SIZE / img.width, CANVAS_SIZE / img.height);
  const drawWidth = img.width * scale;
  const drawHeight = img.height * scale;
  const dx = (CANVAS_SIZE - drawWidth) / 2;
  const dy = (CANVAS_SIZE - drawHeight) / 2;
  ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
}

function loadTarget() {
  const img = new Image();
  img.onload = () => {
    drawImageToCanvas(img, targetCtx);
    outputCtx.drawImage(targetCanvas, 0, 0);
    captureRGBInputs();
  };
  img.src = TARGET_URL;
}

function extractRGB(imageData) {
  const data = imageData.data;
  const count = CANVAS_SIZE * CANVAS_SIZE;
  const rgb = new Uint8Array(count * 3);

  for (let i = 0; i < count; i += 1) {
    const srcIdx = i * 4;
    const dstIdx = i * 3;
    rgb[dstIdx] = data[srcIdx];
    rgb[dstIdx + 1] = data[srcIdx + 1];
    rgb[dstIdx + 2] = data[srcIdx + 2];
  }

  return rgb;
}

function captureRGBInputs() {
  const sourcePixels = sourceCtx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  const targetPixels = targetCtx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  latestSourceRGBA = new Uint8ClampedArray(sourcePixels.data);
  latestSourceRGB = extractRGB(sourcePixels);
  latestTargetRGB = extractRGB(targetPixels);

  if (wasmReady) {
    latestMapping = computeMappingWasm(latestSourceRGB, latestTargetRGB);
    startMorphAnimation();
  }
}

function initWasm() {
  createModule({
    locateFile: (path) => new URL(`../wasm/build/${path}`, import.meta.url).toString(),
  }).then((module) => {
    wasmApi = {
      module,
      computeMapping: module.cwrap("compute_mapping", null, [
        "number",
        "number",
        "number",
        "number",
        "number",
      ]),
    };
    wasmReady = true;

    if (latestSourceRGB && latestTargetRGB) {
      latestMapping = computeMappingWasm(latestSourceRGB, latestTargetRGB);
      startMorphAnimation();
    }
  });
}

function computeMappingWasm(sourceRGB, targetRGB) {
  const count = CANVAS_SIZE * CANVAS_SIZE;
  const sourceBytes = sourceRGB.length;
  const targetBytes = targetRGB.length;
  const mapBytes = count * 4;

  const sourcePtr = wasmApi.module._malloc(sourceBytes);
  const targetPtr = wasmApi.module._malloc(targetBytes);
  const mapPtr = wasmApi.module._malloc(mapBytes);

  wasmApi.module.HEAPU8.set(sourceRGB, sourcePtr);
  wasmApi.module.HEAPU8.set(targetRGB, targetPtr);

  wasmApi.computeMapping(sourcePtr, targetPtr, CANVAS_SIZE, CANVAS_SIZE, mapPtr);

  const mappingView = wasmApi.module.HEAP32.subarray(mapPtr / 4, mapPtr / 4 + count);
  const mapping = new Int32Array(mappingView);

  wasmApi.module._free(sourcePtr);
  wasmApi.module._free(targetPtr);
  wasmApi.module._free(mapPtr);

  return mapping;
}

function renderStaticOutput() {
  if (!latestMapping || !latestSourceRGBA) {
    return;
  }

  const count = CANVAS_SIZE * CANVAS_SIZE;
  const out = new ImageData(CANVAS_SIZE, CANVAS_SIZE);
  const outData = out.data;

  for (let i = 0; i < count; i += 1) {
    const targetIndex = latestMapping[i];
    const srcIdx = i * 4;
    const outIdx = targetIndex * 4;

    outData[outIdx] = latestSourceRGBA[srcIdx];
    outData[outIdx + 1] = latestSourceRGBA[srcIdx + 1];
    outData[outIdx + 2] = latestSourceRGBA[srcIdx + 2];
    outData[outIdx + 3] = 255;
  }

  outputCtx.putImageData(out, 0, 0);
}

function indexToXY(index) {
  return {
    x: index % CANVAS_SIZE,
    y: Math.floor(index / CANVAS_SIZE),
  };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function renderMorphFrame(t) {
  if (!latestMapping || !latestSourceRGBA) {
    return;
  }

  const count = CANVAS_SIZE * CANVAS_SIZE;
  const out = new ImageData(CANVAS_SIZE, CANVAS_SIZE);
  const outData = out.data;

  for (let i = 0; i < count; i += 1) {
    const targetIndex = latestMapping[i];
    const start = indexToXY(i);
    const end = indexToXY(targetIndex);

    const x = Math.round(lerp(start.x, end.x, t));
    const y = Math.round(lerp(start.y, end.y, t));
    const outIdx = (y * CANVAS_SIZE + x) * 4;
    const srcIdx = i * 4;

    outData[outIdx] = latestSourceRGBA[srcIdx];
    outData[outIdx + 1] = latestSourceRGBA[srcIdx + 1];
    outData[outIdx + 2] = latestSourceRGBA[srcIdx + 2];
    outData[outIdx + 3] = 255;
  }

  outputCtx.putImageData(out, 0, 0);
}

function animate(now) {
  const elapsed = now - animationStart;
  const t = Math.min(elapsed / ANIMATION_MS, 1);
  renderMorphFrame(t);

  if (t < 1) {
    animationId = requestAnimationFrame(animate);
  }
}

function startMorphAnimation() {
  if (!latestMapping || !latestSourceRGBA) {
    return;
  }

  if (animationId) {
    cancelAnimationFrame(animationId);
  }

  animationStart = performance.now();
  animationId = requestAnimationFrame(animate);
}

function loadInput(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      drawImageToCanvas(img, sourceCtx);
      captureRGBInputs();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

fileInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) {
    loadInput(file);
  }
});

clearCanvas(sourceCtx);
loadTarget();
initWasm();
