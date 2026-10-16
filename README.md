# VIỆT PHÁCH

Implementation Core Gameplay V0.1 hiện tại được mô tả trong [ARCHITECTURE.md](ARCHITECTURE.md). `CORE_RULES.md` ở root là nguồn gameplay chính thức ưu tiên cao nhất; các cây module bên dưới là kiến trúc mục tiêu, không phải danh sách tính năng đã triển khai.

**Cung Thủ Mộc chơi thử:** `/?character=archer` bắt đầu Lv1; `/?character=archer&sandbox=1` chuẩn bị A1 Lv15, `&path=b1` cho B1. A1/B1 mở đến cấp 15, A2/B2 khóa. Giữ chuột bắn; WASD di chuyển; Q/E rồi click; R; C để tăng tiềm năng/tiến hóa. Đại chiêu: đủ 6 Sinh Tức, Q/E hết hồi → Q+E hoặc E+Q rồi click. Phòng thử có preset hai nhánh, bia/quái và xem chậm trong Dev. [Thiết kế và giới hạn](docs/design/Wood-Archer-Class-Draft.md), [đo runtime](outputs/wood-archer/runtime-benchmark.json). Đây là prototype solo với balance thử.

Phòng thử Pháp Sư Thủy: `/?sandbox=1`. Giữ/thả chuột dùng Thủy Pháo; Q chọn
điểm mặt đất; E chọn đồng đội dưới con trỏ hoặc tự dùng lên bản thân; R tạo kính.
H hồi đầy HP/MP và hình nộm; T chuyển solo/đội; J/K tạo sát thương thử vào bản
thân/đồng đội để kiểm tra khiên. MP/CD và vùng trúng hiện là tuning thử nghiệm,
được tập trung tại `src/config/balance/waterMage.ts`.

Hai nhánh Công Phá A1/B1 đã có gameplay đến cấp 15. Chọn mốc theo thứ tự
trong C → Tiến hóa. READY + Q+E/E+Q trong 0,4s rồi click chọn tâm dùng
Bát Đại Hải Long / Thủy Long Giáng Thế. Sandbox → Dev có preset thử từng nhánh
cấp 15 (bia 1 triệu HP, DEF 50). [Specification và số đo cân bằng thử](docs/design/Water-Mage-Assault-Paths.md)
ghi rõ chi phí, tương tác R và các thông số còn là tuning.

[Cung Thủ hệ Mộc — bản thiết kế thử](docs/design/Wood-Archer-Class-Draft.md)
có bộ kỹ năng nền và A1/B1 đến Lv15; A2/B2 khóa, giữ thiết kế để mở sau. Đây là đề xuất để duyệt, chưa có
runtime Cung Thủ; số so sánh đại chiêu là ước tính công thức, không phải benchmark gameplay.

Dev có mục thử riêng sáu tinh anh và boss Giáp Tai Ương. Boss thử trực tiếp tại
`/?character=mage&sandbox=1&encounter=boss-spiked-shell-beast`.
Chỉ số quái nâng cao là tuning thử nghiệm trong `src/config/balance/eliteEnemies.ts`;
thiết kế/giới hạn bản đầu ở `docs/design/Boss-Giap-Tai-Uong.md`.

Việt Phách là game Action RPG 2D / fake-2.5D phát triển bằng TypeScript + Phaser.

Game hỗ trợ Solo ở phiên bản đầu và được thiết kế để có thể mở rộng Co-op sau này.

Mục tiêu kiến trúc:

- Gameplay dễ mở rộng.
- Character mới không yêu cầu viết lại Combat Core.
- Gameplay không phụ thuộc Phaser.
- Solo và Co-op dùng chung Gameplay Core.
- Progression trong một Run tách khỏi dữ liệu sở hữu lâu dài.
- Cosmetic không ảnh hưởng sức mạnh.
- Có thể mở rộng Character, Outfit, Weapon Skin và Effect Skin trong tương lai.
- Không overengineer những hệ thống chưa cần.

---

# 1. CORE GAME LOOP

Gameplay chính:

