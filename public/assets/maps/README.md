# Current realistic map set — 2026-10-08

The shared map catalog (`src/world/definitions.ts`) selects these four built-in ImageGen edits for the game, Kháng Chiến and Lab. `village` and `khang-chien-1` share Map 1. Original files below remain available for comparison.

| Map | Current artwork | Actual dimensions | State |
| --- | --- | --- | --- |
| 1 | `village-area-1-realistic-v4.png` | 1570 × 1002 | Living village in natural daylight |
| 2 | `village-area-1-ruined-realistic-v3.png` | 1563 × 1006 | Ruined village with early black contamination, overcast daylight |
| 3 | `village-area-1-apocalypse-realistic-v3.png` | 1564 × 1006 | Heavy connected black contamination under storm light |
| 4 | `village-area-1-final-dusk-realistic-v3.png` | 1565 × 1005 | Peak black contamination at dark sunset, inert monster remains |
| Ending only | `village-area-1-cleansed-dusk-realistic-v1.png` | 1565 × 1005 | Cleansed earth and water at dusk; ruins and devastated crops remain |

The new treatment reduces bright speckles, illustrated outlines and noisy material highlights; roofs, timber, roots, soil and water have more natural material response. Maps 2–4 use Map 1 as a style reference. Maps 3–4 also received a focused ground/corruption cleanup pass. Major landmark positions and road/canal layout remain visually aligned; ImageGen edits are not pixel-identical and small artistic details differ. The world remains 2200 × 1400 with unchanged movement, collision, refuge and skill coordinates. These are re-rendered images, not 2× or 4K upscales: the generator did not meet the preferred larger resolution.

The latest progression keeps Map 1 healthy, adds early contamination to Map 2 and substantially increases connected black earth, sludge and ink-dark irrigation water in Maps 3–4. The ancient-banyan shrine and neighbouring residential courtyard remain clean. Paths remain visible through their geometry and value separation. Requested coverage percentages are art direction, not measured segmentation results.

Full initial and cleanup prompts: `art/maps/realistic-v1/prompts.md`; latest contamination prompts: `art/maps/realistic-v1/corruption-prompts.md`; soul-offering ending edit: `art/maps/realistic-v1/cleansing-prompt.md`. The ending variant is a separate edit of current Map 4, selected by `KHANG_CHIEN_CLEANSED_MAP_URL` only during purification/completion, not a fifth playable map. Release and APK compression use WebP quality 90 for the realistic backgrounds, retaining original dimensions. APK packaging drops the original four superseded backgrounds and the three realistic v2 variants from the build; their project source files remain untouched.

# Previous village map presentation

`village-area-1-detail-v3.png` is the previous detail-restored artwork, generated with the built-in ImageGen from `village-area-1-v2.png`. The original remains available. Output is 1570 × 1002, not a 2× upscale. Visual comparison retains the main layout; fine artistic details differ. World remains 2200 × 1400; movement, collision and skill coordinates are unchanged.

Prompt: Faithfully restore the exact Vietnamese village map for close camera zoom; preserve the entire composition, boundaries and placement of roads, bridges, ponds, fields, fences, trees, buildings and landmarks. Retain original colors and game-art style, restore crisp small texture details, remove blur, add no objects or text, do not crop. Request at least 3140 pixels wide and original aspect ratio 1570:1001. The generator did not meet the requested output resolution.
# Previous ruined village variants

`village-area-1-final-dusk-v1.png` is the final aftermath variant: dark brown-gold sunset, extensive black ground corruption and scattered monster remains. ImageGen edited `village-area-1-apocalypse-v1.png` using current monster references: `flat-fur-rat/normal.png`, `grasshopper/normal.png`, `crop-snail/normal.png`, `black-caterpillar/normal.png`. Corpses are painted background decoration, not runtime enemies or collision bodies. Ancient tree and nearby houses remain physically intact. Not selected by the map catalog.

Prompt constraints: preserve fixed map composition and landmarks; genuinely dark late sunset with ochre/umber light, many small inert non-graphic monster remains matching references, preserve black corruption and intact residential enclave, no sky/horizon/UI/new layout.

`village-area-1-apocalypse-v1.png` is a separate, more severe edit of `village-area-1-ruined-v1.png`: black tar-like corruption coats ground, ruined crops and canal banks; cold dim storm lighting implies an approaching apocalypse. Ancient banyan and nearby residential enclave remain intact and cleaner. Same major landmark layout; not selected by the map catalog.

Prompt constraints: keep source camera/composition/landmark footprints; add broad black oily pools and branching stains across ruined areas, dark storm-cloud illumination without literal sky/horizon, retain readable terrain and intact ancient-tree enclave, no characters/UI/new structures or relocation.

`village-area-1-ruined-v1.png` is a separate ImageGen edit of the previous `village-area-1-detail-v3.png`: overcast desaturated atmosphere, ruined peripheral huts/fences/crops and broken trees; ancient banyan and nearby tiled residential courtyard remain intact. Major roads, canals and landmarks visually retain their layout, but generated details are not pixel-identical. Not selected by the current map catalog; no world coordinates or collision changes.

Prompt constraints: preserve the same top-down 3/4 map composition and landmark footprints; destroy peripheral vegetation/farms/straw huts, keep only the ancient-tree residential enclave intact; gloomy readable daylight, no characters/UI/new terrain, no relocation or crop.

