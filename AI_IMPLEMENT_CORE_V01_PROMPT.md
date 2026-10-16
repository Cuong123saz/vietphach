# PROMPT TRIỂN KHAI CORE GAMEPLAY V0.1 --- VIỆT PHÁCH

Bạn đang làm việc trực tiếp trên project **Việt Phách**.

## Vai trò

Hãy làm việc như một **Senior Gameplay/Backend Architecture Engineer**
chuyên TypeScript.

Mục tiêu không phải viết thật nhiều code. Mục tiêu là xây **Gameplay
Core nhỏ, rõ, test được, có boundary tốt và không phá những phần đang
chạy**.

`CORE_RULES.md` ở root project là **nguồn luật chính thức**. Không được
tự thay đổi luật gameplay để làm implementation dễ hơn.

------------------------------------------------------------------------

## Nhiệm vụ

### Bước 1 --- Đọc trước khi sửa

Trước tiên:

1.  Đọc `CORE_RULES.md`.
2.  Đọc cấu trúc project hiện tại.
3.  Xác định code đang chịu trách nhiệm cho:
    -   player runtime;
    -   movement/collision;
    -   character state;
    -   run state;
    -   enemy/spawn nếu đã có;
    -   test setup;
    -   balance/config nếu đã có.
4.  Không port gameplay mechanic từ project cũ.
5.  Không sửa map/camera/movement/collision/animation nếu task này không
    cần.

Sau khi đọc, triển khai trực tiếp. Không dừng lại chỉ để viết kế hoạch
nếu không có blocker thật sự.

------------------------------------------------------------------------

## Phase 1 --- Character Stats và Resources

Triển khai foundation cho:

``` text
maxHp
maxMp
atk
def
mpRegen
attackSpeedRating
attackInterval
critChance
critDamage
moveSpeed
```

Phân biệt:

``` text
Base Stats
Potential
Modifiers
Effective Stats
Current Resources
```

Effective Stats phải derive lại được; không cộng dồn mutable stat gây
drift.

Current Resources tối thiểu:

``` text
currentHp
currentMp
```

Khi MaxHP/MaxMP thay đổi, giữ tỷ lệ current/max theo `CORE_RULES.md`.

Không tạo `hpRegen`.

------------------------------------------------------------------------

## Phase 2 --- Mage V0.1

Base Mage:

``` text
MaxHP = 140
MaxMP = 160
ATK = 12
DEF = 8
MP Regen = 2/s
Attack Speed Rating = 0
Attack Interval = 1.40s
Minimum Attack Interval = 0.65s
Crit Chance = 0.05
Crit Damage = 1.50
```

Potential:

``` text
STR
-> hiện tại không tác dụng

DEX
-> +0.4 DEF
-> +1 Attack Speed Rating

SPI
-> +0.5 ATK
-> +4 MaxMP
-> +0.04 MP/s

VIT
-> +6 MaxHP

LUK
-> CritChance = 0.05 + 0.45 * LUK / (LUK + 75)
```

Attack Interval:

``` text
max(
  0.65,
  1.40 / (1 + attackSpeedRating / 100)
)
```

Balance number phải tập trung trong config.

------------------------------------------------------------------------

## Phase 3 --- Potential

Có đúng:

``` text
strength
dexterity
spirit
vitality
luck
```

Core Potential quản lý:

-   earned points;
-   unspent points;
-   allocation;
-   validation;
-   reset.

Không hard-code công thức Job vào Potential Core.

Luồng:

``` text
allocatePotential(...)
-> validate
-> update allocation
-> derive Effective Stats
-> preserve HP/MP ratio
```

------------------------------------------------------------------------

## Phase 4 --- MP Regen, Healing và Resource Restore

### MP Regen

``` text
currentMp += mpRegen * deltaTime
clamp 0..maxMp
```

### Healing

Tạo boundary tối thiểu để HP có thể được hồi bởi:

-   self;
-   ally;
-   external skill/effect.

Có thể dùng API/model tương đương:

``` text
heal(target, amount)
```

Yêu cầu:

-   clamp tại `maxHp`;
-   không có passive HP Regen;
-   không revive target đã chết;
-   không tự đặt healing scaling, crit heal hoặc healing bonus.