```text
Chọn Character
      ↓
Chọn Cosmetic Loadout
      ↓
Solo / Co-op
      ↓
Start Run
      ↓
Lv1
      ↓
Đánh quái
      ↓
EXP / Level Up
      ↓
Potential / Skill / Evolution
      ↓
Zone tiếp theo
      ↓
Boss / Clear
      ↓
End Run
      ↓
Reset Run Progression
```

Progression trong Run không phải progression của Account.

---

# 2. WORLD STRUCTURE

Phiên bản hiện tại dự kiến:

```text
5 Maps
×
10 Zones / Map
=
50 Zones
```

Đây là mục tiêu nội dung, KHÔNG phải yêu cầu tạo sẵn 50 folder.

Cấu trúc logic:

```text
World
└── Map
    └── Zone
        └── Stage / Encounter
```

## Map

Map là một khu vực lớn của thế giới.

Ví dụ:

```text
Map 1
Làng và đồng ruộng
```

Map có thể chứa nhiều Zone.

## Zone

Zone là một khu gameplay cụ thể mà Player có thể:

- di chuyển;
- chiến đấu;
- gặp NPC;
- gặp Event;
- chuyển sang Zone khác.

## Stage / Encounter

Stage hoặc Encounter mô tả nội dung xảy ra trong Zone:

```text
Spawn quái
→ Wave
→ Elite
→ Event
→ Boss
→ Clear
```

Bắt buộc phân biệt:

```text
Map != Zone != Stage
```

Không gộp ba khái niệm này thành một hệ thống.

---

# 3. RUN SYSTEM

Một Run là một lượt chơi độc lập.

Run có thể là:

```ts
type RunMode = 'solo' | 'coop';
```

Solo và Co-op phải sử dụng cùng Gameplay Core.

## Temporary Run State

Các dữ liệu sau thuộc Run:

```text
Level
EXP
Potential Points
Skill Points
HP
MP
Evolution
Buff
Debuff
Current Map
Current Zone
Stage State
Character Runtime State
```

Khi bắt đầu Run mới, các dữ liệu trên được tạo lại.

Không reset Run bằng cách sửa thủ công từng field của Run cũ.

Luồng đúng:

```text
createRun()
    ↓
RunState mới
    ↓
Gameplay
    ↓
finishRun()
    ↓
RunResult
    ↓
bỏ RunState cũ
```

---

# 4. PERMANENT STATE

Dữ liệu sở hữu lâu dài KHÔNG thuộc Run.

Ví dụ:

```text
Owned Characters
Owned Outfits
Owned Weapon Skins
Owned Effect Skins
Selected Loadout
Account/Profile data
```

Các dữ liệu này không reset khi chơi lại.

Nguyên tắc:

```text
ACCOUNT / COLLECTION
        ≠
RUN PROGRESSION
```

---

# 5. CHARACTER SYSTEM

Character được thiết kế theo:

```text
Job × Element
```

Các Job dự kiến:

```text
Warrior
Fighter
Swordsman
Mage
Archer
```

Các Element dự kiến:

```text
Metal
Wood
Water
Fire
Earth
```

Điều này cho phép mở rộng tối đa:

```text
5 Jobs × 5 Elements
```

nhưng KHÔNG triển khai toàn bộ ngay.

Character đầu tiên và là vertical slice tham chiếu:

```text
Mage × Water
=
Water Mage
```

Một Character có thể sở hữu:

```text
Basic Attack
Q
E
R
Passive
Evolution
Balance Configuration
```

Character mới không được yêu cầu sửa Combat Core nếu cơ chế đó có thể biểu diễn bằng hệ thống chung.

---

# 6. WATER MAGE

Water Mage là Character tham chiếu đầu tiên.

Target structure:

```text
src/gameplay/characters/jobs/mage/elements/water/
├── WaterMageRuntime.ts
├── formulas.ts
├── skills/
├── passive/
├── evolution/
│   └── schools/
│       ├── long-mach/
│       │   ├── assault/
│       │   └── support/
│       └── human-mach/
│           ├── assault/
│           └── support/
└── balance/
```

WaterMageRuntime là Coordinator của gameplay Water Mage.

Nó KHÔNG được trở thành God Object.

