#include <algorithm>
#include <cstdint>
#include <vector>

#include <emscripten/emscripten.h>

extern "C" {

// r,g,b are 0..255. Returns brightness in 0..255 range.
EMSCRIPTEN_KEEPALIVE
float brightness(uint8_t r, uint8_t g, uint8_t b) {
  return 0.2126f * r + 0.7152f * g + 0.0722f * b;
}

// Build brightness array from RGBA pixels.
// pixels: length = width*height*4
// out_brightness: length = width*height
EMSCRIPTEN_KEEPALIVE
void compute_brightness(const uint8_t* pixels, int width, int height, float* out_brightness) {
  const int count = width * height;
  for (int i = 0; i < count; i++) {
    const int idx = i * 4;
    out_brightness[i] = brightness(pixels[idx], pixels[idx + 1], pixels[idx + 2]);
  }
}

// Sort indices by brightness ascending.
// brightness: length = count
// out_indices: length = count
EMSCRIPTEN_KEEPALIVE
void sort_indices_by_brightness(const float* brightness_values, int count, int* out_indices) {
  std::vector<int> indices(count);
  for (int i = 0; i < count; i++) {
    indices[i] = i;
  }

  std::sort(indices.begin(), indices.end(), [&](int a, int b) {
    return brightness_values[a] < brightness_values[b];
  });

  for (int i = 0; i < count; i++) {
    out_indices[i] = indices[i];
  }
}

// Build mapping from source index -> target index using sorted brightness order.
// src_sorted and tgt_sorted are sorted index arrays (length = count).
// out_map: length = count (out_map[src_index] = tgt_index)
EMSCRIPTEN_KEEPALIVE
void build_mapping(const int* src_sorted, const int* tgt_sorted, int count, int* out_map) {
  for (int i = 0; i < count; i++) {
    const int src_index = src_sorted[i];
    const int tgt_index = tgt_sorted[i];
    out_map[src_index] = tgt_index;
  }
}

}
