#version 300 es
//vertex shader for psychedelic animation
out vec2 fragCoord;

void main() {
    //create two triangles that cover the full screen
    float x = (gl_VertexID == 1 || gl_VertexID == 2 || gl_VertexID == 4) ? 1.0 : -1.0;
    float y = (gl_VertexID == 2 || gl_VertexID == 4 || gl_VertexID == 5) ? 1.0 : -1.0;
    
    gl_Position = vec4(x, y, 0.0, 1.0);
    fragCoord = vec2(x, y);
}
