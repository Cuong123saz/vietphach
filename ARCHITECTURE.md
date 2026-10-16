# Foundation hiện tại

README.md là tài liệu kiến trúc nguồn. Foundation chỉ dùng implementation của project hiện tại. Bộ luật chung và specification Targeting, Stats, Input của project hiện tại nằm tại [CORE_RULES.md](CORE_RULES.md). Project cũ chỉ là CONTENT REFERENCE, không phải nguồn specification cho architecture hoặc hệ thống gameplay/runtime.

## Module đang có

| Module | Trách nhiệm |
| --- | --- |
| src/app/bootstrap.ts | Khởi động Phaser, chọn game hoặc Lab, nhận dữ liệu playtest |
| src/run/Run.ts | Tạo state độc lập, điều phối chuyển động, kết thúc lượt chơi |
| src/gameplay/characters/core/movement.ts | Chuyển input hướng và thời gian thành chuyển động world |
| src/world/definitions.ts | Map catalog, zone và schema dữ liệu thiết kế hiện tại |
| src/world/collision.ts | Va chạm hình học và di chuyển có vật cản |
| src/world/parseStage.ts | Kiểm tra dữ liệu nhập, không phụ thuộc editor/storage |
| src/presentation/phaser/MainScene.ts | Input adapter, render, camera, debug và đồng bộ vị trí từ Run |
| src/presentation/animations/characterTextures.ts | Chuẩn bị sprite/animation bằng Phaser |
| src/dev/labs/map/ | Editor, history, browser storage, import/export và giao diện Lab |
| src/config/movement.ts | Thông số preview đang dùng, chưa phải balance nhân vật đã chốt |

## Hướng phụ thuộc

Cung Thủ prototype dùng `ArcherRuntime` / `WoodArcherSkills` riêng và `ArcherRun` fixed-step 120Hz. `WoodArcherScene` đọc state và event để vẽ VFX, `ArcherHud` gọi callback vào runtime; không viết damage từ hiệu ứng. `ArcherEncounter` cung cấp đợt quái/bia và dùng AI chung. URL `character=archer` chọn Scene riêng để giữ Mage/Stage hiện tại. Tuning nằm trong `woodArcher.ts`; A1/B1 đến Lv15, A2/B2 chưa triển khai và khóa bởi Evolution. Các số class/encounter mới là thử nghiệm; xem [thiết kế Cung Thủ](docs/design/Wood-Archer-Class-Draft.md).

App nối các phần lại. Presentation gọi Run; Run dùng Gameplay và World; Gameplay dùng World. Domain không import App, Presentation hoặc Dev. Dev sử dụng cùng World schema/collision với game. Không có event bus, framework hoặc runtime thứ hai.

Input Phaser → moveRunPlayer → moveCharacter → world collision → Run.player.position → sprite/camera.

Run mới luôn tạo player và clone zone mới. Scene shutdown kết thúc Run cũ; không sửa từng field để reset. Run hiện chỉ chạy solo và kết thúc dưới dạng abandoned; chưa có clear encounter. Mage Run có state stats/resources/progression độc lập; các Run chỉ xem model cơ bản vẫn giữ movement preview.

## Giới hạn cần hiểu đúng

Core Gameplay V0.1 đã triển khai theo `CORE_RULES.md`. Lựa chọn `?character=mage` khởi tạo Mage hệ Water, stats Lv1, MP regen và bộ Thủy Pháo/Q/E/R/Mạch. Tốc độ vẫn lấy `MOVEMENT_PREVIEW.speed`, không phải Mage balance chính thức. Các thông số thử kỹ năng được tách khỏi luật đã chốt.

