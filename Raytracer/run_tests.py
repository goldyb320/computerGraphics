#!/usr/bin/env python3
#run all tests and show comparison results
import subprocess
import sys
import os

tests = [
    ("ray-sphere.txt", "sphere.png", "ray-sphere.png"),
    ("ray-sun.txt", "sun.png", "ray-sun.png"),
    ("ray-color.txt", "color.png", "ray-color.png"),
    ("ray-overlap.txt", "overlap.png", "ray-overlap.png"),
    ("ray-behind.txt", "behind.png", "ray-behind.png"),
    ("ray-shadow-basic.txt", "shadow-basic.png", "ray-shadow-basic.png"),
    ("ray-expose1.txt", "expose1.png", "ray-expose1.png"),
    ("ray-expose2.txt", "expose2.png", "ray-expose2.png"),
    ("ray-suns.txt", "suns.png", "ray-suns.png"),
    ("ray-shadow-suns.txt", "shadow-suns.png", "ray-shadow-suns.png"),
    ("ray-view.txt", "view.png", "ray-view.png"),
    ("ray-fisheye.txt", "fisheye.png", "ray-fisheye.png"),
    ("ray-panorama.txt", "panorama.png", "ray-panorama.png"),
    ("ray-plane.txt", "plane.png", "ray-plane.png"),
    ("ray-shadow-plane.txt", "shadow-plane.png", "ray-shadow-plane.png"),
    ("ray-tri.txt", "tri.png", "ray-tri.png"),
    ("ray-shadow-triangle.txt", "shadow-triangle.png", "ray-shadow-triangle.png"),
    ("ray-tex.txt", "tex.png", "ray-tex.png"),
]

def run_test(input_file, output_file, ref_file):
    print(f"\n{'='*50}")
    print(f"Testing: {input_file}")
    print(f"{'='*50}")
    
    #render
    print("Rendering...")
    try:
        result = subprocess.run(
            ["make", "run", f"file={input_file}"],
            capture_output=True,
            text=True,
            timeout=30
        )
        if result.returncode != 0:
            print(f"  ✗ Render failed: {result.stderr}")
            return False
    except subprocess.TimeoutExpired:
        print("  ✗ Render timed out")
        return False
    except Exception as e:
        print(f"  ✗ Render error: {e}")
        return False
    
    #check output exists
    if not os.path.exists(output_file):
        print(f"  ✗ Output file not created: {output_file}")
        return False
    
    print(f"  ✓ Output created: {output_file}")
    
    #compare if reference exists
    if os.path.exists(ref_file):
        print("Comparing with reference...")
        try:
            result = subprocess.run(
                ["python3", "compare_images.py", ref_file, output_file],
                capture_output=True,
                text=True
            )
            output = result.stdout.strip()
            #extract key info
            lines = output.split('\n')
            for line in lines:
                if "Total differences" in line:
                    print(f"  {line}")
                    #parse percentage
                    if "%" in line:
                        pct_str = line.split("(")[1].split("%")[0]
                        try:
                            pct = float(pct_str)
                            if pct < 1.0:
                                print("  ✓ Images match very closely (<1% difference)")
                            elif pct < 5.0:
                                print("  ⚠ Images are similar but have some differences (<5%)")
                            else:
                                print("  ✗ Images differ significantly (>5%)")
                        except:
                            pass
        except Exception as e:
            print(f"  ⚠ Comparison error: {e}")
    else:
        print(f"  ⚠ Reference file not found: {ref_file}")
        print("  (No comparison possible)")
    
    return True

if __name__ == "__main__":
    print("\n" + "="*50)
    print("RAYTRACER TEST SUITE")
    print("="*50)
    
    passed = 0
    total = len(tests)
    
    for input_file, output_file, ref_file in tests:
        if run_test(input_file, output_file, ref_file):
            passed += 1
    
    print(f"\n{'='*50}")
    print(f"SUMMARY: {passed}/{total} tests rendered successfully")
    print(f"{'='*50}\n")
    
    print("How to read the output:")
    print("  ✓ = Success")
    print("  ✗ = Failure")
    print("  ⚠ = Warning")
    print("\nFor detailed pixel-by-pixel differences, check difference.png")
    print("(created by compare_images.py)")

