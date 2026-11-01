#version 330
#extension GL_ARB_separate_shader_objects : require

// Fullbright: replaces the vanilla lightmap so every block/sky light level renders at full brightness.
// The uniform block is kept identical to vanilla 26.3 so the pipeline interface still matches.

layout(std140) uniform LightmapInfo {
    float SkyFactor;
    float BlockFactor;
    float NightVisionFactor;
    float DarknessScale;
    float BossOverlayWorldDarkeningFactor;
    float BrightnessFactor;
    vec3 BlockLightTint;
    vec3 SkyLightColor;
    vec3 AmbientColor;
    vec3 NightVisionColor;
} lightmapInfo;

layout(location = 0) in vec2 texCoord;

layout(location = 0) out vec4 fragColor;

void main() {
    fragColor = vec4(1.0);
}
