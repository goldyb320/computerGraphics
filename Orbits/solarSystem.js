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

//tetrahedron data
const tetPos = new Float32Array([1,1,1, -1,-1,1, -1,1,-1, 1,-1,-1]);
const tetCol = new Float32Array([1,1,1, 0,0,1, 0,1,0, 1,0,0]);
const tetIdx = new Uint16Array([0,1,2, 0,2,3, 0,3,1, 1,2,3]);

//octahedron data
const octPos = new Float32Array([1,0,0, 0,1,0, 0,0,1, 0,-1,0, 0,0,-1, -1,0,0]);
const octCol = new Float32Array([1,0.5,0.5, 0.5,1,0.5, 0.5,0.5,1, 0.5,0,0.5, 0.5,0.5,0, 0,0.5,0.5]);
const octIdx = new Uint16Array([0,1,2, 0,2,3, 0,3,4, 0,4,1, 5,1,4, 5,4,3, 5,3,2, 5,2,1]);

//global gl context
let gl;

//create shader
function createShader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s));
    }
    return s;
}

//create program
function createProgram() {
    const vsObj = createShader(gl.VERTEX_SHADER, vs);
    const fsObj = createShader(gl.FRAGMENT_SHADER, fs);
    const prog = gl.createProgram();
    gl.attachShader(prog, vsObj);
    gl.attachShader(prog, fsObj);
    gl.linkProgram(prog);
    return prog;
}

//create buffers
function createBuffers() {
    const tetPosBuf = gl.createBuffer();
    const tetColBuf = gl.createBuffer();
    const tetIdxBuf = gl.createBuffer();
    const octPosBuf = gl.createBuffer();
    const octColBuf = gl.createBuffer();
    const octIdxBuf = gl.createBuffer();
    
    //upload tetrahedron data
    gl.bindBuffer(gl.ARRAY_BUFFER, tetPosBuf);
    gl.bufferData(gl.ARRAY_BUFFER, tetPos, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, tetColBuf);
    gl.bufferData(gl.ARRAY_BUFFER, tetCol, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tetIdxBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, tetIdx, gl.STATIC_DRAW);
    
    //upload octahedron data
    gl.bindBuffer(gl.ARRAY_BUFFER, octPosBuf);
    gl.bufferData(gl.ARRAY_BUFFER, octPos, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, octColBuf);
    gl.bufferData(gl.ARRAY_BUFFER, octCol, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, octIdxBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, octIdx, gl.STATIC_DRAW);
    
    return { tetPosBuf, tetColBuf, tetIdxBuf, octPosBuf, octColBuf, octIdxBuf };
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
}

