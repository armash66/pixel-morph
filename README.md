# Pixel Forge

A **permutation-driven morphing experiment** that rearranges pixels from a source image to match a target silhouette using brightness sorting.

![Demo](public/assets/ww2%20hero.png)

## 🚀 Concept

**Pixel Forge** is a pure-math visualization tool. It doesn't use AI, neural networks, or color blending. Instead, it asks:

> *"What if we took the pixels from Image A and simply moved them to form Image B?"*

### The Rules
1.  **No Recoloring**: The pixels you see in the output are the *exact* same pixels from your source image.
2.  **No AI**: The mapping is deterministic, based purely on pixel brightness.
3.  **Frontend Only**: All processing happens in your browser using JavaScript (and WebAssembly for performance).

## 🛠️ Features

-   **Home Workspace**: Upload any input image and a target reference.
-   **Scribble Mode**: Draw your own input and watch your doodles rearrange into the target.
-   **Live Morph**: Watch the linear interpolation of pixels in real-time.
-   **Dual Engine**: Runs on highly optimized WASM with a JS fallback.
-   **Theme Support**: Toggle between Dark and Light modes.

## ⚙️ How It Works

1.  **Brightness Calculation**: Every pixel in the source and target is assigned a brightness value ($0.2126R + 0.7152G + 0.0722B$).
2.  **Sorting**: Pixels in both images are sorted from darkest to lightest.
3.  **Mapping**: The $i$-th darkest pixel in the source is mapped to the position of the $i$-th darkest pixel in the target.
4.  **Animation**: The pixels travel from their original $(x, y)$ to their new $(x', y')$ using linear interpolation.

## 📦 Run Locally

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/armash66/pixel-morph.git
    cd pixel-morph
    ```

2.  **Start a local server**:
    You need a local static server to load the WASM modules correctly.
    ```bash
    # Python 3
    python -m http.server 8080
    ```

3.  **Open in Browser**:
    Visit `http://localhost:8080/public/index.html`

## 📂 Project Structure

-   `public/js/`: Core application logic and WASM interface.
-   `public/css/`: Styling and layout.
-   `public/wasm/`: Compiled WebAssembly modules (C++ source).
-   `public/assets/`: Default images.

---

**Built by [Armash](https://github.com/armash66)**
