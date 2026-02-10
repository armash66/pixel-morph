#include <algorithm>
#include <cstdint>
#include <vector>

// Pure math model for pixel rearrangement.
// No I/O. No rendering. No external libraries.

struct PixelInfo {
  float brightness;
  int index;
};

// Convert RGB to a single brightness scalar in [0, 255].
static float brightness(uint8_t r, uint8_t g, uint8_t b) {
  return 0.2126f * r + 0.7152f * g + 0.0722f * b;
}

// Build (brightness, index) list from a flat RGB array.
// pixels: length = width*height*3, RGB order.
static void build_brightness_list(const uint8_t* pixels,
                                  int width,
                                  int height,
                                  std::vector<PixelInfo>& out_list) {
  const int count = width * height;
  out_list.resize(count);

  for (int i = 0; i < count; i++) {
    const int idx = i * 3;
    const uint8_t r = pixels[idx];
    const uint8_t g = pixels[idx + 1];
    const uint8_t b = pixels[idx + 2];
    out_list[i] = {brightness(r, g, b), i};
  }
}

// Sort list in ascending brightness (dark -> bright).
static void sort_by_brightness(std::vector<PixelInfo>& list) {
  std::sort(list.begin(), list.end(),
            [](const PixelInfo& a, const PixelInfo& b) { return a.brightness < b.brightness; });
}

// Compute permutation mapping using pure math rules.
// mapping[source_index] = target_index
// source_pixels / target_pixels: flat RGB arrays length = width*height*3
// mapping: output array length = width*height (must be allocated by caller)
void compute_mapping(const uint8_t* source_pixels,
                     const uint8_t* target_pixels,
                     int width,
                     int height,
                     int* mapping) {
  const int count = width * height;

  std::vector<PixelInfo> source_list;
  std::vector<PixelInfo> target_list;

  // Step 1: compute brightness lists
  build_brightness_list(source_pixels, width, height, source_list);
  build_brightness_list(target_pixels, width, height, target_list);

  // Step 2: sort by brightness
  sort_by_brightness(source_list);
  sort_by_brightness(target_list);

  // Step 3: map i-th darkest source to i-th darkest target
  for (int i = 0; i < count; i++) {
    const int src_index = source_list[i].index;
    const int tgt_index = target_list[i].index;
    mapping[src_index] = tgt_index;
  }
}