//draw function
function draw(prog, mvpLoc, tetVAO, octVAO, t) {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(prog);
    
    //projection matrix
    const fovy = Math.PI / 4;
    const near = 0.1;
    const far = 100;
    const proj = m4perspNegZ(near, far, fovy, canvas.width, canvas.height);
    
    //view matrix
    const eye = [0, 0, 8];
    const center = [0, 0, 0];
    const up = [0, 1, 0];
    const view = m4view(eye, center, up);
    
    //sun large octahedron at origin, spinning
    const sunRot = m4rotY(t * Math.PI);
    const sunMvp = m4mul(proj, view, sunRot);
    gl.uniformMatrix4fv(mvpLoc, false, sunMvp);
    gl.bindVertexArray(octVAO);
    gl.drawElements(gl.TRIANGLES, 24, gl.UNSIGNED_SHORT, 0);
    
    //earth smaller octahedron orbiting sun
    const earthOrbit = 3;
    const earthX = Math.cos(t * 0.5) * earthOrbit;
    const earthZ = Math.sin(t * 0.5) * earthOrbit;
    const earthTrans = m4trans(earthX, 0, earthZ);
    const earthRot = m4rotY(t * 3);
    const earthScale = m4scale(0.6, 0.6, 0.6);
    const earthMvp = m4mul(proj, view, earthTrans, earthRot, earthScale);
    gl.uniformMatrix4fv(mvpLoc, false, earthMvp);
    gl.drawElements(gl.TRIANGLES, 24, gl.UNSIGNED_SHORT, 0);
    
    //mars smaller than earth, 1.6x distance, 1.9x slower orbit
    const marsOrbit = earthOrbit * 1.6;
    const marsX = Math.cos(t * 0.5 / 1.9) * marsOrbit;
    const marsZ = Math.sin(t * 0.5 / 1.9) * marsOrbit;
    const marsTrans = m4trans(marsX, 0, marsZ);
    const marsRot = m4rotY(t * 3 / 2.2);
    const marsScale = m4scale(0.5, 0.5, 0.5);
    const marsMvp = m4mul(proj, view, marsTrans, marsRot, marsScale);
    gl.uniformMatrix4fv(mvpLoc, false, marsMvp);
    gl.drawElements(gl.TRIANGLES, 24, gl.UNSIGNED_SHORT, 0);
    
    //moon tetrahedron orbiting earth
    const moonOrbit = 1.2;
    const moonX = earthX + Math.cos(t * 2) * moonOrbit;
    const moonZ = earthZ + Math.sin(t * 2) * moonOrbit;
    const moonTrans = m4trans(moonX, 0, moonZ);
    const moonRot = m4rotY(t * 2);
    const moonScale = m4scale(0.3, 0.3, 0.3);
    const moonMvp = m4mul(proj, view, moonTrans, moonRot, moonScale);
    gl.uniformMatrix4fv(mvpLoc, false, moonMvp);
    gl.bindVertexArray(tetVAO);
    gl.drawElements(gl.TRIANGLES, 12, gl.UNSIGNED_SHORT, 0);
    
    //phobos tetrahedron orbiting mars, faster than mars
    const phobosOrbit = 0.8;
    const phobosX = marsX + Math.cos(t * 4) * phobosOrbit;
    const phobosZ = marsZ + Math.sin(t * 4) * phobosOrbit;
    const phobosTrans = m4trans(phobosX, 0, phobosZ);
    const phobosRot = m4rotY(t * 4);
    const phobosScale = m4scale(0.2, 0.2, 0.2);
    const phobosMvp = m4mul(proj, view, phobosTrans, phobosRot, phobosScale);
    gl.uniformMatrix4fv(mvpLoc, false, phobosMvp);
    gl.drawElements(gl.TRIANGLES, 12, gl.UNSIGNED_SHORT, 0);
    
    //deimos tetrahedron, half size of phobos, 2x distance, slower orbit
    const deimosOrbit = phobosOrbit * 2;
    const deimosX = marsX + Math.cos(t * 1.5) * deimosOrbit;
    const deimosZ = marsZ + Math.sin(t * 1.5) * deimosOrbit;
    const deimosTrans = m4trans(deimosX, 0, deimosZ);
    const deimosRot = m4rotY(t * 1.5);
    const deimosScale = m4scale(0.1, 0.1, 0.1);
    const deimosMvp = m4mul(proj, view, deimosTrans, deimosRot, deimosScale);
    gl.uniformMatrix4fv(mvpLoc, false, deimosMvp);
    gl.drawElements(gl.TRIANGLES, 12, gl.UNSIGNED_SHORT, 0);
}

//animation loop
function animate(prog, mvpLoc, tetVAO, octVAO) {
    let t = 0;
    function loop() {
        t += 0.016; //~60fps
        draw(prog, mvpLoc, tetVAO, octVAO, t);
        requestAnimationFrame(loop);
    }
    return loop;
}

//main initialization
function init() {
    const canvas = document.getElementById('canvas');
    gl = canvas.getContext('webgl2');
    
    const prog = createProgram();
    const mvpLoc = gl.getUniformLocation(prog, 'mvp');
    const buffers = createBuffers();
    const tetVAO = createVAO(buffers.tetPosBuf, buffers.tetColBuf, buffers.tetIdxBuf);
    const octVAO = createVAO(buffers.octPosBuf, buffers.octColBuf, buffers.octIdxBuf);
    
    gl.enable(gl.DEPTH_TEST);
    
    resize(canvas);
    window.addEventListener('resize', () => resize(canvas));
    animate(prog, mvpLoc, tetVAO, octVAO)();
}