Không gom toàn bộ:

```text
damage
shield
targeting
cooldown
input
animation
VFX
evolution
resource
```

vào `WaterMageRuntime.ts`.

WaterMageRuntime điều phối các module khác.

---

# 7. COMBAT CORE

Combat chứa các luật dùng chung giữa Character và Enemy.

Dùng chung cơ chế không có nghĩa mọi nhân vật có kỹ năng giống nhau.
Core cung cấp luật; Character và Skill quyết định công thức, cấu hình và cách dùng luật đó.
Presentation quyết định hình ảnh, animation, VFX và âm thanh.

Bộ luật nền và ranh giới của từng cơ chế được mô tả trong [CORE_RULES.md](CORE_RULES.md).
Tài liệu này mô tả specification Targeting, Stats và Input của project hiện tại.
Project cũ chỉ dùng để bảo tồn CONTENT đã chốt, không phải nguồn specification cho architecture hoặc hệ thống gameplay/runtime.
Danh sách cơ chế là bản đồ trách nhiệm, không phải yêu cầu tạo toàn bộ module ngay.

Các domain có thể gồm:

```text
damage
healing
shield
hit
targeting
cooldown
resources
status-effects
```

Không bắt buộc tạo folder cho từng domain trước khi chúng thực sự cần tồn tại.

Ví dụ:

Combat Core biết:

```text
Shield hấp thụ damage như thế nào.
```

Water Mage biết:

```text
Thủy Hộ tạo loại Shield nào.
```

Presentation biết:

```text
Shield đó hiển thị như thế nào.
```

Ba trách nhiệm không được trộn lẫn.

---

# 8. GAMEPLAY KHÔNG PHỤ THUỘC PHASER

Đây là architecture rule bắt buộc.

Không import Phaser trực tiếp trong:

```text
src/gameplay/
src/run/
src/account/
src/cosmetics/
```

Không làm:

```ts
class WaterDragonSkill {
  constructor(
    private scene: Phaser.Scene,
    private sprite: Phaser.Physics.Arcade.Sprite,
  ) {}
}
```

Gameplay phải có khả năng chạy/test bằng TypeScript mà không cần render game.

Luồng mong muốn:

```text
Input
  ↓
Character Runtime
  ↓
Skill
  ↓
Combat Core
  ↓
Gameplay Result / Event
  ↓
Presentation Adapter
  ↓
Phaser
  ↓
Sprite / Animation / VFX / Audio
```

Gameplay quyết định:

```text
Chuyện gì xảy ra?
```

Presentation quyết định:

```text
Nó trông và nghe như thế nào?
```

---

# 9. PRESENTATION

Presentation chịu trách nhiệm cho:

```text
Phaser Scene
Sprite
Animation
Camera
VFX
Audio
UI
Depth
Y Sorting
Fake-2.5D rendering
```

Presentation được phép phụ thuộc Gameplay.

Gameplay không được phụ thuộc Presentation.

Ví dụ:

```text
WaterDragonSkill
→ damage / targeting / gameplay

WaterDragonVfx
→ hình ảnh rồng / animation / particle
```

Hai phần phải độc lập.

---

# 10. FAKE 2.5D

Việt Phách sử dụng gameplay 2D.

Không cần Physics 3D.

Cảm giác 2.5D đến từ:

```text
top-down 3/4 camera
Y sorting
shadow
foreground
object occlusion
VFX layering
projectile height simulation nếu cần
```

Render concept:

```text
Ground
  ↓
Ground VFX
  ↓
Characters / Enemies / NPC
  ↓
Foreground Objects
  ↓
Air VFX
  ↓
UI
```

Không đưa visual fake-2.5D vào Combat Core.

---

# 11. MAP AND CAMERA

Map có thể lớn hơn viewport.

Camera follow Player.

Không ép toàn bộ World Map phải vừa màn hình.

Phải phân biệt:

```text
World Coordinate
Asset Pixel Coordinate
Screen Coordinate
Camera Coordinate
```

Thay đổi độ phân giải PNG không được tự động thay đổi:

```text
Player Speed
Collision
Skill Range
AoE
Enemy AI
World Position
```

