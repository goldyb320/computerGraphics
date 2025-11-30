#!/usr/bin/env python3
#render all test cases and compare with reference images
import subprocess
import sys
import os

tests = [
    ("ray-sphere.txt", "ray-sphere.png", "sphere.png"),
    ("ray-sun.txt", "ray-sun.png", "sun.png"),
    ("ray-color.txt", "ray-color.png", "color.png"),
    ("ray-overlap.txt", "ray-overlap.png", "overlap.png"),
    ("ray-behind.txt", "ray-behind.png", "behind.png"),
    ("ray-shadow-basic.txt", "ray-shadow-basic.png", "shadow-basic.png"),
    ("ray-expose1.txt", "ray-expose1.png", "expose1.png"),
    ("ray-expose2.txt", "ray-expose2.png", "expose2.png"),
    ("ray-suns.txt", "ray-suns.png", "suns.png"),
    ("ray-shadow-suns.txt", "ray-shadow-suns.png", "shadow-suns.png"),
    ("ray-view.txt", "ray-view.png", "view.png"),
    ("ray-fisheye.txt", "ray-fisheye.png", "fisheye.png"),
    ("ray-panorama.txt", "ray-panorama.png", "panorama.png"),
    ("ray-plane.txt", "ray-plane.png", "plane.png"),
    ("ray-shadow-plane.txt", "ray-shadow-plane.png", "shadow-plane.png"),
    ("ray-tri.txt", "ray-tri.png", "tri.png"),
    ("ray-shadow-triangle.txt", "ray-shadow-triangle.png", "shadow-triangle.png"),
    ("ray-tex.txt", "ray-tex.png", "tex.png"),
]

def render_test(input_file, output_file):
    #extract output filename from input file
    if not os.path.exists(input_file):
        print(f"Warning: {input_file} not found, skipping")
        return False
    
    print(f"Rendering {input_file}...")
    try:
        result = subprocess.run(
            ["make", "run", f"file={input_file}"],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            print(f"  ✓ Rendered successfully")
            return True
        else:
            print(f"  ✗ Error: {result.stderr}")
            return False
    except Exception as e:
        print(f"  ✗ Exception: {e}")
        return False

def compare_images(ref_file, gen_file):
    if not os.path.exists(ref_file):
        print(f"  Warning: Reference {ref_file} not found")
        return
    if not os.path.exists(gen_file):
        print(f"  Warning: Generated {gen_file} not found")
        return
    
    try:
        result = subprocess.run(
            ["python3", "compare_images.py", ref_file, gen_file],
            capture_output=True,
            text=True
        )
        print(result.stdout)
    except Exception as e:
        print(f"  Error comparing: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "compare":
        #compare mode
        print("Comparing all rendered images with references...\n")
        for input_file, ref_file, gen_file in tests:
            print(f"Comparing {gen_file}...")
            compare_images(ref_file, gen_file)
            print()
    else:
        #render mode
        print("Rendering all test cases...\n")
        for input_file, ref_file, gen_file in tests:
            render_test(input_file, gen_file)
            print()
        
        print("Done! Run 'python3 test_all.py compare' to compare with references")

