//global vars
let gl, shaderProgramColor, shaderProgramTexture, currentShaderProgram, terrain = null;
let viewMatrix, projectionMatrix, normalMatrix;
let positionBuffer, normalBuffer, texCoordBuffer, indexBuffer;
let time = 0;
let currentMaterial = { type: 'blank', color: [1, 1, 1, 0.3] };
let texture = null;

//init webgl
function init() {
    const canvas = document.getElementById('terrainCanvas');
    gl = canvas.getContext('webgl2');
    
    if (!gl) {
        alert('WebGL2 not supported');
        return;
    }
    window.gl = gl;
    
    //setup resize handler
    window.addEventListener('resize', fillScreen);
    fillScreen();
    
    //set bg color
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    
    //get shader code
    const vertexShaderColorCode = document.getElementById('vertex-shader-color').textContent;
    const fragmentShaderColorCode = document.getElementById('fragment-shader-color').textContent;
    const vertexShaderTextureCode = document.getElementById('vertex-shader-texture').textContent;
    const fragmentShaderTextureCode = document.getElementById('fragment-shader-texture').textContent;
    
    //create shader programs
    shaderProgramColor = createShaderProgram(vertexShaderColorCode, fragmentShaderColorCode);
    shaderProgramTexture = createShaderProgram(vertexShaderTextureCode, fragmentShaderTextureCode);
    
    if (!shaderProgramColor || !shaderProgramTexture) {
        alert('Failed to create shader programs');
        return;
    }
    
    //setup uniforms
    setupUniforms();
    
    //set initial shader
    currentShaderProgram = shaderProgramColor;
    gl.useProgram(currentShaderProgram);
    
    //setup events
    setupEventListeners();
    
    //gen initial terrain
    try {
        generateTerrain(20, 10);
    } catch (error) {
        console.error('Failed to generate initial terrain:', error);
    }
    
    //start anim loop
    animate();
}

//create shader program
function createShaderProgram(vertexCode, fragmentCode) {
    const vertexShader = createShader(gl.VERTEX_SHADER, vertexCode);
    const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentCode);
    
    if (!vertexShader || !fragmentShader) {
        console.error('Failed to create shaders');
        return null;
    }
    
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program linking failed:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }
    
    return program;
}

//create shader
function createShader(type, code) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, code);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compilation failed:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    
    return shader;
}

//setup uniforms
function setupUniforms() {
    //color shader uniforms
    shaderProgramColor.uniforms = {
        modelViewMatrix: gl.getUniformLocation(shaderProgramColor, 'modelViewMatrix'),
        projectionMatrix: gl.getUniformLocation(shaderProgramColor, 'projectionMatrix'),
        normalMatrix: gl.getUniformLocation(shaderProgramColor, 'normalMatrix'),
        lightDirection: gl.getUniformLocation(shaderProgramColor, 'lightDirection'),
        color: gl.getUniformLocation(shaderProgramColor, 'color'),
        shininess: gl.getUniformLocation(shaderProgramColor, 'shininess')
    };
    
    //texture shader uniforms
    shaderProgramTexture.uniforms = {
        modelViewMatrix: gl.getUniformLocation(shaderProgramTexture, 'modelViewMatrix'),
        projectionMatrix: gl.getUniformLocation(shaderProgramTexture, 'projectionMatrix'),
        normalMatrix: gl.getUniformLocation(shaderProgramTexture, 'normalMatrix'),
        lightDirection: gl.getUniformLocation(shaderProgramTexture, 'lightDirection'),
        texture: gl.getUniformLocation(shaderProgramTexture, 'uTexture')
    };
}

//setup event listeners
function setupEventListeners() {
    document.querySelector('#submit').addEventListener('click', event => {
        const gridSize = Number(document.querySelector('#gridsize').value) || 2;
        const faultCount = Number(document.querySelector('#faults').value) || 0;
        generateTerrain(gridSize, faultCount);
    });
    
    //material input listener
    document.querySelector('#material').addEventListener('change', event => {
        parseMaterial(event.target.value);
    });
    
    //also listen to input for immediate feedback
    document.querySelector('#material').addEventListener('input', event => {
        parseMaterial(event.target.value);
    });
}

//parse material input
function parseMaterial(value) {
    value = value.trim();
    
    //blank - use default
    if (value === '') {
        currentMaterial = { type: 'blank', color: [1, 1, 1, 0.3] };
        switchToColorShader();
        return;
    }
    
    //hex color #RRGGBBAA
    if (/^#[0-9a-f]{8}$/i.test(value)) {
        const r = Number('0x' + value.substr(1, 2)) / 255.0;
        const g = Number('0x' + value.substr(3, 2)) / 255.0;
        const b = Number('0x' + value.substr(5, 2)) / 255.0;
        const a = Number('0x' + value.substr(7, 2)) / 255.0;
        currentMaterial = { type: 'color', color: [r, g, b, a] };
        switchToColorShader();
        return;
    }
    
    //image url .jpg or .png
    if (/[.](jpg|png)$/i.test(value)) {
        loadTexture(value);
        return;
    }
    
    //invalid - use error color
    currentMaterial = { type: 'color', color: [1, 0, 1, 0] };
    switchToColorShader();
}

