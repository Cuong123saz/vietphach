# Kiêu Ngạo — nguồn ảnh và prompt v1

## Nguồn giao cuối sau kiểm tra padding

- Mộc Lộc: `C:\Users\Personal\.codex\generated_images\01a11971-aad7-7021-aa5d-5c1ce96543c4\exec-1b3eb1ae-02c9-4c45-9638-1c8f7fef8447.png`.
- Sáu tư thế nhân vật: `C:\Users\Personal\.codex\generated_images\01a11971-aad7-7021-aa5d-5c1ce96543c4\exec-a669b856-4404-4775-bbc8-42c025a9fa6a.png`.
- Bốn nền rừng dùng nguồn được ghi ở trên.
- Khung nhân vật dùng vùng cắt được kiểm tra theo alpha, giữ đủ tay/chân của tư thế nằm; không đổi pixel gốc.

### Prompt nhân vật

```text
Use case: stylized-concept. Asset type: ONE transparent narrative sprite atlas for Vietnamese dark-folklore 2.5D RPG. Supporting reference image is the existing playable archer: preserve her face, high brown ponytail, green leaf cloak, white trousers, ornate wooden bow. Exactly SIX isolated full-body sprite cells arranged 3 columns by 2 rows on a landscape 1536x1024 genuinely transparent canvas. No labels, no background, no props extending into other cells, no ground, no shadows or VFX. All subjects are viewed from a high oblique game camera, three-quarter facing lower-left. Every complete pose fits inside its equal cell with 50px transparent padding. Top row: (1) an adult Vietnamese hunter in plain earth-brown cloth, seated exhausted with bow across knees; (2) a different older wounded hunter in faded olive cloth, seated leaning on one hand, no gore; (3) the archer's elderly male teacher, grey hair and short grey beard, ochre tunic, kneeling weakly and reaching one hand forward, alive. Bottom row: (4) the SAME elderly male teacher reclining on his side, dead peacefully, one hand outstretched, no gore; (5) the SAME teacher upright bound inside a small compact vertical bundle of woody roots around chest and arms, tired face visible, roots isolated with no deer body; (6) the EXACT reference female archer sitting quietly on the ground, knees bent, eyes lowered in regret, bow laid within her lap, holding a single ordinary warning arrow. Semi-realistic painted game sprite materials with restrained detail, soft realistic light, muted olive, brown and ivory. Avoid smiling, heroic triumphant poses, text, cell borders, baked effects, bright neon.
```

### Chỉnh padding nhân vật

```text
Edit target: the provided narrative sprite atlas. Preserve the same six character identities, clothing, poses, order, realistic painted style and true transparent alpha. Fix ONLY cell layout and padding. Canvas 1536x1024, strict 3 columns by 2 rows; cell boundaries x=0,512,1024,1536 and y=0,512,1024. Shrink and center EACH sprite uniformly within its own cell to fit its ENTIRE silhouette with at least 45 pixels empty transparent padding at all four cell edges. In particular the bottom-left reclining elderly man must fit completely inside x=45..467, y=557..979: BOTH outstretched hand and BOTH feet need to be fully visible, reduce his entire size as necessary. Top-left hunter all bow tips must fit within x=45..467. Bottom-middle bound teacher must fit x=557..979. Bottom-right seated female archer and her bow must fit x=1069..1491. Top-middle hunter and top-right kneeling teacher likewise fully contained. No touching cell boundaries, no clipping, no cell labels, no panels, no background, no VFX, no added characters.
```

### Chỉnh padding Mộc Lộc