---

# 12. CHARACTER UNLOCK

Character là nội dung có thể được mở khóa hoặc sở hữu lâu dài.

Ví dụ:

```text
Water Mage
Fire Mage
Water Archer
...
```

Character có thể có gameplay riêng.

Tuy nhiên Character mới không được thiết kế theo nguyên tắc:

```text
trả tiền = mạnh hơn
```

Character khác nhau bằng:

```text
playstyle
skill kit
element
mechanic
role
evolution
```

không phải sức mạnh trả phí.

---

# 13. COSMETIC SYSTEM

Cosmetic không ảnh hưởng Combat.

Ba nhóm Cosmetic chính:

```text
Outfit
Weapon Skin
Effect Skin
```

## Outfit

Thay đổi ngoại hình Character.

Không thay đổi:

```text
HP
MP
Damage
Speed
Hitbox
Cooldown
Skill Multiplier
```

## Weapon Skin

Weapon Skin là ngoại hình của vũ khí.

Các loại vũ khí dự kiến:

```text
Pen
Blade
Hammer
Sword
Bow
```

Ví dụ:

```text
Pen
├── Default Pen
├── Bamboo Pen
├── Water Jade Pen
└── Dragon Pen
```

Weapon Skin có thể thay đổi:

```text
sprite
appearance
animation presentation
trail
sound
```

Weapon Skin KHÔNG thay đổi:

```text
damage
attack speed
range
hitbox
skill multiplier
combat stats
```

## Effect Skin

Effect Skin có thể thay đổi:

```text
VFX
particle
trail
visual animation
color theme
sound
```

Không thay đổi Gameplay Result.

---

# 14. CHARACTER VISUAL COMPOSITION

Hệ thống hiển thị Character nên hướng tới:

```text
Body
  +
Outfit
  +
Weapon Skin
  +
Effect Skin
  =
Final Character Presentation
```

Không tạo Character gameplay mới chỉ vì thay Outfit.

Không gắn Weapon Skin vào damage calculation.

Không gắn Effect Skin vào Skill Formula.

---

# 15. PLAYER LOADOUT

Permanent Loadout có thể được biểu diễn theo hướng:

```ts
interface PlayerLoadout {
  characterId: CharacterId;

  cosmetics: {
    outfitId: string;
    weaponSkinId: string;
    effectSkinId: string;
  };
}
```

Loadout được chọn trước Run.

Run sử dụng Character gameplay tương ứng và Cosmetic chỉ phục vụ Presentation.

---

# 16. SOLO AND CO-OP

Không xây hai game riêng:

```text
SoloGame
CoopGame
```

Thiết kế:

```text
                 Run
                  │
          ┌───────┴───────┐
          │               │
        Solo            Co-op
          │               │
          └───────┬───────┘
                  ↓
             Gameplay Core
```

Khác biệt Co-op sau này có thể nằm ở:

```text
session
party
network synchronization
enemy scaling
revive
player connection state
```

Không implement networking trước khi cần.

Không cài networking framework chỉ để chuẩn bị tương lai.

---

# 17. TARGET ARCHITECTURE

Target architecture dài hạn:

```text
src/
├── app/
│
├── engine/
│   ├── time/
│   ├── input/
│   ├── events/
│   ├── math/
│   └── random/
│
├── gameplay/
│   ├── characters/
│   │   ├── core/
│   │   └── jobs/
│   │
│   ├── combat/
│   ├── progression/
│   └── enemies/
│
├── run/
│
├── world/
│   ├── maps/
│   ├── zones/
│   ├── stages/
│   ├── spawning/
│   ├── collision/
│   ├── transitions/
│   └── npcs/
│
├── account/
│
├── cosmetics/
│
├── multiplayer/
│
├── presentation/
│   ├── phaser/
│   ├── animations/
│   ├── vfx/
│   ├── audio/
│   └── ui/
│
├── dev/
│   ├── sandbox/
│   ├── labs/
│   └── debug/
│
└── config/
```

Đây là TARGET ARCHITECTURE.

KHÔNG tạo toàn bộ folder trên nếu chưa có implementation thực tế.

