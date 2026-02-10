# pixel-morph

Pure‑math pixel permutation demo: upload an image and watch its own pixels rearrange into a fixed target silhouette.

## Core Idea (Requirement)
- **Input colors only**: no recoloring, no blending, no target colors.
- **Permutation only**: pixels are *moved* to new positions based on brightness sorting.
- **Target used for structure**: target positions guide where input pixels land.

In short: **your image’s colors, rearranged into the target’s shape**.

## How It Works
1. Load a fixed target image (offscreen).
2. Upload a source image (offscreen).
3. Convert each pixel to brightness:  
   `0.2126*r + 0.7152*g + 0.0722*b`
4. Sort source and target pixels by brightness.
5. Map the i‑th darkest source pixel to the i‑th darkest target position.
6. Animate pixels from original positions to mapped target positions.

## Run Locally
1. Build WASM (optional; JS fallback exists):
   ```powershell
   wasm\build.ps1
   ```
2. Serve the repo root:
   ```powershell
   python -m http.server 8080
   ```
3. Open:
   ```
   http://localhost:8080/public/index.html
   ```

## Notes
- If WASM fails to initialize, the app falls back to a pure‑JS implementation (same math).
- The target image is stored at `public/assets/ww2 hero.png`.
