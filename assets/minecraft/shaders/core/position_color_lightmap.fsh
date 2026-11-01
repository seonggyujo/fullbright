#version 150
// fullbright: vanilla 1.17 core/position_color_lightmap.fsh, used on 1.17-1.20.4. Lightmap reads pinned to the brightest cell.

uniform sampler2D Sampler2;

uniform vec4 ColorModulator;

in vec4 vertexColor;
in vec2 texCoord2;

out vec4 fragColor;

void main() {
    vec4 color = texture(Sampler2, vec2(15.5 / 16.0)) * vertexColor;
    fragColor = color * ColorModulator;
}