```text
Edit target: transparent TWO-pose deer guardian atlas. Keep EXACTLY the same Mộc Lộc deer identity, bark armor, antlers, roots in chest, colors and TWO poses, idle at left and lowered-antler charge at right. Keep landscape 1536x1024 truly transparent canvas. Fix ONLY sprite SCALE and placement so both silhouettes are isolated in their own half with generous empty space. SHRINK both full silhouettes by 30 percent from current size. Left full sprite must fit entirely inside rectangle x=90..670, y=145..880. Right full sprite must fit entirely inside rectangle x=875..1455, y=145..880. ALL antler tips, all hooves, tails and roots inside those rectangles. Equal anatomical deer size; scale charging pose as needed to fit its width. Leave the full vertical stripe x=690..850 absolutely empty transparent from y=0 to 1024. Leave 100px outer margin. No labels, no shadows, no background blocks, no additional assets. Do not redraw the deer or change its design.
```


Ngày: 2026-10-08. Chế độ: imagegen tích hợp. PNG nguồn được giữ nguyên, atlas được tách khung trong game.

## forest-edge-v1.png

Nguồn: `C:\Users\Personal\.codex\generated_images\01a11971-aad7-7021-aa5d-5c1ce96543c4\exec-fad53b11-d1ad-40a9-bd87-ab8cc85e1567.png`

```text
Use case: stylized-concept. Asset type: complete playable 2.5D RPG terrain background, landscape 1536x1024. Vietnamese dark folklore bamboo and banyan forest, realistic hand-painted materials, high oblique orthographic camera, entire terrain fills image, no horizon, no sky, no UI, no lettering, no characters, no creatures, no baked magic or particles. An open traversable earthy track connects left edge to right edge through the lower-middle third, leaving at least 55% readable walking and combat ground. Dense dark vegetation mostly at edges, large natural material shapes, low visual noise, restrained olive, ochre, slate palette, soft realistic lighting. No foreground canopy covering paths, no bright neon, no toy-like graphics. Area 1: THE FOREST EDGE. Warm muted late-afternoon sunlight. Old Vietnamese wooden watch shelter and a tiny distant village roof toward far left. A weathered banyan at upper-left, grassy clearing with packed dirt from x15% y75% to x85% y75%. Small dark damp root veins at edges only. Clearly recognizable quiet threshold into an ancient forest. Leave lower central trail clear.
```

## silent-bridge-v1.png

Nguồn: `C:\Users\Personal\.codex\generated_images\01a11971-aad7-7021-aa5d-5c1ce96543c4\exec-0b03b425-2046-4f16-bbba-ac1470e6a7cd.png`

```text
Use case: stylized-concept. Asset type: complete playable 2.5D RPG terrain background, landscape 1536x1024. Vietnamese dark folklore bamboo and banyan forest, realistic hand-painted materials, high oblique orthographic camera, entire terrain fills image, no horizon, no sky, no UI, no lettering, no characters, no creatures, no baked magic or particles. An open traversable earthy track connects left edge to right edge through the lower-middle third, leaving at least 55% readable walking and combat ground. Dense dark vegetation mostly at edges, large natural material shapes, low visual noise, restrained olive, ochre, slate palette, soft realistic lighting. No foreground canopy covering paths, no bright neon, no toy-like graphics. Area 2: THE SILENT BRIDGE. Cool filtered daylight, dense bamboo. A narrow shallow stream flowing north to south near the center, crossed by a broad old timber footbridge along the lower-middle left-right track at y70%. Bridge has sturdy worn planks, simple low rails, enough width for fighting. Two small unoccupied hunter resting sites by the trail, bundles and cold hearths without people. Water reflects olive foliage, not sparkling. Rootlike dark veins crawl subtly along streambanks.
```

## stone-boundary-v1.png

Nguồn: `C:\Users\Personal\.codex\generated_images\01a11971-aad7-7021-aa5d-5c1ce96543c4\exec-ee50b82a-a694-46bd-9648-b0f499bcd6cc.png`

