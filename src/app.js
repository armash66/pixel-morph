import createModule from "../wasm/build/morph.js";

const CANVAS_SIZE = 256;
const ANIMATION_MS = 3200;

const inputCanvas = document.getElementById("inputCanvas");
const outputCanvas = document.getElementById("outputCanvas");
const targetPreview = document.getElementById("targetPreview");
const fileInput = document.getElementById("fileInput");
const targetInput = document.getElementById("targetInput");
const debugToggle = document.getElementById("debugToggle");
const themeToggle = document.getElementById("themeToggle");
const metricEngine = document.getElementById("metricEngine");
const metricProgress = document.getElementById("metricProgress");
const metricSimilarity = document.getElementById("metricSimilarity");

const inputCtx = inputCanvas.getContext("2d", { willReadFrequently: true });
const outputCtx = outputCanvas.getContext("2d");
const previewCtx = targetPreview ? targetPreview.getContext("2d") : null;

const targetUrl = "./assets/ww2%20hero.png";

const sourceCanvas = document.createElement("canvas");
sourceCanvas.width = CANVAS_SIZE;
sourceCanvas.height = CANVAS_SIZE;
const sourceCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });

const targetCanvas = document.createElement("canvas");
targetCanvas.width = CANVAS_SIZE;
targetCanvas.height = CANVAS_SIZE;
const targetCtx = targetCanvas.getContext("2d", { willReadFrequently: true });

let latestSourceRGB = null;
let latestTargetRGB = null;
let latestMapping = null;
let latestSourceRGBA = null;
let animationId = null;
let animationStart = 0;
let warnedWasmUnavailable = false;
let debugMode = false;
let latestSimilarity = null;

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
    drawPreview(img);
    captureRGBInputs();
  };
  img.src = targetUrl;
}

function loadTargetFromFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      drawImageToCanvas(img, targetCtx);
      drawPreview(img);
      captureRGBInputs();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function drawPreview(img) {
  if (!previewCtx) {
    return;
  }
  previewCtx.clearRect(0, 0, targetPreview.width, targetPreview.height);
  previewCtx.fillStyle = "#05070b";
  previewCtx.fillRect(0, 0, targetPreview.width, targetPreview.height);
  const scale = Math.min(targetPreview.width / img.width, targetPreview.height / img.height);
  const drawWidth = img.width * scale;
  const drawHeight = img.height * scale;
  const dx = (targetPreview.width - drawWidth) / 2;
  const dy = (targetPreview.height - drawHeight) / 2;
  previewCtx.drawImage(img, dx, dy, drawWidth, drawHeight);
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

  latestMapping = computeMappingWithFallback(latestSourceRGB, latestTargetRGB);
  if (latestMapping) {
    latestSimilarity = computeSimilarity(latestSourceRGBA, latestTargetRGB, latestMapping);
    updateSimilarityMetric();
    startMorphAnimation();
  }
}

async function initWasm() {
  try {
    let module = await createModule({
      locateFile: (path) => new URL(`../wasm/build/${path}`, import.meta.url).toString(),
      onAbort: (reason) => console.error("WASM abort:", reason),
      printErr: (msg) => console.error("WASM stderr:", msg),
    });

    if (module && typeof module.then === "function") {
      module = await module;
    }

    if (module.ready) {
      await module.ready;
    }

    if (!module.calledRun && module.onRuntimeInitialized) {
      await new Promise((resolve) => {
        module.onRuntimeInitialized = () => resolve();
      });
    }

    if (!module.HEAPU8 || !module.HEAP32) {
      return;
    }

    const computeMapping = module.cwrap("compute_mapping", null, [
      "number",
      "number",
      "number",
      "number",
      "number",
    ]);

    wasmApi = { module, computeMapping };
    wasmReady = true;
    if (metricEngine) {
      metricEngine.textContent = "WASM";
    }

    if (latestSourceRGB && latestTargetRGB) {
      const mapping = computeMappingWasm(latestSourceRGB, latestTargetRGB);
      if (mapping) {
        latestMapping = mapping;
        latestSimilarity = computeSimilarity(latestSourceRGBA, latestTargetRGB, latestMapping);
        updateSimilarityMetric();
        startMorphAnimation();
      }
    }
  } catch (err) {
    wasmReady = false;
    // Silent fallback to JS mapping.
    if (metricEngine) {
      metricEngine.textContent = "JS";
    }
  }
}

