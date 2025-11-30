//global variables
let gl, shaderProgram, terrain = null;
let viewMatrix, projectionMatrix, normalMatrix;
let positionBuffer, normalBuffer, indexBuffer;
let time = 0;
let lightingMode = 0; //0=normal,1=brighter diffuse,2=enhanced specular,3=different light dir

//initialize webgl
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
    
    //set canvas background color
    gl.clearColor(0.2, 0.2, 0.2, 1.0);
    
    //get shader sources
    const vertexShaderCode = document.getElementById('vertex-shader').textContent;
    const fragmentShaderCode = document.getElementById('fragment-shader').textContent;
    
    //create shader program
    shaderProgram = createShaderProgram(vertexShaderCode, fragmentShaderCode);
    if (!shaderProgram) {
        alert('Failed to create shader program');
        return;
    }
    gl.useProgram(shaderProgram);
    
    //setup uniforms
    setupUniforms();
    
    //setup event listeners
    setupEventListeners();
    
    //generate initial terrain
    try {
        generateTerrain(20, 10);
    } catch (error) {
        console.error('Failed to generate initial terrain:', error);
    }
    
    //add keyboard controls for lighting verification
    document.addEventListener('keydown', (event) => {
        switch(event.key) {
            case '1':
                lightingMode = 0;
                break;
            case '2':
                lightingMode = 1;
                break;
            case '3':
                lightingMode = 2;
                break;
            case '4':
                lightingMode = 3;
                break;
        }
    });
    
    //start animation loop
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
    //get uniform locations
    const viewMatrixLoc = gl.getUniformLocation(shaderProgram, 'modelViewMatrix');
    const projectionMatrixLoc = gl.getUniformLocation(shaderProgram, 'projectionMatrix');
    const normalMatrixLoc = gl.getUniformLocation(shaderProgram, 'normalMatrix');
    const lightDirectionLoc = gl.getUniformLocation(shaderProgram, 'lightDirection');
    const diffuseColorLoc = gl.getUniformLocation(shaderProgram, 'diffuseColor');
    const specularColorLoc = gl.getUniformLocation(shaderProgram, 'specularColor');
    const shininessLoc = gl.getUniformLocation(shaderProgram, 'shininess');
    
    //store uniform locations
    shaderProgram.uniforms = {
        modelViewMatrix: viewMatrixLoc,
        projectionMatrix: projectionMatrixLoc,
        normalMatrix: normalMatrixLoc,
        lightDirection: lightDirectionLoc,
        diffuseColor: diffuseColorLoc,
        specularColor: specularColorLoc,
        shininess: shininessLoc
    };
}

//setup event listeners
function setupEventListeners() {
    document.querySelector('#submit').addEventListener('click', event => {
        const gridSize = Number(document.querySelector('#gridsize').value) || 2;
        const faultCount = Number(document.querySelector('#faults').value) || 0;
        generateTerrain(gridSize, faultCount);
    });
}

//generate terrain using fault-based fractal algorithm
function generateTerrain(gridSize, faultCount) {
    
    //create grid vertices
    const vertices = [];
    const step = 2.0 / (gridSize - 1);
    
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            const x = -1.0 + j * step;
            const z = -1.0 + i * step;
            vertices.push(x, 0, z); //start with flat terrain
        }
    }
    
    //apply faults
    if (faultCount > 0) {
        applyFaults(vertices, gridSize, faultCount);
        normalizeHeights(vertices, gridSize);
    }
    
    //calculate normals
    const normals = calculateNormals(vertices, gridSize);
    
    //create indices for triangles
    const indices = [];
    for (let i = 0; i < gridSize - 1; i++) {
        for (let j = 0; j < gridSize - 1; j++) {
            const topLeft = i * gridSize + j;
            const topRight = topLeft + 1;
            const bottomLeft = (i + 1) * gridSize + j;
            const bottomRight = bottomLeft + 1;
            
            //first triangle
            indices.push(topLeft, bottomLeft, topRight);
            //second triangle
            indices.push(topRight, bottomLeft, bottomRight);
        }
    }
    
    //store terrain data
    terrain = {
        vertices: vertices,
        normals: normals,
        indices: indices,
        gridSize: gridSize
    };
    
    //create buffers
    createBuffers();
}

