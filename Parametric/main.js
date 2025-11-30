// globals
let gl, program;
let positionBuffer, normalBuffer, indexBuffer;
let currentGeometry = null;
let animationId;

// shader uniforms
let modelViewMatrixLocation, projectionMatrixLocation, normalMatrixLocation;
let lightPositionLocation, lightColorLocation, ambientColorLocation;
let materialColorLocation, shininessLocation;

// camera stuff
let cameraAngle = 0;
let cameraDistance = 5;

// startup
function init() {
    const canvas = document.getElementById('canvas');
    gl = canvas.getContext('webgl2');
    
    if (!gl) {
        alert('WebGL2 not supported');
        return;
    }
    
    // make shaders
    program = createShaderProgram(gl, vertexShaderSource, fragmentShaderSource);
    if (!program) {
        alert('Failed to create shader program');
        return;
    }
    
    // get uniform spots
    modelViewMatrixLocation = gl.getUniformLocation(program, 'modelViewMatrix');
    projectionMatrixLocation = gl.getUniformLocation(program, 'projectionMatrix');
    normalMatrixLocation = gl.getUniformLocation(program, 'normalMatrix');
    lightPositionLocation = gl.getUniformLocation(program, 'lightPosition');
    lightColorLocation = gl.getUniformLocation(program, 'lightColor');
    ambientColorLocation = gl.getUniformLocation(program, 'ambientColor');
    materialColorLocation = gl.getUniformLocation(program, 'materialColor');
    shininessLocation = gl.getUniformLocation(program, 'shininess');
    
    // button click
    document.getElementById('makeObject').addEventListener('click', generateGeometry);
    
    // depth test
    gl.enable(gl.DEPTH_TEST);
    
    // start animating
    animate();
}

// make sphere
function generateSphere(rings, slices) {
    const vertices = [];
    const normals = [];
    const indices = [];
    
    // make points
    for (let i = 0; i <= rings; i++) {
        const phi = Math.PI * i / rings;
        const y = Math.cos(phi);
        const sinPhi = Math.sin(phi);
        
        for (let j = 0; j <= slices; j++) {
            const theta = 2 * Math.PI * j / slices; // 0 to 2π
            const x = sinPhi * Math.cos(theta);
            const z = sinPhi * Math.sin(theta);
            
            vertices.push(x, y, z);
            normals.push(x, y, z); // normal = position for unit sphere
        }
    }
    
    // make triangles
    for (let i = 0; i < rings; i++) {
        for (let j = 0; j < slices; j++) {
            const current = i * (slices + 1) + j;
            const next = current + slices + 1;
            
            // triangle 1
            indices.push(current, next, current + 1);
            // triangle 2
            indices.push(current + 1, next, next + 1);
        }
    }
    
    // check counts (assignment spec: 2 + rs vertices, 2rs triangles)
    const expectedVertices = 2 + rings * slices;
    const expectedTriangles = 2 * rings * slices;
    const actualVertices = vertices.length / 3;
    const actualTriangles = indices.length / 3;
    
    console.log(`sphere: expected ${expectedVertices} vertices, got ${actualVertices}`);
    console.log(`sphere: expected ${expectedTriangles} triangles, got ${actualTriangles}`);
    
    // verify exact counts as required
    if (actualVertices !== expectedVertices || actualTriangles !== expectedTriangles) {
        console.error('sphere count mismatch!');
    }
    
    // octahedron test case
    if (rings === 1 && slices === 4) {
        console.log('octahedron: 1 ring, 4 slices = platonic solid');
    }
    
    return { vertices, normals, indices };
}

// make torus
function generateTorus(rings, slices) {
    const vertices = [];
    const normals = [];
    const indices = [];
    
    const majorRadius = 1.0; // center to center distance
    const minorRadius = 0.3; // tube radius
    
    for (let i = 0; i < rings; i++) {
        const u = 2 * Math.PI * i / rings; // 0 to 2π
        
        for (let j = 0; j < slices; j++) {
            const v = 2 * Math.PI * j / slices; // 0 to 2π
            
            // position on torus
            const x = (majorRadius + minorRadius * Math.cos(v)) * Math.cos(u);
            const y = minorRadius * Math.sin(v);
            const z = (majorRadius + minorRadius * Math.cos(v)) * Math.sin(u);
            
            vertices.push(x, y, z);
            
            // normal (away from ring center)
            const normalX = Math.cos(v) * Math.cos(u);
            const normalY = Math.sin(v);
            const normalZ = Math.cos(v) * Math.sin(u);
            normals.push(normalX, normalY, normalZ);
        }
    }
    
    // make triangles
    for (let i = 0; i < rings; i++) {
        for (let j = 0; j < slices; j++) {
            const current = i * slices + j;
            const next = ((i + 1) % rings) * slices + j;
            const currentNext = i * slices + ((j + 1) % slices);
            const nextNext = ((i + 1) % rings) * slices + ((j + 1) % slices);
            
            // triangle 1
            indices.push(current, next, currentNext);
            // triangle 2
            indices.push(currentNext, next, nextNext);
        }
    }
    
    // check counts (assignment spec: rs vertices, 2rs triangles)
    const expectedVertices = rings * slices;
    const expectedTriangles = 2 * rings * slices;
    const actualVertices = vertices.length / 3;
    const actualTriangles = indices.length / 3;
    
    console.log(`torus: expected ${expectedVertices} vertices, got ${actualVertices}`);
    console.log(`torus: expected ${expectedTriangles} triangles, got ${actualTriangles}`);
    
    // verify exact counts as required
    if (actualVertices !== expectedVertices || actualTriangles !== expectedTriangles) {
        console.error('torus count mismatch!');
    }
    
    return { vertices, normals, indices };
}

