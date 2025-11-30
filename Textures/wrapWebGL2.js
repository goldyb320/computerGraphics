/*
 * This file does the following:
 * 
 * 1. creates an array _gl_call_traces, the elements of which are arrays of distinct GL interaction traces
 * 2. replace the return value of canvas.getContext with a proxy that logs activity
 */

const _gl_call_traces = []
var _gl_last_call_trace = []
const _gl_already_warned = new Set()

const _gl_old_getContext = HTMLCanvasElement.prototype.getContext
HTMLCanvasElement.prototype.getContext = function(...args) {

  function _gl_wrap_for_logging(gl) {
    const _gl_symbols = new WeakMap()
    const _gl_constants = new Map()
    _gl_constants.set(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, 'gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT')
    const _gl_creator_counts = new Map()
    const banned = {
      'getAttribLocation':':\nuse `layout(location = ...)` in the vertex shader instead',
    }
    const showNum = (n,i) => (n=='vertexAttribPointer') || (n == 'enableVertexAttribArray') || (n.includes('draw'))
    var _gl_live_call_trace = []
    console.info('CS 418 WebGL2 wrapper around',gl)
    return new Proxy(gl, {
      get(obj, prop, recv) {
        const val = obj[prop]
        if (val instanceof Function) {
          return function(...args) {
            //format
            const sig = 'gl.'+prop+'('+(args.map((x,i)=>{
              if (_gl_symbols.has(x)) return _gl_symbols.get(x)
              if (_gl_constants.has(x)) return _gl_constants.get(x)
              if ('number' == typeof x && !showNum(prop,i)) return 'num'
              if ('object' == typeof x && x) return 'length' in x ? `${x.constructor.name}[${x.length}]` : x.constructor.name
              return JSON.stringify(x)
              })).join(', ')+')'
            //track
            _gl_live_call_trace.push(sig)
            if (prop == 'clear') {
              let idx = -1
              for(let j=0; j<_gl_call_traces.length; j+=1) {
                let e = _gl_call_traces[j]
                if (e.length === _gl_live_call_trace.length && e.every((v,i) => v === _gl_live_call_trace[i])) idx = j
              }
              if (idx == -1) {
                if (_gl_call_traces.length >= 16) _gl_call_traces.splice(4,2,['...']) //keep compile-in-loop from creating mem leak
                idx = _gl_call_traces.length
                _gl_call_traces.push(_gl_live_call_trace)
              }
              _gl_last_call_trace = _gl_call_traces[idx]
              _gl_live_call_trace = []
            }
            //forward call
            const val2 = val.apply(this === recv ? obj : this, args)
            //check for warnings
            if (!_gl_already_warned.has(sig)) {
              //warn about likely errors
              if (prop in banned) { console.warn('CS418 prohibits use of',prop+banned[prop]); _gl_already_warned.add(sig); } 
              if (prop == 'shaderSource') {
                if (!args[1].startsWith('#version 300 es')) { console.warn('CS418 requires `#version 300 es` shaders'); _gl_already_warned.add(sig); }
                let src = args[1].replace(/\\(\r\n?|\n\r?)/g,'').replace(/(\/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*+\/)|(\/\/.*)/g,' ') //line cont & comments
                if (/^[ \t\v\f]*#[ \t\v\f]*define[ \t\v\f]/m.test(src)) { console.warn('CS418 prohibits use of C-style macros in GLSL'); }
                if (args[2] == 0x8B31 && /^\s*in /m.test(src)) { console.warn('CS418 requires all vertex in variables to have a layout(location=...)'); }
                //reasonable approx of finding GLSL inefficiencies
                let attrib = Array.from(src.matchAll(/\bin\b[^;]*\b([_a-zA-Z][_a-zA-Z0-9]*)\b[ \t\n\v\f\r]*;/g)).map(m=>m[1])
                attrib.push('gl_VertexID', 'gl_InstanceID', 'gl_FragCoord', 'gl_FrontFacing', 'gl_PointCoord')
                for(let i=0; i<attrib.length; i+=1) {
                  [...src.matchAll(new RegExp("\\b([_a-zA-Z][_a-zA-Z0-9]*)\\b\\s*[-+*/%<>&^|]*=[^=;][^;]*\\b"+attrib[i]+"\\b", "g"))].forEach(
                    m => { if (!attrib.includes(m[1])) attrib.push(m[1]) }
                  )
                }
                if (new RegExp("\\bif\\b[^{};]*\\b("+attrib.join('|')+")\\b[^{};]*\\)\\s*([{]|[a-zA-Z_])").test(src.replace(/if\s*\([^{};]*\)\s*discard;/g,'')))
                  console.warn('Shader contains `if` that may not allow full warp parallelism:');
                if (new RegExp("\\bwhile\\b[^{};]*\\b("+attrib.join('|')+")\\b[^{};]*\\)\\s*([{]|[a-zA-Z_])").test(src))
                  console.warn('Shader contains `while` that may not allow full warp parallelism');
                if (new RegExp("\\bfor\\b[^{};]*;[^{};]*\\b("+attrib.join('|')+")\\b[^{};]*;").test(src))
                  console.warn('Shader contains `for` that may not allow full warp parallelism');
              }
              if (val2 === null) { console.warn(`CS418 prohibits null return: ${sig}`); _gl_already_warned.add(sig); }
              if (args.some(x=>x===null)) { console.warn(`CS418 prohibits null arguments: ${sig}`); _gl_already_warned.add(sig); }
            }
            //log results needed for later sigs
            if (prop.startsWith('create')) {
              if (!_gl_creator_counts.has(prop)) _gl_creator_counts.set(prop,0)
              const thisID = _gl_creator_counts.get(prop) + 1
              _gl_creator_counts.set(prop, thisID)
              _gl_symbols.set(val2, prop.substr(6)+'#'+thisID)
              _gl_live_call_trace[_gl_live_call_trace.length-1] = prop.substr(6)+'#'+thisID+' = ' + _gl_live_call_trace[_gl_live_call_trace.length-1]
            }
            if (prop == 'getUniformLocation' && val2) {
              const symbol = _gl_symbols.get(args[0])+'.uniforms.'+args[1]
              _gl_symbols.set(val2, symbol)
            }
            return val2
          }
        } else {
          if ('object' == typeof val) _gl_symbols.set(val, 'gl.'+prop)
          else _gl_constants.set(val, 'gl.'+prop)
          return val
        }
      }
    })
  }

  return _gl_wrap_for_logging(_gl_old_getContext.apply(this, args));
}
if (window.top != window) window.addEventListener('message', e=>window.top.postMessage([_gl_already_warned,_gl_last_call_trace,_gl_call_traces],'*'))


const _cs418_requestAnimationFrame = requestAnimationFrame
const _cs418_cancelAnimationFrame = cancelAnimationFrame
var _cs418_requestAnimationFrame_used = 0
var _cs418_animationFrame_handle = undefined
requestAnimationFrame = callback => {
  if (_cs418_requestAnimationFrame_used != 0) throw new Error("Calling requestAnimationFrame while another call is pending is usually an error and is prohibited in CS 418.")
  _cs418_requestAnimationFrame_used += 1
  _cs418_animationFrame_handle = _cs418_requestAnimationFrame(ms => {
    _cs418_requestAnimationFrame_used -= 1
    _cs418_animationFrame_handle = undefined
    callback(ms)
  })
  return _cs418_animationFrame_handle
}
cancelAnimationFrame = requestID => {
  if (requestID != _cs418_animationFrame_handle) throw new Error("Calling cancelAnimationFrame without a pending animation frame request ID is usually an error and is prohibited in CS 418.")
  _cs418_requestAnimationFrame_used -= 1
  _cs418_animationFrame_handle = undefined
}
const _cs418_setTimeout = setTimeout
const _cs418_setInterval = setInterval
setTimeout = (...args) => { console.warn("CS 418 forbids using setTimeout"); _cs418_setTimeout(...args) }
setInterval = (...args) => { console.warn("CS 418 forbids using setInterval"); _cs418_setInterval(...args) }
const add = (x,y) => x.map((e,i)=>e+y[i])
const sub = (x,y) => x.map((e,i)=>e-y[i])
const mul = (x,s) => x.map(e=>e*s)
const div = (x,s) => x.map(e=>e/s)
const dot = (x,y) => x.map((e,i)=>e*y[i]).reduce((s,t)=>s+t)
const mag = (x) => Math.sqrt(dot(x,x))
const normalize = (x) => div(x,mag(x))
const cross = (x,y) => x.length == 2 ?
  x[0]*y[1]-x[1]*y[0] :
  x.map((e,i)=> x[(i+1)%3]*y[(i+2)%3] - x[(i+2)%3]*y[(i+1)%3])

//matrix ops
const m4row = (m,r) => new m.constructor(4).map((e,i)=>m[r+4*i])
const m4rowdot = (m,r,v) => m[r]*v[0] + m[r+4]*v[1] + m[r+8]*v[2] + m[r+12]*v[3]
const m4col = (m,c) => m.slice(c*4,(c+1)*4)
const m4transpose = (m) => m.map((e,i) => m[((i&3)<<2)+(i>>2)])
const m4mul = (...args) => args.reduce((m1,m2) => {
  if(m2.length == 4) return m2.map((e,i)=>m4rowdot(m1,i,m2)) //m*v
  if(m1.length == 4) return m1.map((e,i)=>m4rowdot(m2,i,m1)) //v*m
  let ans = new m1.constructor(16)
  for(let c=0; c<4; c+=1) for(let r=0; r<4; r+=1)
    ans[r+c*4] = m4rowdot(m1,r,m4col(m2,c))
  return ans //m*m
})

const m3row = (m,r) => new m.constructor(3).map((e,i)=>m[r+3*i])
const m3rowdot = (m,r,v) => m[r]*v[0] + m[r+3]*v[1] + m[r+6]*v[2]
const m3col = (m,c) => m.slice(c*3,(c+1)*3)
const m3transpose = (m) => m.map((e,i) => m[((i&3)<<2)+(i>>2)])
const m3mul = (...args) => args.reduce((m1,m2) => {
  if(m2.length == 3) return m2.map((e,i)=>m3rowdot(m1,i,m2)) //m*v
  if(m1.length == 3) return m1.map((e,i)=>m3rowdot(m2,i,m1)) //v*m
  let ans = new m1.constructor(9)
  for(let c=0; c<3; c+=1) for(let r=0; r<3; r+=1)
    ans[r+c*3] = m3rowdot(m1,r,m3col(m2,c))
  return ans //m*m
})

//graphics matrices
const m4trans = (dx,dy,dz) => new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, dx,dy,dz,1])
const m4rotX = (ang) => { //around x axis
  let c = Math.cos(ang), s = Math.sin(ang);
  return new Float32Array([1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]);
}
const m4rotY = (ang) => { //around y axis
  let c = Math.cos(ang), s = Math.sin(ang);
  return new Float32Array([c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]);
}
const m4rotZ = (ang) => { //around z axis
  let c = Math.cos(ang), s = Math.sin(ang);
  return new Float32Array([c,s,0,0, -s,c,0,0, 0,0,1,0, 0,0,0,1]);
}
const m4fixAxes = (f, up) => { //f to -z, up to near +y
  f = normalize(f)
  let r = normalize(cross(f,up))
  let u = cross(r,f)
  return new Float32Array([
    r[0],u[0],-f[0],0,
    r[1],u[1],-f[1],0,
    r[2],u[2],-f[2],0,
    0,0,0,1
  ])
}
const m4scale = (sx,sy,sz) => new Float32Array([sx,0,0,0, 0,sy,0,0, 0,0,sz,0, 0,0,0,1])
const m4view = (eye, center, up) => m4mul(m4fixAxes(sub(center,eye), up), m4trans(-eye[0],-eye[1],-eye[2]))
const m4perspNegZ = (near, far, fovy, width, height) => {
  let sy = 1/Math.tan(fovy/2);
  let sx = sy*height/width;
  return new Float32Array([sx,0,0,0, 0,sy,0,0, 0,0,-(far+near)/(far-near),-1, 0,0,(2*far*near)/(near-far),0]);
}