//apply fault-based fractal algorithm
function applyFaults(vertices, gridSize, faultCount) {
    for (let f = 0; f < faultCount; f++) {
        //random fault line
        const x1 = Math.random() * 2 - 1;
        const z1 = Math.random() * 2 - 1;
        const x2 = Math.random() * 2 - 1;
        const z2 = Math.random() * 2 - 1;
        
        //calculate which side of the line each vertex is on
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                const vertexIndex = (i * gridSize + j) * 3;
                const x = vertices[vertexIndex];
                const z = vertices[vertexIndex + 2];
                
                //cross product to determine which side of the line
                const cross = (x2 - x1) * (z - z1) - (z2 - z1) * (x - x1);
                
                //add height based on which side of the fault line
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
    
    //find min and max heights
    for (let i = 0; i < vertices.length; i += 3) {
        const height = vertices[i + 1];
        minHeight = Math.min(minHeight, height);
        maxHeight = Math.max(maxHeight, height);
    }
    
    //normalize to range [-0.5, 0.5]
    const range = maxHeight - minHeight;
    if (range > 0) {
        const scale = 1.0; //constant for height scaling
        for (let i = 0; i < vertices.length; i += 3) {
            vertices[i + 1] = scale * (vertices[i + 1] - 0.5 * (maxHeight + minHeight)) / range;
        }
    }
}

//calculate normals using grid-based approach
function calculateNormals(vertices, gridSize) {
    const normals = new Array(vertices.length);
    
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            const vertexIndex = (i * gridSize + j) * 3;
            
            //get neighboring vertices (use current vertex if on edge)
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
            
            //calculate normal using (n-s) × (w-e)
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
    if (indexBuffer) gl.deleteBuffer(indexBuffer);
    
    //position buffer
    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(terrain.vertices), gl.STATIC_DRAW);
    
    //normal buffer
    normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(terrain.normals), gl.STATIC_DRAW);
    
    //index buffer
    indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(terrain.indices), gl.STATIC_DRAW);
}

//fill screen function
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
        //update projection matrix based on aspect ratio
        updateProjectionMatrix();
    }
}

//update projection matrix
function updateProjectionMatrix() {
    const canvas = document.getElementById('terrainCanvas');
    const aspect = canvas.width / canvas.height;
    const fovy = Math.PI / 4; //45 degrees
    const near = 0.1;
    const far = 100.0;
    
    projectionMatrix = m4perspNegZ(near, far, fovy, canvas.width, canvas.height);
}

//animation loop
function animate() {
    time += 0.016; //~60 fps
    
    //update camera position (circular motion around terrain)
    updateCamera();
    
    //draw
    draw();
    
    requestAnimationFrame(animate);
}

//update camera position
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
    
    //calculate normal matrix (inverse transpose of model-view matrix)
    const view3x3 = [
        viewMatrix[0], viewMatrix[1], viewMatrix[2],
        viewMatrix[4], viewMatrix[5], viewMatrix[6],
        viewMatrix[8], viewMatrix[9], viewMatrix[10]
    ];
    
    //for this simple case, we can use the 3x3 part directly since there's no scaling
    normalMatrix = new Float32Array(view3x3);
}

//draw function
function draw() {
    if (!gl || !shaderProgram) return;
    
    if (!terrain) {
        //clear with a dark background when no terrain
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        return;
    }
    
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    
    //setup vertex attributes
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
    
    //set uniforms
    gl.uniformMatrix4fv(shaderProgram.uniforms.modelViewMatrix, false, viewMatrix);
    gl.uniformMatrix4fv(shaderProgram.uniforms.projectionMatrix, false, projectionMatrix);
    gl.uniformMatrix3fv(shaderProgram.uniforms.normalMatrix, false, normalMatrix);
    
    //lighting parameters based on test mode
    let lightDirection, diffuseColor, specularColor, shininess;
    
    switch(lightingMode) {
        case 0: //normal lighting
            lightDirection = [0.5, 1.0, 0.3];
            diffuseColor = [0.8, 0.6, 0.4];
            specularColor = [1.0, 1.0, 1.0];
            shininess = 32.0;
            break;
        case 1: //brighter diffuse lighting
            lightDirection = [0.5, 1.0, 0.3];
            diffuseColor = [1.2, 0.9, 0.6]; //brighter earth tone
            specularColor = [1.0, 1.0, 1.0];
            shininess = 32.0;
            break;
        case 2: //enhanced specular highlights
            lightDirection = [0.5, 1.0, 0.3];
            diffuseColor = [0.8, 0.6, 0.4];
            specularColor = [2.0, 2.0, 2.0]; //brighter specular
            shininess = 64.0; //more focused highlights
            break;
        case 3: //different light direction
            lightDirection = [1.0, 0.5, 0.2]; //more from the side
            diffuseColor = [0.8, 0.6, 0.4];
            specularColor = [1.0, 1.0, 1.0];
            shininess = 32.0;
            break;
    }
    
    gl.uniform3fv(shaderProgram.uniforms.lightDirection, lightDirection);
    gl.uniform3fv(shaderProgram.uniforms.diffuseColor, diffuseColor);
    gl.uniform3fv(shaderProgram.uniforms.specularColor, specularColor);
    gl.uniform1f(shaderProgram.uniforms.shininess, shininess);
    
    
    //draw triangles
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.drawElements(gl.TRIANGLES, terrain.indices.length, gl.UNSIGNED_SHORT, 0);
}

//start the application
window.addEventListener('load', init);
