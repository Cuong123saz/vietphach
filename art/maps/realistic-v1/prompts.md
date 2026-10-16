# Realistic Kháng Chiến map prompts — 2026-10-08

Generated with the built-in ImageGen tool. Existing maps are edit targets; Map 1's new image is the material/style reference for Maps 2–4. Original assets are retained. Resolution requests in prompts are preferences, not measured output dimensions; see the map asset README for actual dimensions.

## Map 1 — village-area-1-realistic-v4.png

### Material re-render

```text
Use case: style-transfer
Asset type: final in-game Vietnamese village background, Map 1 of 4.
Input image 1: EDIT TARGET and strict spatial layout reference.
Primary request: Re-render this exact map as a realistic, clean, highly detailed Vietnamese rural environment. Replace the cartoon paint treatment and busy grain-like texture with convincingly real materials and coherent daylight. This is a production game map, not a concept thumbnail.
Composition: Preserve the entire fixed high-angle orthographic three-quarter overhead camera, exact framing, edge-to-edge terrain, aspect ratio about 11:7, all landmark footprints and their relative positions. Preserve the banyan sanctuary near upper right of centre, its roots and stone shrine ring, red clay tile courtyard houses at upper right, rice paddies to left and lower edge, diagonal canal and all bridges, right pond shelter, fenced vegetable plots, bamboo clumps and straw huts. Preserve broad playable roads and courtyard openings. No horizon or sky.
Style: Photorealistic environment render with natural grounded proportions, physically plausible diffuse and specular materials, nuanced ambient occlusion and unified soft directional sunlight. Real earth, wood, fired clay, stone, leaves and water; no illustration outlines.
Materials: Roads have quiet compacted earth and worn stone patches, a few purposeful cracks and shallow impressions rather than an everywhere pebble pattern. Tile roofs have natural rough fired clay and gentle age variation; reeds and straw have cohesive bundles; wood bridges show structural planks and restrained grain; tree roots have solid bark and weight; rice plants grow in readable rows with believable leaf shapes; water has subdued reflections, depth and a few ripples. Keep foliage in coherent leaf masses, avoid bright dots around every leaf and stone.
Lighting/color: Calm natural daytime, soft consistent sunlight, realistic restrained green and earthy warm color. Avoid neon yellow-green, excessive HDR and glossy ground.
Detail hierarchy: Large forms must read clearly first; add authentic material detail at close zoom without making every pixel equally busy. Cleaner paths and quiet midtones between detail clusters. Remove salt-and-pepper speckle, film grain, sharpening halos, glittering stones and stippled brush texture. Do not merely blur or upscale the old drawing.
Constraints: Retain exact layout and landmark placement; no new buildings, paths, characters, creatures, extra decoration, labels, text, UI, border or watermark. Do not crop or zoom. Output one full map, preferably 3140 x 2000 pixels, landscape about 11:7.
```

## Map 2 — village-area-1-ruined-realistic-v2.png

### Material re-render

