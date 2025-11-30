# Test Suite Guide

## Quick Command

**Run all tests and see results:**
```bash
python3 run_tests.py
```

Or in WSL:
```bash
wsl python3 run_tests.py
```

## How to Read the Output

### Status Symbols:
- **✓** = Success (file created, or images match closely)
- **✗** = Failure (render failed, or images differ significantly)
- **⚠** = Warning (reference missing, or images have some differences)

### Output Interpretation:

**1. Render Status:**
```
Testing: ray-sphere.txt
Rendering...
  ✓ Output created: sphere.png
```
This means the image was successfully generated.

**2. Comparison Results:**
```
Comparing with reference...
  Total differences: 0 out of 5000 pixels (0.00%)
  ✓ Images match very closely (<1% difference)
```
- **<1% difference** = Excellent match, likely correct
- **<5% difference** = Good match, minor differences (may be acceptable)
- **>5% difference** = Significant differences, likely a bug

**3. Example Output:**
```
==================================================
Testing: ray-sphere.txt
==================================================
Rendering...
  ✓ Output created: sphere.png
Comparing with reference...
  Total differences: 50 out of 5000 pixels (1.00%)
  ⚠ Images are similar but have some differences (<5%)
```

### Understanding Pixel Differences:

The comparison script creates `difference.png` showing where pixels differ:
- **Black pixels** = No difference (images match)
- **Bright pixels** = Large difference at that location
- **White pixels** = Maximum difference

### What Each Test Checks:

1. **ray-sphere.txt** - Basic sphere rendering (no lighting)
   - Should show black spheres on transparent background
   - Tests: ray-sphere intersection, normalization

2. **ray-sun.txt** - Diffuse lighting
   - Should show lit spheres with gradients
   - Tests: Lambert lighting, sun direction

3. **ray-color.txt** - Colored spheres
   - Should show different colored spheres
   - Tests: Color state machine

4. **ray-overlap.txt** - Overlapping spheres
   - Should show spheres in correct depth order
   - Tests: Closest intersection finding

5. **ray-behind.txt** - Sphere behind camera
   - Should NOT show sphere behind camera
   - Tests: Positive t-value filtering

6. **ray-shadow-basic.txt** - Shadow casting
   - Should show shadows on spheres
   - Tests: Shadow rays, shadow acne prevention

## Manual Comparison

To manually compare a specific test:
```bash
# Render
make run file=ray-sun.txt

# Compare
python3 compare_images.py ray-sun.png sun.png

# View difference image
# (opens difference.png in your image viewer)
```

## Troubleshooting

**If all tests show 100% difference:**
- Check that ray directions are normalized
- Verify ray-sphere intersection algorithm matches spec exactly
- Check sRGB conversion

**If shadows don't appear:**
- Verify shadow ray origin offset (0.0001 * normal)
- Check shadow ray direction is normalized
- Ensure shadow intersection check excludes the same sphere

**If colors are wrong:**
- Verify color state machine (color persists until changed)
- Check sRGB gamma conversion
- Verify linear color clamping (0-1 range)

