const vertSrc = `#version 300 es
in vec2 a_position;
uniform mat4 u_transform;
uniform float u_time;
uniform float u_isBorder;

void main() {
    float vertexId = float(gl_VertexID);
    float jitterX, jitterY;
    float isBorder = step(0.5, u_isBorder);
    
    float borderJitterX = sin(u_time * 5.0 + vertexId * 0.7) * 0.04 + 
                         cos(u_time * 3.5 + vertexId * 1.1) * 0.03;
    float borderJitterY = cos(u_time * 4.2 + vertexId * 0.8) * 0.035 + 
                         sin(u_time * 5.5 + vertexId * 1.2) * 0.025;
    
    float centerJitterX = sin(u_time * 3.0 + vertexId * 0.4) * 0.02 + 
                         cos(u_time * 2.5 + vertexId * 0.6) * 0.015;
    float centerJitterY = cos(u_time * 2.8 + vertexId * 0.5) * 0.02 + 
                         sin(u_time * 3.2 + vertexId * 0.7) * 0.015;
    
    jitterX = mix(centerJitterX, borderJitterX, isBorder);
    jitterY = mix(centerJitterY, borderJitterY, isBorder);
    
    vec2 jitter = vec2(jitterX, jitterY);
    vec4 jitteredPos = vec4(a_position + jitter, 0.0, 1.0);
    gl_Position = u_transform * jitteredPos;
}`;

const fragSrc = `#version 300 es
precision mediump float;
out vec4 fragColor;

void main() {
    fragColor = vec4(1.0, 0.373, 0.02, 1.0);
}`;

const borderFragSrc = `#version 300 es
precision mediump float;
out vec4 fragColor;

void main() {
    fragColor = vec4(0.075, 0.16, 0.292, 1.0);
}`;

function makeLogo() {
    const verts = [
        -0.4, 0.6,  -0.4, 0.4,  -0.15, 0.4,  -0.15, 0.2,  -0.4, 0.2,  -0.4, 0.0,
        -0.15, 0.0,  -0.15, -0.2,  -0.4, -0.2,  -0.4, -0.4,  -0.15, -0.4,  -0.15, -0.6,
        0.15, -0.6,  0.15, -0.4,  0.4, -0.4,  0.4, -0.2,  0.15, -0.2,  0.15, 0.0,
        0.4, 0.0,  0.4, 0.2,  0.15, 0.2,  0.15, 0.4,  0.4, 0.4,  0.4, 0.6
    ];
    const idx = [
        0,1,2, 0,2,3, 0,3,4, 0,4,5, 0,5,6, 0,6,7, 0,7,8, 0,8,9, 0,9,10, 0,10,11,
        0,11,12, 0,12,13, 0,13,14, 0,14,15, 0,15,16, 0,16,17, 0,17,18, 0,18,19,
        0,19,20, 0,20,21, 0,21,22, 0,22,23
    ];
    return { verts, idx };
}

function makeBorder() {
    const pad = 0.02;
    const verts = [
        -0.4 - pad, 0.6 + pad,  -0.4 - pad, 0.4 - pad,  -0.15 - pad, 0.4 - pad,  -0.15 - pad, 0.2 - pad,  -0.4 - pad, 0.2 - pad,  -0.4 - pad, 0.0 - pad,
        -0.15 - pad, 0.0 - pad,  -0.15 - pad, -0.2 + pad,  -0.4 - pad, -0.2 + pad,  -0.4 - pad, -0.4 + pad,  -0.15 - pad, -0.4 + pad,  -0.15 - pad, -0.6 - pad,
        0.15 + pad, -0.6 - pad,  0.15 + pad, -0.4 + pad,  0.4 + pad, -0.4 + pad,  0.4 + pad, -0.2 + pad,  0.15 + pad, -0.2 + pad,  0.15 + pad, 0.0 - pad,
        0.4 + pad, 0.0 - pad,  0.4 + pad, 0.2 - pad,  0.15 + pad, 0.2 - pad,  0.15 + pad, 0.4 - pad,  0.4 + pad, 0.4 - pad,  0.4 + pad, 0.6 + pad
    ];
    const idx = [
        0,1,2, 0,2,3, 0,3,4, 0,4,5, 0,5,6, 0,6,7, 0,7,8, 0,8,9, 0,9,10, 0,10,11,
        0,11,12, 0,12,13, 0,13,14, 0,14,15, 0,15,16, 0,16,17, 0,17,18, 0,18,19,
        0,19,20, 0,20,21, 0,21,22, 0,22,23
    ];
    return { verts, idx };
}

