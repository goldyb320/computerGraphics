//vertex shader
const vs = `#version 300 es
layout(location = 0) in vec3 pos;
layout(location = 1) in vec3 col;
uniform mat4 mvp;
out vec3 vCol;
void main() {
    gl_Position = mvp * vec4(pos, 1.0);
    vCol = col;
}`;

//fragment shader
const fs = `#version 300 es
precision highp float;
in vec3 vCol;
out vec4 fragColor;
void main() {
    fragColor = vec4(vCol, 1.0);
}`;

//octahedron data
const octPos = new Float32Array([1,0,0, 0,1,0, 0,0,1, 0,-1,0, 0,0,-1, -1,0,0]);
const octCol = new Float32Array([0.5,0,1, 1,0.84,0, 0,1,0, 0.5,0,1, 1,0.84,0, 0,1,0]);
const octIdx = new Uint16Array([0,1,2, 0,2,3, 0,3,4, 0,4,1, 5,1,4, 5,4,3, 5,3,2, 5,2,1]);

//global variables
let gl;
let canvas;
let prog;
let mvpLoc;
let octVAO;
let position = [0, 0, 0];
const moveSpeed = 0.02;

//keyboard tracking
window.keysBeingPressed = {};
window.addEventListener('keydown', event => keysBeingPressed[event.key] = true);
window.addEventListener('keyup', event => keysBeingPressed[event.key] = false);

//create shader
function createShader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
}

//create program
function createProgram() {
    const vsObj = createShader(gl.VERTEX_SHADER, vs);
    const fsObj = createShader(gl.FRAGMENT_SHADER, fs);
    
    if (!vsObj || !fsObj) {
        return null;
    }
    
    const prog = gl.createProgram();
    gl.attachShader(prog, vsObj);
    gl.attachShader(prog, fsObj);
    gl.linkProgram(prog);
    
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        return null;
    }
    
    return prog;
}

//create buffers
function createBuffers() {
    const octPosBuf = gl.createBuffer();
    const octColBuf = gl.createBuffer();
    const octIdxBuf = gl.createBuffer();
    
    gl.bindBuffer(gl.ARRAY_BUFFER, octPosBuf);
    gl.bufferData(gl.ARRAY_BUFFER, octPos, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, octColBuf);
    gl.bufferData(gl.ARRAY_BUFFER, octCol, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, octIdxBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, octIdx, gl.STATIC_DRAW);
    
    return { octPosBuf, octColBuf, octIdxBuf };
}

//create vao
function createVAO(posBuf, colBuf, idxBuf) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, colBuf);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
    return vao;
}

//resize function
function resize(canvas) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

//update position based on key presses
function updatePosition() {
    if (keysBeingPressed['q']) position[2] -= moveSpeed;
    if (keysBeingPressed['e']) position[2] += moveSpeed;
    if (keysBeingPressed['a']) position[0] -= moveSpeed;
    if (keysBeingPressed['d']) position[0] += moveSpeed;
    if (keysBeingPressed['w']) position[1] += moveSpeed;
    if (keysBeingPressed['s']) position[1] -= moveSpeed;
}

//draw function
function draw() {
    updatePosition();
    
    if (!prog) return;
    
    gl.useProgram(prog);
    
    const fovy = Math.PI / 4;
    const near = 0.1;
    const far = 100;
    const proj = m4perspNegZ(near, far, fovy, canvas.width, canvas.height);
    
    const eye = [0, 0, 8];
    const center = [0, 0, 0];
    const up = [0, 1, 0];
    const view = m4view(eye, center, up);
    
    const scale = m4scale(0.05, 0.05, 0.05);
    const model = m4mul(m4trans(position[0], position[1], position[2]), scale);
    
    const mvp = m4mul(proj, view, model);
    gl.uniformMatrix4fv(mvpLoc, false, mvp);
    
    gl.bindVertexArray(octVAO);
    gl.drawElements(gl.TRIANGLES, 24, gl.UNSIGNED_SHORT, 0);
}

//animation loop
function animate() {
    function loop() {
        if (prog) draw();
        requestAnimationFrame(loop);
    }
    return loop;
}

//main initialization
function init() {
    canvas = document.getElementById('canvas');
    gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true });
    
    if (!gl) return;
    
    prog = createProgram();
    if (!prog) return;
    
    mvpLoc = gl.getUniformLocation(prog, 'mvp');
    if (!mvpLoc) return;
    
    const buffers = createBuffers();
    octVAO = createVAO(buffers.octPosBuf, buffers.octColBuf, buffers.octIdxBuf);
    
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    
    resize(canvas);
    window.addEventListener('resize', () => resize(canvas));
    
    draw();
    animate()();
}

window.addEventListener('DOMContentLoaded', init);