const m3rotX = (ang) => { //around x axis
  let c = Math.cos(ang), s = Math.sin(ang);
  return new Float32Array([1,0,0, 0,c,s, 0,-s,c]);
}
const m3rotY = (ang) => { //around y axis
  let c = Math.cos(ang), s = Math.sin(ang);
  return new Float32Array([c,0,-s, 0,1,0, s,0,c]);
}
const m3rotZ = (ang) => { //around z axis
  let c = Math.cos(ang), s = Math.sin(ang);
  return new Float32Array([c,s,0, -s,c,0, 0,0,1]);
}
const m3fixAxes = (f, up) => { //f to -z, up to near +y
  f = normalize(f)
  let r = normalize(cross(f,up))
  let u = cross(r,f)
  return new Float32Array([
    r[0],u[0],-f[0],
    r[1],u[1],-f[1],
    r[2],u[2],-f[2],
  ])
}
const m3scale = (sx,sy,sz) => new Float32Array([sx,0,0, 0,sy,0, 0,0,sz])



//quaternion
const m4fromQ = (q) => { 
  let n = dot(q,q)
  let s = n ? 2/n : 0
  let xx = s*q[1]*q[1], xy = s*q[1]*q[2], xz = s*q[1]*q[3], xw = s*q[1]*q[0]
  let yy = s*q[2]*q[2], yz = s*q[2]*q[3], yw = s*q[2]*q[0]
  let zz = s*q[3]*q[3], zw = s*q[3]*q[0]
  return new Float32Array([
    1-yy-zz, xy+zw, xz-yw, 0,
    xy-zw, 1-xx-zz, yz+xw, 0,
    xz+yw, yz-xw, 1-xx-yy, 0,
    0,0,0,1,
  ])
}
const m4toQ = (m) => {
  let a00 = m[0], a11 = m[5], a22 = m[10]
  if (a00 + a11 + a22 > 0)
    return normalize([a00+a11+a22+1, m[6]-m[9], m[8]-m[2], m[1]-m[4]])
  if ((a00 > a11) && (a00 > a22))
    return normalize([m[6]-m[9], a00-a11-a22+1, m[1]+m[4], m[8]-m[2]])
  if (a11 > a22)
    return normalize([m[8]-m[2], m[1]+m[4], a11-a00-a22+1, m[6]+m[9]])
  return normalize([m[1]-m[4], m[2]+m[8], m[6]+m[9], a22-a00-a11+1])
}

