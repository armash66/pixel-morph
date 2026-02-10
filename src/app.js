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

let animationId = null;
let animationStart = 0;
let currentMapping = null;
let sourcePixels = null;

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
  };
  img.src = TARGET_URL;
}

function brightnessOf(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function buildBrightnessList(imageData) {
  const data = imageData.data;
  const list = new Array(CANVAS_SIZE * CANVAS_SIZE);
  for (let i = 0; i < list.length; i += 1) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    list[i] = {
      index: i,
      brightness: brightnessOf(r, g, b),
    };
  }
  list.sort((a, b) => a.brightness - b.brightness);
  return list;
}

function buildMapping(sourceData, targetData) {
  const sourceList = buildBrightnessList(sourceData);
  const targetList = buildBrightnessList(targetData);

  const mapping = new Array(sourceList.length);
  for (let i = 0; i < sourceList.length; i += 1) {
    mapping[sourceList[i].index] = targetList[i].index;
  }
  return mapping;
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

function renderFrame(t) {
  if (!currentMapping || !sourcePixels) {
    return;
  }

  const out = new ImageData(CANVAS_SIZE, CANVAS_SIZE);
  const outData = out.data;
  const src = sourcePixels.data;

  for (let i = 0; i < currentMapping.length; i += 1) {
    const targetIndex = currentMapping[i];
    const start = indexToXY(i);
    const end = indexToXY(targetIndex);

    const x = Math.round(lerp(start.x, end.x, t));
    const y = Math.round(lerp(start.y, end.y, t));
    const outIndex = (y * CANVAS_SIZE + x) * 4;

    const srcIndex = i * 4;
    outData[outIndex] = src[srcIndex];
    outData[outIndex + 1] = src[srcIndex + 1];
    outData[outIndex + 2] = src[srcIndex + 2];
    outData[outIndex + 3] = 255;
  }

  outputCtx.putImageData(out, 0, 0);
}

function animate(now) {
  const elapsed = now - animationStart;
  const t = Math.min(elapsed / ANIMATION_MS, 1);
  renderFrame(t);

  if (t < 1) {
    animationId = requestAnimationFrame(animate);
  }
}

function startMorph() {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }

  sourcePixels = sourceCtx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  const targetPixels = targetCtx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  currentMapping = buildMapping(sourcePixels, targetPixels);
  animationStart = performance.now();
  animationId = requestAnimationFrame(animate);
}

function loadInput(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      drawImageToCanvas(img, sourceCtx);
      startMorph();
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
