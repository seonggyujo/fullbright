#version 150
// fullbright: vanilla 1.18.2 core/rendertype_entity_translucent_cull.vsh, made to run on 1.17-1.20.4. Lightmap reads pinned to the brightest cell.

#moj_import <light.glsl>
#moj_import <fog.glsl>

in vec3 Position;
in vec4 Color;
in vec2 UV0;
in vec2 UV1;
in ivec2 UV2;
in vec3 Normal;

uniform sampler2D Sampler2;

uniform mat4 ModelViewMat;
uniform mat4 ProjMat;
uniform mat3 IViewRotMat;
uniform int FogShape;

uniform vec3 Light0_Direction;
uniform vec3 Light1_Direction;

out float vertexDistance;
out vec4 vertexColor;
out vec2 texCoord0;
out vec2 texCoord1;
out vec2 texCoord2;
out vec4 normal;

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
    vertexColor = minecraft_mix_light(Light0_Direction, Light1_Direction, Normal, Color) * texelFetch(Sampler2, ivec2(15, 15), 0);
    texCoord0 = UV0;
    texCoord1 = UV1;
    texCoord2 = UV2;
    normal = ProjMat * ModelViewMat * vec4(Normal, 0.0);
}