function computeMappingWasm(sourceRGB, targetRGB) {
  if (!wasmReady || !wasmApi || !wasmApi.module) {
    return null;
  }
  if (!wasmApi.module.HEAPU8 || !wasmApi.module.HEAP32) {
    return null;
  }

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

function computeMappingWithFallback(sourceRGB, targetRGB) {
  const mapping = computeMappingWasm(sourceRGB, targetRGB);
  if (mapping) {
    if (metricEngine) {
      metricEngine.textContent = "WASM";
    }
    return mapping;
  }

  if (!warnedWasmUnavailable) {
    warnedWasmUnavailable = true;
  }
  if (metricEngine) {
    metricEngine.textContent = "JS";
  }
  return computeMappingJs(sourceRGB, targetRGB);
}

function brightnessOf(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function buildBrightnessList(rgb) {
  const count = CANVAS_SIZE * CANVAS_SIZE;
  const list = new Array(count);
  for (let i = 0; i < count; i += 1) {
    const idx = i * 3;
    list[i] = {
      index: i,
      brightness: brightnessOf(rgb[idx], rgb[idx + 1], rgb[idx + 2]),
    };
  }
  list.sort((a, b) => a.brightness - b.brightness);
  return list;
}

function computeMappingJs(sourceRGB, targetRGB) {
  if (!sourceRGB || !targetRGB) {
    return null;
  }
  const sourceList = buildBrightnessList(sourceRGB);
  const targetList = buildBrightnessList(targetRGB);

  // Split into "active" and "background" to reduce wasted pixels on black bars.
  const threshold = 20;
  const sourceActive = [];
  const sourceBg = [];
  for (const item of sourceList) {
    if (item.brightness > threshold) {
      sourceActive.push(item);
    } else {
      sourceBg.push(item);
    }
  }

  const targetActive = [];
  const targetBg = [];
  for (const item of targetList) {
    if (item.brightness > threshold) {
      targetActive.push(item);
    } else {
      targetBg.push(item);
    }
  }

  const mapping = new Int32Array(sourceList.length);
  const activeCount = Math.min(sourceActive.length, targetActive.length);
  for (let i = 0; i < activeCount; i += 1) {
    mapping[sourceActive[i].index] = targetActive[i].index;
  }

  // Map remaining pixels to remaining positions to keep a full permutation.
  const sourceRest = sourceActive.slice(activeCount).concat(sourceBg);
  const targetRest = targetActive.slice(activeCount).concat(targetBg);
  for (let i = 0; i < sourceRest.length; i += 1) {
    mapping[sourceRest[i].index] = targetRest[i].index;
  }

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

  // Permutation only: keep input colors, move to target positions.
  const count = CANVAS_SIZE * CANVAS_SIZE;
  const out = new ImageData(CANVAS_SIZE, CANVAS_SIZE);
  const outData = out.data;

  if (metricProgress) {
    metricProgress.textContent = `${Math.round(t * 100)}%`;
  }

  for (let i = 0; i < count; i += 1) {
    const targetIndex = latestMapping[i];
    const start = indexToXY(i);
    const end = indexToXY(targetIndex);

    const x = Math.round(lerp(start.x, end.x, t));
    const y = Math.round(lerp(start.y, end.y, t));
    const outIdx = (y * CANVAS_SIZE + x) * 4;
    const srcIdx = i * 4;

    if (debugMode) {
      const color = debugColor(i);
      outData[outIdx] = color.r;
      outData[outIdx + 1] = color.g;
      outData[outIdx + 2] = color.b;
    } else {
      outData[outIdx] = latestSourceRGBA[srcIdx];
      outData[outIdx + 1] = latestSourceRGBA[srcIdx + 1];
      outData[outIdx + 2] = latestSourceRGBA[srcIdx + 2];
    }
    outData[outIdx + 3] = 255;
  }

  outputCtx.putImageData(out, 0, 0);
}

function debugColor(index) {
  // Simple integer hash -> RGB
  let x = index + 1;
  x = (x ^ (x >>> 16)) * 0x45d9f3b;
  x = (x ^ (x >>> 16)) * 0x45d9f3b;
  x = x ^ (x >>> 16);
  return {
    r: x & 255,
    g: (x >>> 8) & 255,
    b: (x >>> 16) & 255,
  };
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

  if (metricProgress) {
    metricProgress.textContent = "0%";
  }

  animationStart = performance.now();
  animationId = requestAnimationFrame(animate);
}

function loadInput(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      drawImageToCanvas(img, inputCtx);
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

targetInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) {
    loadTargetFromFile(file);
  }
});

debugToggle.addEventListener("change", (event) => {
  debugMode = event.target.checked;
  if (latestMapping && latestSourceRGBA) {
    startMorphAnimation();
  }
});


clearCanvas(inputCtx);
clearCanvas(sourceCtx);
clearCanvas(outputCtx);
loadTarget();
initWasm();

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  if (themeToggle) {
    themeToggle.checked = theme === "light";
  }
}

if (themeToggle) {
  const saved = localStorage.getItem("pixelMorphTheme");
  if (saved) {
    applyTheme(saved);
  }
  themeToggle.addEventListener("change", (event) => {
    const next = event.target.checked ? "light" : "dark";
    localStorage.setItem("pixelMorphTheme", next);
    applyTheme(next);
  });
}

function computeSimilarity(sourceRGBA, targetRGB, mapping) {
  if (!sourceRGBA || !targetRGB || !mapping) {
    return null;
  }
  const count = CANVAS_SIZE * CANVAS_SIZE;
  let sumSq = 0;
  for (let i = 0; i < count; i += 1) {
    const targetIndex = mapping[i];
    const srcIdx = i * 4;
    const outBrightness = brightnessOf(
      sourceRGBA[srcIdx],
      sourceRGBA[srcIdx + 1],
      sourceRGBA[srcIdx + 2]
    );
    const tgtIdx = targetIndex * 3;
    const tgtBrightness = brightnessOf(
      targetRGB[tgtIdx],
      targetRGB[tgtIdx + 1],
      targetRGB[tgtIdx + 2]
    );
    const diff = outBrightness - tgtBrightness;
    sumSq += diff * diff;
  }

  const mse = sumSq / count;
  const maxMse = 255 * 255;
  const score = Math.max(0, 1 - mse / maxMse);
  return Math.round(score * 1000) / 10;
}

function updateSimilarityMetric() {
  if (!metricSimilarity) {
    return;
  }
  if (latestSimilarity === null) {
    metricSimilarity.textContent = "--";
    return;
  }
  metricSimilarity.textContent = `${latestSimilarity}%`;
}
