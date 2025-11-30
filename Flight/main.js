//main app class
class TerrainViewer {
    constructor() {
        this.canvas = null;
        this.gl = null;
        this.program = null;
        this.terrain = null;
        this.camera = null;
        this.inputManager = null;
        
        //rendering data
        this.vertexBuffer = null;
        this.normalBuffer = null;
        this.indexBuffer = null;
        this.vertexCount = 0;
        
        //matrices
        this.modelMatrix = m4scale(1, 1, 1);
        this.viewMatrix = new Float32Array(16);
        this.projectionMatrix = new Float32Array(16);
        
        //timing
        this.lastTime = 0;
        
        this.init();
    }

    async init() {
        this.canvas = document.getElementById('glCanvas');
        this.gl = this.canvas.getContext('webgl2');
        
        if (!this.gl) {
            alert('webgl2 not supported');
            return;
        }

        //setup input
        this.inputManager = new InputManager();
        
        //setup cam
        this.camera = new Camera();
        
        //gen terrain
        this.terrain = new TerrainGenerator(129, 2.0);
        this.terrain.generate();
        
        //setup webgl
        await this.setupShaders();
        this.setupBuffers();
        this.setupMatrices();
        
        //start render loop
        this.lastTime = performance.now();
        requestAnimationFrame((time) => this.render(time));
    }

    async setupShaders() {
        //load shader sources
        const vertexSource = await this.loadShaderSource('vertex.glsl');
        const fragmentSource = await this.loadShaderSource('fragment.glsl');
        
        //create & compile shaders
        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentSource);
        
        //create program
        this.program = this.gl.createProgram();
        this.gl.attachShader(this.program, vertexShader);
        this.gl.attachShader(this.program, fragmentShader);
        this.gl.linkProgram(this.program);
        
        if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
            console.error('program linking failed:', this.gl.getProgramInfoLog(this.program));
            return;
        }
        
        //get uniform locs
        this.uniforms = {
            modelMatrix: this.gl.getUniformLocation(this.program, 'modelMatrix'),
            viewMatrix: this.gl.getUniformLocation(this.program, 'viewMatrix'),
            projectionMatrix: this.gl.getUniformLocation(this.program, 'projectionMatrix')
        };
    }

    async loadShaderSource(filename) {
        const response = await fetch(filename);
        return await response.text();
    }

    createShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('shader compilation failed:', this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }

    setupBuffers() {
        //create vertex buffer
        this.vertexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.terrain.vertices), this.gl.STATIC_DRAW);
        
        //create normal buffer
        this.normalBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.normalBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.terrain.normals), this.gl.STATIC_DRAW);
        
        //create index buffer
        this.indexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.terrain.indices), this.gl.STATIC_DRAW);
        
        this.vertexCount = this.terrain.indices.length;
    }

    setupMatrices() {
        //setup projection mat
        const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        this.projectionMatrix = m4perspNegZ(0.1, 1000.0, Math.PI / 4, this.canvas.clientWidth, this.canvas.clientHeight);
    }

    render(currentTime) {
        //calc delta time
        const deltaTime = (currentTime - this.lastTime) / 1000.0;
        this.lastTime = currentTime;
        
        //update cam
        this.camera.update(this.inputManager.getPressedKeys(), deltaTime);
        
        //update view mat
        this.viewMatrix = this.camera.getViewMatrix();
        
        //clear screen
        this.gl.clearColor(0.1, 0.1, 0.2, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        
        //enable depth test
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.depthFunc(this.gl.LEQUAL);
        
        //use shader prog
        this.gl.useProgram(this.program);
        
        //set uniforms
        this.gl.uniformMatrix4fv(this.uniforms.modelMatrix, false, this.modelMatrix);
        this.gl.uniformMatrix4fv(this.uniforms.viewMatrix, false, this.viewMatrix);
        this.gl.uniformMatrix4fv(this.uniforms.projectionMatrix, false, this.projectionMatrix);
        
        //setup vertex attrs
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.enableVertexAttribArray(0);
        this.gl.vertexAttribPointer(0, 3, this.gl.FLOAT, false, 0, 0);
        
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.normalBuffer);
        this.gl.enableVertexAttribArray(1);
        this.gl.vertexAttribPointer(1, 3, this.gl.FLOAT, false, 0, 0);
        
        //draw terrain
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        this.gl.drawElements(this.gl.TRIANGLES, this.vertexCount, this.gl.UNSIGNED_SHORT, 0);
        
        //continue render loop
        requestAnimationFrame((time) => this.render(time));
    }

    //handle window resize
    onResize() {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        
        //update projection mat
        this.projectionMatrix = m4perspNegZ(0.1, 1000.0, Math.PI / 4, this.canvas.width, this.canvas.height);
    }
}

//start app when page loads
window.addEventListener('load', () => {
    const app = new TerrainViewer();
    
    //handle window resize
    window.addEventListener('resize', () => app.onResize());
});
