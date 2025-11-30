const VS_SRC = `#version 300 es
layout(location=0) in vec3 aCenter;
layout(location=1) in float aRadius;
layout(location=2) in vec3 aColor;

uniform mat4 uProj;
uniform mat4 uView;
uniform float uViewportPx;   // use canvas height or width in pixels
uniform float uProjScale;    // proj[1][1] for y or proj[0][0] for x

out vec3 vColor;
out vec3 vCenter;
out float vRadius;

void main(){
  vec4 clip = uProj * uView * vec4(aCenter, 1.0);
  gl_Position = clip;
  vColor = aColor;
  vCenter = aCenter;
  vRadius = aRadius;
  // Point size in pixels is the diameter of the sphere on screen
  float invW = 1.0 / clip.w;
  float rpx = uViewportPx * uProjScale * invW * aRadius;
  gl_PointSize = max(1.0, 2.0 * rpx);
}
`;

const FS_SRC = `#version 300 es
precision highp float;

in vec3 vColor;
in vec3 vCenter;
in float vRadius;
uniform vec3 uLightPos;
uniform vec3 uEye;
out vec4 oCol;

void main(){
  // Map to [-1,1]^2, flip Y so +Y is up
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  p.y = -p.y;
  float r2 = dot(p,p);
  if (r2 > 1.0) { discard; }
  // Surface normal on the unit sphere in screen space
  float nz = sqrt(max(0.0, 1.0 - r2));
  vec3 N = normalize(vec3(p, nz));
  // Approximate world-space position on sphere surface for lighting
  vec3 wPos = vCenter + vRadius * N;
  vec3 L = normalize(uLightPos - wPos);
  vec3 V = normalize(uEye - wPos);
  vec3 H = normalize(L + V);
  float diff = max(dot(N,L), 0.0);
  float spec = pow(max(dot(N,H), 0.0), 32.0);
  vec3 col = vColor*(0.1 + 0.9*diff) + vec3(1.0)*0.3*spec;
  oCol = vec4(col, 1.0);
}
`;

const randRange = (a,b) => a + Math.random()*(b-a);
const clamp = (x,a,b) => Math.max(a,Math.min(b,x));

function createProgram(gl, vsSrc, fsSrc) {
	const vs = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vs, vsSrc);
	gl.compileShader(vs);
	if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(vs)||'vs err');
	const fs = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fs, fsSrc);
	gl.compileShader(fs);
	if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(fs)||'fs err');
	const prog = gl.createProgram();
	gl.attachShader(prog, vs);
	gl.attachShader(prog, fs);
	gl.linkProgram(prog);
	if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog)||'link err');
	gl.deleteShader(vs); gl.deleteShader(fs);
	return prog;
}

function resizeCanvasToDisplaySize(canvas) {
	const dpr = Math.min(window.devicePixelRatio||1, 2);
	const w = Math.floor(canvas.clientWidth * dpr);
	const h = Math.floor(canvas.clientHeight * dpr);
	if (canvas.width !== w || canvas.height !== h) {
		canvas.width = w; canvas.height = h; return true;
	}
	return false;
}