//load texture from url
function loadTexture(url) {
    const img = new Image();
    
    img.addEventListener('load', () => {
        //texture loaded ok
        if (texture) {
            gl.deleteTexture(texture);
        }
        
        texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        
        currentMaterial = { type: 'texture', texture: texture };
        switchToTextureShader();
    });
    
    img.addEventListener('error', () => {
        //texture load failed - use error color
        currentMaterial = { type: 'color', color: [1, 0, 1, 0] };
        switchToColorShader();
    });
    
    img.src = url;
}

//switch to color shader
function switchToColorShader() {
    currentShaderProgram = shaderProgramColor;
    gl.useProgram(currentShaderProgram);
}

//switch to texture shader
function switchToTextureShader() {
    currentShaderProgram = shaderProgramTexture;
    gl.useProgram(currentShaderProgram);
}

//gen terrain using fault-based fractal
function generateTerrain(gridSize, faultCount) {
    
    //create grid verts with tex coords
    const vertices = [];
    const texCoords = [];
    const step = 2.0 / (gridSize - 1);
    
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            const x = -1.0 + j * step;
            const z = -1.0 + i * step;
            vertices.push(x, 0, z); //start flat
            
            //tex coords (0,0) to (1,1)
            const u = j / (gridSize - 1);
            const v = i / (gridSize - 1);
            texCoords.push(u, v);
        }
    }
    
    //apply faults
    if (faultCount > 0) {
        applyFaults(vertices, gridSize, faultCount);
        normalizeHeights(vertices, gridSize);
    }
    
    //calc normals
    const normals = calculateNormals(vertices, gridSize);
    
    //create triangle indices
    const indices = [];
    for (let i = 0; i < gridSize - 1; i++) {
        for (let j = 0; j < gridSize - 1; j++) {
            const topLeft = i * gridSize + j;
            const topRight = topLeft + 1;
            const bottomLeft = (i + 1) * gridSize + j;
            const bottomRight = bottomLeft + 1;
            
            //first tri
            indices.push(topLeft, bottomLeft, topRight);
            //second tri
            indices.push(topRight, bottomLeft, bottomRight);
        }
    }
    
    //store terrain data
    terrain = {
        vertices: vertices,
        normals: normals,
        texCoords: texCoords,
        indices: indices,
        gridSize: gridSize
    };
    
    //create buffers
    createBuffers();
}

//apply fault-based fractal
function applyFaults(vertices, gridSize, faultCount) {
    for (let f = 0; f < faultCount; f++) {
        //random fault line
        const x1 = Math.random() * 2 - 1;
        const z1 = Math.random() * 2 - 1;
        const x2 = Math.random() * 2 - 1;
        const z2 = Math.random() * 2 - 1;
        
        //calc which side of line each vertex is on
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                const vertexIndex = (i * gridSize + j) * 3;
                const x = vertices[vertexIndex];
                const z = vertices[vertexIndex + 2];
                
                //cross product to determine side
                const cross = (x2 - x1) * (z - z1) - (z2 - z1) * (x - x1);
                
                //add height based on side
                const heightChange = cross > 0 ? 0.1 : -0.1;
                vertices[vertexIndex + 1] += heightChange;
            }
        }
    }
}

//normalize heights to consistent range
function normalizeHeights(vertices, gridSize) {
    let minHeight = Infinity;
    let maxHeight = -Infinity;
    
    //find min/max heights
    for (let i = 0; i < vertices.length; i += 3) {
        const height = vertices[i + 1];
        minHeight = Math.min(minHeight, height);
        maxHeight = Math.max(maxHeight, height);
    }
    
    //normalize to [-0.5, 0.5]
    const range = maxHeight - minHeight;
    if (range > 0) {
        const scale = 1.0;
        for (let i = 0; i < vertices.length; i += 3) {
            vertices[i + 1] = scale * (vertices[i + 1] - 0.5 * (maxHeight + minHeight)) / range;
        }
    }
}