| Module Core V0.1 | Trách nhiệm |
| --- | --- |
| `src/gameplay/characters/core/CharacterStats.ts` | Common stats và validation; không có stat bị cấm |
| `src/gameplay/characters/core/CharacterResources.ts` | Current HP/MP, ratio, damage HP, healing, resource restore và MP regen |
| `src/gameplay/characters/core/Potential.ts` | Ngân sách điểm, allocation, validation; reset bằng state mới |
| `src/gameplay/characters/jobs/mage/MageStats.ts` | Base, công thức Potential và attack interval; không có WP |
| `src/gameplay/characters/jobs/mage/MageRuntime.ts` | Điều phối derive stats/resources và commit progression nguyên tử |
| `src/gameplay/combat/Element.ts` | Năm hệ, hai vòng quan hệ, hệ số damage |
| `src/gameplay/combat/Damage.ts` | Hit đã xác nhận → Crit → DEF V0.1 → Element → HP |
| `src/gameplay/combat/Targeting.ts` | Actor/ground/direction eligibility, tách khỏi physical hit |
| `src/gameplay/enemies/EnemyElement.ts` | Element khi spawn normal/elite/boss và nguồn authoritative |
| `src/gameplay/progression/Level.ts` | Lv1 có 5 Potential; lên cấp +5 Potential/+1 Skill Point; tối đa Lv15, tổng 75 Potential; EXP 20+10×(L−1) |
| `src/gameplay/progression/Evolution.ts` | Cổng mốc 5/7/9/11/13/15, lựa chọn theo thứ tự và điều kiện nhánh/hướng, chỉ lưu lựa chọn đã có gameplay |
| `src/gameplay/characters/jobs/mage/WaterMageEvolution.ts` | Khung tên/nhánh tham khảo dự án cũ, chưa bật hiệu ứng hoặc lựa chọn |
| `src/config/balance/` | Số đã chốt cho Mage, Ngũ Hành và phần thưởng level |

API tích hợp trong Run: `tickRun`, `allocateRunPotential`, `awardRunExperience`, `spawnRunEnemy`. Run mới reset resources, progression, lựa chọn evolution và modifier tạm bằng việc tạo state mới. Meta/Account không được nhận vào các API này nên không bị reset.

Potential → Job formula → modifier policy (nếu đã có specification) → Effective Stats → preserve current HP/MP ratio. Không có WP hoặc công thức Water Power. Modifier policy được truyền rõ ràng; không có thứ tự stacking mặc định của Core. Không xây buff framework.

Healing/Resource Restore là mutation boundary nhận target hợp lệ; skill/effect adapter phải dùng targeting policy trước khi gọi nếu cần hạn chế self/ally/enemy. Heal không hồi sinh. Resource khác MP có thể cung cấp pool riêng, HP không dùng resource restore.

Damage nhận `ConfirmedHit` có loại projectile/hitbox/aoe và identity source/target. Collision adapter chịu trách nhiệm chứng minh hit thật. Targeting không tạo hit và không có RNG miss. Đầu vào `element` của damage độc lập với element của source. DEF dùng công thức chung V0.1 với DEF_SCALE = 50 trong balance config, không nhận callback thay luật. Final Damage giữ precision dạng number; chưa chốt làm tròn. Công thức EXP trong tests chỉ là fixture.

Enemy Element được gán một lần qua spawn API; host/server sau này có thể cấp element đã roll. Enemy stats, EXP reward, rank/catalog mapping và hit geometry chưa có definition chính thức nên không suy diễn từ tên file tài nguyên hoặc marker Lab.

Thủy Pháo có Basic Attack timing, projectile/Hit và damage. `WaterCannon.ts`
quản lý idle/charging/full_charge/firing/recovery độc lập movement, giữ charge timing hiện tại.
MouseUp chuyển firing; hold giữ full_charge, không tự bắn/lặp. Shot truyền chargeRatio 0..1 vào projectile.
Run sở hữu projectile state và lifecycle; `Projectile.ts` kiểm tra enemy bằng
swept circle và tái sử dụng obstacle geometry hiện tại. `WaterCannonCombat.ts`
chụp raw damage ATK * (0.20 + 1.05 * chargeRatio) khi spawn; Run nối ConfirmedHit
với CombatActor qua Damage Core Water/Crit/DEF/Ngũ Hành. Full Charge hit hợp lệ
cấp tối đa +1 Mạch cho attack instance, clamp 4/4. Bắn hụt/vật cản không cấp điểm.
Run dọn attack snapshot khi projectile kết thúc. `waterCannonTextures.ts` chỉ xử lý artwork/VFX.
Scene chuyển chuột sang world, cung cấp muzzle và render trái/phải. Khi charge,
Run dùng chargeMoveMultiplier hiện tại, không sửa stats. Các marker enemy Lab
là Hit preview target với radius dev rõ ràng, không phải combat enemy được gán stats.

