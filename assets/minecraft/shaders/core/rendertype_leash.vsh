#version 150
// fullbright: vanilla 1.18.2 core/rendertype_leash.vsh, made to run on 1.17-1.20.4. Lightmap reads pinned to the brightest cell.

#moj_import <fog.glsl>

in vec3 Position;
in vec4 Color;
in ivec2 UV2;

uniform sampler2D Sampler2;

uniform mat4 ModelViewMat;
uniform mat4 ProjMat;
uniform mat3 IViewRotMat;
uniform vec4 ColorModulator;
uniform int FogShape;

out float vertexDistance;
flat out vec4 vertexColor;

// fullbright: 1.17-1.18 never set IViewRotMat, so it stays zero there; identity matches their vanilla math.
mat3 fullbright_view_rotation() {
    return determinant(IViewRotMat) == 0.0 ? mat3(1.0) : IViewRotMat;
}

// fullbright: local copy of the 1.18.2 fog_distance(), because 1.17-1.18.1 fog.glsl lacks it.
float fullbright_fog_distance(mat4 modelViewMat, vec3 pos, int shape) {
    if (shape == 0) {
        return length((modelViewMat * vec4(pos, 1.0)).xyz);
    } else {
        float distXZ = length((modelViewMat * vec4(pos.x, 0.0, pos.z, 1.0)).xyz);
        float distY = length((modelViewMat * vec4(0.0, pos.y, 0.0, 1.0)).xyz);
        return max(distXZ, distY);
    }
}

void main() {
    gl_Position = ProjMat * ModelViewMat * vec4(Position, 1.0);

    vertexDistance = fullbright_fog_distance(ModelViewMat, fullbright_view_rotation() * Position, FogShape);
    vertexColor = Color * ColorModulator * texelFetch(Sampler2, ivec2(15, 15), 0);
}