const m3fromQ = (q) => { 
  let n = dot(q,q)
  let s = n ? 2/n : 0
  let xx = s*q[1]*q[1], xy = s*q[1]*q[2], xz = s*q[1]*q[3], xw = s*q[1]*q[0]
  let yy = s*q[2]*q[2], yz = s*q[2]*q[3], yw = s*q[2]*q[0]
  let zz = s*q[3]*q[3], zw = s*q[3]*q[0]
  return new Float32Array([
    1-yy-zz, xy+zw, xz-yw,
    xy-zw, 1-xx-zz, yz+xw,
    xz+yw, yz-xw, 1-xx-yy,
  ])
}
const m3toQ = (m) => {
  let a00 = m[0], a11 = m[4], a22 = m[8]
  if (a00 + a11 + a22 > 0)
    return normalize([a00+a11+a22+1, m[5]-m[7], m[6]-m[2], m[1]-m[3]])
  if ((a00 > a11) && (a00 > a22))
    return normalize([m[5]-m[7], a00-a11-a22+1, m[1]+m[3], m[6]-m[2]])
  if (a11 > a22)
    return normalize([m[6]-m[2], m[1]+m[3], a11-a00-a22+1, m[5]+m[7]])
  return normalize([m[1]-m[3], m[2]+m[6], m[5]+m[7], a22-a00-a11+1])
}
const lerp = (t,p0,p1) => add(mul(p0,1-t), mul(p1,t))
const lbez = (t, ...p) => {
  while(p.length > 1) p = p.slice(1).map((e,i) => lerp(t,p[i],e))
  return p[0]
}
const bezcut = (t, ...p) => {
  let front = [], back = []
  while(p.length > 0) {
    front.push(p[0])
    back.unshift(p[p.length-1])
    p = p.slice(1).map((e,i) => lerp(t,p[i],e))
  }
  return [front, back]
}
const slerp = (t,q0,q1) => {
  let d = dot(q0,q1)
  if (d > 0.9999) return normalize(lerp(t,q0,q1))
  let o = Math.acos(d), den = Math.sin(o)
  return add(mul(q0, Math.sin((1-t)*o)/den), mul(q1, Math.sin(t*o)/den))
}
const qlerp = (t,q0,q1) => {
  let d = dot(q0,q1)
  if (d < 0) { q1 = mul(q1,-1); d = -d; }
  if (d > 0.9999) return normalize(lerp(t,q0,q1))
  let o = Math.acos(d), den = Math.sin(o)
  return add(mul(q0, Math.sin((1-t)*o)/den), mul(q1, Math.sin(t*o)/den))
}
const sbez = (t, ...p) => {
  while(p.length > 1) p = p.slice(1).map((e,i) => slerp(t,p[i],e))
  return p[0]
}
const qbez = (t, ...p) => {
  while(p.length > 1) p = p.slice(1).map((e,i) => qlerp(t,p[i],e))
  return p[0]
}