`/?sandbox=1` chạy Mage với bia địch 10.000 HP / DEF 0 / hệ Water và hai hình
nộm đồng đội 120 HP (ban đầu 25% và 75%). Actor/HP được tạo riêng mỗi cảnh từ
`src/dev/sandbox/fixtures.ts`; không có AI, nghề đồng đội hoặc multiplayer.
H hồi đầy HP/MP bản thân và hình nộm, không cộng Mạch. T cho đồng đội rời/vào sân;
J/K tạo hit thử nghiệm từ bia vào bản thân/đồng đội để kiểm tra khiên. HUD hiển thị
HP, MP, Mạch, damage, khiên, kính, dây, buff Tinh Thần và cooldown.
Đây là dữ liệu thử nghiệm, không phải balance địch.

## Water Mage gameplay V0.1

Run sở hữu clock, CombatBody và lifecycle; `WaterMageSkills.ts` giữ Q/E/R,
cast snapshots, cooldown, kính, dây và hàng đợi sao chép. Domain không import Phaser.
Scene chuyển world cursor/view thành input; lấy event để render rồng, dây và khiên.
Presentation không được dùng sprite overlap hoặc animation phase để cấp Damage/Mạch.

- Q khóa ground khi commit, giới hạn cast range, tạo AoE Circle Hit ở impact;
  total raw damage 2 ATK, một cast chỉ +1 Mạch nếu hit ít nhất một Enemy.
- E thường khiên 20% MaxMP cho mục tiêu; không chọn thì self, chỉ +1 sau áp khiên.
- E READY chọn đồng đội hoặc tự chọn thấp % HP trong màn hình, phá hòa theo HP
  hiện tại rồi ID. Chia khiên 50/50 và refresh toàn bộ link set về 10s; base limit 1.
- E READY solo cấp khiên đầy đủ và +5 * level Spirit trong 10s (replace/refresh).
  Modifier tạm không sửa ngân sách Potential; level/allocation vẫn derive đúng khi buff đang tồn tại.
- E READY có đồng đội ngoài màn hình cấp khiên self đầy đủ và giữ READY, không buff solo.
- Buff solo không bị tự chuyển đổi khi ally vào sân, giữ đến hết hạn cả khi lần E READY mới tạo dây.
- R tạo 3 kính trong 12s và +1 Mạch. Q/E gốc dùng một kính, sao chép sau 1.5s;
  snapshot original raw values và CopyRate. Copy Q cast lại ground cũ, copy E cấp
  từng phần khiên cho đúng recipient cũ, không retarget/refund khi mục tiêu mất hợp lệ.
- Q sao chép dùng `WATER_MAGE_COPY_TIMING`: lóe kính 0.18s rồi bay thẳng 0.65s,
  bỏ toàn bộ charge/summon/anticipation của Q gốc. Domain lấy tổng hai thời gian
  để lập lịch AoE impact; VFX dùng cùng config, không tự cấp Damage ở cuối animation.
  Kính cũng lóe trước luồng E sao chép; luồng E chỉ trình diễn các grant đã xác nhận.
- Mạch, link và buff Spirit là Unique; execution copy không cộng điểm, không kích
  hoạt/refresh chúng và không lên lịch thêm copy. R mới không hủy copy đã lên lịch.
- `Shield.ts` quản lý từng layer riêng theo source/skill/application, thời hạn E 8s.
  Damage Core tính Crit/DEF/element một lần, rồi shield hấp thụ theo hạn sớm, dư trừ HP.

MP/CD/Q range/AoE/delay tập trung tại `src/config/balance/waterMage.ts`, đánh dấu
tuning thử nghiệm. Q delay 2.31s hiện khớp chuỗi VFX gốc; đổi tuning phải đối chiếu
presentation. Các hệ số damage/shield/copy và durations đã chốt nằm riêng trong RULES.
Không triển khai Evolution/multiplayer hoặc đưa mechanic từ sandbox cũ vào kit.

Dev tuning trong `src/config/waterCannon.ts`: projectile 480 world units/s,
radius 8, range 600 world units; marker enemy radius 12. Các số này chưa phải
balance chính thức. Thời gian pose fire 0.12s và impact 0.18s chỉ phục vụ hình ảnh,
không tạo cooldown. Muzzle phải đối chiếu ảnh và có thể tuning presentation.