let start = 0;

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program error:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }
    return program;
}

function createBuffer(gl, data) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    return buffer;
}

function createIndexBuffer(gl, data) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(data), gl.STATIC_DRAW);
    return buffer;
}

function main() {
    const canvas = document.getElementById('canvas');
    const gl = canvas.getContext('webgl2');
    
    if (!gl) {
        console.error('WebGL2 not supported');
        return;
    }
    
    const vertShader = createShader(gl, gl.VERTEX_SHADER, vertSrc);
    const fragShader = createShader(gl, gl.FRAGMENT_SHADER, fragSrc);
    const borderVertShader = createShader(gl, gl.VERTEX_SHADER, vertSrc);
    const borderFragShader = createShader(gl, gl.FRAGMENT_SHADER, borderFragSrc);
    
    const prog = createProgram(gl, vertShader, fragShader);
    const borderProg = createProgram(gl, borderVertShader, borderFragShader);
    const posLoc = gl.getAttribLocation(prog, 'a_position');
    const matLoc = gl.getUniformLocation(prog, 'u_transform');
    const timeLoc = gl.getUniformLocation(prog, 'u_time');
    const isBorderLoc = gl.getUniformLocation(prog, 'u_isBorder');
    const borderPosLoc = gl.getAttribLocation(borderProg, 'a_position');
    const borderMatLoc = gl.getUniformLocation(borderProg, 'u_transform');
    const borderTimeLoc = gl.getUniformLocation(borderProg, 'u_time');
    const borderIsBorderLoc = gl.getUniformLocation(borderProg, 'u_isBorder');
    
    const logo = makeLogo();
    const border = makeBorder();
    const logoBuf = createBuffer(gl, logo.verts);
    const logoIdxBuf = createIndexBuffer(gl, logo.idx);
    const borderBuf = createBuffer(gl, border.verts);
    const borderIdxBuf = createIndexBuffer(gl, border.idx);
    
    gl.viewport(0, 0, canvas.width, canvas.height);
    function animate(time) {
        if (start === 0) start = time;
        const t = (time - start) / 1000;
        
        gl.clearColor(1.0, 1.0, 1.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        const transform = m4scale(0.8, 0.8, 1);
        gl.useProgram(borderProg);
        gl.bindBuffer(gl.ARRAY_BUFFER, borderBuf);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, borderIdxBuf);
        gl.enableVertexAttribArray(borderPosLoc);
        gl.vertexAttribPointer(borderPosLoc, 2, gl.FLOAT, false, 0, 0);
        gl.uniformMatrix4fv(borderMatLoc, false, transform);
        gl.uniform1f(borderTimeLoc, t);
        gl.uniform1f(borderIsBorderLoc, 1.0);
        gl.drawElements(gl.TRIANGLES, border.idx.length, gl.UNSIGNED_SHORT, 0);
    gl.useProgram(prog);
        gl.bindBuffer(gl.ARRAY_BUFFER, logoBuf);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, logoIdxBuf);
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
        gl.uniformMatrix4fv(matLoc, false, transform);
        gl.uniform1f(timeLoc, t);
        gl.uniform1f(isBorderLoc, 0.0);
        gl.drawElements(gl.TRIANGLES, logo.idx.length, gl.UNSIGNED_SHORT, 0);
        
        requestAnimationFrame(animate);
    }
    
    requestAnimationFrame(animate);
}

window.addEventListener('load', main);