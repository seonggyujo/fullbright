#version 150
// fullbright: vanilla 1.20.5-1.21.1 core/rendertype_translucent_moving_block.vsh, lightmap reads pinned to the brightest cell.

in vec3 Position;
in vec4 Color;
in vec2 UV0;
in ivec2 UV2;
in vec3 Normal;

uniform sampler2D Sampler2;

uniform mat4 ModelViewMat;
uniform mat4 ProjMat;

out vec4 vertexColor;
out vec2 texCoord0;

void main() {
    gl_Position = ProjMat * ModelViewMat * vec4(Position, 1.0);

    vertexColor = Color * texelFetch(Sampler2, ivec2(15, 15), 0);
    texCoord0 = UV0;
}