Architecture document đi trước code.

Folder đi cùng implementation.

---

# 18. ASSET STRUCTURE

Target:

```text
public/assets/
├── characters/
├── outfits/
├── weapons/
├── enemies/
├── maps/
├── npcs/
├── vfx/
├── ui/
└── audio/
```

Binary asset không đặt trong `src`.

Gameplay rule không đặt trong `public/assets`.

Không tạo folder asset trống nếu chưa có asset tương ứng.

---

# 19. SANDBOX AND LABS

## Sandbox

Dùng để thử một hệ thống riêng:

```text
movement
skill
damage
animation
enemy AI
VFX
```

## Labs

Dùng để thử nhiều hệ thống kết hợp.

Ví dụ:

```text
Combat Lab
Character Lab
Boss Lab
Map Lab
Setup Stage
Co-op Lab trong tương lai
```

Setup Stage là developer tool dùng để tạo/thử Stage.

Không để code chỉ phục vụ Lab xâm nhập production Gameplay Core.

---

# 20. BALANCE

Không hard-code balance number rải rác trong Skill implementation nếu chúng là dữ liệu cân bằng.

Tránh:

```ts
const damage = atk * skillCoefficient;
const manaCost = 20;
const cooldown = 3.5;
```

rải ở nhiều file.

Character-specific balance nên được tập trung trong:

```text
character/.../balance/
```

Gameplay đọc Balance Configuration.

Balance Configuration chứa data.

Không biến Balance Configuration thành nơi chứa Gameplay Logic.

---

# 21. TESTING

Gameplay Core phải có thể test mà không cần khởi động Phaser.

Ưu tiên test:

```text
formulas
damage
shield
resource
progression
skills
passive
evolution
Run creation
Run reset
```

Ví dụ:

```text
Given:
Water Mage
ATK = X
MP = Y

When:
Cast Q

Then:
Damage = X
MP = Y
Passive Counter = Z
```

Không cần Sprite để chạy test gameplay.

---

# 22. DEVELOPMENT STRATEGY

Việt Phách phát triển theo Vertical Slice.

Không triển khai 25 Character trước.

Ưu tiên:

```text
Bootstrap
   ↓
Map
   ↓
Camera
   ↓
Player Movement
   ↓
Water Mage
   ↓
Pen
   ↓
Basic Attack
   ↓
Enemy
   ↓
HP / Damage / Death
   ↓
Q / E / R
   ↓
Passive
   ↓
Evolution
   ↓
One Complete Zone
   ↓
One Complete Run
```

Sau khi Vertical Slice ổn mới mở rộng Character, Map và Co-op.

---

# 23. SOURCE OF TRUTH

Khi code cũ và Architecture Documentation mâu thuẫn:

Không tự động rewrite code cũ.

Code cũ có thể là implementation đang hoạt động cần migrate dần.

AI phải:

```text
inspect
→ xác định dependency
→ đề xuất migration
→ thay đổi nhỏ
→ verify
```

Không:

```text
rewrite toàn bộ project
```

chỉ để khớp architecture.

---

# 24. NO EMPTY ARCHITECTURE

Không tạo:

```text
multiplayer/
shop/
account/
cosmetics/
...
```

chỉ để cây thư mục trông đầy đủ.

Chỉ tạo module khi:

1. Feature hiện tại thực sự cần nó; hoặc
2. Một contract thực sự cần thiết để thiết lập boundary hiện tại.

Không tạo placeholder class.

Không tạo empty interface.

Không tạo `.gitkeep` hàng loạt.

Không tạo 50 Zone placeholder.

---

# 25. NO OVERENGINEERING

Không tự ý thêm:

```text
Dependency Injection Framework
ECS Framework
Complex Event Bus
Repository Pattern
Plugin Architecture
Microservices
Backend
Database abstraction
Networking Framework
State framework mới
```

nếu requirement hiện tại chưa cần.

Ưu tiên:

```text
TypeScript type
interface
pure function
small class
composition
explicit dependency
```

---

# 26. AI CODING RULES

Mọi AI coding agent phải đọc file này trước khi thực hiện thay đổi kiến trúc.

