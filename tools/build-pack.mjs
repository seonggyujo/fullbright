// Regenerates the base shaders, every overlay_* folder and pack.mcmeta from the vanilla shaders of each release.
// Usage: node tools/build-pack.mjs <vanilla dir from fetch-vanilla.mjs> <pack dir>
import fs from "node:fs";
import path from "node:path";
import { readsLightmap, pinLightmap, makeCrossVersion, onlyFogDiffers, withHeader, stripHeader } from "./shader-transforms.mjs";
import { openVanilla, SHADERS } from "./vanilla-tree.mjs";

const [vanillaDir, packDir] = process.argv.slice(2);
if (!vanillaDir || !packDir) throw new Error("usage: node tools/build-pack.mjs <vanilla dir> <pack dir>");
const vanilla = openVanilla(vanillaDir);
const { releases, index: at, format: fmt, before, read } = vanilla;
const CROSS_VERSION_SOURCE = "1.18.2"; // base files for 1.17-1.18.1 are built from this release
const BASE_LAST = "1.20.4"; // base folder files are exactly right up to this release
// Hand-written white lightmap shaders, one per lightmap.fsh interface. Add one when that interface changes.
const HANDWRITTEN = [
  { dir: "lightmap_1_21_2-26_2", from: "1.21.2", to: "26.2" },
  { dir: "lightmap_26_3", from: "26.3", to: "26.3" },
];

// Files that read the lightmap themselves in some release before the lightmap shader existed.
const oldReleases = releases.filter((r) => before(r.id, vanilla.firstLightmapShader)).map((r) => r.id);
const tracked = [...new Set(oldReleases.flatMap((id) => vanilla.list(id).filter((f) => readsLightmap(read(id, f)))))].sort();

function baseFile(file) {
  const first = oldReleases.find((id) => read(id, file));
  const source = before(first, CROSS_VERSION_SOURCE) && read(first, file) !== read(CROSS_VERSION_SOURCE, file) ? CROSS_VERSION_SOURCE : first;
  const text = read(source, file);
  for (const r of releases.slice(at(first), at(BASE_LAST) + 1)) {
    const v = read(r.id, file);
    if (!v) throw new Error(`${file} disappears in ${r.id}, inside the base range`);
    if (v !== text && !(before(r.id, CROSS_VERSION_SOURCE) && onlyFogDiffers(v, text))) throw new Error(`${file} changes in ${r.id}, inside the base range`);
  }
  if (source === CROSS_VERSION_SOURCE) {
    return withHeader(makeCrossVersion(text), [`vanilla ${source} ${file}, made to run on ${first}-${BASE_LAST}. Lightmap reads pinned to the brightest cell.`]);
  }
  return withHeader(pinLightmap(text), [`vanilla ${first} ${file}, used on ${first}-${BASE_LAST}. Lightmap reads pinned to the brightest cell.`]);
}

// For later releases, find where the base file is wrong and what must replace it there.
function overlaySegments(file, base) {
  const segments = [];
  let open = null;
  for (const r of releases.slice(at(BASE_LAST) + 1)) {
    const v = read(r.id, file);
    const pinned = v && readsLightmap(v) ? pinLightmap(v) : null;
    const old = before(r.id, vanilla.firstLightmapShader);
    if (v && old && !pinned) throw new Error(`${file} in ${r.id} no longer reads the lightmap in a known way`);
    // Before the lightmap shader only a pinned copy is right; after it, vanilla or pinned both work.
    const ok = !v || [pinned, old ? null : v].some((c) => c !== null && stripHeader(base) === c);
    if (ok) { open = null; continue; }
    const content = old ? pinned : v;
    if (open && open.content === content) { open.to = r.id; continue; }
    open = { file, from: r.id, to: r.id, content, old };
    segments.push(open);
  }
  // A segment may also cover neighbouring releases where the file does not exist, since it is unused there.
  const present = (i) => read(releases[i].id, file) !== null;
  for (const s of segments) {
    let lo = at(s.from), hi = at(s.to);
    while (lo - 1 > at(BASE_LAST) && !present(lo - 1)) lo--;
    while (hi + 1 < releases.length && !present(hi + 1)) hi++;
    Object.assign(s, { minFrom: lo, maxTo: hi, source: s.from === s.to ? s.from : `${s.from}-${s.to}` });
  }
  return segments;
}

// Moves flexible segments into a range another segment already uses, so fewer overlay folders exist.
function shareRanges(segments) {
  const key = (s) => `${s.from}..${s.to}`;
  for (const s of segments) {
    const fit = segments.find((o) => key(o) !== key(s) && s.minFrom <= at(o.from) && at(o.from) <= at(s.from) && at(s.to) <= at(o.to) && at(o.to) <= s.maxTo);
    if (fit) Object.assign(s, { from: fit.from, to: fit.to });
  }
  for (const s of segments) {
    const prev = releases[at(s.from) - 1], next = releases[at(s.to) + 1];
    if (prev.format === fmt(s.from) || (next && next.format === fmt(s.to))) throw new Error(`${s.file}: a pack format is split across ${s.from}-${s.to}`);
  }
  return segments;
}

const dirName = (from, to) => "overlay_" + (from === to ? from : `${from}-${to}`).replaceAll(".", "_");
const writeFile = (file, text) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); };

// Generated output is owned by this script: base copies of tracked files and every overlay_* folder.
for (const d of fs.readdirSync(packDir)) if (d.startsWith("overlay_")) fs.rmSync(path.join(packDir, d), { recursive: true });
const overlays = new Map();
const segments = [];
for (const file of tracked) {
  const base = baseFile(file);
  writeFile(path.join(packDir, SHADERS, file), base);
  segments.push(...overlaySegments(file, base));
}
for (const s of shareRanges(segments)) {
  const dir = dirName(s.from, s.to);
  overlays.set(dir, { dir, from: s.from, to: s.to });
  const note = s.old ? "lightmap reads pinned to the brightest cell." : "unmodified, undoes the base folder override (lightmap.fsh does fullbright here).";
  writeFile(path.join(packDir, dir, SHADERS, s.file), withHeader(s.content, [`vanilla ${s.source} ${s.file}, ${note}`]));
}

const entry = ({ dir, from, to }) => ({
  directory: dir,
  formats: { min_inclusive: fmt(from), max_inclusive: fmt(to) },
  min_format: fmt(from),
  max_format: fmt(to),
});
const entries = [...HANDWRITTEN, ...overlays.values()].map(entry)
  .sort((a, b) => a.min_format - b.min_format || a.max_format - b.max_format || a.directory.localeCompare(b.directory));
const first = releases[0].id, last = releases[releases.length - 1].id;
const meta = {
  pack: {
    description: `Fullbright for Minecraft ${first} - ${last}`,
    pack_format: 15,
    supported_formats: { min_inclusive: fmt(first), max_inclusive: fmt(last) },
    min_format: fmt(first),
    max_format: fmt(last),
  },
  overlays: { entries },
};
fs.writeFileSync(path.join(packDir, "pack.mcmeta"), JSON.stringify(meta, null, 2) + "\n");
console.log(`tracked ${tracked.length} files; ${overlays.size} generated overlays + ${HANDWRITTEN.length} hand-written`);
for (const o of overlays.values()) console.log(`  ${o.dir}  formats ${fmt(o.from)}-${fmt(o.to)}`);
