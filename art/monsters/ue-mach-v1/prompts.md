# Bộ prompt quái Uế Mạch v1

Chế độ: công cụ imagegen tích hợp (built-in). Ngày: 2026-10-08. Atlas PNG giữ alpha gốc; game chỉ tách các khung hình, không vẽ lại ảnh. Các bản thử có chữ hoặc cảnh nền đã bị loại.

## Danh mục nguồn giao cuối

Các nguồn trong phần thử và chỉnh bố cục bên dưới ghi lại quá trình tạo ảnh. Bảng này xác định đúng bảy file cuối được tích hợp.

| Loài | File nguồn cuối | File trong dự án |
| --- | --- | --- |
| flat-fur-rat | C:\Users\Personal\.codex\generated_images\01a11971-aad7-7021-aa5d-5c1ce96543c4\exec-6231526e-9afb-42d2-b046-7bd2147f35bf.png | public/assets/monsters/ue-mach-v1/flat-fur-rat-sheet.png |
| grasshopper | C:\Users\Personal\.codex\generated_images\01a11971-aad7-7021-aa5d-5c1ce96543c4\exec-a8514327-119f-4293-95f2-ae69244a597f.png | public/assets/monsters/ue-mach-v1/grasshopper-sheet.png |
| crop-snail | C:\Users\Personal\.codex\generated_images\01a11971-aad7-7021-aa5d-5c1ce96543c4\exec-f684c5fd-c6a3-4270-8d13-685d987ef8ec.png | public/assets/monsters/ue-mach-v1/crop-snail-sheet.png |
| caterpillar | C:\Users\Personal\.codex\generated_images\01a11971-aad7-7021-aa5d-5c1ce96543c4\exec-f4d60394-619b-4035-8bf2-87cd0d157724.png | public/assets/monsters/ue-mach-v1/caterpillar-sheet.png |
| black-caterpillar | C:\Users\Personal\.codex\generated_images\01a11971-aad7-7021-aa5d-5c1ce96543c4\exec-f77598ee-c045-4ba5-abf7-be7f81300bbf.png | public/assets/monsters/ue-mach-v1/black-caterpillar-sheet.png |
| mutant-caterpillar | C:\Users\Personal\.codex\generated_images\01a11971-aad7-7021-aa5d-5c1ce96543c4\exec-8b17734d-7341-4580-981b-91c9b7453a39.png | public/assets/monsters/ue-mach-v1/mutant-caterpillar-sheet.png |
| boss-spiked-shell-beast | C:\Users\Personal\.codex\generated_images\01a11971-aad7-7021-aa5d-5c1ce96543c4\exec-9cb882fd-285f-4046-b44b-f9efb3600cd9.png | public/assets/monsters/ue-mach-v1/boss-spiked-shell-beast-sheet.png |


## Chỉnh bố cục cuối cùng

### Boss — bố cục đã kiểm tra cuối

Nguồn cuối: C:\Users\Personal\.codex\generated_images\01a11971-aad7-7021-aa5d-5c1ce96543c4\exec-9cb882fd-285f-4046-b44b-f9efb3600cd9.png

```text
Use case: precise-object-edit. Keep this exact boss design and its six existing poses. Create a production transparent sprite atlas with MUCH SMALLER CUTOUTS and MUCH MORE EMPTY SPACE. Canvas 1536x1024, six tiny full-body thumbnails, each only 280 pixels wide and at most 320 pixels tall. Centers at (256,256), (768,256), (1280,256), (256,768), (768,768), (1280,768). Each creature fully inside the central 320x320 region of its 512x512 cell. There must be at least 96 pixels of COMPLETELY TRANSPARENT padding on all four sides of EACH cell. Preserve idle, digging, emerging, jumping, lunging and curled rolling poses in that order. Preserve rat head, realistic fur, spiral snail shell and cracked ochre plates. Only six isolated small creature cutouts on transparent background. No labels, floor, lighting backgrounds, cast shadows or effects. The most important correction is SHRINK each boss to about HALF of its previous size. Do not fill the canvas with large illustrations.
```


