# Parametric Geometry MP

This project implements a 3D graphics application that generates parametric spheres and tori using WebGL2.

## Features

- **Sphere Generation**: Creates spheres with any number of rings (latitude lines) and slices (longitude lines)
- **Torus Generation**: Creates tori with any number of rings and slices
- **Interactive Controls**: HTML form with input fields for rings, slices, and shape selection
- **3D Rendering**: Real-time 3D rendering with WebGL2
- **Lighting**: Implements both diffuse and specular lighting
- **Camera Animation**: Moving camera that orbits around the geometry

## File Structure

- `index.html` - Main HTML file with UI controls and canvas
- `main.js` - Main JavaScript application logic
- `shaders.js` - Vertex and fragment shaders for 3D rendering
- `math.js` - Mathematical utility functions for 3D graphics
- `wrapWebGL2.js` - WebGL2 wrapper for debugging and validation

## Usage

1. Open `index.html` in a web browser that supports WebGL2
2. Adjust the "Rings" and "Slices" input fields
3. Check the "Torus" checkbox to generate a torus, or leave unchecked for a sphere
4. Click "Make Object" to generate and render the geometry
5. The camera will automatically orbit around the generated object

## Geometry Specifications

### Sphere
- **Rings**: Number of latitude lines (≥ 1)
- **Slices**: Number of longitude lines (≥ 3)
- **Vertices**: 2 + rings × slices
- **Triangles**: 2 × rings × slices
- **Special Case**: 1 ring, 4 slices creates an octahedron (Platonic solid)

### Torus
- **Rings**: Number of rings around the major circumference (≥ 3)
- **Slices**: Number of slices through the minor circumference (≥ 3)
- **Vertices**: rings × slices
- **Triangles**: 2 × rings × slices

## Technical Details

- Uses WebGL2 with modern shader syntax (#version 300 es)
- Implements proper surface normals for smooth lighting
- Supports both diffuse and specular lighting models
- Efficient geometry generation with minimal vertex/triangle counts
- Real-time camera animation using requestAnimationFrame

## Browser Compatibility

Requires a modern web browser with WebGL2 support:
- Chrome 56+
- Firefox 51+
- Safari 15+
- Edge 79+

## Assignment Requirements Met

✅ Two number entry fields (rings, slices)  
✅ One checkbox field (torus selection)  
✅ One button (make object)  
✅ One canvas (WebGL2 rendering)  
✅ Sphere generation with parametric geometry  
✅ Torus generation with parametric geometry  
✅ Diffuse and specular lighting  
✅ Moving camera around geometry  
✅ Correct vertex and triangle counts  
✅ Support for any number of rings and slices  
✅ Proper surface normals  
✅ No spaces in filenames  
