#!/bin/bash
#render all test cases and optionally compare with reference images

echo "Rendering all test cases..."
echo ""

#core tests
tests=(
    "ray-sphere.txt"
    "ray-sun.txt"
    "ray-color.txt"
    "ray-overlap.txt"
    "ray-behind.txt"
    "ray-shadow-basic.txt"
)

for test in "${tests[@]}"; do
    if [ -f "$test" ]; then
        echo "Rendering $test..."
        make run file="$test"
    else
        echo "Warning: $test not found"
    fi
done

echo ""
echo "Done rendering all tests"
echo ""
echo "To compare with reference images, run:"
echo "  python3 compare_images.py <reference.png> <generated.png>"