```text
Use case: stylized-concept. Asset type: complete playable 2.5D RPG terrain background, landscape 1536x1024. Vietnamese dark folklore bamboo and banyan forest, realistic hand-painted materials, high oblique orthographic camera, entire terrain fills image, no horizon, no sky, no UI, no lettering, no characters, no creatures, no baked magic or particles. An open traversable earthy track connects left edge to right edge through the lower-middle third, leaving at least 55% readable walking and combat ground. Dense dark vegetation mostly at edges, large natural material shapes, low visual noise, restrained olive, ochre, slate palette, soft realistic lighting. No foreground canopy covering paths, no bright neon, no toy-like graphics. Area 3: THE ANCIENT BOUNDARY. Late twilight, older thicker tree trunks. A circular ring of eight weathered low stone monoliths is fully visible in the upper-right clearing around x64% y44%, ellipse shape about 23% width and 15% height, center empty. The broad earthy path in lower-middle passes beside the ring toward deeper forest at right. Ring intact. Black root veins are restrained outside the ring but dense beyond toward right. Small abandoned hunter camp at x38% y63%, no people. No giant central tree.
```

## sealed-heart-v1.png

Nguồn: `C:\Users\Personal\.codex\generated_images\01a11971-aad7-7021-aa5d-5c1ce96543c4\exec-24840444-a064-4847-886b-ea2c2f2482bf.png`

```text
Use case: stylized-concept. Asset type: complete playable 2.5D RPG terrain background, landscape 1536x1024. Vietnamese dark folklore bamboo and banyan forest, realistic hand-painted materials, high oblique orthographic camera, entire terrain fills image, no horizon, no sky, no UI, no lettering, no characters, no creatures, no baked magic or particles. An open traversable earthy track connects left edge to right edge through the lower-middle third, leaving at least 55% readable walking and combat ground. Dense dark vegetation mostly at edges, large natural material shapes, low visual noise, restrained olive, ochre, slate palette, soft realistic lighting. No foreground canopy covering paths, no bright neon, no toy-like graphics. Area 4: THE SEALED HEART. Somber moonlit dusk but terrain remains readable. A broad bare-earth circular arena occupies middle 60%, perimeter of gnarled banyan and bamboo. Eight weathered stone blocks make a low ancient seal ring at perimeter of the central arena, no tall columns obstructing gameplay. The ground inside the arena is nearly clear and flat, thin dark roots follow perimeter; no giant roots crossing center. Leave central-right at x62% y48% empty for a separately drawn deer boss. A trail enters from far left at y75%. Natural slate and earthy brown highlights, no glowing runes.
```

## moc-loc-sheet-v1.png

Nguồn: `C:\Users\Personal\.codex\generated_images\01a11971-aad7-7021-aa5d-5c1ce96543c4\exec-a9ed1225-46eb-47a4-8532-4c66e784ca47.png`

```text
Use case: stylized-concept. Asset type: transparent game character atlas for a Vietnamese dark-folklore RPG. Exactly TWO isolated full-body sprites in two equal cells side by side on a 1536x1024 genuinely transparent canvas, no labels, no border, no ground, no scenery, no particles, no contact shadow. Same adult majestic forest DEER guardian in both cells, facing lower-left three-quarter, high oblique game view. LEFT relaxed guarding pose with head high. RIGHT lowers antlers before a straight charge. Tall elk-like anatomy and slender articulated legs, NOT a humanoid and NOT a dragon. Weathered dark bark armor follows natural deer anatomy, moss on upper shoulders, bone-colored branching antlers intertwined with woody roots. Restrained earthy brown, charcoal olive, ivory highlights. In its sternum is a closed knot of roots resembling a seal, with tiny subdued warm human cloth trapped between roots, no gore, no glowing gemstone. Noble and burdened rather than evil. Clean readable silhouette and realistic natural materials compatible with realistic painted forest terrain. Each entire body, ALL antlers and ALL hoof tips fit inside its own half with 70px transparent padding to every cell boundary. Both sprites the SAME anatomical size and height, about 700px tall, centered each half. No writing, no gradient rectangle behind subjects.
```

