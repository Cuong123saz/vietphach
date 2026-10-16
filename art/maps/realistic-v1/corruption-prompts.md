# Stronger corruption prompts — 2026-10-08

Generated with the built-in ImageGen tool from the previous realistic v2 maps. Percentages in prompts are visual direction, not measured image segmentation. Preserve the original map geometry and the clean ancient-banyan refuge. Current selected artwork and measured dimensions are recorded in `public/assets/maps/README.md`.

## Map 2 — Early contamination

```text
Use case: precise-object-edit
Asset type: final Map 2 background for a Vietnamese village game, early black contamination stage.
Input image 1: EDIT TARGET. Preserve exact full-map framing, high-angle orthographic three-quarter camera, landscape aspect ratio, and all road, bridge, canal, hut, tree, field, garden and house footprints. Keep the existing destroyed peripheral huts, broken fences, dead fields and tree debris unchanged in placement.
Primary request: Introduce a clearly visible EARLY STAGE of black environmental corruption to the ruined village, as preparation for much more severe contamination in Maps 3–4. Around 15–20 percent of the exposed outer ground outside the protected sanctuary should have connected small-to-medium charcoal-black sludge patches. Keep most central roads and soil brown/grey so this still reads as the beginning of infection.
Placement of contamination: In a few low rice-field corners on the far left and bottom, selected irrigation bank stretches, and low soil pockets beside ruined peripheral huts. Channel water shows a few broad opaque near-black sections and expanding dark pools, while much of the canal remains dull grey-blue. Small branching runnels connect to the pools. Do not evenly scatter spots over the whole map.
Material appearance: Deep near-black dirty organic sludge with weight, matte-to-satin sheen and a few broad dim reflections; black infected earth with natural surface relief. These are material changes, not shadow/exposure changes. Cohesive black patches large enough to see at whole-map scale.
Protected area: The living banyan and stone shrine ring above-right of centre, adjacent red-tile houses and immediate courtyard remain entirely clean and intact. Preserve the soft grey overcast daylight and muted realistic material treatment everywhere; no glowing sunny enclave.
Noise control: Preserve readable architectural and timber details but keep ground textures quiet. No tiny repeated flecks, bright speckled stones, glitter, particles, dense silver crack webs, purple glow, neon veins, stippling, oversharpening grain or shiny plastic.
Constraints: No new buildings, terrain, plants, people, live creatures, monster corpses, text, UI, border or watermark. Roads and bridges remain clear in shape and width. No horizon, sky, camera shift, crop or zoom. Output one complete map in source aspect ratio.
```

## Map 3 — Strong black coverage

```text
Use case: precise-object-edit
Asset type: final in-game Vietnamese village map, stronger environmental corruption pass.
Input image 1: EDIT TARGET. Preserve its exact fixed high-angle three-quarter orthographic camera, full-map framing, aspect ratio and all landmark positions.
Primary request: The present black contamination is too sparse. Make the corruption visibly dominant as a REAL MATERIAL coating the ground and water outside the protected residential sanctuary. This must be an unmistakable large change visible even when viewing the whole map as a thumbnail.
Corruption appearance: Replace large areas of the currently brown and grey exposed soil with deep charcoal-black infected earth and thick near-black sludge. Create broad connected irregular patches and heavy black pools, spreading through rice fields, failed gardens, irrigation channels, pond margins and the foundations of peripheral ruined huts. Contaminated canal water becomes deep opaque ink-black with restrained broad grey reflections. Blackness must come from actual corrupted surface material, not an overall dark exposure filter or a colored screen overlay.
Texture hierarchy: Broad quiet dark masses, subtle thick rolled sludge edges and a small number of readable natural rivulets. Keep convincing soil relief and a little restrained dark-brown variation inside black areas. Preserve crisp beams, planks, tile geometry, stone banks and roots. Natural heavy matte-to-satin dirty material, not pure flat black paint and not glossy plastic.
Protected area: Keep the ancient living banyan and shrine ring above-right of the map centre, the neighbouring red-tile residential houses and their immediate courtyard physically intact and visibly clean. End corruption in an irregular boundary outside this enclave; no newly drawn magical barrier or rings. Make the contrast between the surviving clean sanctuary and the blackened outer village evident.
Invariants: Preserve all roads, their widths and routing, bridges, field boundaries, canal geometry, garden fences, ruined structures and tree locations. The playable paths may be stained black but must remain readable by their edge geometry and a little value separation. Do not erase landmarks or hide them under sludge. No new buildings, terrain, foliage, people, live monsters, UI, text, borders or watermark. No sky, horizon, crop or zoom.
Avoid: tiny black flecks, thousands of white dots, glitter, particles, silvery crack webs, violet or neon veins, exaggerated bloom, oversharpening grain, uniform global darkness. This change is about vastly more black material coverage while preserving the already cleaner realistic rendering.
Map 3 coverage and lighting: Corruption occupies approximately 65–75 percent of the visible OUTER ground surface outside the clean sanctuary. The large rice-field blocks along the entire left and lower edge should be predominantly black; black connected areas cross the central and lower-right soil and cover most canal banks. Retain a few lighter muddy road ribbons and small uncorrupted soil islands. Cold dim storm daylight, no sunset. Retain enough readable shadow detail. No corpses in this map.
```

