const VS_SRC = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNrm;

uniform mat4 uProj;
uniform mat4 uView;
uniform mat4 uModel;
uniform mat3 uNrmMat;

out vec3 vN;
out vec3 vWPos;

void main(){
  vec4 wpos = uModel * vec4(aPos,1.0);
  vWPos = wpos.xyz;
  vN = normalize(uNrmMat * aNrm);
  gl_Position = uProj * uView * wpos;
}
`;

const FS_SRC = `#version 300 es
precision highp float;
in vec3 vN;
in vec3 vWPos;
uniform vec3 uLightPos;
uniform vec3 uEye;
uniform vec3 uColor;
out vec4 oCol;
void main(){
  vec3 N = normalize(vN);
  vec3 L = normalize(uLightPos - vWPos);
  vec3 V = normalize(uEye - vWPos);
  vec3 H = normalize(L+V);
  float diff = max(dot(N,L),0.0);
  float spec = pow(max(dot(N,H),0.0),32.0);
  vec3 col = uColor*(0.1+0.9*diff) + vec3(1.0)*0.3*spec;
  oCol = vec4(col,1.0);
}
`;

const randRange = (a,b) => a + Math.random()*(b-a)
const clamp = (x,a,b) => Math.max(a,Math.min(b,x))

async function loadSphereGeom() {
	// load json and build buffers
	const res = await fetch('sphere.json')
	const data = await res.json()
	const positions = new Float32Array(data.attributes[0].flat())
	const normals = new Float32Array((data.attributes[1]||data.attributes[0]).flat())
	const indices = new Uint16Array(data.triangles.flat())
	return {positions, normals, indices}
}

function createProgram(gl, vsSrc, fsSrc) {
	// compile
	const vs = gl.createShader(gl.VERTEX_SHADER)
	gl.shaderSource(vs, vsSrc)
	gl.compileShader(vs)
	if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(vs)||'vs err')
	const fs = gl.createShader(gl.FRAGMENT_SHADER)
	gl.shaderSource(fs, fsSrc)
	gl.compileShader(fs)
	if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(fs)||'fs err')
	// link
	const prog = gl.createProgram()
	gl.attachShader(prog, vs)
	gl.attachShader(prog, fs)
	gl.linkProgram(prog)
	if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog)||'link err')
	gl.deleteShader(vs); gl.deleteShader(fs)
	return prog
}

function mat3FromMat4UpperLeft(m4) {
	return new Float32Array([m4[0],m4[1],m4[2], m4[4],m4[5],m4[6], m4[8],m4[9],m4[10]])
}

function createVAO(gl, geom) {
	const vao = gl.createVertexArray()
	gl.bindVertexArray(vao)
	// pos
	const vboPos = gl.createBuffer()
	gl.bindBuffer(gl.ARRAY_BUFFER, vboPos)
	gl.bufferData(gl.ARRAY_BUFFER, geom.positions, gl.STATIC_DRAW)
	gl.enableVertexAttribArray(0)
	gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0)
	// nrm
	const vboNrm = gl.createBuffer()
	gl.bindBuffer(gl.ARRAY_BUFFER, vboNrm)
	gl.bufferData(gl.ARRAY_BUFFER, geom.normals, gl.STATIC_DRAW)
	gl.enableVertexAttribArray(1)
	gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0)
	// idx
	const ibo = gl.createBuffer()
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo)
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geom.indices, gl.STATIC_DRAW)
	gl.bindVertexArray(null)
	return {vao, count: geom.indices.length}
}

function makeRenderer(gl, prog, vaoInfo) {
	const loc = {
		uProj: gl.getUniformLocation(prog,'uProj'),
		uView: gl.getUniformLocation(prog,'uView'),
		uModel: gl.getUniformLocation(prog,'uModel'),
		uNrmMat: gl.getUniformLocation(prog,'uNrmMat'),
		uLightPos: gl.getUniformLocation(prog,'uLightPos'),
		uEye: gl.getUniformLocation(prog,'uEye'),
		uColor: gl.getUniformLocation(prog,'uColor'),
	}
	return {
		drawFrame(state) {
			gl.viewport(0,0,gl.drawingBufferWidth, gl.drawingBufferHeight)
			gl.clearColor(0.06,0.06,0.08,1)
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
			gl.useProgram(prog)
			gl.bindVertexArray(vaoInfo.vao)
			gl.uniformMatrix4fv(loc.uProj,false,state.proj)
			gl.uniformMatrix4fv(loc.uView,false,state.view)
			gl.uniform3fv(loc.uLightPos,state.lightPos)
			gl.uniform3fv(loc.uEye,state.eye)
			for (let i=0;i<state.N;i++) {
				const p = state.pos[i]
				const s = state.radius
				const model = m4mul(m4trans(p[0],p[1],p[2]), m4scale(s,s,s))
				const nrm = mat3FromMat4UpperLeft(model)
				gl.uniformMatrix4fv(loc.uModel,false,model)
				gl.uniformMatrix3fv(loc.uNrmMat,false,nrm)
				gl.uniform3fv(loc.uColor,state.color[i])
				gl.drawElements(gl.TRIANGLES, vaoInfo.count, gl.UNSIGNED_SHORT, 0)
			}
			gl.bindVertexArray(null)
		}
	}
}

function createSim(N, cubeW) {
	const e = 0.9
	const g = 2.0
	const drag = 0.02
	const maxSpeed = 1.0
	const half = cubeW*0.5
	const r = cubeW*0.075 // diameter = 0.15*w
	const minBound = [-half+r, -half+r, -half+r]
	const maxBound = [ half-r,  half-r,  half-r]
	const pos = Array.from({length:N}, ()=>[0,0,0])
	const vel = Array.from({length:N}, ()=>[0,0,0])
	const color = Array.from({length:N}, ()=>[randRange(0.2,1.0),randRange(0.2,1.0),randRange(0.2,1.0)])
	function reset() {
		// random non-overlap
		for (let i=0;i<N;i++) {
			let ok=false, tries=0
			while(!ok && tries<2000){
				tries++
				pos[i][0] = randRange(minBound[0], maxBound[0])
				pos[i][1] = randRange(minBound[1], maxBound[1])
				pos[i][2] = randRange(minBound[2], maxBound[2])
				ok = true
				for(let j=0;j<i;j++){
					const dx = pos[i][0]-pos[j][0], dy=pos[i][1]-pos[j][1], dz=pos[i][2]-pos[j][2]
					if (dx*dx+dy*dy+dz*dz < (2*r)*(2*r)) { ok=false; break; }
				}
			}
			const speed = randRange(0.12,0.35)
			const ang1 = randRange(0,Math.PI*2)
			const ang2 = randRange(-0.5,0.5)
			vel[i][0] = speed*Math.cos(ang1)*Math.cos(ang2)
			vel[i][1] = speed*Math.sin(ang2)
			vel[i][2] = speed*Math.sin(ang1)*Math.cos(ang2)
		}
	}
	function step(dt) {
		//gravity+drag
		const damp = Math.max(0,1 - drag*dt)
		for (let i=0;i<N;i++){
			vel[i][1] -= g*dt
			vel[i][0] *= damp; vel[i][1] *= damp; vel[i][2] *= damp
			//cap speed
			const s2 = vel[i][0]*vel[i][0]+vel[i][1]*vel[i][1]+vel[i][2]*vel[i][2]
			if (s2 > maxSpeed*maxSpeed){
				const k = maxSpeed/Math.sqrt(s2)
				vel[i][0]*=k; vel[i][1]*=k; vel[i][2]*=k
			}
		}
		//integrate
		for (let i=0;i<N;i++){
			pos[i][0] += vel[i][0]*dt
			pos[i][1] += vel[i][1]*dt
			pos[i][2] += vel[i][2]*dt
		}
		//walls first (simple, elastic)
		const eps = 1e-4
		for (let i=0;i<N;i++){
			if (pos[i][0]-r < -half) { pos[i][0] = -half + r + eps; if (vel[i][0] < 0) vel[i][0] = -vel[i][0]*e; }
			if (pos[i][0]+r >  half) { pos[i][0] =  half - r - eps; if (vel[i][0] > 0) vel[i][0] = -vel[i][0]*e; }
			if (pos[i][1]-r < -half) { pos[i][1] = -half + r + eps; if (vel[i][1] < 0) vel[i][1] = -vel[i][1]*e; }
			if (pos[i][1]+r >  half) { pos[i][1] =  half - r - eps; if (vel[i][1] > 0) vel[i][1] = -vel[i][1]*e; }
			if (pos[i][2]-r < -half) { pos[i][2] = -half + r + eps; if (vel[i][2] < 0) vel[i][2] = -vel[i][2]*e; }
			if (pos[i][2]+r >  half) { pos[i][2] =  half - r - eps; if (vel[i][2] > 0) vel[i][2] = -vel[i][2]*e; }
		}
		//then sphere-sphere once (impulse+depen)
		for (let i=0;i<N;i++){
			for (let j=i+1;j<N;j++){
				const dx = pos[j][0]-pos[i][0]
				const dy = pos[j][1]-pos[i][1]
				const dz = pos[j][2]-pos[i][2]
				const dist2 = dx*dx+dy*dy+dz*dz
				const minD = 2*r
				if (dist2 < minD*minD){
					let dist = Math.sqrt(dist2)
					let nx=1,ny=0,nz=0
					if (dist > 1e-8){ nx=dx/dist; ny=dy/dist; nz=dz/dist }
					// pos corr
					const pen = minD - dist
					if (pen > 0){
						const corr = 0.5*pen
						pos[i][0] -= corr*nx; pos[i][1] -= corr*ny; pos[i][2] -= corr*nz
						pos[j][0] += corr*nx; pos[j][1] += corr*ny; pos[j][2] += corr*nz
					}
					// impulse along normal
					const rvx = vel[j][0]-vel[i][0]
					const rvy = vel[j][1]-vel[i][1]
					const rvz = vel[j][2]-vel[i][2]
					const s = rvx*nx + rvy*ny + rvz*nz
					if (s < 0){
						const jimp = -(1.0+e)*s*0.5
						vel[i][0] -= jimp*nx; vel[i][1] -= jimp*ny; vel[i][2] -= jimp*nz
						vel[j][0] += jimp*nx; vel[j][1] += jimp*ny; vel[j][2] += jimp*nz
					}
				}
			}
		}
		//final cap
		for (let i=0;i<N;i++){
			const s2b = vel[i][0]*vel[i][0]+vel[i][1]*vel[i][1]+vel[i][2]*vel[i][2]
			if (s2b > maxSpeed*maxSpeed){
				const k2 = maxSpeed/Math.sqrt(s2b)
				vel[i][0]*=k2; vel[i][1]*=k2; vel[i][2]*=k2
			}
		}
	}
	reset()
	return {N, pos, vel, color, step, reset, radius:r, half, minBound, maxBound}
}

function resizeCanvasToDisplaySize(canvas) {
	const dpr = Math.min(window.devicePixelRatio||1, 2)
	const w = Math.floor(canvas.clientWidth * dpr)
	const h = Math.floor(canvas.clientHeight * dpr)
	if (canvas.width !== w || canvas.height !== h) {
		canvas.width = w; canvas.height = h; return true
	}
	return false
}

async function main() {
	const canvas = document.getElementById('c')
	const gl = canvas.getContext('webgl2', {antialias:true})
	if (!gl) throw new Error('webgl2 req')
	gl.enable(gl.DEPTH_TEST)
	// load geometry+program
	const [geom] = await Promise.all([loadSphereGeom()])
	const prog = createProgram(gl, VS_SRC, FS_SRC)
	const vaoInfo = createVAO(gl, geom)
	const renderer = makeRenderer(gl, prog, vaoInfo)
	// sim
	const N = 50
	const cubeW = 2.0
	const sim = createSim(N, cubeW)
	// camera/light
	let eye = [0,0,3.2]
	let center = [0,0,0]
	let up = [0,1,0]
	function computeProjView() {
		const fovy = Math.PI/4
		const proj = m4perspNegZ(0.1, 100, fovy, gl.drawingBufferWidth, gl.drawingBufferHeight)
		const view = m4view(eye, center, up)
		return {proj, view}
	}
	let {proj, view} = computeProjView()
	let lastT = performance.now()
	let lastReset = lastT
	function frame(tMs){
		try{
			if (resizeCanvasToDisplaySize(canvas)) { ({proj,view} = computeProjView()) }
			const now = tMs || performance.now()
			let dt = (now - lastT)/1000
			if (!isFinite(dt) || dt <= 0) dt = 1/60
			dt = Math.min(0.033, Math.max(1/120, dt))
			lastT = now
			if (now - lastReset > 15000) { sim.reset(); lastReset = now }
			sim.step(dt)
			const state = {
				N: sim.N, pos: sim.pos, color: sim.color, radius: sim.radius,
				proj, view, eye: new Float32Array(eye), lightPos: new Float32Array([2.5,3.0,2.5])
			}
			renderer.drawFrame(state)
		} finally {
			requestAnimationFrame(frame)
		}
	}
	requestAnimationFrame(frame)
}

window.addEventListener('load', main)