//calc normals using grid approach
function calculateNormals(vertices, gridSize) {
    const normals = new Array(vertices.length);
    
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            const vertexIndex = (i * gridSize + j) * 3;
            
            //get neighbors (use current if on edge)
            const north = i > 0 ? (i - 1) * gridSize + j : i * gridSize + j;
            const south = i < gridSize - 1 ? (i + 1) * gridSize + j : i * gridSize + j;
            const west = j > 0 ? i * gridSize + (j - 1) : i * gridSize + j;
            const east = j < gridSize - 1 ? i * gridSize + (j + 1) : i * gridSize + j;
            
            //get positions
            const v = [vertices[vertexIndex], vertices[vertexIndex + 1], vertices[vertexIndex + 2]];
            const n = [vertices[north * 3], vertices[north * 3 + 1], vertices[north * 3 + 2]];
            const s = [vertices[south * 3], vertices[south * 3 + 1], vertices[south * 3 + 2]];
            const w = [vertices[west * 3], vertices[west * 3 + 1], vertices[west * 3 + 2]];
            const e = [vertices[east * 3], vertices[east * 3 + 1], vertices[east * 3 + 2]];
            
            //calc normal using (n-s) × (w-e)
            const ns = sub(n, s);
            const we = sub(w, e);
            const normal = cross(ns, we);
            const normalizedNormal = normalize(normal);
            
            normals[vertexIndex] = normalizedNormal[0];
            normals[vertexIndex + 1] = normalizedNormal[1];
            normals[vertexIndex + 2] = normalizedNormal[2];
        }
    }
    
    return normals;
}

//create opengl buffers
function createBuffers() {
    if (positionBuffer) gl.deleteBuffer(positionBuffer);
    if (normalBuffer) gl.deleteBuffer(normalBuffer);
    if (texCoordBuffer) gl.deleteBuffer(texCoordBuffer);
    if (indexBuffer) gl.deleteBuffer(indexBuffer);
    
    //position buffer
    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(terrain.vertices), gl.STATIC_DRAW);
    
    //normal buffer
    normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(terrain.normals), gl.STATIC_DRAW);
    
    //tex coord buffer
    texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(terrain.texCoords), gl.STATIC_DRAW);
    
    //index buffer
    indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(terrain.indices), gl.STATIC_DRAW);
}

//fill screen
function fillScreen() {
    let canvas = document.getElementById('terrainCanvas');
    document.body.style.margin = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    canvas.style.width = '';
    canvas.style.height = '';
    if (gl) {
        gl.viewport(0, 0, canvas.width, canvas.height);
        //update projection based on aspect
        updateProjectionMatrix();
    }
}

//update projection matrix
function updateProjectionMatrix() {
    const canvas = document.getElementById('terrainCanvas');
    const aspect = canvas.width / canvas.height;
    const fovy = Math.PI / 4;
    const near = 0.1;
    const far = 100.0;
    
    projectionMatrix = m4perspNegZ(near, far, fovy, canvas.width, canvas.height);
}

//anim loop
function animate() {
    time += 0.016;
    
    //update camera (circular motion)
    updateCamera();
    
    //draw
    draw();
    
    requestAnimationFrame(animate);
}

//update camera pos
function updateCamera() {
    if (!terrain) return;
    
    const radius = 3.0;
    const height = 1.5;
    const centerX = 0;
    const centerZ = 0;
    
    const eyeX = centerX + radius * Math.cos(time * 0.5);
    const eyeY = height;
    const eyeZ = centerZ + radius * Math.sin(time * 0.5);
    
    const eye = [eyeX, eyeY, eyeZ];
    const center = [0, 0, 0];
    const up = [0, 1, 0];
    
    viewMatrix = m4view(eye, center, up);
    
    //calc normal matrix (3x3 part of view)
    const view3x3 = [
        viewMatrix[0], viewMatrix[1], viewMatrix[2],
        viewMatrix[4], viewMatrix[5], viewMatrix[6],
        viewMatrix[8], viewMatrix[9], viewMatrix[10]
    ];
    
    //use 3x3 directly (no scaling)
    normalMatrix = new Float32Array(view3x3);
}

//draw
function draw() {
    if (!gl || !currentShaderProgram) return;
    
    if (!terrain) {
        //clear if no terrain
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        return;
    }
    
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    
    //use current shader
    gl.useProgram(currentShaderProgram);
    
    //setup vertex attrs
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);
    
    //set common uniforms
    gl.uniformMatrix4fv(currentShaderProgram.uniforms.modelViewMatrix, false, viewMatrix);
    gl.uniformMatrix4fv(currentShaderProgram.uniforms.projectionMatrix, false, projectionMatrix);
    gl.uniformMatrix3fv(currentShaderProgram.uniforms.normalMatrix, false, normalMatrix);
    
    //lighting
    const lightDirection = [0.5, 1.0, 0.3];
    gl.uniform3fv(currentShaderProgram.uniforms.lightDirection, lightDirection);
    
    //set shader-specific uniforms
    if (currentShaderProgram === shaderProgramColor) {
        //color shader
        gl.uniform4fv(currentShaderProgram.uniforms.color, currentMaterial.color);
        gl.uniform1f(currentShaderProgram.uniforms.shininess, 32.0);
    } else if (currentShaderProgram === shaderProgramTexture) {
        //texture shader
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, currentMaterial.texture);
        gl.uniform1i(currentShaderProgram.uniforms.texture, 0);
    }
    
    //draw tris
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.drawElements(gl.TRIANGLES, terrain.indices.length, gl.UNSIGNED_SHORT, 0);
}

//start app
window.addEventListener('load', init);