EXP curve thử nghiệm tham khảo D:/kpah: 20+10×(L−1), tổng 1190 EXP lên Lv15. Ở cap, EXP về 0, không cấp thêm điểm. EXP reward của quái, Mage moveSpeed chính thức, modifier stacking và respec vẫn chưa chốt.

Map là không gian world; Zone là vùng và placements. Schema `Stage` version 1 đang là gói thiết kế Lab chứa danh sách zones, không phải runtime encounter. Giữ định dạng để dữ liệu Lab đang lưu tiếp tục đọc được. Khi triển khai encounter, cần specification riêng; không dùng gói Lab này làm encounter state.

Quái/NPC trong Lab vẫn là marker; chưa auto-spawn combat từ dữ liệu Lab. Map chưa có collision hoàn chỉnh. Chưa thêm Account, Cosmetic, skill/evolution cụ thể hoặc Multiplayer.

## Kiểm tra

`npm run typecheck`, `npm test`, `npm run test:lab`, `npm run build`.

Tests kiểm tra Run độc lập, vòng đời, chuyển động, collision, dữ liệu Lab, boundary import và các luật Core V0.1 trong `tests/core.cjs`. TypeScript đã bật strict. Chưa có lint script. Build/typecheck không thay thế việc kiểm tra trực quan trong browser.

## Hiệu ứng vận nước dùng lại
`src/presentation/phaser/WaterChargeEffect.ts` đóng gói orb 4 mức, nước trước/sau,
loop đủ lực và giọt nước. Tạo sau khi `createWaterCannonTextures(scene)` chuẩn bị texture.
Mỗi frame gọi `update({active, full, progress, position, origin, facingLeft,
deltaSeconds, timeMs})`. `position` là chân, `origin` là đầu gậy, thời gian tính
bằng giây cho delta và mili giây cho clock. Gọi `hide()` khi ngắt và `destroy()`
khi kết thúc scene. Mỗi instance sở hữu object/góc xoay riêng, dùng cho nhiều actor.
Module không đọc Mage/Run, không điều khiển niệm, projectile hoặc damage.

## Thần Long Thủy Q preview
`WaterDragonPreview` sở hữu sprite/lifecycle cho một cast, không đọc hoặc sửa combat resources.
MainScene lấy con trỏ world, giới hạn trong map. Gameplay chụp tọa độ mặt đất
ngay lúc cast, giới hạn range và trả event cho VFX; không chọn Enemy hoặc retarget.
MP/CD, AoE damage và tích Mạch nằm trong WaterMageSkills, tách khỏi preview/VFX.
Điểm đáp đất trống vẫn nổ nước hướng lên.
MainScene điều phối input và cung cấp origin world. Preview giữ endpoint đã khóa,
Bay thẳng + tăng tốc, orientation theo hướng bay, impact là visual cue chứ không ConfirmedHit.
Mở đầu: vung trượng 120 ms → quả cầu `water-orb-3` bay lên 400 ms →
giữ trên cao và xoay 600 ms → hòa sang tia nước 01. Quả cầu dùng tốc độ
xoay 0.5 rad/s và kích thước 34 của tụ lực; điểm bắn chụp khi rời trượng.
Timing tạo rồng: 320/380/160/1200/180 ms, tổng cả mở đầu 3.36 giây. Chưa có gameplay Q.

Q summon visual: quả cầu xuất phát ở đầu trượng giơ cao (offset ±2, -71),
bay lên 55 world units. Hình 01 rộng 6–22 mọc tại vị trí quả cầu trên cao,
hòa quả cầu ra rồi nở thành 02–03. Rồng đã tạo hình và tất cả pose bay dùng
cùng chiều cao gốc 88, scale đều hai trục, không co nhỏ/phình lên khi bay;
dive giữ pose 03 thêm 12% đầu pha.
Frame mới giữ alpha 1; frame cũ đi cùng điểm neo đầu rồng rồi tan trong 80 ms.
Đây là tuning presentation, không đổi timing/gameplay.

Q dive playtest hiện tại: 0.65 giây, bay thẳng tăng tốc, không uốn quỹ đạo.
Chuỗi bay 04 → 05 → 06 → 05 → 06 (thêm hai frame), sau đó impact 07.
Uốn thân là hình ảnh trong asset; không làm thêm wave offset.

