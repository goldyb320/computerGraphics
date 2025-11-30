#version 300 es
precision highp float;

layout(location = 0) in vec3 position;
layout(location = 1) in vec3 normal;

uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;

out vec3 worldPosition;
out vec3 worldNormal;
out vec3 viewDirection;

void main() {
    //trans pos to world space
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    worldPosition = worldPos.xyz;
    
    //trans normal to world space
    worldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    
    //calc view dir
    viewDirection = normalize(-worldPosition);
    
    //final pos in clip space
    gl_Position = projectionMatrix * viewMatrix * worldPos;
}
