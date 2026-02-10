const CANVAS_SIZE = 256;

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

  latestSourceRGB = extractRGB(sourcePixels);
  latestTargetRGB = extractRGB(targetPixels);
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