### flat-fur-rat

File nguồn cuối: C:\Users\Personal\.codex\generated_images\01a11971-aad7-7021-aa5d-5c1ce96543c4\exec-6231526e-9afb-42d2-b046-7bd2147f35bf.png

```text
Use case: precise-object-edit. Edit this production sprite atlas. Preserve the exact creature design, material style, poses, and normal/elite differences. Fix ONLY layout and padding. Make a 1536x1024 transparent PNG with exactly SIX isolated creatures in an exact 3-column 2-row grid of 512x512 cells. Reduce EACH individual creature to fit fully inside the central 350x350 region of its own cell, leaving at least 80 pixels of fully transparent space on ALL four sides of every cell. No part of any creature touches a cell boundary. Keep all facing RIGHT. No overlap. Top row idle, windup, attack; bottom row elite idle, windup, attack.  Background must be fully transparent, no floor, shadows, labels, scenery, effects, or background glow. Only the six creature cutouts, each smaller with ample empty space. Do not add labels or draw the grid.
```

### grasshopper

File nguồn cuối: C:\Users\Personal\.codex\generated_images\01a11971-aad7-7021-aa5d-5c1ce96543c4\exec-a8514327-119f-4293-95f2-ae69244a597f.png

```text
Use case: precise-object-edit. Edit this production sprite atlas. Preserve the exact creature design, material style, poses, and normal/elite differences. Fix ONLY layout and padding. Make a 1536x1024 transparent PNG with exactly SIX isolated creatures in an exact 3-column 2-row grid of 512x512 cells. Reduce EACH individual creature to fit fully inside the central 350x350 region of its own cell, leaving at least 80 pixels of fully transparent space on ALL four sides of every cell. No part of any creature touches a cell boundary. Keep all facing RIGHT. No overlap. Top row idle, windup, attack; bottom row elite idle, windup, attack.  Background must be fully transparent, no floor, shadows, labels, scenery, effects, or background glow. Only the six creature cutouts, each smaller with ample empty space. Do not add labels or draw the grid.
```

### crop-snail

File nguồn cuối: C:\Users\Personal\.codex\generated_images\01a11971-aad7-7021-aa5d-5c1ce96543c4\exec-f684c5fd-c6a3-4270-8d13-685d987ef8ec.png

```text
Use case: precise-object-edit. Edit this production sprite atlas. Preserve the exact creature design, material style, poses, and normal/elite differences. Fix ONLY layout and padding. Make a 1536x1024 transparent PNG with exactly SIX isolated creatures in an exact 3-column 2-row grid of 512x512 cells. Reduce EACH individual creature to fit fully inside the central 350x350 region of its own cell, leaving at least 80 pixels of fully transparent space on ALL four sides of every cell. No part of any creature touches a cell boundary. Keep all facing RIGHT. No overlap. Top row idle, windup, attack; bottom row elite idle, windup, attack.  Background must be fully transparent, no floor, shadows, labels, scenery, effects, or background glow. Only the six creature cutouts, each smaller with ample empty space. Do not add labels or draw the grid.
```

### caterpillar

File nguồn cuối: C:\Users\Personal\.codex\generated_images\01a11971-aad7-7021-aa5d-5c1ce96543c4\exec-f4d60394-619b-4035-8bf2-87cd0d157724.png

```text
Use case: precise-object-edit. Edit this production sprite atlas. Preserve the exact creature design, material style, poses, and normal/elite differences. Fix ONLY layout and padding. Make a 1536x1024 transparent PNG with exactly SIX isolated creatures in an exact 3-column 2-row grid of 512x512 cells. Reduce EACH individual creature to fit fully inside the central 350x350 region of its own cell, leaving at least 80 pixels of fully transparent space on ALL four sides of every cell. No part of any creature touches a cell boundary. Keep all facing RIGHT. No overlap. Top row idle, windup, attack; bottom row elite idle, windup, attack.  Background must be fully transparent, no floor, shadows, labels, scenery, effects, or background glow. Only the six creature cutouts, each smaller with ample empty space. Do not add labels or draw the grid.
```