Sheet dive không có ô đều nhau: bounding box của đuôi chồng lên ô bên cạnh.
Texture preparation tách bốn silhouette alpha liên thông lớn nhất, giữ nguyên RGBA
của từng hình và bỏ mảnh thuộc hình khác. Canvas chung giữ cùng tỷ lệ pixel;
điểm neo đầu chuyển từ tọa độ sheet sang từng texture đã tách.
Mục tiêu bên trái dùng lật ngang trước khi tính góc cúi đầu; origin X được
phản chiếu cùng hình. Tạo hình và bay giữ cùng hướng lật, góc xoay dùng cung
ngắn nhất để không lộn thân hoặc quay cả vòng khi chuyển sang lao xuống.
Va chạm Q dùng `dragon-impact.png` alpha gốc riêng, rộng 140, tâm bung tại
(90%, 56%) neo đúng endpoint. Ảnh hướng phải gốc được xoay theo hướng lao tới;
không dùng pose rồng 07 làm va chạm, không đổi hiệu ứng va chạm đánh thường.
Q tạm khóa input di chuyển từ khi nhận cast hợp lệ đến hết anticipation
(động tác 2). Sau khi quả cầu rời trượng dùng pose 1 `water-q-ready`, đến lúc
rồng tạo hình xong giữ 0.22 giây ở pose 1, sau đó dùng pose 2 `water-q-command` hướng về target. Tick Q trước
movement để mở khóa ngay trong frame bắt đầu dive; không sửa MoveSpeed/Collision.
Hủy cast, chết hoặc shutdown giải phóng lock. Đánh thường đang vận bị hủy khi
bắt đầu Q, không nhận một chu kỳ đánh thường mới trong thời gian khóa chân.

## HUD và bảng nhân vật

HUD quái tham khảo `D:/kpah/src/presentation/EnemyFocusPanel.ts`: bảng mục tiêu trên cùng
hiển thị tên, nhãn hệ có chữ và màu, HP hiện tại/tối đa, cận chiến/đánh xa, thù hận với
người chơi và trạng thái thật (ra đòn, truy đuổi, hồi máu, slow, khiên hoặc đã hạ gục).
`enemyHudModel.ts` chỉ đọc state, không expire shield/slow hay đổi targeting gameplay.
Click thân quái chọn mục tiêu hiển thị; nếu chưa chọn thì dùng quái vừa đánh trúng,
sau đó quái sống gần nhất trong màn hình. Mục tiêu chết vẫn được xem nếu còn trên sân;
ra ngoài màn hình/mất hợp lệ sẽ dùng mục tiêu hợp lệ tiếp theo. Vòng dưới chân chỉ là
Presentation. Q tiếp tục chọn mặt đất. Không tự thêm cấp quái hay EXP reward.
Quái thường Sandbox roll độc lập một trong năm hệ lúc spawn, giữ nguyên hệ khi đánh,
hồi máu và DEV hồi HP. Bia tập cố định Thủy; normal/elite/boss vẫn dùng Enemy Element Core.

`presentation/hud/CombatHud.ts` gắn DOM lên container của canvas cho Mage.
`waterMageHudModel.ts` đọc snapshot chỉ số, Mạch, khiên, kính và bản sao đang
chờ; không mutation combat, kể cả khi gặp lớp khiên đã hết hạn. HUD cập nhật
tối đa 10 lần/giây, thay text và thuộc tính tại chỗ để giữ focus khi xem bảng.

Nhấn C hoặc chân dung mở bảng nhân vật; icon thanh kỹ năng mở chi tiết,
không cast bằng click vào icon. Dùng chiêu bằng Q/E/R và chuột trên chiến trường.
Bảng có tab Thông tin / Kỹ năng / Tiềm năng / Tiến hóa, Escape đóng, phím mũi tên đổi
tab, focus trả về nơi mở. Chỉ phân bổ tiềm năng qua `allocateRunPotential`;
curve EXP dùng config chung. HUD thêm EXP/điểm chưa dùng, tab Tiến hóa hiển thị mốc đủ/chưa đủ cấp, ghi rõ hiệu ứng chưa triển khai. DEV Sandbox thêm +50 EXP / +1 cấp qua EXP, không set level trực tiếp hoặc cấp lại điểm khi hồi HP/MP. Quái Sandbox vẫn không tự thưởng EXP/loot.

