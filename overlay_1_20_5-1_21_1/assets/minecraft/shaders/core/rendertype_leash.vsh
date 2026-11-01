#version 150
// fullbright: vanilla 1.20.5-1.21.1 core/rendertype_leash.vsh, lightmap reads pinned to the brightest cell.

#moj_import <fog.glsl>

in vec3 Position;
in vec4 Color;
in ivec2 UV2;

uniform sampler2D Sampler2;

uniform mat4 ModelViewMat;
uniform mat4 ProjMat;
uniform vec4 ColorModulator;
uniform int FogShape;

out float vertexDistance;
flat out vec4 vertexColor;

void main() {
    gl_Position = ProjMat * ModelViewMat * vec4(Position, 1.0);

    vertexDistance = fog_distance(Position, FogShape);
    vertexColor = Color * ColorModulator * texelFetch(Sampler2, ivec2(15, 15), 0);
}
