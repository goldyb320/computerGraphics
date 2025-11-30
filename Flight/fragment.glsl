#version 300 es
precision highp float;

in vec3 worldPosition;
in vec3 worldNormal;
in vec3 viewDirection;

out vec4 fragColor;

//lighting params
const vec3 lightDirection = normalize(vec3(1.0, 1.0, 1.0));
const vec3 lightColor = vec3(1.0, 0.95, 0.8);
const vec3 ambientColor = vec3(0.1, 0.15, 0.2);

//simple earth tone coloring
const vec3 baseColor = vec3(0.8, 0.6, 0.4);

void main() {
    //calc lighting
    float NdotL = max(dot(normalize(worldNormal), lightDirection), 0.0);
    vec3 diffuse = lightColor * NdotL;
    
    //add specular highlights
    vec3 reflectDir = reflect(-lightDirection, normalize(worldNormal));
    float spec = pow(max(dot(normalize(viewDirection), reflectDir), 0.0), 32.0);
    vec3 specular = lightColor * spec * 0.3;
    
    //combine lighting w/ earth tone base color
    vec3 finalColor = baseColor * (ambientColor + diffuse) + specular;
    
    fragColor = vec4(finalColor, 1.0);
}