### Resource Restore

Tạo boundary tối thiểu để một source có thể cung cấp Resource cho
self/ally.

Hướng API:

``` text
restoreResource(target, resourceType, amount)
```

Yêu cầu:

-   clamp tại Max Resource;
-   tách khỏi MP Regen;
-   không hard-code thành `restoreAllyMp()` nếu abstraction chung hợp
    lý;
-   không tự đặt hệ số support;
-   chuẩn bị để sau này nghề khác có Resource khác MP.

`Resource Regen Buff` chỉ cần boundary/extensibility hợp lý nếu kiến
trúc hiện tại cần; không xây một buff framework lớn chỉ cho task này.

### Lifesteal

Chưa triển khai công thức Lifesteal.

Chỉ bảo đảm kiến trúc Healing sau này có thể nhận healing từ Lifesteal
mà không cần tạo passive `hpRegen`.

------------------------------------------------------------------------

## Phase 5 --- Water Mage Scaling

Water Mage:

``` text
Damage dùng ATK theo công thức của từng kỹ năng.
MaxMP là resource và chỉ scale utility/support khi kỹ năng định nghĩa rõ.
```

Không có WP / Water Power / Thủy Lực hoặc offensive stat dẫn xuất từ MaxMP.

Chưa triển khai passive Water Mage.

------------------------------------------------------------------------

## Phase 6 --- Element Core

Có đúng:

``` text
METAL
WOOD
WATER
FIRE
EARTH
```

Tương khắc:

``` text
WOOD  -> EARTH
EARTH -> WATER
WATER -> FIRE
FIRE  -> METAL
METAL -> WOOD
```

Tương sinh:

``` text
WOOD  -> FIRE
FIRE  -> EARTH
EARTH -> METAL
METAL -> WATER
WATER -> WOOD
```

Core phải resolve quan hệ tập trung.

Không hard-code Water/Fire trong skill.

Tương sinh hiện chưa mặc định thay đổi Damage.

------------------------------------------------------------------------

## Phase 7 --- Damage Core

Mọi Damage phải mang Element.

Pipeline:

``` text
Projectile / Hitbox / AoE chạm hợp lệ
-> Raw Damage
-> Crit
-> DEF
-> Ngũ Hành
-> Final Damage
-> HP
```

Ngũ Hành V0.1:

``` text
Advantage = x1.25
Disadvantage = x0.80
Normal = x1.00
```

Các hệ số nằm trong config.

Player và Enemy dùng cùng Damage Resolver.

Không có:

-   Accuracy;
-   Evasion;
-   RNG miss;
-   Physical/Magic/Neutral Damage;
-   Physical/Magic DEF;
-   Element Damage Bonus;
-   Element Resistance.

Nếu projectile/hitbox/AoE không chạm thì không tạo Damage.

------------------------------------------------------------------------

## Phase 8 --- Enemy Element

Normal Enemy:

``` text
random 1/5 Element khi spawn
```

Elite:

``` text
random 1/5 Element khi spawn
```

Boss:

``` text
fixed Element từ definition
```

Element là data/state, không tạo 5 class Enemy theo hệ.

Thiết kế state/API sao cho sau này server/host authoritative có thể
truyền Element đã roll vào Enemy.

Không triển khai networking trong task này.

------------------------------------------------------------------------

## Phase 9 --- Level / Run Progression

Run bắt đầu:

``` text
level = 1
exp = 0
potential = 0
unspentPotential = 0
```

Mỗi level:

``` text
+5 Potential
+1 Skill Point
```

Mốc hiện tại đến Lv15.

Run Reset phải reset Run Progression nhưng không reset Meta/Account data
theo `CORE_RULES.md`.

------------------------------------------------------------------------

## Targeting

Kiến trúc phải có khả năng mở rộng:

``` text
SELF
ALLY
ENEMY
ALLY_OR_ENEMY
GROUND
DIRECTION
```

Targeting phải có thể tái sử dụng cho:

-   Damage;
-   Healing;
-   Shield;
-   Buff;
-   Resource Restore.

Không cần xây hệ thống lớn nếu project hiện tại chưa cần toàn bộ mode.

