# Character foundations

- `basic` — Cơ bản. Preserved shared foundation: four idle poses, sixteen run frames. Down/left/right use the twelve original individual uploads; up and idle use the earlier sheets. Do not overwrite this foundation for class-specific changes.
- `mage` — Pháp sư. Active model is `mage/model-v2`, painted in the same 2.5D style as Wood Archer: four idle directions, sixteen running frames and four casting poses. Older staff-bearing uploads remain archived in the Mage root; `idle-up-alternate.png` is the duplicate rear idle.

Root game URL selects basic. `?character=mage` selects mage using normal keyboard controls; there is no automatic demo. Future foundations should add their own assets and profile instead of editing basic. Staff is baked into mage artwork; these files are not modular body/weapon layers.

Mage V2 source PNGs retain real alpha. Extraction and body/foot landmarks live in `src/presentation/animations/mageModel.ts`. All idle/run/casting poses share a 128 × 96 logical canvas and foot origin (64,88), preserving airborne strides. Alpha silhouettes rather than a strict grid prevent clipping the complete staff or borrowing adjacent figures.