function createSim(n, cubeW) {
	const e = 0.9;
	const g = 2.0;
	const drag = 0.02;
	const maxSpeed = 1.2;
	const half = cubeW*0.5;
	const minBound = [-half, -half, -half];
	const maxBound = [ half,  half,  half];

	// radii distributed so largest ~5x smallest, and roughly fill bottom
	const radii = new Float32Array(n);
	let maxR = 0;
	for (let i=0;i<n;i++) {
		const r = (Math.random()+0.25) * (0.75/Math.cbrt(n));
		radii[i] = r;
		if (r > maxR) maxR = r;
	}
	const mass = new Float32Array(n);
	for (let i=0;i<n;i++) mass[i] = radii[i]*radii[i]*radii[i]; // proportional to volume

	const pos = Array.from({length:n},()=>[0,0,0]);
	const vel = Array.from({length:n},()=>[0,0,0]);
	const color = Array.from({length:n},()=>[randRange(0.2,1.0),randRange(0.2,1.0),randRange(0.2,1.0)]);

	function reset() {
		// random non-overlap placement
		for (let i=0;i<n;i++) {
			let ok=false, tries=0;
			while(!ok && tries<5000){
				tries++;
				pos[i][0] = randRange(minBound[0]+radii[i], maxBound[0]-radii[i]);
				pos[i][1] = randRange(minBound[1]+radii[i], maxBound[1]-radii[i]);
				pos[i][2] = randRange(minBound[2]+radii[i], maxBound[2]-radii[i]);
				ok = true;
				for(let j=0;j<i;j++){
					const dx = pos[i][0]-pos[j][0], dy=pos[i][1]-pos[j][1], dz=pos[i][2]-pos[j][2];
					const dd = dx*dx+dy*dy+dz*dz;
					const minD = radii[i]+radii[j];
					if (dd < minD*minD) { ok=false; break; }
				}
			}
			const speed = randRange(0.12,0.35);
			const ang1 = randRange(0,Math.PI*2);
			const ang2 = randRange(-0.5,0.5);
			vel[i][0] = speed*Math.cos(ang1)*Math.cos(ang2);
			vel[i][1] = speed*Math.sin(ang2);
			vel[i][2] = speed*Math.sin(ang1)*Math.cos(ang2);
		}
	}

	// grid for O(n) collision detection
	let cellSize = 2*maxR; // >= largest diameter
	cellSize = Math.max(cellSize, 1e-3);
	const dim = Math.max(1, Math.ceil(cubeW / cellSize));
	function key(ix,iy,iz){ return ix + iy*dim + iz*dim*dim; }

	function buildGrid() {
		const cells = Array.from({length:dim*dim*dim},()=>[]);
		for (let i=0;i<n;i++) {
			const ix = clamp(Math.floor((pos[i][0]+half)/cellSize),0,dim-1);
			const iy = clamp(Math.floor((pos[i][1]+half)/cellSize),0,dim-1);
			const iz = clamp(Math.floor((pos[i][2]+half)/cellSize),0,dim-1);
			cells[key(ix,iy,iz)].push(i);
		}
		return cells;
	}

	function step(dt) {
		// gravity + drag
		const damp = Math.max(0,1 - drag*dt);
		for (let i=0;i<n;i++){
			vel[i][1] -= g*dt;
			vel[i][0] *= damp; vel[i][1] *= damp; vel[i][2] *= damp;
			const s2 = vel[i][0]*vel[i][0]+vel[i][1]*vel[i][1]+vel[i][2]*vel[i][2];
			if (s2 > maxSpeed*maxSpeed){
				const k = maxSpeed/Math.sqrt(s2);
				vel[i][0]*=k; vel[i][1]*=k; vel[i][2]*=k;
			}
		}
		// integrate
		for (let i=0;i<n;i++){
			pos[i][0] += vel[i][0]*dt;
			pos[i][1] += vel[i][1]*dt;
			pos[i][2] += vel[i][2]*dt;
		}
		// walls
		const eps = 1e-4;
		for (let i=0;i<n;i++){
			const r = radii[i];
			if (pos[i][0]-r < -half) { pos[i][0] = -half + r + eps; if (vel[i][0] < 0) vel[i][0] = -vel[i][0]*e; }
			if (pos[i][0]+r >  half) { pos[i][0] =  half - r - eps; if (vel[i][0] > 0) vel[i][0] = -vel[i][0]*e; }
			if (pos[i][1]-r < -half) { pos[i][1] = -half + r + eps; if (vel[i][1] < 0) vel[i][1] = -vel[i][1]*e; }
			if (pos[i][1]+r >  half) { pos[i][1] =  half - r - eps; if (vel[i][1] > 0) vel[i][1] = -vel[i][1]*e; }
			if (pos[i][2]-r < -half) { pos[i][2] = -half + r + eps; if (vel[i][2] < 0) vel[i][2] = -vel[i][2]*e; }
			if (pos[i][2]+r >  half) { pos[i][2] =  half - r - eps; if (vel[i][2] > 0) vel[i][2] = -vel[i][2]*e; }
		}
		// sphere-sphere collisions using grid
		const cells = buildGrid();
		for (let ix=0; ix<dim; ix++){
			for (let iy=0; iy<dim; iy++){
				for (let iz=0; iz<dim; iz++){
					const baseKey = key(ix,iy,iz);
					// Collect candidates from this cell and neighbors
					let cand = [];
					for (let dx=-1; dx<=1; dx++){
						for (let dy=-1; dy<=1; dy++){
							for (let dz=-1; dz<=1; dz++){
								const nx = ix+dx, ny = iy+dy, nz = iz+dz;
								if (nx<0||ny<0||nz<0||nx>=dim||ny>=dim||nz>=dim) continue;
								cand = cand.concat(cells[key(nx,ny,nz)]);
							}
						}
					}
					const list = cells[baseKey];
					for (let ii=0; ii<list.length; ii++){
						const i = list[ii];
						for (let jj=0; jj<cand.length; jj++){
							const j = cand[jj];
							if (j <= i) continue;
							const dx = pos[j][0]-pos[i][0];
							const dy = pos[j][1]-pos[i][1];
							const dz = pos[j][2]-pos[i][2];
							const rsum = radii[i] + radii[j];
							const dist2 = dx*dx+dy*dy+dz*dz;
							if (dist2 < rsum*rsum){
								const dist = Math.max(1e-8, Math.sqrt(dist2));
								const nx = dx/dist, ny = dy/dist, nz = dz/dist;
								// positional correction weighted by inverse masses
								const wi = 1.0/mass[i], wj = 1.0/mass[j];
								const pen = rsum - dist;
								if (pen > 0){
									const corr = pen / (wi + wj);
									pos[i][0] -= corr*wi*nx; pos[i][1] -= corr*wi*ny; pos[i][2] -= corr*wi*nz;
									pos[j][0] += corr*wj*nx; pos[j][1] += corr*wj*ny; pos[j][2] += corr*wj*nz;
								}
								// velocity impulse along normal
								const rvx = vel[j][0]-vel[i][0];
								const rvy = vel[j][1]-vel[i][1];
								const rvz = vel[j][2]-vel[i][2];
								const s = rvx*nx + rvy*ny + rvz*nz;
								if (s < 0){
                                    const jimp = -(1.0+e)*s / (wi + wj);
									vel[i][0] -= jimp*wi*nx; vel[i][1] -= jimp*wi*ny; vel[i][2] -= jimp*wi*nz;
									vel[j][0] += jimp*wj*nx; vel[j][1] += jimp*wj*ny; vel[j][2] += jimp*wj*nz;
								}
							}
						}
					}
				}
			}
		}
	}

	reset();
	return {N:n, pos, vel, color, radii, mass, step, reset, half, minBound, maxBound, maxR};
}