```text
Use case: style-transfer
Asset type: finished in-game Vietnamese village background, one of four matching maps.
Input image 1: EDIT TARGET, authoritative geometry, layout, destruction state and camera.
Input image 2: STYLE REFERENCE ONLY, the new realistic Map 1. Match its clean real materials, believable solid geometry, grounded colors, natural leaf clusters and restrained texture. Do not copy its healthy farms into the damaged map.
Primary request: Re-render image 1 in the realistic material treatment of image 2, removing the old illustrated outlines and visual noise. A credible photorealistic environment render with physically plausible earth, fired clay tiles, stone, timber, vegetation and water. Detail means specific real forms and material variation, not random speckles.
Composition/invariants: Preserve the exact full-map framing, fixed high-angle orthographic three-quarter overhead camera and original landscape aspect. Preserve all major landmark footprints and relative positions: ancient banyan and shrine ring just upper-right of centre, intact red-tile courtyard houses and entrance on upper right, rice paddies on left and bottom, diagonal canals, every existing bridge, right pond pavilion, huts, fenced garden plots, bamboo and road junctions. Keep the ancient banyan sanctuary and nearby tile-roof residential enclave intact. Roads must keep their original widths and route. No camera movement, crop, horizon or sky.
Materials/detail hierarchy: Real coherent tree bark and substantial roots; subtly irregular roof tiles, believable timber frames and straw bundles; calm large soil and stone surface patches, shallow cracks and mud channels; coherent dull water reflections and bank geometry. Solid large forms first, readable medium forms next, restrained fine details. Consolidate overly dense twig and rubble patterns into plausible small clusters within existing damaged footprints. Paths need quieter midtone surfaces and clear readable edges. Preserve visible destruction without filling every inch with similar debris.
Avoid: grain, salt-and-pepper dots, stippling, crunchy oversharpening, halos, repeated tiny white rocks everywhere, glittering splinters, violet sparkle, heavy black illustration outlines, cartoon materials, excessive HDR, plastic sheen. Do not solve noise by smearing away geometry.
Constraints: No new buildings, road routes, props, people, live creatures, text, labels, UI, borders or watermark. Do not rebuild destroyed peripheral huts or trees. Output one full finished map; preferably around 3140 x 2000 pixels with original full-map aspect ratio.
Map 2 scene state: The same village after devastation, under soft grey overcast daylight. Peripheral thatched huts have collapsed, timber frames and fences are broken, fields are flattened or dead, peripheral trees are snapped and leafless, irrigation water is murky. Preserve recognizable destruction locations and the sheltered living green banyan and intact houses. Render collapsed beams with clear weight and contact shadows, a few readable broken roof and reed bundles instead of thousands of bright thin sticks. Mud and standing water have subdued diffuse lighting, realistic desaturated earth and grey-blue water. No black supernatural corruption yet. The protected enclave uses the same overcast sky lighting as the rest, with restrained green foliage and earthy tile color, not artificial glowing sunshine.
```

## Map 3 — village-area-1-apocalypse-realistic-v2.png

### Material re-render

```text
Use case: style-transfer
Asset type: finished in-game Vietnamese village background, one of four matching maps.
Input image 1: EDIT TARGET, authoritative geometry, layout, destruction state and camera.
Input image 2: STYLE REFERENCE ONLY, the new realistic Map 1. Match its clean real materials, believable solid geometry, grounded colors, natural leaf clusters and restrained texture. Do not copy its healthy farms into the damaged map.
Primary request: Re-render image 1 in the realistic material treatment of image 2, removing the old illustrated outlines and visual noise. A credible photorealistic environment render with physically plausible earth, fired clay tiles, stone, timber, vegetation and water. Detail means specific real forms and material variation, not random speckles.
Composition/invariants: Preserve the exact full-map framing, fixed high-angle orthographic three-quarter overhead camera and original landscape aspect. Preserve all major landmark footprints and relative positions: ancient banyan and shrine ring just upper-right of centre, intact red-tile courtyard houses and entrance on upper right, rice paddies on left and bottom, diagonal canals, every existing bridge, right pond pavilion, huts, fenced garden plots, bamboo and road junctions. Keep the ancient banyan sanctuary and nearby tile-roof residential enclave intact. Roads must keep their original widths and route. No camera movement, crop, horizon or sky.
Materials/detail hierarchy: Real coherent tree bark and substantial roots; subtly irregular roof tiles, believable timber frames and straw bundles; calm large soil and stone surface patches, shallow cracks and mud channels; coherent dull water reflections and bank geometry. Solid large forms first, readable medium forms next, restrained fine details. Consolidate overly dense twig and rubble patterns into plausible small clusters within existing damaged footprints. Paths need quieter midtone surfaces and clear readable edges. Preserve visible destruction without filling every inch with similar debris.
Avoid: grain, salt-and-pepper dots, stippling, crunchy oversharpening, halos, repeated tiny white rocks everywhere, glittering splinters, violet sparkle, heavy black illustration outlines, cartoon materials, excessive HDR, plastic sheen. Do not solve noise by smearing away geometry.
Constraints: No new buildings, road routes, props, people, live creatures, text, labels, UI, borders or watermark. Do not rebuild destroyed peripheral huts or trees. Output one full finished map; preferably around 3140 x 2000 pixels with original full-map aspect ratio.
Map 3 scene state: The ruined village during approaching apocalypse, under cold dim storm illumination. Preserve the extensive dark oily corruption on soil, fields and canal banks, using large coherent charcoal-black stains and heavy puddles with sparse broad soft reflections. Existing corruption branches may remain, but remove glittering blue-purple micro-highlights and dense bright thread patterns. Keep the destroyed huts, dead peripheral fields and trees, all bridges and banks readable. Wet materials must be physically plausible: matte soot-like soil, satin dark sludge, dull wet timber and subdued canal reflections. The living ancient banyan and tile-roof residential refuge remain intact and less corrupted, with gently warmer natural tones but coherent storm lighting. Maintain enough shadow detail and separation to read playable paths; do not make the whole scene black or flat. No sunset or corpses in this map.
```

