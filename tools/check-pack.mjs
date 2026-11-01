// Checks the pack against the vanilla shaders of every release by simulating how the game resolves overlays.
// Usage: node tools/check-pack.mjs <vanilla dir from fetch-vanilla.mjs> <pack dir> [pack.mcmeta to use instead]
import fs from "node:fs";
import path from "node:path";
import { MARKER, readsLightmap, pinLightmap, makeCrossVersion, onlyFogDiffers, stripHeader } from "./shader-transforms.mjs";
import { openVanilla, SHADERS, LIGHTMAP_SHADER } from "./vanilla-tree.mjs";

const [vanillaDir, packDir, metaPath] = process.argv.slice(2);
if (!vanillaDir || !packDir) throw new Error("usage: node tools/check-pack.mjs <vanilla dir> <pack dir> [pack.mcmeta]");
const vanilla = openVanilla(vanillaDir);
const meta = JSON.parse(fs.readFileSync(metaPath ?? path.join(packDir, "pack.mcmeta"), "utf8"));
const errors = [];
const fail = (msg) => errors.push(msg);
const readFile = (f) => (fs.existsSync(f) ? fs.readFileSync(f, "utf8") : null);
const walk = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(path.join(dir, e.name)).map((f) => `${e.name}/${f}`) : [e.name]) : []);

// pack.mcmeta rules from minecraft.wiki/w/Pack.mcmeta (old-version compatibility below format 65).
const range = (r) => (typeof r === "number" ? [r, r] : Array.isArray(r) ? [r[0], r[1] ?? r[0]] : [r.min_inclusive, r.max_inclusive]);
const major = (f) => (Array.isArray(f) ? f[0] : f);
const p = meta.pack;
const [sMin, sMax] = range(p.supported_formats);
if (!(sMin <= p.pack_format && p.pack_format <= sMax)) fail("pack_format is outside supported_formats");
if (sMin !== major(p.min_format) || sMax !== major(p.max_format)) fail("supported_formats does not match min_format/max_format");
const overlays = (meta.overlays?.entries ?? (fail("overlays must be a top-level key"), [])).map((e) => {
  const [a, b] = e.formats ? range(e.formats) : (fail(`${e.directory}: formats missing`), [0, -1]);
  if (a !== major(e.min_format) || b !== major(e.max_format)) fail(`${e.directory}: formats does not match min/max_format`);
  if (!/^[a-z0-9_-]+$/.test(e.directory)) fail(`${e.directory}: directory name uses characters old versions may reject`);
  return { dir: e.directory, min: a, max: b, files: walk(path.join(packDir, e.directory, SHADERS)) };
});
const baseFiles = walk(path.join(packDir, SHADERS));
for (const d of fs.readdirSync(packDir)) if (/^(overlay|lightmap)_/.test(d) && !overlays.some((o) => o.dir === d)) fail(`${d}: folder not listed in pack.mcmeta`);

// A generated file names the vanilla release it came from; rebuild it from that source and compare.
function checkDerived(id, rel, text) {
  const header = text.split("\n").find((l) => l.startsWith(MARKER)) ?? "";
  const m = header.match(/^\/\/ fullbright: vanilla (\S+) (\S+), (.*)$/);
  if (!m || m[2] !== rel) return fail(`${id}: ${rel} has no valid source header`);
  const src = m[1].split("-")[0];
  const srcText = vanilla.read(src, rel);
  const cross = m[3].startsWith("made to run on");
  const expected = m[3].startsWith("unmodified") ? srcText : cross ? stripHeader(makeCrossVersion(srcText)) : pinLightmap(srcText);
  if (stripHeader(text) !== expected) fail(`${id}: ${rel} does not match its source ${src}`);
  const van = vanilla.read(id, rel);
  if (srcText !== van && !(cross && onlyFogDiffers(van, srcText))) fail(`${id}: ${rel} was built from ${src}, which differs from ${id}`);
}

const ioLines = (s) => s.split("\n").map((l) => l.trim()).filter((l) => /^(layout\(.*\)\s*)?(in|out) /.test(l)).sort().join(" | ");
for (const r of vanilla.releases) {
  if (!(sMin <= r.format && r.format <= sMax)) { fail(`${r.id}: not covered by supported_formats`); continue; }
  const active = r.format >= 18 ? overlays.filter((o) => o.min <= r.format && r.format <= o.max) : [];
  let fromPack = 0, unused = 0;
  const effective = (rel) => {
    const hits = active.filter((o) => o.files.includes(rel));
    if (hits.length > 1) fail(`${r.id}: ${rel} provided by several overlays (${hits.map((h) => h.dir).join(", ")})`);
    const dir = hits.length ? hits[hits.length - 1].dir : baseFiles.includes(rel) ? "." : null;
    return dir ? { dir, text: readFile(path.join(packDir, dir, SHADERS, rel)) } : null;
  };
  for (const rel of new Set([...baseFiles, ...active.flatMap((o) => o.files)])) {
    const eff = effective(rel);
    if (!vanilla.read(r.id, rel)) { unused++; continue; }
    fromPack++;
    if (rel !== LIGHTMAP_SHADER) checkDerived(r.id, rel, eff.text);
  }
  if (vanilla.before(r.id, vanilla.firstLightmapShader)) {
    for (const rel of vanilla.list(r.id)) {
      const text = effective(rel)?.text ?? vanilla.read(r.id, rel);
      if (readsLightmap(text)) fail(`${r.id}: ${rel} still reads the real lightmap`);
    }
  } else {
    const lm = effective(LIGHTMAP_SHADER);
    if (!lm || !lm.text.includes("fragColor = vec4(1.0);")) fail(`${r.id}: white lightmap.fsh not applied`);
    else if (ioLines(lm.text) !== ioLines(vanilla.read(r.id, LIGHTMAP_SHADER))) fail(`${r.id}: lightmap.fsh in/out differ from vanilla (${lm.dir})`);
  }
  console.log(`${r.id.padEnd(8)} fmt ${String(r.format).padEnd(3)} ${String(fromPack).padStart(2)} pack files used, ${String(unused).padStart(2)} unused  [${active.map((o) => o.dir).join(", ")}]`);
}

if (errors.length) { console.log(`\nFAIL (${errors.length})`); for (const e of errors.slice(0, 30)) console.log(" - " + e); process.exit(1); }
console.log(`\nOK: ${vanilla.releases.length} releases checked`);