### black-caterpillar

File nguồn cuối: C:\Users\Personal\.codex\generated_images\01a11971-aad7-7021-aa5d-5c1ce96543c4\exec-f77598ee-c045-4ba5-abf7-be7f81300bbf.png

```text
Use case: precise-object-edit. Edit this production sprite atlas. Preserve the exact creature design, material style, poses, and normal/elite differences. Fix ONLY layout and padding. Make a 1536x1024 transparent PNG with exactly SIX isolated creatures in an exact 3-column 2-row grid of 512x512 cells. Reduce EACH individual creature to fit fully inside the central 350x350 region of its own cell, leaving at least 80 pixels of fully transparent space on ALL four sides of every cell. No part of any creature touches a cell boundary. Keep all facing RIGHT. No overlap. Top row idle, windup, attack; bottom row elite idle, windup, attack.  Background must be fully transparent, no floor, shadows, labels, scenery, effects, or background glow. Only the six creature cutouts, each smaller with ample empty space. Do not add labels or draw the grid.
```

### mutant-caterpillar

File nguồn cuối: C:\Users\Personal\.codex\generated_images\01a11971-aad7-7021-aa5d-5c1ce96543c4\exec-8b17734d-7341-4580-981b-91c9b7453a39.png

```text
Use case: precise-object-edit. Edit this production sprite atlas. Preserve the exact creature design, material style, poses, and normal/elite differences. Fix ONLY layout and padding. Make a 1536x1024 transparent PNG with exactly SIX isolated creatures in an exact 3-column 2-row grid of 512x512 cells. Reduce EACH individual creature to fit fully inside the central 350x350 region of its own cell, leaving at least 80 pixels of fully transparent space on ALL four sides of every cell. No part of any creature touches a cell boundary. Keep all facing RIGHT. No overlap. Top row idle, windup, attack; bottom row elite idle, windup, attack.  Background must be fully transparent, no floor, shadows, labels, scenery, effects, or background glow. Only the six creature cutouts, each smaller with ample empty space. Do not add labels or draw the grid.
```

### boss-spiked-shell-beast

File nguồn cuối: C:\Users\Personal\.codex\generated_images\01a11971-aad7-7021-aa5d-5c1ce96543c4\exec-85229b0e-284d-44be-9f6b-9626d255620e.png

```text
Use case: precise-object-edit. Edit this production sprite atlas. Preserve the exact creature design, material style, poses, and normal/elite differences. Fix ONLY layout and padding. Make a 1536x1024 transparent PNG with exactly SIX isolated creatures in an exact 3-column 2-row grid of 512x512 cells. Reduce EACH individual creature to fit fully inside the central 350x350 region of its own cell, leaving at least 80 pixels of fully transparent space on ALL four sides of every cell. No part of any creature touches a cell boundary. Keep all facing RIGHT. No overlap. Top row idle, windup, attack; bottom row elite idle, windup, attack. For this boss preserve the six existing poses: idle, dig, emerge, jump, lunge, roll; no elite row. Background must be fully transparent, no floor, shadows, labels, scenery, effects, or background glow. Only the six creature cutouts, each smaller with ample empty space. Do not add labels or draw the grid.
```


## flat-fur-rat

Nguồn đã chọn: C:\Users\Personal\.codex\generated_images\01a11971-aad7-7021-aa5d-5c1ce96543c4\exec-a17d827f-ca39-4bb4-99da-be648258f5a5.png

