// Downloads the vanilla shaders of every supported release from misode/mcmeta into a folder for build-pack.mjs.
// Usage: node tools/fetch-vanilla.mjs <output dir>   (on Windows keep the path short, e.g. C:\tmp\vanilla)
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { SHADERS, SHADER_DIRS } from "./vanilla-tree.mjs";

// Supported releases, oldest first. Add each new Minecraft release here, then rebuild.
const RELEASES = [
  "1.17", "1.17.1", "1.18", "1.18.1", "1.18.2", "1.19", "1.19.1", "1.19.2", "1.19.3", "1.19.4",
  "1.20", "1.20.1", "1.20.2", "1.20.3", "1.20.4", "1.20.5", "1.20.6", "1.21", "1.21.1", "1.21.2",
  "1.21.3", "1.21.4", "1.21.5", "1.21.6", "1.21.7", "1.21.8", "1.21.9", "1.21.10", "1.21.11",
  "26.1", "26.1.1", "26.1.2", "26.2", "26.3",
];
const REPO = "https://github.com/misode/mcmeta.git";
const VERSIONS_URL = "https://raw.githubusercontent.com/misode/mcmeta/summary/versions/data.json";

if (!process.argv[2]) throw new Error("usage: node tools/fetch-vanilla.mjs <output dir>");
const out = path.resolve(process.argv[2]);
const gitDir = path.join(out, "git");
const git = (...args) => execFileSync("git", ["-C", gitDir, ...args], { stdio: ["ignore", "ignore", "inherit"] });

// A shallow, blob-less clone: only the shader files of each release tag are downloaded.
if (!fs.existsSync(path.join(gitDir, ".git"))) {
  fs.mkdirSync(gitDir, { recursive: true });
  git("init", "-q");
  git("remote", "add", "origin", REPO);
  for (const [key, value] of [["remote.origin.promisor", "true"], ["remote.origin.partialclonefilter", "blob:none"], ["core.autocrlf", "false"], ["core.longpaths", "true"]]) git("config", key, value);
}
git("fetch", "-q", "--depth", "1", "--filter=blob:none", "origin", ...RELEASES.map((v) => `refs/tags/${v}-assets:refs/tags/${v}-assets`));
for (const v of RELEASES) {
  const target = path.join(out, v);
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });
  git("--work-tree", target, "checkout", "-q", `${v}-assets`, "--", ...SHADER_DIRS.map((d) => `${SHADERS}/${d}`));
}

const data = await (await fetch(VERSIONS_URL)).json();
const releases = RELEASES.map((id) => {
  const entry = data.find((x) => x.id === id);
  if (!entry) throw new Error(`release ${id} not found in ${VERSIONS_URL}`);
  const format = entry.resource_pack_version;
  return { id, format: Array.isArray(format) ? format[0] : format };
});
fs.writeFileSync(path.join(out, "releases.json"), JSON.stringify(releases, null, 1) + "\n");
console.log(`fetched ${releases.length} releases into ${out}`);
