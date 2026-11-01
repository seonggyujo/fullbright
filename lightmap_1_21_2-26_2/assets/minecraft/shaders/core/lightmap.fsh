#version 150
// Fullbright for 1.21.2-26.2: the lightmap texture becomes pure white, so every light level is full bright.
// No uniforms are declared, because their layout changes across these versions and none are needed.

in vec2 texCoord;
out vec4 fragColor;

void main() {
    fragColor = vec4(1.0);
}
