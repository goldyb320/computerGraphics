#!/bin/bash
#run all tests and show results

echo "========================================="
echo "Rendering all test cases..."
echo "========================================="
echo ""

tests=(
    "ray-sphere.txt:sphere.png:ray-sphere.png"
    "ray-sun.txt:sun.png:ray-sun.png"
    "ray-color.txt:color.png:ray-color.png"
    "ray-overlap.txt:overlap.png:ray-overlap.png"
    "ray-behind.txt:behind.png:ray-behind.png"
    "ray-shadow-basic.txt:shadow-basic.png:ray-shadow-basic.png"
)

for test_info in "${tests[@]}"; do
    IFS=':' read -r input_file output_file ref_file <<< "$test_info"
    
    echo "Testing: $input_file"
    echo "  Rendering..."
    make run file="$input_file" > /dev/null 2>&1
    
    if [ -f "$output_file" ]; then
        echo "  ✓ Output file created: $output_file"
        
        if [ -f "$ref_file" ]; then
            echo "  Comparing with reference..."
            result=$(python3 compare_images.py "$ref_file" "$output_file" 2>&1 | tail -1)
            echo "  $result"
        else
            echo "  ⚠ Reference file not found: $ref_file"
        fi
    else
        echo "  ✗ Failed to create output file"
    fi
    echo ""
done

echo "========================================="
echo "Done!"
echo "========================================="

