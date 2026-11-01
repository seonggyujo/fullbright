# Fullbright

A vanilla resource pack that removes darkness: caves, nights and the Nether render at full brightness.
One zip covers **Minecraft Java 1.17 to 26.3**. No mods, no OptiFine, no gamma hacks in `options.txt`.

## Supported versions

| Minecraft        | What becomes fully bright                                           |
|------------------|---------------------------------------------------------------------|
| 1.17 - 26.3      | Everything: blocks, mobs, held items, particles, signs              |
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

| Folder                                    | Applies to      | Purpose                                                              |
|-------------------------------------------|-----------------|----------------------------------------------------------------------|
| `assets/` (base)                          | 1.17 - 1.20.4   | Every shader that reads the lightmap reads its brightest cell instead |
| `overlay_1_20_5-1_21_1/`                  | 1.20.5 - 1.21.1 | Same, for the shaders as they were in these versions                 |
| `lightmap_1_21_2-26_2/`, `lightmap_26_3/` | 1.21.2 - 26.3   | The lightmap shader itself outputs pure white                        |
| other `overlay_*/`                        | 1.21.2 - 26.3   | Unmodified vanilla copies that undo the base folder files, which would break these versions |

1.17 - 1.20.1 cannot read overlays, so the base folder must work on all of them at once. Entity and particle
shaders changed their fog math in 1.18.1 and 1.18.2, so the base copies carry their own fog function and run
unchanged from 1.17 to 1.20.4. The one visible difference: on 1.18.1 the fog edge on mobs and particles is round
instead of cylindrical.

Every generated shader starts with a `// fullbright:` line naming the vanilla release it was built from.

## License

MIT for this pack's own work, see [LICENSE](LICENSE).
The `light.glsl` files are based on (or are copies of) Minecraft's shader sources, which belong to Mojang Studios.
