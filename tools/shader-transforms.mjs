// Pure text transforms that turn vanilla shader sources into this pack's fullbright versions.
// No file or network access here, so build-pack.mjs and check-pack.mjs share exactly the same logic.

export const MARKER = "// fullbright:";

// Every way 1.17-1.21.1 shaders read the lightmap, mapped to a read of its brightest cell (block 15, sky 15).
const LIGHTMAP_READS = [
  ["texelFetch(Sampler2, UV2 / 16, 0)", "texelFetch(Sampler2, ivec2(15, 15), 0)"],
  ["texture(Sampler2, texCoord2)", "texture(Sampler2, vec2(15.5 / 16.0))"],
  ["texture(lightMap, clamp(uv / 256.0, vec2(0.5 / 16.0), vec2(15.5 / 16.0)))", "texture(lightMap, vec2(15.5 / 16.0))"],
];

export function readsLightmap(source) {
  return LIGHTMAP_READS.some(([from]) => source.includes(from));
}

export function pinLightmap(source) {
  if (!readsLightmap(source)) throw new Error("no known lightmap read to pin");
  return LIGHTMAP_READS.reduce((text, [from, to]) => text.split(from).join(to), source);
}

// 1.18.2 shaders call fog_distance() and use IViewRotMat. 1.17-1.18.1 have no fog_distance() in fog.glsl,
// and 1.17-1.18 never set IViewRotMat (it stays zero). A local copy and an identity fallback let one file
// run on 1.17-1.20.4. Only difference left: 1.18.1 never sets FogShape, so its entity fog is spherical.
const FOG_HELPERS = `${MARKER} local copy of the 1.18.2 fog_distance(), because 1.17-1.18.1 fog.glsl lacks it.
float fullbright_fog_distance(mat4 modelViewMat, vec3 pos, int shape) {
    if (shape == 0) {
        return length((modelViewMat * vec4(pos, 1.0)).xyz);
    } else {
        float distXZ = length((modelViewMat * vec4(pos.x, 0.0, pos.z, 1.0)).xyz);
        float distY = length((modelViewMat * vec4(0.0, pos.y, 0.0, 1.0)).xyz);
        return max(distXZ, distY);
    }
}
`;

const VIEW_ROTATION_HELPER = `${MARKER} 1.17-1.18 never set IViewRotMat, so it stays zero there; identity matches their vanilla math.
mat3 fullbright_view_rotation() {
    return determinant(IViewRotMat) == 0.0 ? mat3(1.0) : IViewRotMat;
}
`;

// True when two vanilla variants differ only in the fog lines that changed in 1.18.1 and 1.18.2.
const FOG_LINE = /^\s*$|#moj_import <fog.glsl>|uniform mat3 IViewRotMat;|uniform int FogShape;|vertexDistance = (length\(\(ModelViewMat \* vec4\(Position, 1.0\)\).xyz\)|cylindrical_distance\(ModelViewMat, (IViewRotMat \* )?Position\)|fog_distance\(ModelViewMat, (IViewRotMat \* )?Position, FogShape\));/;
export function onlyFogDiffers(a, b) {
  const strip = (s) => s.split("\n").filter((l) => !FOG_LINE.test(l)).join("\n");
  return strip(a) === strip(b);
}

export function makeCrossVersion(source1182) {
  const usesRotation = source1182.includes("IViewRotMat * Position");
  if (!source1182.includes("fog_distance(ModelViewMat, ")) throw new Error("expected a 1.18.2 fog_distance call");
  const body = source1182
    .split("fog_distance(ModelViewMat, ").join("fullbright_fog_distance(ModelViewMat, ")
    .split("IViewRotMat * Position").join("fullbright_view_rotation() * Position");
  const helpers = (usesRotation ? VIEW_ROTATION_HELPER + "\n" : "") + FOG_HELPERS + "\n";
  const at = body.indexOf("void main()");
  if (at < 0) throw new Error("no main()");
  return pinLightmap(body.slice(0, at) + helpers + body.slice(at));
}

// Puts a marker comment right after #version (GLSL needs #version first) or at the top if there is none.
export function withHeader(source, lines) {
  const header = lines.map((l) => `${MARKER} ${l}`).join("\n") + "\n";
  const m = source.match(/^#version[^\n]*\n/);
  return m ? m[0] + header + source.slice(m[0].length) : header + source;
}

export function stripHeader(source) {
  return source.split("\n").filter((l) => !l.startsWith(MARKER)).join("\n");
}