### Final ground and corruption cleanup

```text
Use case: precise-object-edit
Asset type: final realistic in-game Vietnamese village map.
Input image 1: edit target. Keep its camera, exact full-map framing, every building footprint, canal, bridge, rice-field boundary, garden boundary, ancient banyan shrine, and all broad paths and their widths unchanged.
Primary request: One focused material and noise cleanup pass. This still looks too busy because the ground and black corruption are covered by thousands of little bright marks. Replace that fine surface pattern with quieter photorealistic soil, soot, mud and dark sludge. Preserve real structural detail such as tile geometry, roots, planks and collapsed beams.
Ground cleanup: Remove about 80 percent of tiny isolated pale stone dots, glittering splinter highlights and hairline silvery marks from road and field surfaces. Use medium and large natural muted brown soil patches, a few shallow footprints/ruts and sparse purposeful stones; no evenly speckled pebble carpet. Black corruption should read as wide heavy dark organic pools and patches with gently rolled edges and only a few broad dim reflections. Remove the cobweb-like silver/violet network of tiny bright cracks. It should feel heavy, dirty and natural, never sparkling.
Realism: Photorealistic grounded environment materials, smooth noise-free shading, broad diffuse highlights, real ambient contact shadows, restrained saturation, no hard black cartoon contour, no plastic gloss. Do not blur whole image. Crisp architectural and wooden structure edges, quiet ground midtones.
Invariants: Preserve the green living banyan and intact residential sanctuary, destroyed peripheral huts and fields, rubble location clusters, all map framing and landmark positions. Do not add new terrain, roads, buildings, people, creatures, UI, text, borders or watermark. No cropping, zooming, sky or horizon. Output one complete map in the source aspect ratio.
Lighting state: Cold dim storm daylight with readable neutral shadows. Preserve the dark apocalypse atmosphere and absence of corpses. Keep the protected houses and living tree intact, with the same coherent overcast lighting; no sunset or sunny enclave.
```

## Map 4 — village-area-1-final-dusk-realistic-v2.png

### Material re-render