Tên hiện tại A1=Thủy Nhân Mạch, B1=Thủy Long Mạch; ưu tiên B1. A2/B2 giữ dữ liệu nhưng có `locked: true` ở Lv7/9/11/13/15;
Evolution Core loại khỏi lựa chọn hợp lệ dù `implemented` đã bật. HUD ghi
“Khóa” riêng từng lựa chọn. Hai nhánh gốc Long/Nhân ở Lv5 vẫn được giữ.

A1/B1 Lv5/7/9/11/13/15 đã có lựa chọn gameplay qua `chooseRunEvolution` và commit
Mage progression. `WaterLongRules` kiểm tra lựa chọn từng mốc, tập trung hệ số
tại `config/balance/waterLong.ts`. `WaterLongSwamp` dùng Damage/Resource/Movement
Core, slow có thời hạn trên CombatBody không mutation Stats. Mạch ghi đúng
amount MP vào hàng đợi proc rồi flush khi có context chứa dây/actors; không
hồi MP từ counter đã cap. READY E nhập vị trí sau click, E thường giữ khiên.

`WaterHumanRules` kiểm tra A1. `WaterMageCapstones` quản lý E công phá A1, chi phí,
quyền dùng đại chiêu và sự kiện theo thời gian mô phỏng; không phụ thuộc Phaser.
`WaterMageSupport` xác nhận hỗ trợ trước commit. Siết đại chiêu ghi rawDamage một
lần mỗi AoE có hit. `WaterUltimateEffects` chỉ đọc state; `WaterSkillInput` ghép
Q/E trong 0,4s, Esc/blur/mở bảng hủy input chưa commit. Tuning riêng ở
`config/balance/waterEvolution.ts`. Hai tiến hóa không đọc damage cinematic.
Q snapshot radius/damage/charge; VFX vận nhanh hơn khớp timer gameplay nhưng
không tăng tốc flight. Siết tick1s và Q proc theo thứ tự damage rồi tăng stack,
copy dùng hiệu lực snapshot và trần extension2s. Swamp copy có lifetime riêng.
`WaterSwampEffects` đọc state, dùng hai phần cạnh nhau trong mỗi ảnh nguồn
đầm; rồng vòng6 pose dùng art rồng đã có, không sửa file PNG. A1/B1 đã có Lv15
theo `docs/design/Water-Mage-Assault-Paths.md`.

MainScene khóa input chiến trường và xóa phím/đánh thường đang giữ khi bảng
nhân vật hoặc DEV mở; Run tạm dừng cùng các hiệu ứng. Thời gian khiên, dây và kính
cũng tạm dừng. Shield tổng tách khỏi HP, chi tiết lớp giữ thời hạn riêng.
Thông số sandbox chuyển vào DevMenu; F3 vẫn bật vùng camera/collision và tên
quái để kiểm thử. Capture portrait giữ khung quay sạch, không gắn HUD.

Tải ảnh: `AssetLoadGuard` chặn khởi tạo sân khi loader báo lỗi texture bắt buộc,
hiển thị tài nguyên lỗi và nút tải lại. Map vẫn được phép dùng placeholder đã có.
HUD tự thử lại ảnh lỗi tối đa ba lần với thời gian chờ tăng dần, bỏ timer khi
ảnh tải thành công hoặc UI bị hủy. Không thay missing texture bằng sprite giả.

## Hitbox actor theo ảnh

`SpriteHitboxes` đọc bounds alpha >20 của texture/frame, cache theo frame object,
rồi đổi qua scale, origin, flip và world transform thành `BodyBox` offset với
điểm neo actor. MainScene cấp box cho Run player và combat bodies; Gameplay Core
không đọc canvas/Phaser/ảnh. Cập nhật khi đổi frame/tư thế, không tính VFX hoặc nhãn.

`world/bodyGeometry.ts` dùng chung cho projectile sweep (rectangle có góc tròn
theo bán kính đạn), Q circle/box và chọn E. `movementBody` tạo vòng tròn nhỏ quanh
chân, tách riêng với hitbox nhận đòn: 30% chiều rộng, clamp 6–18 và cap radius gốc,
lấy tuning từ `config/movement.ts`. Run dùng footprint cho chặn actor, vật cản/map;
giữ slide/substeps và chỉ chặn body sống, hợp lệ. Body chồng nhau được thoát nếu
không tăng diện tích chồng lấn. Bia tập và marker vẫn nhận đòn theo hình tròn gốc.
F3 vẽ vùng nhận đòn xanh và footprint chặn chân cam đúng với Core đang dùng.

