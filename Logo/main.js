//vertex shader source
const vertSrc = `#version 300 es
in vec2 a_position;
uniform mat4 u_transform;

void main() {
    gl_Position = u_transform * vec4(a_position, 0.0, 1.0);
}`;

//fragment shader source
const fragSrc = `#version 300 es
precision mediump float;
out vec4 fragColor;

void main() {
    fragColor = vec4(1.0, 0.373, 0.02, 1.0);
}`;

//blue border fragment shader
const borderFragSrc = `#version 300 es
precision mediump float;
out vec4 fragColor;

void main() {
    fragColor = vec4(0.075, 0.16, 0.292, 1.0);
}`;

//creates the main logo geometry
function makeLogo() {
    //vertical bar of the I
    const bar = [-0.12, -0.5, -0.12, 0.5, 0.12, 0.5, 0.12, -0.5];
    //serifs
    const top = [-0.35, 0.3, -0.35, 0.5, 0.35, 0.5, 0.35, 0.3];
    const bottom = [-0.35, -0.5, -0.35, -0.3, 0.35, -0.3, 0.35, -0.5];
    
    const verts = [...bar, ...top, ...bottom];
    const idx = [0,1,2, 0,2,3, 4,5,6, 4,6,7, 8,9,10, 8,10,11];
    
    return { verts, idx };
}

//creates border geometry for outline effect
function makeBorder() {
    const pad = 0.02;
    
    //border around vertical bar
    const barBorder = [ -0.12 - pad, -0.5 - pad, -0.12 - pad, 0.5 + pad, 0.12 + pad, 0.5 + pad, 0.12 + pad, -0.5 - pad
    ];
    
    //border around top serif
    const topBorder = [-0.35 - pad, 0.3 - pad,-0.35 - pad, 0.5 + pad, 0.35 + pad, 0.5 + pad, 0.35 + pad, 0.3 - pad
    ];
    
    //border around bottom serif
    const bottomBorder = [-0.35 - pad, -0.5 - pad, -0.35 - pad, -0.3 + pad, 0.35 + pad, -0.3 + pad, 0.35 + pad, -0.5 - pad
    ];
    
    const verts = [...barBorder, ...topBorder, ...bottomBorder];
    const idx = [0,1,2, 0,2,3, 4,5,6, 4,6,7, 8,9,10, 8,10,11];
    
    return { verts, idx };
}

let start = 0;

//helper functions
//creates and compiles a shader
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

//creates a shader program
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

//creates a buffer for vertex data
function createBuffer(gl, data) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    return buffer;
}

//creates a buffer for index data
function createIndexBuffer(gl, data) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(data), gl.STATIC_DRAW);
    return buffer;
}

//main initialization function
function main() {
    const canvas = document.getElementById('canvas');
    const gl = canvas.getContext('webgl2');
    
    if (!gl) {
        console.error('WebGL2 not supported');
        return;
    }
    
    //compile shaders
    const vertShader = createShader(gl, gl.VERTEX_SHADER, vertSrc);
    const fragShader = createShader(gl, gl.FRAGMENT_SHADER, fragSrc);
    const borderVertShader = createShader(gl, gl.VERTEX_SHADER, vertSrc);
    const borderFragShader = createShader(gl, gl.FRAGMENT_SHADER, borderFragSrc);
    
    //create shader programs
    const prog = createProgram(gl, vertShader, fragShader);
    const borderProg = createProgram(gl, borderVertShader, borderFragShader);
    
    //get attribute and uniform locations
    const posLoc = gl.getAttribLocation(prog, 'a_position');
    const matLoc = gl.getUniformLocation(prog, 'u_transform');
    const borderPosLoc = gl.getAttribLocation(borderProg, 'a_position');
    const borderMatLoc = gl.getUniformLocation(borderProg, 'u_transform');
    
    //create geometry
    const logo = makeLogo();
    const border = makeBorder();
    
    //create buffers
    const logoBuf = createBuffer(gl, logo.verts);
    const logoIdxBuf = createIndexBuffer(gl, logo.idx);
    const borderBuf = createBuffer(gl, border.verts);
    const borderIdxBuf = createIndexBuffer(gl, border.idx);
    
    gl.viewport(0, 0, canvas.width, canvas.height);
    
    //animation loop
    function animate(time) {
        if (start === 0) start = time;
        const t = (time - start) / 1000;
        
        //clear screen
        gl.clearColor(1.0, 1.0, 1.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        //calculate animation values
        const tx = Math.sin(t * 0.5) * 0.3;
        const ty = Math.cos(t * 0.3) * 0.2;
        const rot = t * 0.8;
        const scl = 0.8 + 0.2 * Math.sin(t * 1.2);
        
        //build transformation matrix
        const transMat = m4trans(tx, ty, 0);
        const rotMat = m4rotZ(rot);
        const sclMat = m4scale(scl, scl, 1);
        const transform = m4mul(transMat, rotMat, sclMat);
        
        //draw border first
        gl.useProgram(borderProg);
        gl.bindBuffer(gl.ARRAY_BUFFER, borderBuf);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, borderIdxBuf);
        gl.enableVertexAttribArray(borderPosLoc);
        gl.vertexAttribPointer(borderPosLoc, 2, gl.FLOAT, false, 0, 0);
        gl.uniformMatrix4fv(borderMatLoc, false, transform);
        gl.drawElements(gl.TRIANGLES, border.idx.length, gl.UNSIGNED_SHORT, 0);
        
        //draw main logo on top
        gl.useProgram(prog);
        gl.bindBuffer(gl.ARRAY_BUFFER, logoBuf);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, logoIdxBuf);
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
        gl.uniformMatrix4fv(matLoc, false, transform);
        gl.drawElements(gl.TRIANGLES, logo.idx.length, gl.UNSIGNED_SHORT, 0);
        
        requestAnimationFrame(animate);
    }
    
    requestAnimationFrame(animate);
}

//start when page loads
window.addEventListener('load', main);