// upload to gpu
function uploadGeometry(geometry) {
    // position buffer
    if (positionBuffer) gl.deleteBuffer(positionBuffer);
    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry.vertices), gl.STATIC_DRAW);
    
    // normal buffer
    if (normalBuffer) gl.deleteBuffer(normalBuffer);
    normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry.normals), gl.STATIC_DRAW);
    
    // index buffer
    if (indexBuffer) gl.deleteBuffer(indexBuffer);
    indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(geometry.indices), gl.STATIC_DRAW);
    
    currentGeometry = geometry;
}

// make geometry from inputs
function generateGeometry() {
    const rings = parseInt(document.getElementById('rings').value);
    const slices = parseInt(document.getElementById('slices').value);
    const isTorus = document.getElementById('torus').checked;
    
    // check inputs
    if (isTorus) {
        if (rings < 3 || slices < 3) {
            alert('torus needs at least 3 rings and 3 slices');
            return;
        }
    } else {
        if (rings < 1 || slices < 3) {
            alert('sphere needs at least 1 ring and 3 slices');
            return;
        }
    }
    
    let geometry;
    if (isTorus) {
        geometry = generateTorus(rings, slices);
        console.log(`torus: ${rings} rings, ${slices} slices`);
        console.log(`vertices: ${geometry.vertices.length / 3}, triangles: ${geometry.indices.length / 3}`);
    } else {
        geometry = generateSphere(rings, slices);
        console.log(`sphere: ${rings} rings, ${slices} slices`);
        console.log(`vertices: ${geometry.vertices.length / 3}, triangles: ${geometry.indices.length / 3}`);
    }
    
    uploadGeometry(geometry);
}

// draw everything
function render() {
    if (!currentGeometry) return;
    
    // clear screen
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    // use shaders
    gl.useProgram(program);
    
    // set up vertex data
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    
    // matrices
    const canvas = gl.canvas;
    const aspect = canvas.width / canvas.height;
    
    // model matrix (identity)
    const modelMatrix = new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ]);
    
    // view matrix (camera orbit)
    const eye = [
        cameraDistance * Math.cos(cameraAngle),
        2,
        cameraDistance * Math.sin(cameraAngle)
    ];
    const center = [0, 0, 0];
    const up = [0, 1, 0];
    const viewMatrix = m4view(eye, center, up);
    
    // model-view matrix
    const modelViewMatrix = m4mul(viewMatrix, modelMatrix);
    
    // normal matrix (3x3 upper-left)
    const normalMatrix = new Float32Array([
        modelViewMatrix[0], modelViewMatrix[1], modelViewMatrix[2],
        modelViewMatrix[4], modelViewMatrix[5], modelViewMatrix[6],
        modelViewMatrix[8], modelViewMatrix[9], modelViewMatrix[10]
    ]);
    
    // projection matrix
    const projectionMatrix = m4perspNegZ(0.1, 100, Math.PI / 4, canvas.width, canvas.height);
    
    // set uniforms
    gl.uniformMatrix4fv(modelViewMatrixLocation, false, modelViewMatrix);
    gl.uniformMatrix4fv(projectionMatrixLocation, false, projectionMatrix);
    gl.uniformMatrix3fv(normalMatrixLocation, false, normalMatrix);
    
    // lighting
    gl.uniform3fv(lightPositionLocation, [5, 5, 5]);
    gl.uniform3fv(lightColorLocation, [1, 1, 1]);
    gl.uniform3fv(ambientColorLocation, [0.2, 0.2, 0.2]);
    gl.uniform3fv(materialColorLocation, [0.8, 0.4, 0.2]);
    gl.uniform1f(shininessLocation, 32.0);
    
    // draw
    gl.drawElements(gl.TRIANGLES, currentGeometry.indices.length, gl.UNSIGNED_SHORT, 0);
}

// animation loop
function animate() {
    cameraAngle += 0.01;
    render();
    animationId = requestAnimationFrame(animate);
}

// start when page loads
window.addEventListener('load', init);