```text
Use case: style-transfer. Asset type: production game creature sprite atlas for Vietnamese village dark-fantasy Ue Mach corruption. Image 1 is the creature redesign target and species reference. Image 2 is ONLY the grounded material/rendering reference of the village map, do not copy any scenery. Rebuild the creature rather than preserve the old cartoon style.
Make ONE transparent PNG sprite sheet with EXACTLY six isolated full-body sprites in a precise 3-column by 2-row equal square-cell grid, preferably 1536x1024. Top row ordinary creature, bottom row stronger elite of the same species. Column 1 neutral grounded idle, column 2 clearly coiled windup, column 3 attack release pose. Identical 3/4 elevated game camera, all six face screen RIGHT, same proportions and physical scale across columns. Feet and ground contact align within each equal cell. Each whole silhouette contained within its cell with ample 12% transparent padding and no overlap. No backdrop, floor, cast shadow, labels, text, grid lines or borders. No projectiles, spell swirls, ground effects, flying debris or particles baked into any cell.
Style: grounded high-quality painterly realism coherent with the map, believable anatomy and restrained broad material shapes that read at 72-100 game pixels, soft controlled edge lighting, natural brown ochre gray and charcoal with a few pale bone/chitin edges. Ue corruption is tar-black organic staining, rootlike strands and dull tissue changes, not futuristic armor. Ordinary rank retains mostly natural species anatomy; elite rank adds cracked organic plates and more connected ink-black corruption but remains recognizable. Do not make the whole creature jet-black; preserve readable midtones and pale edges. Avoid cartoon outlines, neon colors, glowing rims, human features, gore, glitter, tiny speckle noise, excessive bristles, extra limbs and decorative weapons. Truly transparent alpha background.
SPECIES: Vietnamese field rat, compact coarse muddy brown fur clumped by wet tar, ragged round ears, short ivory incisors, dark amber bead eyes. Tail curls tightly along rear flank within compact silhouette so the body stays large in the game. Ordinary retains living natural rat proportions; elite has a low armored shoulder hump with root-like tar seams, broad strong jaw, restrained ivory teeth. Windup hunkers down with hind legs loaded, attack short forward leap with foreclaws and mouth toward screen right, no long flying trail.
```

## crop-snail

Nguồn đã chọn: C:\Users\Personal\.codex\generated_images\01a11971-aad7-7021-aa5d-5c1ce96543c4\exec-0924fd2a-048a-4fe9-bcbe-463cf106da8c.png

```text
Use case: style-transfer. Asset type: production game creature sprite atlas for Vietnamese village dark-fantasy Ue Mach corruption. Image 1 is the creature redesign target and species reference. Image 2 is ONLY the grounded material/rendering reference of the village map, do not copy any scenery. Rebuild the creature rather than preserve the old cartoon style.
Make ONE transparent PNG sprite sheet with EXACTLY six isolated full-body sprites in a precise 3-column by 2-row equal square-cell grid, preferably 1536x1024. Top row ordinary creature, bottom row stronger elite of the same species. Column 1 neutral grounded idle, column 2 clearly coiled windup, column 3 attack release pose. Identical 3/4 elevated game camera, all six face screen RIGHT, same proportions and physical scale across columns. Feet and ground contact align within each equal cell. Each whole silhouette contained within its cell with ample 12% transparent padding and no overlap. No backdrop, floor, cast shadow, labels, text, grid lines or borders. No projectiles, spell swirls, ground effects, flying debris or particles baked into any cell.
Style: grounded high-quality painterly realism coherent with the map, believable anatomy and restrained broad material shapes that read at 72-100 game pixels, soft controlled edge lighting, natural brown ochre gray and charcoal with a few pale bone/chitin edges. Ue corruption is tar-black organic staining, rootlike strands and dull tissue changes, not futuristic armor. Ordinary rank retains mostly natural species anatomy; elite rank adds cracked organic plates and more connected ink-black corruption but remains recognizable. Do not make the whole creature jet-black; preserve readable midtones and pale edges. Avoid cartoon outlines, neon colors, glowing rims, human features, gore, glitter, tiny speckle noise, excessive bristles, extra limbs and decorative weapons. Truly transparent alpha background.
SPECIES: Natural crop snail, large weathered spiral brown shell with muddy cracks and restrained tar veining, low heavy gray-olive wet muscular foot, short natural tentacles with tiny bead eyes, no cartoon eyelids or human expression. Elite shell grows thicker chipped overlapping mineral-organic plates with root strands and muted oxidized teal seams, broad dark throat sac. Idle head forward low, windup contracts throat and lifts front foot, attack extends neck forward right and opens small natural mouth to spit, but do not draw the spit projectile.
```

