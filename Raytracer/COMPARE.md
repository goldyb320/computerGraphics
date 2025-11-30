# Image Comparison Commands

## Original Issue
The original problem was that when there was no ray-sphere intersection, the code returned `Vector3(0, 0, 0)` (black), making the entire image black. The fix was to return a light grey background with a diagonal striped pattern instead.

## ImageMagick Comparison Commands

### Compare two images and show differences:
```bash
magick compare ray-sphere.png sphere.png -compose src difference.png
```

### Get detailed difference statistics:
```bash
magick compare -metric AE ray-sphere.png sphere.png null:
```

### Create a visual difference image (highlight differences in red):
```bash
magick compare ray-sphere.png sphere.png -highlight-color red -lowlight-color white diff_highlighted.png
```

### Check if images are identical:
```bash
magick compare ray-sphere.png sphere.png -metric AE null: 2>&1
# Returns 0 if identical, non-zero if different
```

### Side-by-side comparison:
```bash
magick montage ray-sphere.png sphere.png -tile 2x1 -geometry +0+0 comparison.png
```

## About Transparency
The reference image (ray-sphere.png) should have a light grey background with a diagonal striped pattern, not be transparent. If it appears transparent when viewed, it might be:
1. The viewer is showing transparency incorrectly
2. The background pattern is very subtle
3. The alpha channel handling needs adjustment

The specification says "light grey background with a subtle diagonal striped pattern" - so there should be a visible background.

