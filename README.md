# Fullbright

A vanilla resource pack that removes darkness: caves, nights and the Nether render at full brightness.
One zip covers **Minecraft Java 1.17 to 26.3**. No mods, no OptiFine, no gamma hacks in `options.txt`.

## Supported versions

| Minecraft        | What becomes fully bright                                           |
|------------------|---------------------------------------------------------------------|
| 1.21.2 - 26.3    | Everything: blocks, mobs, items, particles                          |
| 1.17 - 1.21.1    | Blocks only. Mobs, items and particles keep vanilla lighting        |
| 1.16.5 and older | Not supported. These versions have no core shaders to change        |

Snapshots are not supported. Versions newer than 26.3 show the pack as incompatible until it is updated.

## Install

1. Download `Fullbright-<version>.zip` from [Releases](../../releases).
2. Put the zip (do not unzip it) into `.minecraft/resourcepacks`.
3. In game: Options > Resource Packs, move **Fullbright** to the right side, then Done.

On 1.17 - 1.19.4 the pack list says it was made for a newer version. Load it anyway; it works.

Not tested with Sodium, Iris or OptiFine shader packs. A shader pack replaces the vanilla shaders this pack edits.

## How it works

Minecraft multiplies every pixel of the world by a small lightmap texture indexed by block light and sky light.
Where that lightmap comes from changed several times, so the pack switches files per version with
[overlays](https://minecraft.wiki/w/Pack.mcmeta):

| Folder                                  | Applies to       | Purpose                                                              |
|-----------------------------------------|------------------|----------------------------------------------------------------------|
| `assets/.../include/light.glsl`         | 1.17 - 1.21.5    | Block shaders sample the brightest lightmap cell instead of the real one |
| `lightmap_1_21_2-26_2/.../lightmap.fsh` | 1.21.2 - 26.2    | The lightmap shader outputs pure white                               |
| `lightmap_26_3/.../lightmap.fsh`        | 26.3             | Same, written for the 26.3 shader interface                          |
| `vanilla_light_*/.../light.glsl`        | 1.21.6 and later | Unmodified vanilla copies that undo the 1.17 `light.glsl` override, which would break newer versions |

1.17 - 1.20.1 cannot read overlays, so the old override has to live in the base folder, and newer versions restore the vanilla file.

## License

MIT for this pack's own work, see [LICENSE](LICENSE).
The `light.glsl` files are based on (or are copies of) Minecraft's shader sources, which belong to Mojang Studios.