## grasshopper

Nguồn đã chọn: C:\Users\Personal\.codex\generated_images\01a11971-aad7-7021-aa5d-5c1ce96543c4\exec-3ba36519-5c84-4886-9c27-a2c16fc2134f.png

```text
Use case: stylized-concept. Production TRANSPARENT game sprite sheet, 1536x1024. EXACTLY SIX full-body creature cutouts in 3 columns and 2 rows. Equal 512x512 cells. Top row normal: idle, windup, attack. Bottom row elite: idle, windup, attack. Each centered in its own cell, generous transparent padding, facing RIGHT in identical slightly elevated three-quarter camera. Rice-field grasshopper, six anatomically plausible legs, dry ochre olive chitin and folded wings. Elite has bark-like shin armor, charcoal stains, longer angular hind legs. Windup crouches low, release is a short leap with wings half open. Grounded painterly realistic material, muted earth tones, readable at 80 pixels, clean broad shapes, restrained detail. Only the six creatures. Completely transparent background. Absolutely NO scenery, NO floor, NO text, NO labels, NO grid, NO lighting backdrop, NO projectiles, NO particles, NO cast shadows. This is a sprite atlas, not a concept presentation.
```

## caterpillar

Nguồn đã chọn: C:\Users\Personal\.codex\generated_images\01a11971-aad7-7021-aa5d-5c1ce96543c4\exec-6cf57518-3f01-4606-a8a4-849bdee1c5fb.png

```text
Use case: stylized-concept. Production TRANSPARENT game sprite sheet, 1536x1024. EXACTLY SIX full-body creature cutouts in 3 columns and 2 rows. Equal 512x512 cells. Top row normal: idle, windup, attack. Bottom row elite: idle, windup, attack. Each centered in its own cell, generous transparent padding, facing RIGHT in identical slightly elevated three-quarter camera. Compact gray-olive caterpillar with six tiny prolegs and sparse rust-brown thorn bristles. Elite has cracked bark collars and longer pale thorn tips. Windup arches back and raises bristles, release snaps head forward. Grounded painterly realistic material, muted earth tones, readable at 80 pixels, clean broad shapes, restrained detail. Only the six creatures. Completely transparent background. Absolutely NO scenery, NO floor, NO text, NO labels, NO grid, NO lighting backdrop, NO projectiles, NO particles, NO cast shadows. This is a sprite atlas, not a concept presentation.
```

## black-caterpillar

Nguồn đã chọn: C:\Users\Personal\.codex\generated_images\01a11971-aad7-7021-aa5d-5c1ce96543c4\exec-412e6a67-9b74-494c-8fa2-9e1b44705b61.png

```text
Use case: stylized-concept. Production TRANSPARENT game sprite sheet, 1536x1024. EXACTLY SIX full-body creature cutouts in 3 columns and 2 rows. Equal 512x512 cells. Top row normal: idle, windup, attack. Bottom row elite: idle, windup, attack. Each centered in its own cell, generous transparent padding, facing RIGHT in identical slightly elevated three-quarter camera. Charcoal caterpillar, dull violet segment seams, sparse ivory quills. Elite has larger organized quill fan and cracked organic plates. Windup raises quill fans, release bends head forward. Grounded painterly realistic material, muted earth tones, readable at 80 pixels, clean broad shapes, restrained detail. Only the six creatures. Completely transparent background. Absolutely NO scenery, NO floor, NO text, NO labels, NO grid, NO lighting backdrop, NO projectiles, NO particles, NO cast shadows. This is a sprite atlas, not a concept presentation.
```