## Map 4 — Strong black coverage

```text
Use case: precise-object-edit
Asset type: final in-game Vietnamese village map, stronger environmental corruption pass.
Input image 1: EDIT TARGET. Preserve its exact fixed high-angle three-quarter orthographic camera, full-map framing, aspect ratio and all landmark positions.
Primary request: The present black contamination is too sparse. Make the corruption visibly dominant as a REAL MATERIAL coating the ground and water outside the protected residential sanctuary. This must be an unmistakable large change visible even when viewing the whole map as a thumbnail.
Corruption appearance: Replace large areas of the currently brown and grey exposed soil with deep charcoal-black infected earth and thick near-black sludge. Create broad connected irregular patches and heavy black pools, spreading through rice fields, failed gardens, irrigation channels, pond margins and the foundations of peripheral ruined huts. Contaminated canal water becomes deep opaque ink-black with restrained broad grey reflections. Blackness must come from actual corrupted surface material, not an overall dark exposure filter or a colored screen overlay.
Texture hierarchy: Broad quiet dark masses, subtle thick rolled sludge edges and a small number of readable natural rivulets. Keep convincing soil relief and a little restrained dark-brown variation inside black areas. Preserve crisp beams, planks, tile geometry, stone banks and roots. Natural heavy matte-to-satin dirty material, not pure flat black paint and not glossy plastic.
Protected area: Keep the ancient living banyan and shrine ring above-right of the map centre, the neighbouring red-tile residential houses and their immediate courtyard physically intact and visibly clean. End corruption in an irregular boundary outside this enclave; no newly drawn magical barrier or rings. Make the contrast between the surviving clean sanctuary and the blackened outer village evident.
Invariants: Preserve all roads, their widths and routing, bridges, field boundaries, canal geometry, garden fences, ruined structures and tree locations. The playable paths may be stained black but must remain readable by their edge geometry and a little value separation. Do not erase landmarks or hide them under sludge. No new buildings, terrain, foliage, people, live monsters, UI, text, borders or watermark. No sky, horizon, crop or zoom.
Avoid: tiny black flecks, thousands of white dots, glitter, particles, silvery crack webs, violet or neon veins, exaggerated bloom, oversharpening grain, uniform global darkness. This change is about vastly more black material coverage while preserving the already cleaner realistic rendering.
Map 4 coverage and lighting: Severe peak corruption occupies approximately 80–85 percent of the visible OUTER ground surface outside the clean sanctuary. Nearly all rice-field beds, damaged gardens and irrigation water are blackened, with connected black deposits across most of the central and southern soil. Only a few narrow worn path ribbons and small residual brown patches remain. Preserve the genuinely dark late sunset lighting: muted ochre/umber light from upper right on buildings and solid forms; broad corrupted ground remains clearly BLACK, not copper-brown.
Preserve all existing inert non-graphic monster remains at their existing relative places and background scale: rats, grasshoppers, spiral-shell snails and dark segmented caterpillars. Retain their clear silhouettes with subtle contact shadows against the black ground. Do not add or remove remains, no blood or gore.
```