Trước khi code:

1. Inspect implementation hiện tại.
2. Xác định feature thuộc domain nào.
3. Kiểm tra abstraction hiện có.
4. Không duplicate system.
5. Không refactor code không liên quan.
6. Không import Phaser vào Gameplay Core.
7. Không đưa Cosmetic vào Combat calculation.
8. Không đưa Run progression vào Permanent Account State.
9. Không hard-code balance nếu đã có Balance Configuration.
10. Không tạo architecture placeholder không được sử dụng.
11. Không thay behavior hiện tại nếu task không yêu cầu.
12. Ưu tiên migration nhỏ và có thể kiểm chứng.

Sau thay đổi phải chạy những validation project hiện có:

```text
lint
typecheck
test
build
```

Nếu một command không tồn tại, báo rõ thay vì tự tạo giả kết quả.

Nếu requirement mới mâu thuẫn architecture này:

DỪNG thay đổi architecture liên quan và báo rõ mâu thuẫn trước.

---

# 27. CURRENT PRIORITY

Ưu tiên hiện tại là hoàn thiện Vertical Slice đầu tiên:

```text
Water Mage
+
Map / Zone
+
Enemy
+
Combat
+
Run Progression
```

Shop, payment và networking thật chưa phải ưu tiên hiện tại.

Architecture chỉ cần không khóa khả năng thêm chúng sau này.
# LEGACY PROJECT POLICY

Việt Phách hiện tại là implementation chính.

Project/version cũ KHÔNG phải codebase cần migrate.

Không được tự động port architecture, runtime, class, dependency hoặc
implementation pattern từ project cũ sang project hiện tại.

Project cũ chỉ được sử dụng như CONTENT REFERENCE khi cần lấy lại công sức
thiết kế đã hoàn thành.

Có thể tham khảo hoặc tái sử dụng:

- Skill design.
- Skill names.
- Skill progression/evolution design.
- Gameplay rules đã được chốt.
- Balance values đã được chốt.
- Character concepts.
- Enemy concepts.
- Sprite assets.
- Animation assets.
- VFX assets.
- Audio assets.
- Map/art assets nếu còn phù hợp.

Không tự động tái sử dụng:

- Runtime architecture.
- Scene architecture.
- Old state management.
- Old combat implementation.
- Old character implementation.
- Old Phaser coupling.
- Old dependency structure.
- Utility/helper code chỉ vì nó đã tồn tại.
- Old technical workaround.

Nếu cần đưa một Skill từ project cũ sang project hiện tại:

OLD SKILL
    ↓
Extract design/specification
    ↓
Verify gameplay requirement
    ↓
Implement again using current architecture
    ↓
Connect current Presentation/VFX
    ↓
Test

Không:

OLD SKILL CODE
    ↓
copy/paste
    ↓
NEW PROJECT

Asset cũ có thể được copy/tái sử dụng nếu asset đó vẫn phù hợp với art direction
hiện tại.

Code điều khiển asset/VFX phải tuân theo architecture hiện tại.

Khi code cũ và architecture hiện tại khác nhau:

ARCHITECTURE HIỆN TẠI LUÔN ĐƯỢC ƯU TIÊN.

Project cũ là reference, không phải source of truth.
## Development Rules