```text
Use case: style-transfer
Asset type: finished in-game Vietnamese village background, one of four matching maps.
Input image 1: EDIT TARGET, authoritative geometry, layout, destruction state and camera.
Input image 2: STYLE REFERENCE ONLY, the new realistic Map 1. Match its clean real materials, believable solid geometry, grounded colors, natural leaf clusters and restrained texture. Do not copy its healthy farms into the damaged map.
Primary request: Re-render image 1 in the realistic material treatment of image 2, removing the old illustrated outlines and visual noise. A credible photorealistic environment render with physically plausible earth, fired clay tiles, stone, timber, vegetation and water. Detail means specific real forms and material variation, not random speckles.
Composition/invariants: Preserve the exact full-map framing, fixed high-angle orthographic three-quarter overhead camera and original landscape aspect. Preserve all major landmark footprints and relative positions: ancient banyan and shrine ring just upper-right of centre, intact red-tile courtyard houses and entrance on upper right, rice paddies on left and bottom, diagonal canals, every existing bridge, right pond pavilion, huts, fenced garden plots, bamboo and road junctions. Keep the ancient banyan sanctuary and nearby tile-roof residential enclave intact. Roads must keep their original widths and route. No camera movement, crop, horizon or sky.
Materials/detail hierarchy: Real coherent tree bark and substantial roots; subtly irregular roof tiles, believable timber frames and straw bundles; calm large soil and stone surface patches, shallow cracks and mud channels; coherent dull water reflections and bank geometry. Solid large forms first, readable medium forms next, restrained fine details. Consolidate overly dense twig and rubble patterns into plausible small clusters within existing damaged footprints. Paths need quieter midtone surfaces and clear readable edges. Preserve visible destruction without filling every inch with similar debris.
Avoid: grain, salt-and-pepper dots, stippling, crunchy oversharpening, halos, repeated tiny white rocks everywhere, glittering splinters, violet sparkle, heavy black illustration outlines, cartoon materials, excessive HDR, plastic sheen. Do not solve noise by smearing away geometry.
Constraints: No new buildings, road routes, props, people, live creatures, text, labels, UI, borders or watermark. Do not rebuild destroyed peripheral huts or trees. Output one full finished map; preferably around 3140 x 2000 pixels with original full-map aspect ratio.
Map 4 scene state: The aftermath in genuinely dark late sunset, warm muted ochre and umber light from the upper-right side, physically coherent long soft shadows and neutral cool shaded areas. Preserve the black ground corruption, destroyed peripheral village, intact ancient banyan and nearby houses. Preserve the existing scattered inert monster remains and their species silhouettes, relative positions and small background scale: rat-like rodents, grasshoppers, spiral-shell snails, dark segmented caterpillars. They are non-graphic painted environment remains lying motionless on the ground, not live attacking creatures; no blood, gore, smoke particles or newly added species. Give their shells, fur and carapaces subdued realistic material response and natural contact shadows. Corpses and rubble should read as a few definite forms instead of visual confetti. Corruption has broad dark stains and controlled soft reflections; no tiny glowing veins or violet sparkles. Preserve readable path shapes and separation from debris despite the late hour. No bright daylight and no sky.
```

### Final ground and corruption cleanup

```text
Use case: precise-object-edit
Asset type: final realistic in-game Vietnamese village map.
Input image 1: edit target. Keep its camera, exact full-map framing, every building footprint, canal, bridge, rice-field boundary, garden boundary, ancient banyan shrine, and all broad paths and their widths unchanged.
Primary request: One focused material and noise cleanup pass. This still looks too busy because the ground and black corruption are covered by thousands of little bright marks. Replace that fine surface pattern with quieter photorealistic soil, soot, mud and dark sludge. Preserve real structural detail such as tile geometry, roots, planks and collapsed beams.
Ground cleanup: Remove about 80 percent of tiny isolated pale stone dots, glittering splinter highlights and hairline silvery marks from road and field surfaces. Use medium and large natural muted brown soil patches, a few shallow footprints/ruts and sparse purposeful stones; no evenly speckled pebble carpet. Black corruption should read as wide heavy dark organic pools and patches with gently rolled edges and only a few broad dim reflections. Remove the cobweb-like silver/violet network of tiny bright cracks. It should feel heavy, dirty and natural, never sparkling.
Realism: Photorealistic grounded environment materials, smooth noise-free shading, broad diffuse highlights, real ambient contact shadows, restrained saturation, no hard black cartoon contour, no plastic gloss. Do not blur whole image. Crisp architectural and wooden structure edges, quiet ground midtones.
Invariants: Preserve the green living banyan and intact residential sanctuary, destroyed peripheral huts and fields, rubble location clusters, all map framing and landmark positions. Do not add new terrain, roads, buildings, people, creatures, UI, text, borders or watermark. No cropping, zooming, sky or horizon. Output one complete map in the source aspect ratio.
Lighting state: Keep dark late sunset, warm muted ochre-umber sunlight from upper right, realistic long soft shadows and neutral shaded areas. Keep every existing inert non-graphic rat, grasshopper, spiral-shell snail and segmented caterpillar remain at the same relative place and background scale. Give them physically believable subdued material and contact shadows; no blood, gore or live movement. No brighter daylight.
```