function createPointRenderer(gl, prog, N) {
	const loc = {
		uProj: gl.getUniformLocation(prog,'uProj'),
		uView: gl.getUniformLocation(prog,'uView'),
		uViewportPx: gl.getUniformLocation(prog,'uViewportPx'),
		uProjScale: gl.getUniformLocation(prog,'uProjScale'),
		uLightPos: gl.getUniformLocation(prog,'uLightPos'),
		uEye: gl.getUniformLocation(prog,'uEye'),
	};

	const vao = gl.createVertexArray();
	gl.bindVertexArray(vao);
	// centers (dynamic)
	const vboCenters = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vboCenters);
	gl.bufferData(gl.ARRAY_BUFFER, N*3*4, gl.DYNAMIC_DRAW);
	gl.enableVertexAttribArray(0);
	gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
	// radii (static)
	const vboRadii = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vboRadii);
	gl.bufferData(gl.ARRAY_BUFFER, N*4, gl.STATIC_DRAW);
	gl.enableVertexAttribArray(1);
	gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 0, 0);
	// colors (static)
	const vboColors = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vboColors);
	gl.bufferData(gl.ARRAY_BUFFER, N*3*4, gl.STATIC_DRAW);
	gl.enableVertexAttribArray(2);
	gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 0, 0);
	gl.bindVertexArray(null);

	function updateCenters(state) {
		gl.bindBuffer(gl.ARRAY_BUFFER, vboCenters);
		const centers = new Float32Array(state.N*3);
		for (let i=0;i<state.N;i++){
			centers[i*3+0] = state.pos[i][0];
			centers[i*3+1] = state.pos[i][1];
			centers[i*3+2] = state.pos[i][2];
		}
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, centers);
	}
	function uploadStatic(state) {
		// radii
		gl.bindBuffer(gl.ARRAY_BUFFER, vboRadii);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, state.radii);
		// colors
		gl.bindBuffer(gl.ARRAY_BUFFER, vboColors);
		const cols = new Float32Array(state.N*3);
		for (let i=0;i<state.N;i++){
			cols[i*3+0] = state.color[i][0];
			cols[i*3+1] = state.color[i][1];
			cols[i*3+2] = state.color[i][2];
		}
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, cols);
	}

	return {
		updateCenters,
		uploadStatic,
		drawFrame(state) {
			gl.viewport(0,0,gl.drawingBufferWidth, gl.drawingBufferHeight);
			gl.clearColor(0.06,0.06,0.08,1);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			gl.useProgram(prog);
			gl.bindVertexArray(vao);
			gl.uniformMatrix4fv(loc.uProj,false,state.proj);
			gl.uniformMatrix4fv(loc.uView,false,state.view);
			gl.uniform1f(loc.uViewportPx, state.viewportPx);
			gl.uniform1f(loc.uProjScale, state.projScale);
			gl.uniform3fv(loc.uLightPos,state.lightPos);
			gl.uniform3fv(loc.uEye,state.eye);
			gl.drawArrays(gl.POINTS, 0, state.N);
			gl.bindVertexArray(null);
		}
	};
}

