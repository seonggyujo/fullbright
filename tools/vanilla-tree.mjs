// Reads the vanilla shader folder that fetch-vanilla.mjs makes: releases.json plus one folder per release.
import fs from "node:fs";
import path from "node:path";

export const SHADERS = "assets/minecraft/shaders";
export const SHADER_DIRS = ["core", "include"];
export const LIGHTMAP_SHADER = "core/lightmap.fsh";

export function openVanilla(dir) {
  const releases = JSON.parse(fs.readFileSync(path.join(dir, "releases.json"), "utf8"));
  const index = (id) => {
    const i = releases.findIndex((r) => r.id === id);
    if (i < 0) throw new Error(`unknown release ${id}`);
    return i;
  };
  const read = (id, rel) => {
    const file = path.join(dir, id, SHADERS, rel);
    return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  };
  const list = (id) => SHADER_DIRS.flatMap((d) => {
    const folder = path.join(dir, id, SHADERS, d);
    return fs.existsSync(folder) ? fs.readdirSync(folder).filter((f) => /\.(vsh|fsh|glsl)$/.test(f)).map((f) => `${d}/${f}`) : [];
  });
  const format = (id) => releases[index(id)].format;
  const before = (a, b) => index(a) < index(b);
  // The first release with a lightmap shader; from there the pack's own lightmap.fsh makes everything bright.
  const firstLightmapShader = releases.find((r) => read(r.id, LIGHTMAP_SHADER) !== null).id;
  return { releases, index, read, list, format, before, firstLightmapShader };
}
