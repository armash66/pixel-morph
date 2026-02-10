const CANVAS_SIZE = 256;

const inputCanvas = document.getElementById("inputCanvas");
const targetCanvas = document.getElementById("targetCanvas");
const fileInput = document.getElementById("fileInput");

const inputCtx = inputCanvas.getContext("2d");
const targetCtx = targetCanvas.getContext("2d");

const TARGET_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <rect width="256" height="256" fill="#0b0d12" />
  <circle cx="128" cy="96" r="56" fill="#f97316" />
  <rect x="72" y="150" width="112" height="64" rx="12" fill="#38bdf8" />
  <rect x="92" y="170" width="72" height="24" rx="8" fill="#0f172a" />
</svg>
`;

function svgToDataUrl(svg) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

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
  img.onload = () => drawImageToCanvas(img, targetCtx);
  img.src = svgToDataUrl(TARGET_SVG);
}

function loadInput(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => drawImageToCanvas(img, inputCtx);
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

clearCanvas(inputCtx);
loadTarget();