async function main() {
	const canvas = document.getElementById('c');
	const gl = canvas.getContext('webgl2', {antialias:true});
	if (!gl) throw new Error('webgl2 req');
	gl.enable(gl.DEPTH_TEST);

	const prog = createProgram(gl, VS_SRC, FS_SRC);

	// UI
	const spheresInput = document.getElementById('spheres');
	const form = document.querySelector('form.controls');
	const fpsDiv = document.getElementById('fps');

	let N = parseInt(spheresInput.value,10) || 50;
	const cubeW = 2.0;
	let sim = createSim(N, cubeW);
	let renderer = createPointRenderer(gl, prog, sim.N);
	renderer.uploadStatic({N:sim.N, color:sim.color, radii:sim.radii});
	renderer.updateCenters({N:sim.N, pos:sim.pos});

	// camera/light
	let eye = [0,0,3.2];
	let center = [0,0,0];
	let up = [0,1,0];
	function computeProjView() {
		const fovy = Math.PI/4;
		const proj = m4perspNegZ(0.1, 100, fovy, gl.drawingBufferWidth, gl.drawingBufferHeight);
		const view = m4view(eye, center, up);
		return {proj, view};
	}
	let {proj, view} = computeProjView();

	let lastT = performance.now();
	let lastReset = lastT;

	form.addEventListener('submit', () => {
		N = Math.max(1, Math.min(5000, parseInt(spheresInput.value,10) || 1));
		sim = createSim(N, cubeW);
		renderer = createPointRenderer(gl, prog, sim.N);
		renderer.uploadStatic({N:sim.N, color:sim.color, radii:sim.radii});
		renderer.updateCenters({N:sim.N, pos:sim.pos});
		lastReset = performance.now();
	});

	function frame(tMs){
		try{
			// resize handling
			if (resizeCanvasToDisplaySize(canvas)) { ({proj,view} = computeProjView()); }
			const now = tMs || performance.now();
			let dt = (now - lastT)/1000;
			if (!isFinite(dt) || dt <= 0) dt = 1/60;
			dt = Math.min(0.033, Math.max(1/120, dt));
			lastT = now;
			// 15s auto-reset
			if (now - lastReset > 15000) { sim.reset(); lastReset = now; }
			// step simulation
			sim.step(dt);
			// update GPU centers each frame
			renderer.updateCenters({N:sim.N, pos:sim.pos});
			// compute viewport factor for on-screen radius
			const viewportPx = gl.drawingBufferHeight; // y-axis
			const projScale = proj[5]; // sy
			const state = {
				N: sim.N,
				proj, view,
				viewportPx, projScale,
				eye: new Float32Array(eye),
				lightPos: new Float32Array([2.5,3.0,2.5]),
			};
			// draw
			renderer.drawFrame(state);
			// FPS
			const fps = 1.0/dt;
			fpsDiv.innerHTML = fps.toFixed(1);
		} finally {
			requestAnimationFrame(frame);
		}
	}
	requestAnimationFrame(frame);
}

window.addEventListener('load', main);