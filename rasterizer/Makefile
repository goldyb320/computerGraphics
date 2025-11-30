.PHONY: build run run-test test-test

build:
	@echo "Nothing to build"

run:
	FILE=$(file) python3 main.py

run-test:
	@make run file=rast-gray.txt
	@make run file=rast-smallgap.txt
	@make run file=rast-smoothcolor.txt
	@make run file=rast-checkers.txt
	@echo "All test cases completed."

run-depth:
	@make run file=rast-depth.txt
	@echo "Depth test completed."

test-test:
	@make run-test
	-compare -metric AE gray.png rast-gray.png diff.png
	-compare -metric AE smoothcolor.png rast-smoothcolor.png smooth.png
	-compare -metric AE checkers.png rast-checkers.png check.png
	-compare -metric AE smallgap.png rast-smallgap.png smallgapdiff.png

test-depth:
	@make run-depth
	-compare -metric AE rast-depth.png depth.png depthdiff.png

run-elements:
	@make run file=rast-elements.txt
	@echo "Elements test completed."

test-elements:
	@make run-elements
	-compare -metric AE oldlogo.png rast-elements.png elementsdiff.png

run-srgb:
	@make run file=rast-gammabox.txt
	@make run file=rast-sRGB.txt
	@echo "sRGB tests completed."

test-srgb:
	@make run-srgb
	-compare -metric AE gammabox.png rast-gammabox.png gammaboxdiff.png
	-compare -metric AE sRGB.png rast-sRGB.png sRGBdiff.png

run-perspective:
	@make run file=rast-perspective.txt
	@echo "Perspective test completed."

test-perspective:
	@make run-perspective
	-compare -metric AE perspective.png rast-perspective.png perspectivediff.png

run-matrix:
	@make run file=rast-matrix.txt
	@echo "Matrix test completed."

test-matrix:
	@make run-matrix
	-compare -metric AE rast-matrix.png matrix.png matrixdiff.png

run-cull:
	@make run file=rast-cull.txt
	@echo "Cull test completed."

test-cull:
	@make run-cull
	-compare -metric AE rast-cull.png cull.png culldiff.png

run-2d3d:
	@make run file=rast-2d3d.txt
	@echo "2d3d test completed."

test-2d3d:
	@make run-2d3d
	-compare -metric AE rast-2d3d.png 2d3d.png 2d3ddiff.png
