# Render and Compare Commands

## Quick Commands

### Render all tests:
```bash
python3 test_all.py
```

### Compare all rendered images with references:
```bash
python3 test_all.py compare
```

## Individual Test Commands

### Core Tests:

```bash
# 1. ray-sphere.txt - Basic sphere rendering (no sun, unlit)
make run file=ray-sphere.txt
python3 compare_images.py ray-sphere.png sphere.png

# 2. ray-sun.txt - Diffuse lighting with sun
make run file=ray-sun.txt
python3 compare_images.py ray-sun.png sun.png

# 3. ray-color.txt - Colored spheres with lighting
make run file=ray-color.txt
python3 compare_images.py ray-color.png color.png

# 4. ray-overlap.txt - Overlapping spheres
make run file=ray-overlap.txt
python3 compare_images.py ray-overlap.png overlap.png

# 5. ray-behind.txt - Sphere behind camera (should not be visible)
make run file=ray-behind.txt
python3 compare_images.py ray-behind.png behind.png

# 6. ray-shadow-basic.txt - Basic shadow casting
make run file=ray-shadow-basic.txt
python3 compare_images.py ray-shadow-basic.png shadow-basic.png

# 7. ray-expose1.txt - Low exposure
make run file=ray-expose1.txt
python3 compare_images.py ray-expose1.png expose1.png

# 8. ray-expose2.txt - High exposure
make run file=ray-expose2.txt
python3 compare_images.py ray-expose2.png expose2.png

# 9. ray-suns.txt - Multiple suns
make run file=ray-suns.txt
python3 compare_images.py ray-suns.png suns.png

# 10. ray-shadow-suns.txt - Multiple suns with shadows
make run file=ray-shadow-suns.txt
python3 compare_images.py ray-shadow-suns.png shadow-suns.png
```

## Batch Render (Bash/WSL):

```bash
# Render all
for file in ray-sphere.txt ray-sun.txt ray-color.txt ray-overlap.txt ray-behind.txt ray-shadow-basic.txt; do
    make run file="$file"
done

# Compare all
for ref in ray-sphere.png ray-sun.png ray-color.png ray-overlap.png ray-behind.png ray-shadow-basic.png; do
    gen="${ref#ray-}"
    if [ -f "$gen" ]; then
        echo "Comparing $ref vs $gen:"
        python3 compare_images.py "$ref" "$gen" | tail -2
    fi
done
```

## Expected Output Files:

- `sphere.png` (from ray-sphere.txt)
- `sun.png` (from ray-sun.txt)
- `color.png` (from ray-color.txt)
- `overlap.png` (from ray-overlap.txt)
- `behind.png` (from ray-behind.txt)
- `shadow-basic.png` (from ray-shadow-basic.txt)
- `expose1.png` (from ray-expose1.txt)
- `expose2.png` (from ray-expose2.txt)
- `suns.png` (from ray-suns.txt)
- `shadow-suns.png` (from ray-shadow-suns.txt)