## AI quái thường trong Sandbox

`Run.enemyCombat` sở hữu controller, projectile và event riêng mỗi Run. Chỉ
quái đã được đăng ký qua `registerRunEnemyController` mới có AI; marker Lab và
bia tập không tự biến thành attacker. `EnemyCombat.ts` độc lập Phaser: range
phát hiện, đuổi qua Movement Core/footprint, windup khóa hướng/vùng đánh, release,
recovery/cooldown và leash trở về. Tuning trong `dev/sandbox/monsters.ts` là số thử.

Chuột/châu chấu melee kiểm tra AoE thân và vật cản; ốc/các loại sâu sử dụng
Projectile sweep thật, không homing. Damage chỉ resolve sau contact, dùng ATK,
Attack Element của enemy và pipeline Crit/DEF/Ngũ Hành/khiên/HP hiện tại.
Quái chết/rời sân hủy windup và projectile; không EXP/loot. Việc trở về theo leash
không tự hồi HP; hồi phục theo timer thù hận riêng được định nghĩa bên dưới.

MainScene đổi hai ảnh normal/attack theo phase, hướng và vùng thân khai báo trong
`MonsterTextures.ts`, không cắt/vẽ lại PNG. Hitbox thân loại vùng tia/gai/vệt bay;
vòng chặn chân vẫn dùng Core riêng. Đạn hiển thị từ runtime thật; event impact/damage
tạo phản hồi khiên và số damage. Dev có dừng/chạy AI; reset HP/MP cho phép thử lại
sau khi gục, tách khỏi `heal` vốn không hồi sinh. Finish/reset dọn lifecycle mỗi Run.

## Thù hận và hồi phục quái

`CombatActor.combatRole` là tag bắt buộc melee/ranged; Mage ranged, dummy Đội A
melee, Đội B ranged. Điểm phụ thuộc tag nguồn, không phụ thuộc vị trí hoặc hit kind.
Mỗi controller sở hữu `EnemyThreat.ts` state, cũng tham chiếu từ enemy actor để
Damage Core ghi +5/+10 sau một hit có Final Damage >0 (kể cả bị khiên hấp thụ).
MISS, damage 0, E/R và những nguồn hỗ trợ không tạo điểm. Q copy giữ source Mage.

AI xét tất cả hostile bodies sống/hợp lệ và player trong leash, ưu tiên điểm cao
nhất; bằng điểm giữ mục tiêu cũ, rồi khoảng cách/ID. Không điểm thì dùng detection.
Ưu tiên mới hủy windup cũ, giữ cooldown; projectile đã phóng giữ hướng gốc. Điểm của
actor chết/rời sân bị loại. Reset/finish dọn bảng, finish bỏ tham chiếu từ actor.

Sau 7s không nhận sát thương, `EnemyThreat` tích phân tốc độ giảm `2 + 2*t` và hồi
2% Max HP/s cho quái sống, clamp về 0/Max HP. Khung qua mốc 7s chỉ tính phần vượt;
hit mới cập nhật hồi phục đến timestamp của hit rồi dừng hồi, đặt lại mốc. Timer
tiếp tục khi Dev dừng AI. Không thêm HP Regen stat hoặc hồi phục Player/Ally.
Tuning ở `config/balance/enemyThreat.ts`; Sandbox hiển thị TH và nhãn Hồi, Dev cho
xem mục tiêu/bảng điểm từng quái. Dataset phản ánh cùng state để kiểm tra runtime.

## Stage Kháng Chiến

`run/KhangChienStage.ts` là director của một Run hiện có: phase mở đầu, briefing,
combat, chuyển map, boss, hy sinh, complete/failed. Không tạo runtime song song và
không import Dev/Phaser. Director quản lý danh sách actor sống giới hạn, spawn,
kill quota 100/150/200 và thay Zone trong cùng Run. Preset Lv15 dùng progression
và modifier Mage hiện có; không sửa base balance hay mở evolution chưa implemented.

