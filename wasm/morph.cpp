#include <algorithm>
#include <cstdint>
#include <vector>

struct PixelInfo {
  float brightness;
  int index;
};

// r,g,b are 0..255. Returns brightness in 0..255 range.
float brightness(uint8_t r, uint8_t g, uint8_t b) {
  return 0.2126f * r + 0.7152f * g + 0.0722f * b;
}

// Convert RGB pixels into (brightness, index) list.
// pixels: length = width*height*3 in RGB order.
std::vector<PixelInfo> build_brightness_list(const std::vector<uint8_t>& pixels, int width, int height) {
  const int count = width * height;
  std::vector<PixelInfo> list(count);
  for (int i = 0; i < count; i++) {
    const int idx = i * 3;
    const uint8_t r = pixels[idx];
    const uint8_t g = pixels[idx + 1];
    const uint8_t b = pixels[idx + 2];
    list[i] = {brightness(r, g, b), i};
  }
  return list;
}

// Compute mapping from source indices to target indices by sorting brightness.
// mapping[source_index] = target_index
std::vector<int> compute_mapping(const std::vector<uint8_t>& source_pixels,
                                 const std::vector<uint8_t>& target_pixels,
                                 int width,
                                 int height) {
  const int count = width * height;

  std::vector<PixelInfo> source_list = build_brightness_list(source_pixels, width, height);
  std::vector<PixelInfo> target_list = build_brightness_list(target_pixels, width, height);

  std::sort(source_list.begin(), source_list.end(),
            [](const PixelInfo& a, const PixelInfo& b) { return a.brightness < b.brightness; });
  std::sort(target_list.begin(), target_list.end(),
            [](const PixelInfo& a, const PixelInfo& b) { return a.brightness < b.brightness; });

  std::vector<int> mapping(count);
  for (int i = 0; i < count; i++) {
    const int src_index = source_list[i].index;
    const int tgt_index = target_list[i].index;
    mapping[src_index] = tgt_index;
  }

  return mapping;
}