Stage Kháng Chiến: mở `http://127.0.0.1:5173/?stage=khang-chien&character=mage` hoặc chọn **Dev → Stage · Kháng Chiến**.
Cảnh mở đầu tự chạy, sau bảng chỉ số chọn **Ra trận**. Hạ 100/150/200 quái để qua Map 1/2/3,
Map 4 đánh Giáp Tai Ương; còn 20% HP bắt đầu Thủy Long Giáng Thế. Sau 1,5s quả cầu bay,
nhấn/thả Q liên tục trong 5s để phóng tối đa 10 rồng từ trượng, không MP/CD. Giữ Q không tự bắn.
Mỗi rồng tới tâm kích Siết rồi tăng Siết; cầu lớn theo số rồng tới thật. Hết thời gian,
rồng giáng thế và Bát Đại Hải Long khép lại cảnh. Không tự bù Q thiếu; Dev/bảng nhân vật/mất focus tạm dừng.
Các nút Dev **Bỏ qua mở đầu / Hoàn thành đợt hiện tại / Đưa boss về 40%** giúp kiểm tra nhanh.
**Dev → Thử Thủy Long Giáng Thế** đi qua các đợt bằng cùng director rồi vào thẳng cảnh thử Q.
Viết lời dẫn tại `src/config/stages/khangChienStory.ts`; tuning trial ở `src/config/balance/khangChien.ts`.
Đại chiêu cuối hiện là chuỗi diễn riêng của Stage, chưa mở tiến hóa Lv15 toàn game.
Buff riêng Stage: dùng thành công 4 Q để cường hóa Q thứ 5 thành Thủy Ngục giữ chân 2s, rồng trồi thẳng lên ở giây 1,75 và gây đúng một lần sát thương Q. Q chọn mặt đất theo con trỏ, không tự khóa tâm Thủy Vực Siết; đầm E, hitbox Q/ngục/rồng trồi dùng chung bán kính có tăng theo ải. Q có bộ đếm riêng, không tiêu Mạch; READY chỉ dùng cho E. Thủy Pháo click bắn vận tối đa, hồi 3s, kích thước và bán kính đạn ×1,5, đẩy lùi 24 world units theo va chạm thật (tuning thử nghiệm). Thủy Ngục hiển thị cầu nước sáng bao mục tiêu; không tạo hiệu ứng đầm Thủy Hãm khi cầu đáp. Sát thương toàn bộ quái Stage ×1,5.
Giữ sát thương Q hiện tại và cách tích nội tại. E READY có bán kính đầm ×1 / ×1,3 / ×1,6 / ×1,9 ở ải 1–4;
bản sao giữ vùng và control, chỉ lượng damage nhân CopyRate. Bộ kỹ năng ngoài Stage giữ nguyên.
Kết giới có **8.000 HP**, không tự hồi; vỡ kết giới là thất bại.
Ở ngoài kết giới, quái ưu tiên đuổi bạn; vào trong thì chúng chuyển sang đánh kết giới.
Tiếp viện tràn vào theo đường Tây, Nam, Đông Nam. F3 hiển thị ba tuyến để kiểm tra.
HUD cảnh báo khi HP kết giới còn ≤25%.
Sau khi dựng kết giới, đòn đánh đầu tiên nhắm vào kết giới bật lời cảnh báo 8s để người chơi ra ngoài đỡ đòn. Khi đang đứng trong vùng trú ẩn, HUD hướng dẫn E thường tạo khiên, E READY đặt đầm khống chế. Chết hoặc kết giới vỡ hiện nút Chơi lại Stage ngay; chơi lại tạo lượt mới nhưng bắt đầu ở mốc kết giới đã dựng (giây 24), đầy HP/MP/kết giới, mở chiến đấu và phát nhạc Map 1 từ giây 24.
Kết thúc mỗi đợt có cảnh chuyển map 8,7s: màn hình rung, MP tụt còn tối đa 5%,
Pháp Sư chạy về kết giới cầu xin Thần Thành Hoàng và rút nước ngầm. Nghi thức hồi
đầy MP cùng 4.000 HP kết giới, rồi nhân vật quay ra chiến đấu và nền đổi sang map kế tiếp.

Trước khi thay đổi Gameplay Core, Character, Combat, Progression hoặc Input,
phải đọc:

- `CORE_RULES.md` ở root project

`CORE_RULES.md` là source of truth cho các boundary gameplay dùng chung.

Không tạo toàn bộ các hệ thống được liệt kê trong CORE_RULES trước.
Chỉ implement cơ chế khi feature hiện tại thực sự cần.

Character/Skill được phép định nghĩa behavior riêng,
nhưng không được phá boundary của Core.

Bát Đại Hải Long dùng asset formation.png do người thiết kế cung cấp: 4 tư thế tụ trong 2,2s rồi 8 rồng Q lao đồng thời trong 0,9s, ưu tiên boss và chia mục tiêu địch còn sống. Tuning riêng cinematic, impact ở giây 10,6 và khép stage ở giây 12.