Director cài `WaterMageState.encounterBuff` chứa tuning Q Thủy Ngục và multiplier bán kính E
theo ải; skill đọc payload tùy chọn, không import director hay đoán buff từ URL/map ID.
Q thứ 5 sau 4 Q commit thành công cường hóa, không tiêu Mạch; chụp prison, điểm đáp theo con trỏ
và bán kính đầm E hiện tại vào cast/copy. Stage bỏ auto-center vào đầm; Sandbox giữ nguyên.
`WaterPrison.ts` quản lý
root riêng theo caster/cast; scheduler tạo ngục khi cầu đáp và gọi damage Q hiện có khi rồng
trồi lên, dùng cùng bán kính với đầm E và không gây thêm hit lúc cầu đáp.
`WaterPrisonEffects` chỉ đọc state/sự kiện, dùng sphere asset sáng bao mục tiêu,
không tạo thêm hình đầm Thủy Hãm khi cầu đáp.
Đổi ải hủy hiệu ứng chờ/ngục rồi cập nhật buff; kết thúc Run xóa cả buff. Sandbox không cài buff.

Boss có `ResourceTarget.minimumHp` riêng để pipeline damage dừng tại mốc 20%
và trả đúng appliedDamage. Boss Stage dùng override recovery = 0 trong ThreatState;
quái thường/tinh anh giữ luật hồi phục mặc định. Cảnh cuối bỏ floor rồi resolve
confirmed AoE qua Damage Core, dừng combat thường và kết thúc bằng HP Player = 0.

MainScene đọc director để khóa input/camera, đồng bộ sprite và đổi nền bốn map.
`KhangChienHud` chỉ đọc trạng thái, callback Ra trận/Chơi lại gọi chủ Run/Scene.
`castKhangChienFinaleQ` nhận lệnh Q riêng Stage trong cửa sổ 5s sau 1,5s mở đầu,
ghi tối đa 10 `finaleShots` (thời điểm/phần Siết/origin chụp lúc phóng). Director xử lý
hit Siết khi mỗi rồng tới tâm; không dùng CD/MP/Mạch/copy của Q thường. Scene chỉ
mở bàn phím riêng cảnh sacrifice, lọc auto-repeat và khóa input khi pause/mất focus.
`KhangChienEffects` trình diễn quả cầu, rồng bơi, rồng từ các lệnh Q thật và 8 rồng hội tụ;
VFX không quyết định damage/timing. Hai đại chiêu này là cảnh kết Stage, không phải
implementation gameplay Lv15. Story text/config cân bằng đặt riêng để chỉnh tiếp.

`Run.combatObjectives` chứa kết giới phá được, tách khỏi `combatBodies` để không
lọt vào danh sách đồng đội E/Thủy Mạch hoặc làm thay đổi luật solo. Objective ánh xạ
ID actor tới các đoạn polygon World; AI ngắm mép gần nhất theo tâm hitbox. Va chạm
với obstacle chuyển thành confirmed hit qua Damage Core, không dùng timer trừ HP.
Objective có `protectedArea` cùng oval World: actor ở ngoài được ưu tiên theo thù
hận, actor bên trong được bảo vệ; không có actor ngoài mới nhắm kết giới. Đạn giữ
targetId lúc phóng để phân biệt đánh kết giới với đạn lạc bị vành chặn. HP 8.000 giữ xuyên
các map, không regen; về 0 khiến director thất bại và bỏ vành chặn. `renewal` trong
director lưu điểm bắt đầu và MP thiếu của cảnh chuyển map. Timeline trả về kết giới,
cầu nguyện, hút nước ngầm và xuất trận; tích phân phần khung nằm trong đoạn phục hồi
để Healing/Resource Restore cho cùng kết quả ở mọi frame rate. Đổi Zone chỉ diễn ra
sau cảnh, không tự hồi tài nguyên. Presentation đọc `renewalStep`, rung camera nhẹ
trong cảnh và xóa hiệu ứng khi trở lại combat, pause hoặc teardown.

`world/khangChien.ts` định nghĩa ba đường tiếp viện. Director gán roadId và điểm
spawn theo cột; `EnemyController.approach` theo waypoint trước khi giao chiến, bỏ
route khi có thù hận hoặc mục tiêu trong tầm. Không đưa tọa độ Player vào spawn.
F3 và Dev status trình bày cùng dữ liệu đường/AI, không tạo luồng movement riêng.
