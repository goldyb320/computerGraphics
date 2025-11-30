#!/usr/bin/env python3
#compare two images pixel by pixel
from PIL import Image
import sys

if len(sys.argv) != 3:
    print("Usage: python compare_images.py <image1> <image2>")
    sys.exit(1)

img1 = Image.open(sys.argv[1])
img2 = Image.open(sys.argv[2])

if img1.size != img2.size:
    print(f"Images have different sizes: {img1.size} vs {img2.size}")
    sys.exit(1)

diff_count = 0
total_pixels = img1.size[0] * img1.size[1]

for y in range(img1.size[1]):
    for x in range(img1.size[0]):
        p1 = img1.getpixel((x, y))
        p2 = img2.getpixel((x, y))
        if p1 != p2:
            diff_count += 1
            if diff_count <= 10:
                print(f"Diff at ({x}, {y}): {p1} vs {p2}")

print(f"\nTotal differences: {diff_count} out of {total_pixels} pixels ({100.0 * diff_count / total_pixels:.2f}%)")

#create difference image
diff_img = Image.new('RGB', img1.size)
for y in range(img1.size[1]):
    for x in range(img1.size[0]):
        p1 = img1.getpixel((x, y))[:3] if len(img1.getpixel((x, y))) > 3 else img1.getpixel((x, y))
        p2 = img2.getpixel((x, y))[:3] if len(img2.getpixel((x, y))) > 3 else img2.getpixel((x, y))
        diff = tuple(abs(p1[i] - p2[i]) for i in range(3))
        diff_img.putpixel((x, y), diff)

diff_img.save('difference.png')
print("Saved difference image to difference.png")

