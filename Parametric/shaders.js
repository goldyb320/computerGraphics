// vertex shader
const vertexShaderSource = `#version 300 es
layout(location = 0) in vec3 position;
layout(location = 1) in vec3 normal;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;

out vec3 fragPosition;
out vec3 fragNormal;

void main() {
    fragPosition = vec3(modelViewMatrix * vec4(position, 1.0));
    fragNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * vec4(fragPosition, 1.0);
}`;

// fragment shader
const fragmentShaderSource = `#version 300 es
precision mediump float;

in vec3 fragPosition;
in vec3 fragNormal;

uniform vec3 lightPosition;
uniform vec3 lightColor;
uniform vec3 ambientColor;
uniform vec3 materialColor;
uniform float shininess;

out vec4 fragColor;

void main() {
    // ambient
    vec3 ambient = ambientColor * materialColor;
    
    // diffuse
    vec3 lightDir = normalize(lightPosition - fragPosition);
    float diff = max(dot(fragNormal, lightDir), 0.0);
    vec3 diffuse = diff * lightColor * materialColor;
    
    // specular
    vec3 viewDir = normalize(-fragPosition);
    vec3 reflectDir = reflect(-lightDir, fragNormal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), shininess);
    vec3 specular = spec * lightColor;
    
    // combine
    vec3 result = ambient + diffuse + specular;
    fragColor = vec4(result, 1.0);
}`;

// make shader
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('shader error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    
    return shader;
}

// make program
function createShaderProgram(gl, vertexSource, fragmentSource) {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    
    if (!vertexShader || !fragmentShader) {
        return null;
    }
    
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('program error:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }
    
    return program;
}
