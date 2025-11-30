#version 300 es
precision mediump float;

//fragment shader for psychedelic animation
in vec2 fragCoord;
uniform float seconds;

out vec4 fragColor;

void main() {
    //normalize coordinates to 0-1 range
    vec2 uv = (fragCoord + 1.0) * 0.5;
    
    //create multiple wave patterns
    float wave1 = sin(uv.x * 12.0 + seconds * 19.8) * 0.4;
    float wave2 = cos(uv.y * 9.0 + seconds * 2.3) * 0.35;
    float wave3 = sin((uv.x + uv.y - 12.0) * 6.0 + seconds * 2.7) * 0.25;
    
    //combine waves
    float pattern = wave1 + wave2 + wave3;
    
    //add ripples
    float dist = distance(uv, vec2(0.3));
    float ripple = sin(dist * 15.0 - seconds * 3.2) * 0.4;
    pattern += ripple;
    
    //create color variations
    float r = sin(pattern + seconds * 1.1) * 0.4 + 0.5;
    float g = cos(pattern + seconds * 0.9) * 0.5 + 0.5;
    float b = sin(pattern * 1.8 + seconds * 1.9) * 0.5 + 0.5;
    
    //add some brightness variation
    float brightness = sin(uv.x * 4.0 + uv.y * 3.0 + seconds) * 0.4 + 0.6;
    
    //mix colors
    vec3 color = vec3(r, g, b) * brightness;
    
    //add some saturation boost
    color = mix(vec3(0.5), color, 1.5);
    
    fragColor = vec4(color, 1.0);
}