------------------------------------------------------------------------

## Không được tự làm

Không tự thêm:

``` text
accuracy
evasion
hpRegen
physicalDamage
magicDamage
neutralDamage
physicalDefense
magicDefense
elementDamageBonus
elementResistance
```

Không tự:

-   tạo RNG miss;
-   tạo healing formula mới;
-   tạo lifesteal formula;
-   tạo support resource scaling;
-   tạo bonus Damage từ tương sinh;
-   tạo Q/E/R/passive/evolution nếu chưa được yêu cầu;
-   port mechanic từ project cũ;
-   xây networking;
-   xây monetization;
-   refactor map/camera/movement unrelated;
-   tạo hàng loạt file/folder rỗng.

------------------------------------------------------------------------

## Yêu cầu kiến trúc

-   TypeScript strict.
-   Ưu tiên pure gameplay logic độc lập Phaser.
-   Phaser/Scene chỉ integration/presentation khi hợp lý.
-   Dependency một chiều.
-   Balance number tập trung trong config.
-   Không duplicate luật.
-   Không magic number rải rác.
-   Không over-engineer.
-   Chỉ tạo file thực sự được dùng.
-   Tận dụng cấu trúc project hiện tại trước khi tạo abstraction mới.

------------------------------------------------------------------------

## Test bắt buộc

### Mage

``` text
1 DEX -> +0.4 DEF, +1 Attack Speed Rating
1 SPI -> +0.5 ATK, +4 MaxMP, +0.04 MP/s
1 VIT -> +6 MaxHP
1 STR -> không đổi Mage Effective Stats
LUK -> đúng Crit formula
```

### Resources

-   Preserve CurrentHP ratio khi MaxHP đổi.
-   Preserve CurrentMP ratio khi MaxMP đổi.
-   MP Regen clamp MaxMP.
-   Resource Restore clamp Max Resource.
-   Resource Restore hoạt động với target hợp lệ khác source.

### Healing

-   Heal self.
-   Heal ally/target hợp lệ.
-   Clamp MaxHP.
-   Không heal vượt MaxHP.
-   Không tự revive dead target.
-   Không có passive HP Regen.

### Element

Kiểm tra đủ vòng tương khắc và tương sinh.

### Damage

``` text
WATER -> FIRE = advantage
FIRE -> WATER = disadvantage
EARTH -> WATER = advantage
WATER -> EARTH = disadvantage
WATER -> WOOD = normal
```

Player và Enemy với cùng input phải đi qua cùng luật.

------------------------------------------------------------------------

## Kiểm tra cuối

Sau implementation:

1.  Chạy test.
2.  Chạy typecheck.
3.  Chạy lint nếu project có.
4.  Chạy build.
5.  Không sửa unrelated errors bằng refactor lớn.

------------------------------------------------------------------------

## Báo cáo cuối

Trả lời ngắn theo format:

``` text
A. Đã đọc
- các module liên quan

B. Đã tạo/sửa
- file -> trách nhiệm

C. Luồng đã có
- Potential -> Effective Stats -> Resources
- Healing
- Resource Restore
- Element -> Damage Resolver -> Final Damage
- Enemy Element
- Level/Run nếu đã triển khai

D. Test
- pass/fail
- typecheck
- lint
- build

E. Cố ý chưa làm
- passive
- Q/E/R
- lifesteal formula
- healing scaling
- support scaling
- evolution cụ thể
- networking
- monetization

F. Blocker / luật chưa chốt
- chỉ báo cáo
- không tự phát minh luật
```

## Mục tiêu hoàn thành

Sau task này, foundation phải đủ để bước tiếp theo làm vertical slice:

``` text
Water Mage
-> Thủy Áp
-> projectile thật
-> Enemy
-> Damage Core
-> Crit
-> DEF
-> Ngũ Hành
-> Final Damage
```

và đồng thời đủ boundary để sau này Support Mage có thể:

``` text
heal(ally, amount)
restoreResource(ally, MP, amount)
```

mà không phải viết lại Character/Combat Core.

Dừng ở Core. Không tự triển khai tiếp toàn bộ bộ kỹ năng.