## mutant-caterpillar

Nguồn đã chọn: C:\Users\Personal\.codex\generated_images\01a11971-aad7-7021-aa5d-5c1ce96543c4\exec-43d24674-5cb2-41bd-8d51-12d0af0bc7db.png

```text
Use case: stylized-concept. Production TRANSPARENT game sprite sheet, 1536x1024. EXACTLY SIX full-body creature cutouts in 3 columns and 2 rows. Equal 512x512 cells. Top row normal: idle, windup, attack. Bottom row elite: idle, windup, attack. Each centered in its own cell, generous transparent padding, facing RIGHT in identical slightly elevated three-quarter camera. Rust-brown segmented caterpillar with black tar sacs on its back. Elite has more connected tar sacs and cracked ochre collars. Natural insect head, no human face. Windup contracts sacs, release extends throat right to vent. Grounded painterly realistic material, muted earth tones, readable at 80 pixels, clean broad shapes, restrained detail. Only the six creatures. Completely transparent background. Absolutely NO scenery, NO floor, NO text, NO labels, NO grid, NO lighting backdrop, NO projectiles, NO particles, NO cast shadows. This is a sprite atlas, not a concept presentation.
```

## boss-spiked-shell-beast

Nguồn đã chọn: C:\Users\Personal\.codex\generated_images\01a11971-aad7-7021-aa5d-5c1ce96543c4\exec-571a4fae-13d9-408c-8f78-b7139862bd89.png

```text
Use case: style-transfer. Asset type: transparent production boss sprite atlas for the same Vietnamese village Ue Mach game. Image 1 is the existing Giap Tai Uong boss redesign target and anatomy/pose reference; Image 2 is ONLY grounded map material style. Redesign this boss into a believable corrupted earth-burrowing field-creature chimera: a squat heavy rat-like head and powerful clawed forelimbs under a huge weathered spiral snail-shell carapace. Cracked shell plates, damp brown fur, earth and mineral stains, tar-black branching root seams, a few pale ivory claw tips and chipped ochre shell ridges; small low amber eyes. Retain the concept of rat plus spiral armored shell, not a humanoid demon. No neon green slime, red glowing spikes, giant cute cartoon eyes or modern armor. Make the boss imposing through broad mass and cracked material, not particle noise.
ONE transparent PNG sheet, EXACTLY six full-body isolated poses in a precise 3-column by 2-row equal square-cell grid, preferably 1536x1024. All face screen RIGHT at the same 3/4 elevated isometric game camera and comparable mass/size. TOP row: column1 grounded idle low guard; column2 digging windup with head lowered and foreclaws pushing down; column3 emerging with head and front body raised, all limbs visible. BOTTOM row: column1 short airborne leap with forelimbs raised and shell weight over rear; column2 aggressively pushing/lunging forward right with foreclaws low; column3 coiled spherical defensive roll, head tucked partly into shell with face still visible, suitable for the final self-detonation warning. Do not actually show the explosion.
Each whole silhouette contained within its own equal cell, generous 12% transparent margin. No overlap, no ground, cast shadows, dust cloud, separate rubble, motion trails, swirls, effects, UI, labels, text, numbers, borders or grid. Keep all contact/collision material on the creature itself. Natural muted brown/ochre/gray/charcoal, midtone fur and pale chitin edges readable on dark earth at 170 pixels. Grounded painterly realism matching the map, quiet coherent textures, no speckled grain, no gore. Genuine transparent alpha background.
```

