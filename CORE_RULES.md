**\# VIỆT PHÁCH --- CORE RULES**

**\*\*Phiên bản:\*\*** Core Gameplay V0.1\\

**\*\*Trạng thái:\*\*** Mốc luật chính thức hiện tại\\

**\*\*Vai trò:\*\*** Nguồn tham chiếu chính cho AI/developer. Nếu
implementation

hoặc skill mâu thuẫn với tài liệu này, phải chốt và sửa luật trước khi

sửa code.

------------------------------------------------------------------------

**\## 1. Nguyên tắc nền**

Việt Phách là Action RPG solo/co-op. Combat dùng movement, projectile,

hitbox và AoE thật. Player, Ally, Enemy, Elite và Boss dùng chung

Gameplay Core.

Các nghề hiện tại: \*\*Kiếm khách, Chiến binh, Pháp sư, Đấu sĩ, Cung

thủ\*\*.

Skill không được tự triển khai lại các luật chung như Crit, DEF, Ngũ

Hành, HP/Resource mutation, Potential, Level hoặc Run Reset.

------------------------------------------------------------------------

**\## 2. Stats chung**

  Stat                  Ý nghĩa

  --------------------- ---------------------------

  \`maxHp\`               HP tối đa

  \`maxMp\`               MP tối đa

  \`atk\`                 Tấn công chung

  \`def\`                 Phòng thủ chung

  \`mpRegen\`             Tốc độ tự hồi MP

  \`attackSpeedRating\`   Điểm tốc độ đánh

  \`attackInterval\`      Thời gian giữa hai đòn

  \`critChance\`          Tỷ lệ chí mạng

  \`critDamage\`          Hệ số sát thương chí mạng

  \`moveSpeed\`           Tốc độ di chuyển

**\### Không tồn tại**

\-   \`accuracy\`.

\-   \`evasion\`.

\-   HP Regen thụ động / \`hpRegen\`.

\-   Physical Attack/Damage/Defense.

\-   Magic Attack/Damage/Defense.

\-   Neutral Damage.

\-   Element Damage Bonus.

\-   Element Resistance.

Toàn game chỉ dùng **\*\*một ATK, một DEF và Ngũ Hành\*\***.

------------------------------------------------------------------------

**\## 3. Potential**

Có đúng 5 loại:

\`\`\` ts

strength   // Sức mạnh

dexterity  // Khéo léo

spirit     // Tinh thần

vitality   // Sức khỏe

luck       // May mắn

\`\`\`

Potential Core chỉ quản lý tổng điểm, điểm chưa dùng, allocation,

validation, reset và yêu cầu derive lại stats.

Potential Core không hard-code tác dụng của từng điểm. Công thức

Potential thuộc từng Job.

------------------------------------------------------------------------

**\## 4. Mage Base Stats V0.1**

  Stat                      Base

  --------------------- --------

  \`maxHp\`                    140

  \`maxMp\`                    160

  \`atk\`                       12

  \`def\`                        8

  \`mpRegen\`               2 MP/s

  \`attackSpeedRating\`          0

  \`attackInterval\`        1.40 s

  \`minAttackInterval\`     0.65 s

  \`critChance\`              0.05

  \`critDamage\`              1.50

Các số balance phải tập trung trong config.

------------------------------------------------------------------------

**\## 5. Mage Potential Formula V0.1**

\`\`\` text

1 STR

-\> hiện tại không thay đổi Mage Effective Stats

\`\`\`

\`\`\` text

1 DEX

-\> +0.4 DEF

-\> +1 Attack Speed Rating

\`\`\`

\`\`\` text

1 SPI

-\> +0.5 ATK

-\> +4 Max MP

-\> +0.04 MP/s

\`\`\`

\`\`\` text

1 VIT

-\> +6 Max HP

\`\`\`

Luck:

\`\`\` text

CritChance = 0.05 + 0.45 \* LUK / (LUK + 75)

\`\`\`

Attack Interval:

\`\`\` text

AttackInterval =

max(

  0.65,

  1.40 / (1 + AttackSpeedRating / 100)

)

\`\`\`

DEX không tăng Accuracy/Evasion vì hai hệ thống đó không tồn tại.

------------------------------------------------------------------------

**\## 6. Base Stats, Effective Stats và Current Resources**

Phải tách:

\`\`\` text

BASE STATS

    +

POTENTIAL

    +

MODIFIERS

    ↓

EFFECTIVE STATS

    ↓

CURRENT RESOURCES

\`\`\`

Không cộng dồn trực tiếp vào Effective Stats mỗi lần allocate. Effective

Stats phải derive lại được từ nguồn dữ liệu.

------------------------------------------------------------------------

**\## 7. Current HP/MP khi Max thay đổi**

Khi MaxHP/MaxMP thay đổi, giữ nguyên tỷ lệ current/max:

\`\`\` text

newCurrent =

  oldMax \> 0

    ? newMax \* (oldCurrent / oldMax)

    : newMax

\`\`\`

Sau đó clamp:

\`\`\` text

0 \<= current \<= max

\`\`\`

Áp dụng cho cả HP và MP. Cộng Potential không được trở thành cách hồi

tài nguyên miễn phí.

------------------------------------------------------------------------

**\## 8. HP, Healing, Lifesteal và Resource Restore**

**\### 8.1. HP**

Không có HP Regen thụ động theo thời gian.

HP chỉ được phục hồi bởi mechanic rõ ràng như:

\-   **\*\*Healing:\*\*** hồi máu từ skill/effect.

\-   **\*\*Lifesteal:\*\*** hút máu theo luật riêng khi mechanic đó được
triển

    khai.

Healing có thể đến từ:

\-   Chính nhân vật.

\-   Đồng đội.

\-   Skill/effect bên ngoài.

\-   Vật phẩm hoặc nguồn khác nếu sau này game có.

Healing luôn clamp:

\`\`\` text

0 \<= currentHp \<= maxHp

\`\`\`

Healing **\*\*không tự hồi sinh\*\*** mục tiêu đã chết. Revive, nếu có
sau này,

là mechanic riêng.

Không tự chốt công thức, hệ số hoặc giới hạn Healing/Lifesteal trong

V0.1.

**\### 8.2. MP Regen**

MP Regen là cơ chế tự hồi MP theo thời gian:

\`\`\` text

currentMp += mpRegen \* deltaTime

currentMp = clamp(currentMp, 0, maxMp)

\`\`\`

\`mpRegen\` là cơ chế Core dùng chung, nhưng Base Regen và cách
Potential

ảnh hưởng đến Regen do từng Job định nghĩa.

**\### 8.3. Resource Restore**

Một skill/effect có thể \*\*cung cấp năng lượng cho bản thân hoặc đồng

đội\*\*.

Đây là mechanic riêng với MP Regen:

\`\`\` text

MP Regen

-\> tự hồi theo thời gian

Resource Restore

-\> một nguồn chủ động phục hồi Resource cho target

Resource Regen Buff

-\> buff tạm thời làm thay đổi tốc độ hồi Resource

\`\`\`

Ví dụ Pháp Sư hỗ trợ có thể:

\`\`\` text

Ally: 30 / 100 MP

Support Mage restore 25 MP

-\> Ally: 55 / 100 MP

\`\`\`

Nếu:

\`\`\` text

Ally: 90 / 100 MP

restore 25 MP

-\> Ally: 100 / 100 MP

\`\`\`

Resource không được vượt Max Resource.

Core không được hard-code support thành \`restoreAllyMp()\` nếu có thể

dùng abstraction Resource chung. Hướng API:

\`\`\` text

restoreResource(target, resourceType, amount)

\`\`\`

Skill quyết định nó phục hồi Resource nào.

Sau này một nghề có Resource khác MP thì Core vẫn có thể tái sử dụng.

Không tự giả định mọi Resource đều là MP.

**\### 8.4. Healing và Resource Restore là hai hệ khác nhau**

\`\`\` text

heal(target, amount)

-\> thay đổi HP

restoreResource(target, resourceType, amount)

-\> thay đổi Resource

\`\`\`

Không dùng Resource Restore để hồi HP và không dùng Healing để hồi MP.

------------------------------------------------------------------------

**\## 9. Water Mage Scaling**

Water Mage không có stat `WP` hoặc `Water Power`. `Thủy Lực` là tên mechanic tiến hóa B1, không phải stat.

Luật:

-   `ATK` là offensive scaling chính của Water Mage.

-   `MaxMP` là Resource. Skill có thể dùng `MaxMP` cho mechanic
    utility/support hoặc damage nếu công thức skill đó định nghĩa rõ, nhưng `MaxMP` không mặc
    định tạo thêm offensive stat.

-   `Spirit` đã tăng `ATK`, `MaxMP` và `MP Regen` theo Mage Potential
    Formula.

-   Không tạo derived offensive stat từ `Spirit` hoặc `MaxMP` chỉ để
    scale Damage.

-   Damage/skill scaling cụ thể phải nằm trong formula của từng skill và
    đi qua Damage Core chung.

-   Không được tự đưa `WP` trở lại implementation. Nếu sau này muốn thêm
    một stat nghề mới, phải thay đổi `CORE_RULES.md` trước.

------------------------------------------------------------------------

**\## 10. Element Core**

Có đúng 5 hệ:

\`\`\` ts

type Element =

  \| 'metal'

  \| 'wood'

  \| 'water'

  \| 'fire'

  \| 'earth';

\`\`\`

Tương ứng: Kim, Mộc, Thủy, Hỏa, Thổ.

Mọi Damage Request/Instance hợp lệ phải mang một Element. Không có

Physical/Magic/Neutral Damage.

------------------------------------------------------------------------

**\## 11. Tương khắc**

\`\`\` text

Mộc  -\> Thổ

Thổ  -\> Thủy

Thủy -\> Hỏa

Hỏa  -\> Kim

Kim  -\> Mộc

\`\`\`

Tương khắc tác động Damage hai chiều và bình đẳng cho Player/Enemy.

Ví dụ:

\`\`\` text

WATER -\> FIRE  = khắc hệ

FIRE  -\> WATER = bị khắc hệ

EARTH -\> WATER = khắc hệ

WATER -\> EARTH = bị khắc hệ

\`\`\`

------------------------------------------------------------------------

**\## 12. Tương sinh**

\`\`\` text

Mộc  -\> Hỏa

Hỏa  -\> Thổ

Thổ  -\> Kim

Kim  -\> Thủy

Thủy -\> Mộc

\`\`\`

Core phải nhận biết tương sinh, nhưng V0.1 không mặc định tăng/giảm

Damage. Skill, buff, shield hoặc co-op sau này có thể sử dụng quan hệ

này.

------------------------------------------------------------------------

**\## 13. Element Relation**

Có thể dùng model:

\`\`\` ts

type ElementRelation =

  \| 'same'

  \| 'generates'

  \| 'generatedBy'

  \| 'overcomes'

  \| 'overcomeBy'

  \| 'unrelated';

\`\`\`

Không hard-code quan hệ Ngũ Hành trong từng skill.

------------------------------------------------------------------------

**\## 14. Hệ số Ngũ Hành V0.1**

\`\`\` text

Khắc hệ    -\> x1.25

Bị khắc    -\> x0.80

Không khắc -\> x1.00

\`\`\`

Các hệ số nằm trong balance config.

Ngũ Hành là tầng nguyên tố duy nhất điều chỉnh Damage đầu ra.

------------------------------------------------------------------------

**\## 15. Character Element và Attack Element**

Phải tách:

\`\`\` text

character.element

damage.element

\`\`\`

Combat Core không được mặc định \`damage.element = character.element\`.

Boss hệ Earth có skill Fire thì skill đó phải xét

\`FIRE vs target.element\`.

------------------------------------------------------------------------

**\## 16. Hit/Miss**

Không có Accuracy/Evasion và không có RNG miss.

Đòn trượt khi:

\-   Projectile không chạm target.

\-   Target rời quỹ đạo projectile.

\-   Target rời AoE trước thời điểm Damage.

\-   Melee hitbox không chạm target.

Nếu collision/hit hợp lệ đã xảy ra, không roll né thêm lần nữa.

------------------------------------------------------------------------

**\## 17. Damage Pipeline**

\`\`\` text

ATTACK / SKILL

      ↓

PROJECTILE / HITBOX / AOE

      ↓

Có va chạm hợp lệ?

  ├─ KHÔNG -\> kết thúc, không Damage

  └─ CÓ

      ↓

RAW DAMAGE

      ↓

CRITICAL

      ↓

DEF

      ↓

NGŨ HÀNH

      ↓

FINAL DAMAGE

      ↓

HP

\`\`\`

Skill không tự roll Crit, tính DEF, tính Ngũ Hành hoặc trừ HP.

------------------------------------------------------------------------

**\## 18. DEF**

Game chỉ có một \`DEF\`, dùng chung cho mọi Element.

Không có Physical DEF, Magic DEF hoặc Element Resistance.

**\### DEF Formula V0.1**

DEF dùng diminishing returns với hằng số trong balance config:

\`\`\` text

DEF_SCALE = 50

DEFReduction = DEF / (DEF + DEF_SCALE)

DamageAfterDEF = DamageBeforeDEF \* DEF_SCALE / (DEF + DEF_SCALE)

\`\`\`

Hai biểu thức tương đương: DamageAfterDEF = DamageBeforeDEF \* (1 -
DEFReduction).

DEF áp dụng sau Crit và trước Ngũ Hành. Player, Ally, Enemy, Elite và
Boss

dùng chung công thức; DEF của target là input, không có resolver riêng
theo actor.

V0.1 yêu cầu DEF \>= 0. Không có xuyên DEF, % xuyên DEF, giảm DEF, bỏ
qua DEF

hoặc hard cap giảm sát thương. Không có Physical/Magic/Element DEF.

Không làm tròn từng bước; Final Damage giữ dạng number. Quy tắc
floor/round/ceil

cho Final Damage chưa chốt.

------------------------------------------------------------------------

**\## 19. Targeting**

Kiến trúc cần có khả năng mở rộng:

\`\`\` text

SELF

ALLY

ENEMY

ALLY_OR_ENEMY

GROUND

DIRECTION

\`\`\`

Targeting dùng chung cho Damage, Healing, Shield, Buff và Resource

Restore khi phù hợp.

Target hợp lệ không đồng nghĩa projectile chắc chắn trúng.

------------------------------------------------------------------------

**\## 20. Enemy Element**

\-   **\*\*Normal Enemy:\*\*** random 1 trong 5 hệ khi spawn.

\-   **\*\*Elite:\*\*** random 1 trong 5 hệ khi spawn.

\-   **\*\*Boss:\*\*** hệ cố định từ Enemy/Stage definition.

Không tạo 5 class quái chỉ vì khác Element. Element là data/state.

Trong co-op, Element của cùng một Enemy phải đến từ một nguồn

authoritative chung; mỗi client không được tự random riêng.

------------------------------------------------------------------------

**\## 21. Level và Potential trong Run**

Bắt đầu Run:

\`\`\` text

level = 1

exp = 0

STR = 0

DEX = 0

SPI = 0

VIT = 0

LUK = 0

unspentPotential = 5

\`\`\`

Mỗi Level:

\`\`\` text

+5 Potential Points

+1 Skill Point

\`\`\`

V0.1 dự kiến đến Lv15:

\`\`\` text

5 điểm ban đầu + 14 lần lên cấp \* 5 = 75 Potential Points

\`\`\`

Không cap riêng từng Potential. Tổng allocation không được vượt tổng

điểm đã kiếm được.

EXP tham khảo dự án cũ: chi phí từ cấp L lên cấp L+1 là `20 + (L - 1) * 10`.
Đến Lv15, EXP về 0 và không nhận thêm thưởng cấp. Đây là curve thử nghiệm;
EXP thưởng từ quái/encounter chưa chốt và không tự thêm trong Sandbox.

------------------------------------------------------------------------

**\## 22. Potential Validation**

Tối thiểu:

\-   Amount hợp lệ.

\-   Đủ \`unspentPotential\`.

\-   Allocation không âm.

\-   Tổng điểm dùng không vượt tổng điểm kiếm được.

Không làm:

\`\`\` ts

mage.maxMp += 4;

\`\`\`

Luồng đúng:

\`\`\` text

allocatePotential(SPIRIT, 1)

        ↓

validate

        ↓

update allocation

        ↓

derive Effective Stats

        ↓

preserve HP/MP ratio

\`\`\`

------------------------------------------------------------------------

**\## 23. Evolution**

Các mốc:

\`\`\` text

Lv5

Lv7

Lv9

Lv11

Lv13

Lv15

\`\`\`

Evolution Core chỉ quản lý điều kiện level, lựa chọn hợp lệ và lựa chọn

đã lưu trong Run. Nhánh riêng của Water Mage để triển khai sau.
Khung Water Mage tham khảo dự án cũ: Lv5 chọn Thủy Long Mạch / Thủy Nhân Mạch;
Lv7 chọn Công Phá / Tiếp Dẫn của nhánh đó. Lv9/11/13/15 giữ cùng hướng.
Tên hiện tại: A1 là Thủy Nhân Mạch; B1 là Thủy Long Mạch. Ưu tiên B1.
A2 và B2 (Tiếp Dẫn) bị khóa ở mọi mốc từ Lv7 đến Lv15, vẫn giữ dữ liệu
để mở sau. Khóa hướng độc lập với việc hiệu ứng đã triển khai; không được
chọn A2/B2 kể cả khi định nghĩa hiệu ứng có sẵn.
Không bỏ qua mốc trước, không chọn lại mốc đã lưu. Chỉ cho chọn mốc đã có
hiệu ứng gameplay, không cấp chỉ số giả. Không nhập công thức WP cũ.

### B1 — Thủy Long Mạch, Lv5–Lv13

A1 là Thủy Nhân Mạch và B1 là Thủy Long Mạch. Cả hai đã triển khai đến Lv15;
A2/B2 tiếp tục khóa. Specification lượt chơi thường mới tại
`docs/design/Water-Mage-Assault-Paths.md`; tuning tại `waterEvolution.ts`.

- Lv5: dây sáng hơn. Mỗi lần thực nhận +1 Mạch, bản thân và mỗi người đang
  nối nhận 1% Max MP của Mage, clamp theo Max MP người nhận. Full Charge HIT,
  Q gốc HIT, E thường áp khiên, R tạo kính đều dùng event cấp Mạch hiện có.
  Đã 4/4, MISS, bản sao, DoT, Siết không tự cấp Mạch hoặc MP.
- E thường (chưa READY) ở mọi cấp vẫn tạo khiên 20% Max MP, +1 Mạch và giữ
  lifecycle lớp khiên 8s; không chia/refresh dây đang có.
- Lv7 Thủy Hãm: chỉ E READY đổi thành chọn vị trí mặt đất trong màn hình;
  bấm E vào chọn, click commit MP/CD và tiêu 4 Mạch, E/Esc hủy trước commit.
  Không tạo khiên. Vẫn chọn mù ally theo % HP/HP/ID để nối và refresh dây 10s,
  hoặc solo cấp 5×level SPI trong 10s replace+refresh. Có ally ngoài màn hình
  không cấp SPI; vẫn đặt đầm và tiêu READY, giữ/refresh dây còn hợp lệ.
  Đầm gốc mới thay đầm gốc cũ, tồn tại 2s, damage hình thành một lần =20% Max MP.
  Thông số thử: bán kính50, hút60px/s, giảm20% tốc chạy; kéo đi qua Collision Core.
- Lv9 Sóng Trong Đầm: bán kính×1.30=65. Nội tại **Thủy Lực** là tên mechanic,
  không phải offensive stat/WP: Q damage×.5, thời gian vận×.5. Khi có đầm Q
  tự khóa tâm đầm; Q HIT ít nhất một Enemy trong đầm kéo thêm12px và gia hạn
  .5s một lần/cast. Mỗi đầm tổng gia hạn không quá2s; MISS không gia hạn.
- Lv11 Thủy Vực Siết: bán kính tiếp tục×1.20=78, hút75px/s, giảm30% tốc chạy.
  **Siết** gây10% Max MP/s lên enemy còn trong vùng, tick mỗi1s, không Crit,
  vẫn qua DEF/Ngũ Hành/khiên/HP chung. Q damage tiếp tục×.5, vận×.5, CD×.5,
  hitbox Q bằng bán kính đầm; Q HIT kéo thêm18px.
- Lv13 Thủy Long Gầm: bán kính tiếp tục×1.10=85.8. Q damage/vận/CD tiếp tục×.5:
  còn12.5% Q nền,12.5% thời gian vận,25% CD nền. Rồng vẫn bay .65s.
  Q kích hút gây ngay một lần Siết hiện tại, sau đó tăng Siết thêm10% ATK
  hiện tại. Đầm gốc mới reset lượng tăng. Mỗi proc có chuyển động rồng6 frame quanh đầm.
- R sao chép E READY thành đầm cùng tọa độ sau1.5s, có thời gian riêng2s;
  damage ban đầu/Siết nhân CopyRate, giữ hút/slow. Không nối dây/SPI/Mạch lần hai.
  Q copy được kích hút/gia hạn/Siết: damage Siết và lượng tăng nhân CopyRate;
  .5s gia hạn vẫn trong trần2s của đầm. Không sinh copy khác hoặc nhận Mạch/MP.
  CopyRate/damage được chụp khi chiêu gốc commit. Bản sao đầm còn sống vẫn có thể làm tâm Q
  khi đầm gốc hết. Mất Mage/hết run dọn đầm, bản sao, slow và proc đang chờ.
  Lượng E/Siết nền chụp Max MP trước buff của chính lần E; lượng tăng Siết chụp ATK khi Q proc.

Max MP được phép scale damage E tiến hóa/Siết theo định nghĩa riêng trên;
đây không phải một offensive stat mới. Quy tắc B1 trên ghi đè E READY và R
liên quan; E cơ bản ở các nhánh/cấp khác giữ nguyên.

------------------------------------------------------------------------

**\## 24. Run Reset**

Run mới reset:

\-   Level.

\-   EXP.

\-   Potential allocation.

\-   Unspent Potential.

\-   Skill Points trong Run.

\-   Evolution choices trong Run.

\-   Current HP/MP.

\-   Temporary buffs/debuffs.

\-   Temporary progression.

Không reset Meta/Account:

\-   Character đã mở khóa.

\-   Nghề đã mở khóa.

\-   Trang phục.

\-   Skin vũ khí.

\-   Cosmetic effects.

\-   Account progression sau này.

------------------------------------------------------------------------

**\## 25. Core dùng chung**

  Core                  Trách nhiệm

  --------------------- -----------------------------------

  Movement              WASD, tốc độ, hướng

  Collision             Map, vật cản, actor

  HP/Death              HP, nhận Damage, chết

  Healing               Hồi HP từ self/ally/effect

  Lifesteal             Hút máu; luật chi tiết chốt sau

  Resource              MP và resource framework

  Resource Restore      Cung cấp năng lượng cho self/ally

  Resource Regen Buff   Buff tốc độ hồi Resource

  Stats                 ATK, DEF, HP, MP...

  Potential             5 nhóm tiềm năng

  Damage                Damage pipeline

  Element               Ngũ Hành

  Crit                  Chí mạng

  Targeting             Chọn mục tiêu

  Hit                   Hitbox/projectile/AoE

  Projectile            Đạn, tên, rồng, sóng...

  AoE                   Circle, line, cone...

  Cooldown              Thời gian hồi

  Cast                  Instant/cast/channel/combo

  Status                Slow, stun, DoT, buff, debuff

  Shield                Khiên

  Team/Faction          Player, ally, enemy

  EXP/Level             Tiến trình trong Run

  Evolution             Lv5/7/9/11/13/15

  Animation State       Idle/run/attack/cast/death

  Run Reset             Reset progression/build trong Run

Không có Accuracy System, Evasion System hoặc passive HP Regen System.

------------------------------------------------------------------------

**\## 26. Boundary của Skill**

Skill có thể mô tả:

\-   Element.

\-   Target policy.

\-   Projectile/AoE.

\-   Base/scaling formula.

\-   MP cost.

\-   Cooldown.

\-   Cast behavior.

\-   Damage effect.

\-   Healing effect.

\-   Resource Restore effect.

\-   Resource Regen Buff.

\-   Shield/buff/debuff.

\-   Skill-specific effect.

Skill không được tự triển khai lại Crit, DEF, Ngũ Hành, HP/Resource

clamp, Potential, Level hoặc Run Reset.

------------------------------------------------------------------------

**\## 27. Cấu trúc tham chiếu**

\`\`\` text

src/

├── characters/

│   ├── core/

│   │   ├── CharacterStats.ts

│   │   ├── CharacterResources.ts

│   │   └── Potential.ts

│   └── jobs/

│       └── mage/

│           ├── MageStats.ts

│           ├── MagePotentialFormula.ts

│           └── elements/

│               └── water/

│                   ├── WaterMageRuntime.ts

│                   ├── formulas.ts

│                   ├── skills/

│                   ├── passive/

│                   ├── evolution/

│                   └── presentation/

├── combat/

│   ├── damage/

│   ├── healing/

│   ├── elements/

│   ├── targeting/

│   ├── projectile/

│   ├── aoe/

│   ├── shield/

│   └── status/

├── progression/

│   ├── level/

│   ├── potential/

│   └── evolution/

├── enemies/

├── run/

└── config/

    └── balance/

        ├── combat.ts

        ├── elements.ts

        └── mage.ts

\`\`\`

Đây là cấu trúc tham chiếu. Không tạo toàn bộ file/folder rỗng; chỉ tạo

module khi thực sự cần và ưu tiên hòa vào project hiện tại.

------------------------------------------------------------------------

**\## 28. Thứ tự triển khai V0.1**

1\.  Character Stats + Current Resources.

2\.  Mage Base Stats.

3\.  Potential + Mage Potential Formula.

4\.  Preserve HP/MP ratio.

5\.  MP Regen.

6\.  Minimal Healing boundary: hồi HP có clamp, không revive.

7\.  Minimal Resource Restore boundary: phục hồi Resource có clamp, hỗ

    trợ self/ally.

8\.  Element + Element Relation + Resolver.

9\.  Tương sinh/tương khắc + balance config.

10\. Damage Request/Result/Resolver.

11\. Crit + DEF + Ngũ Hành + Final Damage.

12\. Enemy Element.

13\. EXP + Level.

14\. +5 Potential và +1 Skill Point.

15\. Run Reset.

16\. Sau khi Core PASS mới triển khai skill phức tạp, Lifesteal formula,

    Support skill cụ thể và Evolution cụ thể.

------------------------------------------------------------------------

**\## 29. Vertical Slice đầu tiên**

\`\`\` text

Water Mage Lv1

      ↓

di chuyển trên map

      ↓

gặp Enemy có Element

      ↓

ngắm và bắn Thủy Pháo

      ↓

Projectile bay thật

  ├─ không chạm -\> trượt

  └─ chạm

       ↓

      Crit

       ↓

      DEF

       ↓

    Ngũ Hành

       ↓

 Final Damage

       ↓

   Enemy HP

\`\`\`

Enemy phải dùng chính Damage Core đó để đánh ngược Player.

Sau khi giết Enemy:

\`\`\` text

EXP

 ↓

Level Up

 ↓

+5 Potential

+1 Skill Point

 ↓

Allocate Spirit

 ↓

ATK tăng

MaxMP tăng

MP Regen tăng

\`\`\`

Core cũng phải đủ boundary để sau này Support Mage có thể:

\`\`\` text

heal(ally, amount)

restoreResource(ally, MP, amount)

\`\`\`

mà không cần sửa Damage Core hoặc Character Stats foundation.

------------------------------------------------------------------------

**\## 30. Test tối thiểu**

**\### Mage**

\-   1 DEX -\\\> +0.4 DEF, +1 Attack Speed Rating.

\-   1 SPI -\\\> +0.5 ATK, +4 MaxMP, +0.04 MP/s.

\-   1 VIT -\\\> +6 MaxHP.

\-   1 STR -\\\> không đổi Mage Effective Stats.

\-   LUK -\\\> Crit đúng formula.

**\### Resources**

\-   MaxHP đổi -\\\> CurrentHP giữ tỷ lệ.

\-   MaxMP đổi -\\\> CurrentMP giữ tỷ lệ.

\-   MP Regen không vượt MaxMP.

\-   Resource Restore không vượt Max Resource.

\-   Resource Restore có thể áp dụng cho target khác nếu target hợp lệ.

**\### Healing**

\-   Healing không vượt MaxHP.

\-   Healing có thể đến từ self hoặc ally/effect.

\-   Healing không tự revive target đã chết.

\-   Không có passive HP Regen.

**\### Element**

\-   WOOD khắc EARTH.

\-   EARTH khắc WATER.

\-   WATER khắc FIRE.

\-   FIRE khắc METAL.

\-   METAL khắc WOOD.

\-   Tương sinh đúng vòng đã chốt.

**\### Damage**

\-   WATER -\\\> FIRE: advantage.

\-   FIRE -\\\> WATER: disadvantage.

\-   EARTH -\\\> WATER: advantage.

\-   WATER -\\\> EARTH: disadvantage.

\-   WATER -\\\> WOOD: normal.

\-   Player/Enemy cùng input phải dùng cùng luật Damage.

------------------------------------------------------------------------

**\## 31. AI không được tự thêm**

Không tự thêm:

\-   HP Regen thụ động hoặc stat \`hpRegen\`.

\-   Accuracy.

\-   Evasion.

\-   RNG miss.

\-   Physical/Magic/Neutral Damage.

\-   Physical/Magic DEF.

\-   Element Damage Bonus.

\-   Element Resistance.

\-   Class quái riêng theo Element.

\-   Ngũ Hành hard-code trong từng skill.

\-   Stat WP / Water Power; không biến mechanic Thủy Lực thành stat.

\-   Derived offensive stat từ Spirit hoặc MaxMP nếu Core chưa định
nghĩa.

\-   Bonus Damage mặc định từ tương sinh.

\-   Công thức/hệ số Healing chưa được chốt.

\-   Công thức/hệ số Lifesteal chưa được chốt.

\-   Công thức/hệ số Support Resource Restore chưa được chốt.

\-   Passive/Q/E/R/Evolution nếu task chưa yêu cầu.

\-   Monetization/networking nếu task chưa yêu cầu.

\-   Gameplay mechanic từ project cũ nếu chưa được duyệt.

------------------------------------------------------------------------

**\## 32. Bảo vệ project hiện tại**

Khi triển khai:

\-   Đọc code hiện tại trước.

\-   Không phá map, camera, movement, collision, animation/model đang

    hoạt động.

\-   Không refactor hàng loạt chỉ để ép project theo cây thư mục.

\-   Không tạo file/folder rỗng hàng loạt.

\-   TypeScript strict.

\-   Gameplay logic nên độc lập Phaser khi hợp lý.

\-   Scene/Phaser ưu tiên integration/presentation.

\-   Balance number tập trung trong config.

\-   Pure gameplay logic ưu tiên unit test.

------------------------------------------------------------------------

**\## 33. Quy tắc thay đổi luật**

Nếu feature mới yêu cầu thay đổi một luật Core:

1\.  Chỉ ra luật hiện tại bị thay đổi.

2\.  Chốt thiết kế mới.

3\.  Sửa \`CORE_RULES.md\`.

4\.  Sau đó mới sửa implementation.

Không để code và \`CORE_RULES.md\` âm thầm mâu thuẫn.

------------------------------------------------------------------------

**\## 34. Thủy Pháo --- Basic Attack V0.1**

Thủy Pháo là đánh thường của Water Mage. MouseDown từ IDLE bắt đầu
CHARGING \[02\].

MouseUp trước đủ lực chuyển FIRING \[04\] ngay, không tiếp tục tụ.

Giữ đủ lực chuyển FULL_CHARGE \[03\], progress giữ 1, chờ MouseUp mới
bắn.

Không tự bắn và không auto-repeat. FIRING -\> IDLE; phát tiếp theo cần
MouseDown mới.

Một lần nhấn/thả tạo tối đa một projectile. Bấm trong chu kỳ không reset
hoặc xếp hàng.

\`chargeDuration = Effective attackInterval\`: Attack Speed chỉ giảm
thời gian đến đủ lực,

không tự kích hoạt bắn, không áp hai lần và không thêm cooldown.

Movement và attack chạy song song. Luật movement được chốt mới nhất:

\`\`\` text

chargeProgress = 0..1

moveMultiplier = (1 - chargeProgress)\^3

0% charge -\> 100% MoveSpeed

25% charge -\> 42.1875% MoveSpeed

50% charge -\> 12.5% MoveSpeed

100% charge / Full Charge \[03\] -\> 0% MoveSpeed (100% slow)

Release \[04\] -\> 100% MoveSpeed

\`\`\`

Hệ số áp dụng trong CHARGING và FULL_CHARGE, không sửa Effective
moveSpeed.

FIRING/IDLE trả về hệ số 1. Không khóa WASD.

Aim theo chuột world, cập nhật trong charge; khi fire lấy hướng aim hiện
tại.

Projectile bay 360 độ, độc lập với sprite attack chỉ quay LEFT/RIGHT.

Sprite RIGHT có thể flipX thành LEFT; muzzle/orb phải flip theo.

Charge dùng pose 02 và orb to/sáng dần theo gameplay progress; fire dùng
pose 04.

Pose 03 báo đủ lực và giữ orb tối đa, không tạo attack/Hit riêng.

VFX không sở hữu charge timing. Projectile lưu chargeRatio 0..1 lúc
release,

chưa dùng cho damage/effect.

Projectile bắt đầu từ muzzle, không homing, không auto-target, không
xuyên.

Chạm enemy đầu tiên xác nhận Hit một lần rồi biến mất. Chạm obstacle hợp

lệ cũng biến mất; miss hết range/lifetime thì biến mất.

Damage formula, ATK scaling, crit policy và MP cost chưa chốt. Bản hiện
tại

chỉ thử Hit, không tạo damage hoặc trừ MP. Khi đã chốt, dùng Damage Core
chung.

Projectile tuning hiện là dev preview, không phải balance chính thức.

### Cập nhật đã chốt — Thủy Pháo / Mạch / Q preview

Các quy tắc trong mục cập nhật này thay thế mô tả cũ ở mục 34 khi mâu thuẫn.

- Thủy Pháo gây raw damage `ATK * (0.20 + 1.05 * chargeRatio)`;
  chargeRatio 0/0.5/1 tương ứng 0.20/0.725/1.25 ATK.
- Chụp ATK và chargeRatio khi tạo phát bắn. Damage hệ Water đi qua
  Damage Core chung: Crit -> DEF -> Ngũ Hành -> HP. Đánh thường cho phép Crit.
- Không thay đổi charge timing, recovery, movement slow hoặc projectile tuning.
  Giữ hành vi đánh thường không trừ MP hiện tại; chưa định nghĩa MP cost mới.
- Mạch [Độc Nhất] thay thế tên Hồi Lực Tiến, giới hạn 4 điểm, không tràn;
  4/4 là READY. Không có stat WP/Water Power; Thủy Lực chỉ là mechanic B1.
- Thủy Pháo chỉ cấp +1 Mạch khi Full Charge 100% và Hit Confirm vào Enemy
  còn sống, hợp lệ. Đạt full charge, release, spawn, miss, obstacle không cấp điểm.
  Một attack instance chỉ cấp tối đa +1; READY không bị reset bởi đánh thường.
- Bản sao không cấp Mạch hoặc kích hoạt hiệu ứng [Độc Nhất].
- Q trong phạm vi triển khai hiện tại vẫn là preview: nhấn Q chụp tọa độ
  mặt đất của con trỏ ngay lúc cast, không chọn Enemy, không homing/retarget.
  Giữ chuỗi summon/dive; điểm đáp luôn nổ nước kể cả không có Enemy.
  Vụ nổ hướng lên khỏi mặt đất. Preview không gây damage, không cấp Mạch,
  không trừ MP/CD. Q cast range và AoE gameplay chưa được triển khai.
- Sandbox có hình nộm địch/đồng đội với CombatActor và HP thật, dữ liệu
  thử nghiệm riêng. Không tự chuyển marker Lab thành quái chiến đấu.

### Bộ kỹ năng Q/E/R và nội tại — triển khai V0.1

Yêu cầu mới triển khai Q gameplay thay thế giới hạn Q preview phía trên:
Q gốc khóa tọa độ khi cast, AoE kiểm tra mục tiêu ở thời điểm impact,
raw damage tổng 2 ATK và chỉ +1 Mạch nếu hit ít nhất một Enemy.
Q miss vẫn có splash, không cấp Mạch. Bản sao là cast riêng nhưng không cấp Mạch.
MP/CD/Q range/radius/impact delay đặt tại waterMage.ts dưới dạng tuning thử nghiệm.
Q cho phép Crit qua Damage Core chung. E chọn mục tiêu trong màn hình hiện tại.

- E không chọn ai thì dùng lên bản thân. Khi chưa READY chỉ cấp khiên cho
  mục tiêu, không hưởng dây hoặc refresh dây; áp dụng thành công cấp +1 Mạch.
- E READY chọn đồng đội thì nối người đó. E READY lên bản thân chọn lại
  đồng đội hợp lệ thấp % HP nhất trong màn hình hiện tại.
- Khi nối dây, tổng khiên 20% Max MP chia 50/50 cho bản thân và đồng đội;
  mỗi E READY refresh toàn bộ dây về 10 giây, Mạch 4 -> 0, không cộng ngược.
  Base tối đa một dây, không buff stat nền; không đứt do khoảng cách sau nối,
  hủy khi hết hạn hoặc đồng đội chết/rời sân/mất hợp lệ.
- Solo: E READY lên bản thân cấp khiên đầy đủ và buff +5 * level Tinh Thần
  trong 10 giây, replace + refresh, không stack. Đồng đội vào sân chỉ được
  xét lại ở lần E READY tiếp theo. Không có tính năng/tên Địa Mạch riêng.
- Mỗi phần khiên có nguồn, lượng còn lại và thời hạn 8 giây riêng;
  các phần cộng dồn, không refresh phần cũ. Damage trừ phần sắp hết hạn trước.
- R tạo 3 kính trong 12 giây; tạo thành công cấp +1 Mạch. Q/E gốc hợp lệ
  tiêu 1 kính và sao chép sau 1.5 giây, không copy R hoặc copy khác.
- CopyRate = clamp(0.30 + MaxMP / 10000, 0.30, 0.50).
  Damage/shield nhân CopyRate; các hiệu ứng hợp lệ kích hoạt đầy đủ,
  loại trừ hiệu ứng [Độc Nhất].
- Mirror Q lưu tọa độ gốc. Mirror E lưu người nhận và các phần khiên gốc
  (gồm cả hai phần 50/50), không tạo/refresh dây hoặc buff Tinh Thần.
  Mục tiêu mất hợp lệ thì hủy riêng phần đó, không chuyển và không hoàn kính.
- Cập nhật trình diễn/thi triển R: khi bản sao bắt đầu sau 1,5 giây, kính lóe sáng
  ngắn rồi phóng chiêu. Q sao chép bỏ vận lực, tạo hình và anticipation; rồng lao
  thẳng từ vị trí kính tới tọa độ Q gốc, không homing. Hit/AoE/Damage diễn ra lúc
  rồng chạm đất theo `WATER_MAGE_COPY_TIMING.flash + qFlight` (tuning hiện tại
  0,18 + 0,65 giây từ lúc bản sao bắt đầu), không dùng 2,31 giây của Q gốc.
  E sao chép lóe kính rồi phát luồng nước đến người nhận khiên; đây là VFX hỗ trợ,
  giữ thời điểm cấp khiên đã chốt và không biến E thành đòn đánh Enemy.
- R mới thay thế kính chưa dùng; bản sao đã lên lịch vẫn thực hiện.
- Q gameplay tương lai chỉ +1 Mạch khi hit ít nhất một Enemy, tối đa một
  điểm cho toàn bộ cast kể cả Evolution nhiều rồng; tổng damage base 2 ATK.

Các trường hợp bổ sung đã chốt:
- Có đồng đội hợp lệ trên sân nhưng tất cả ngoài màn hình: E READY lên bản
  thân cấp khiên đầy đủ, giữ READY, không cấp buff solo hoặc cộng Mạch ngược.
- Chuyển từ solo sang nối dây: buff Tinh Thần đã có vẫn chạy đến hết hạn.
- So người thấp máu theo % HP rồi HP hiện tại thấp hơn. Nếu cả hai bằng nhau,
  ID ổn định làm tiêu chí cuối để kết quả không phụ thuộc thứ tự mảng.
- Buff Tinh Thần là modifier tạm, không sửa allocation Potential hoặc điểm đã kiếm.
  Derive lại ATK/MaxMP/MP regen qua công thức Mage; giữ tỷ lệ HP/MP khi Max đổi.
- CopyRate và raw damage/shield chụp theo lần cast gốc; sao chép không tiêu MP/CD.
- Khi caster chết, hủy thi triển/bản sao đang chờ, kính/dây và buff solo;
  các phần khiên đã cấp vẫn theo thời hạn riêng. Run mới tạo state sạch.
- Final Damage -> khiên (ưu tiên hạn sớm) -> HP. Shield không tự áp lại Crit/DEF/Ngũ Hành.

**\## Tóm tắt luật bắt buộc**

### Va chạm theo ảnh actor hiện tại

Theo yêu cầu mới: quái, đồng đội và nhân vật dùng khung chữ nhật bao phần
ảnh có alpha nhìn thấy, tại scale/origin/flip/tư thế đang hiển thị. Bỏ viền
trong suốt; không tính bóng chân, nhãn, khiên, dây hoặc hiệu ứng skill.
Điểm neo chân/position của actor giữ nguyên; hitbox có offset riêng.
Đạn, Q AoE và chọn E dùng khung bao ảnh này trong Core.
Theo điều chỉnh mới, di chuyển dùng vòng tròn nhỏ quanh điểm neo chân,
bán kính 30% chiều rộng ảnh, tối thiểu 6, tối đa 18 world units và không
vượt radius gốc của actor. Actor không có ảnh dùng radius gốc với cap 18.
Vùng chặn này áp dụng cho actor, vật cản và biên map; không thu vùng nhận đòn.
Actor sống, hợp lệ, trên sân chặn nhau khi di chuyển; chết/rời sân không chặn.
Khi các vùng chặn chồng nhau, cho phép di chuyển ra mà không tăng diện tích
chồng lấn để tránh kẹt. Marker Lab/bia tập vẫn nhận đòn theo hình tròn gốc.
Đây là hitbox bao ảnh, không phải va chạm theo từng pixel alpha.

### AI quái thường trong Sandbox

Theo yêu cầu mới, 6 quái thường tự phát hiện và đánh người chơi. Chuột/châu
chấu đánh gần; ốc sên/các loại sâu bắn đạn theo hướng khóa lúc phát động.
Có các pha chờ, đuổi, phát động, hồi đòn và trở về khi mất mục tiêu/vượt leash.
Melee/AoE và đạn phải va chạm thật; đạn không homing. Dùng chung Damage Core,
DEF, Ngũ Hành, khiên và HP; Attack Element lấy từ enemy, không hard-code Water.
Quái chết/rời sân dừng AI và hủy đòn đang phát động. Không tự thêm EXP hoặc loot.
Các số HP/ATK/tốc độ/tầm/nhịp đánh là cấu hình Sandbox thử nghiệm, chưa là
balance chính thức. Dev được dừng/chạy AI và reset HP/MP để thử lại sau khi gục.
Ảnh phát động giữ nguyên; phần tia/gai/vệt chuyển động đã nằm trong PNG
không tự trở thành hitbox nhận đòn. Presentation khai báo vùng thân/neo riêng.

### Thù hận và hồi phục quái

Actor có tag `combatRole = melee | ranged`. Tag thuộc nhân vật, không suy ra
từ khoảng cách hoặc hình học đòn: melee tạo +5, ranged tạo +10 cho mỗi hit
gây sát thương. Mage là ranged. Hit sát thương bị khiên hấp thụ vẫn tính;
MISS, damage 0 và kỹ năng hỗ trợ không tạo điểm. Q copy tính cho Mage gốc.
Mỗi quái có bảng riêng theo source actor ID; ưu tiên actor sống/hợp lệ có
điểm lớn nhất, cùng điểm giữ mục tiêu cũ rồi xét gần nhất/ID. Mục tiêu phải
nằm trong leash; không có điểm thì dùng phát hiện theo khoảng cách hiện có.
Đổi mục tiêu hủy windup cũ, giữ cooldown; đạn đã phóng không retarget.

Sau 7s kể từ lần quái nhận sát thương gần nhất, mọi điểm giảm với tốc độ
`2 + 2 × t` điểm/s (`t` là số giây vượt mốc 7s), clamp về 0. Quái sống hồi
2% Max HP/s cùng thời gian đó, clamp Max HP. Nhận hit sát thương mới dừng
hồi, đặt lại 7s và tốc độ giảm ban đầu. Không hồi sinh quái. Đây là cơ chế
phục hồi riêng của quái theo yêu cầu mới, không thêm stat HP Regen hoặc
HP regen thụ động cho Player/Ally. Timers vẫn chạy khi Dev dừng AI.

\> Việt Phách dùng một ATK và một DEF chung. Không có

\> Physical/Magic/Neutral Damage, Accuracy, Evasion, Element Damage

\> Bonus, Element Resistance hoặc HP Regen thụ động. Mọi Damage mang một

\> trong năm hệ Kim, Mộc, Thủy, Hỏa, Thổ. Hit/Miss do

\> projectile/hitbox/AoE thực tế quyết định. Ngũ Hành là tầng nguyên tố

\> duy nhất điều chỉnh Damage đầu ra và áp dụng bình đẳng cho

\> Player/Enemy. Tương khắc tác động Damage; tương sinh chỉ được Core

\> nhận biết và chưa mặc định tác động Damage. HP được phục hồi bằng

\> Healing hoặc Lifesteal; Healing có thể đến từ self, đồng đội hoặc

\> effect bên ngoài. MP có thể tự hồi bằng MP Regen và có thể được cung

\> cấp từ bên ngoài qua Resource Restore; Resource Regen Buff là
mechanic

\> riêng. Potential có 5 loại nhưng tác dụng do từng nghề định nghĩa.

\> Water Mage không có stat WP / Water Power. Thủy Lực là mechanic B1. ATK là offensive

\> scaling chính; MaxMP là Resource và chỉ được skill dùng cho mechanic

\> utility/support hoặc damage khi công thức skill có định nghĩa rõ. Không tạo derived offensive
stat

\> từ Spirit hoặc MaxMP. Run Progression và Meta Progression phải tách
biệt.

### Cập nhật vận Thủy Pháo và hướng gương R

- Vận đánh thường làm chậm dần tối đa 60%; đầy lực còn 40% tốc độ. Giữ đường cong hiện tại: moveMultiplier = 1 - 0.60 * (1 - (1 - progress)^3). Thả đòn trả về 100% tốc độ; không sửa Effective Stats.
- Giảm nhẹ tuning thời gian đầy lực: cơ bản 2,10 giây; tối thiểu 1,45 giây. Attack Speed vẫn chỉ rút thời gian vận, không tự bắn; recovery giữ nguyên.
- Presentation R đặt gương sát nhân vật, phía đối diện hướng ngắm/thi triển trái-phải: nhắm trái → gương phải; nhắm phải → gương trái. VFX bản sao xuất phát cùng anchor của gương. Không đổi targeting, damage hoặc hành vi sao chép gameplay.
- Mục này thay thế các giá trị movement/charge hoặc mô tả vị trí gương mâu thuẫn ở trên.

### Presentation chặn đòn E

- Khi khiên E hấp thụ đòn đánh, hoạt ảnh chặn nằm ở rìa thân nhân vật phía đòn đi tới, hướng ra ngoài. Đạn dùng hướng bay tại va chạm; đòn cận chiến dùng phía nguồn đánh. Hoạt ảnh đi theo nhân vật và giữ phía chặn trong thời gian hiển thị. Quy tắc này không thay đổi lượng hấp thụ hoặc tạo cơ chế khiên theo hướng.

### Skill Specification — hoạt ảnh rồng bơi Thủy Long Gầm

- Phục hồi CONTENT rồng nước cuộn/bơi quanh đầm qua sprite sheet 6 tư thế, 3 cột × 2 hàng. Không nhập runtime, targeting, công thức hoặc balance của project cũ.
- Presentation nhận sự kiện `swamp-roar` hiện tại: Q xác nhận trúng Enemy trong đầm có tiến hóa Thủy Long Gầm. Q miss hoặc đầm chưa có tiến hóa này không phát hoạt ảnh. Q sao chép tiếp tục theo quy tắc gameplay hiện tại.
- Một rồng bao quanh tâm đầm, chuyển qua 6 tư thế bơi; không dịch chuyển cả hình rồng quanh một vòng tròn và không xoay tĩnh một ảnh bay. Kích thước theo bán kính đầm, đặt trên mặt nước.
- Giữ thời gian trình diễn hiện tại 0,6 giây (tuning VFX, không phải balance legacy). Đòn kích hoạt mới tại cùng đầm làm mới hoạt ảnh, không chồng nhiều rồng. Hủy khi đầm kết thúc, caster chết hoặc scene đóng.
- Asset gốc được bảo tồn; bản dùng để render có nền trong suốt. Không đổi damage, pull, slow, stack, MP, cooldown hoặc progression.

### Điều chỉnh lực hút liên tục của đầm

- Đầm không được tự giữ cứng quái đang chạy ra khi không có Q. Tuning hiện tại giảm hút thường từ 60 xuống 20 world units/s, Thủy Vực Siết từ 75 xuống 28 world units/s. Với quái Sandbox tốc độ 80, sau slow còn 64/56, tốc độ chạy ra vẫn lớn hơn lực hút của một đầm.
- Giữ slow và lực kéo tức thời Q 12/18 world units. Các mức hút mới là tuning thử nghiệm của project hiện tại, chưa phải balance cuối. Va chạm, nhiều vùng ảnh hưởng hoặc pha quái đứng thi triển vẫn có thể làm quái chưa thoát ngay.

### E đầm — thời gian, Siết và Khô Mạch

- Đầm E gốc và bản sao tồn tại 4 giây trước gia hạn Q; Siết cơ bản mỗi giây giảm còn 5% Max MP. Giữ sát thương hình thành đầm, stack ATK và giới hạn gia hạn +2 giây.
- Khi còn bất kỳ đầm E nào của caster: Khô Mạch chặn mọi nguồn cộng điểm Mạch, gồm đánh thường đủ lực, Q, R và cấp điểm trực tiếp. Điểm bị chặn không được tích chờ; không kích hoạt hồi MP theo việc nhận điểm. MP regen thông thường không bị khóa.
- E bị khóa dùng lại trong thời gian đầm tồn tại; cooldown E chỉ đếm từ khi đầm cuối cùng kết thúc, tính cả gia hạn Q và đầm bản sao. HUD hiển thị Khô Mạch và E khóa hồi chiêu. E thường chỉ tạo khiên giữ luật cũ.

### Thứ tự E READY — hỗ trợ trước, tiến hóa sau

- E READY dạng đầm ưu tiên tự chọn đồng đội sống/hợp lệ trong màn hình theo % HP thấp nhất, HP hiện tại thấp nhất rồi ID. Vị trí đầm không quyết định người được nối.
- Hoàn tất nối/làm mới dây trước khi tạo vùng nước và áp sát thương hình thành. Solo hoàn tất buff bản thân thay cho dây. Không tạo đầm nếu có đồng đội trên sân nhưng không ai hợp lệ trong màn hình; thất bại không tiêu MP, Mạch, kính hoặc cooldown.
- Đây là thứ tự hành động gameplay trong cùng một lần E, không thêm thời gian thi triển chưa được chốt. Bản sao chỉ sao chép đầm, không nối dây hoặc buff thêm.

### Nội dung map Kháng Chiến

- Kháng Chiến có bốn cảnh/khu dùng cùng world 2200 × 1400: Map 1 là làng gốc, Map 2 tàn phá, Map 3 nhiễm đen, Map 4 hoàng hôn và xác quái. Chọn qua Dev; chưa tự chuyển khu hay thêm luật hoàn thành trận.
- Kết giới bao trọn cây cổ thụ và cụm nhà còn nguyên vẹn phía trên/phải theo vùng người thiết kế đánh dấu. Dân làng ngồi trong gian hiên nhà còn nguyên vẹn, thu nhỏ nhóm còn rộng 85 đơn vị và quay xuống trái theo hướng người thiết kế đánh dấu, là NPC trang trí chưa có AI/HP/nhiệm vụ. Tư thế ngồi được tạo lại từ asset người thiết kế cung cấp; giữ bản gốc. Kết giới dùng tài nguyên water-barrier-v2 có phần giữa trong suốt, sóng thấp và độ đậm dao động chậm 85–95%, vành va chạm dùng cùng tâm và bán kính với vùng kết giới.
- Kết giới nước là lớp Presentation riêng trong suốt; vành oval quanh khu nhà/cây cổ thụ gồm các đoạn vật cản polygon trong World, bên trong trống cho dân làng trú ẩn. Player được đi xuyên kết giới cả hai chiều; quái vẫn bị chặn. Các vật cản khác vẫn chặn Player bình thường. Projectile giữ luật va chạm hiện tại. Map chọn riêng giữ kết giới không có HP; Stage Kháng Chiến có luật HP/phá kết giới bên dưới.
- Bốn cảnh giữ cùng vị trí NPC và kết giới. Không dùng kích thước PNG để thay đổi tọa độ gameplay.

### HUD Thủy V2 — trình bày

- Thay bộ icon HUD cũ bằng ảnh người dùng cung cấp. Tên R hiển thị: Thủy Kính Tam Tượng; ID, công thức và cơ chế R giữ nguyên.
- Mạch dùng ảnh nhiều đầm nối nhau (ảnh 6): 0 tối, 1/4 xám đen, 2/4 xám, 3/4 xám sáng, 4/4 sáng rực. Số điểm luôn hiển thị để không phụ thuộc riêng màu sắc.
- Khung Trạng thái đặc biệt dùng ảnh khung trong suốt (ảnh 8), xuất hiện trên Thủy Pháo khi đang đầy lực và trên Thủy Mạch khi READY. Không cấp thêm hiệu ứng gameplay.
- E đổi sang icon xoáy nước (ảnh 7) khi đã mở B1 cấp 7, READY, đủ MP, hết hồi chiêu, caster còn sống và không Khô Mạch. Thủy Hãm, Sóng Trong Đầm và Thủy Vực Siết dùng chung icon này. E thường giữ icon Thủy Hộ.
- Bố cục tham khảo ảnh 1: bảng HP/MP/EXP/tiềm năng và chân dung, bảng mục tiêu với HP/hệ/trạng thái thật, thanh kỹ năng Chuột/Q/E/R. Không sao chép phím W hoặc bình thuốc chưa có trong game.
- HUD chiến đấu thu gọn: khung nhân vật 232px, khung quái 175px. Thanh kỹ năng theo ảnh kích thước người dùng chốt: rộng 414px, icon 56px, phím/trạng thái 14px; màn hình hẹp tự thu vừa khung và dùng icon 48px. Tên và MP của kỹ năng xem trong bảng chi tiết. Bảng nhân vật mở bằng C giữ kích thước để đọc và phân bổ điểm.
- Icon Thủy Long Giáng Thế dùng ảnh rồng lao xuống do người dùng cung cấp, hiển thị ở mốc B1 cấp 15 trong bảng tiến hóa. Từ 08/10/2026, mốc đã có gameplay lượt chơi thường theo `docs/design/Water-Mage-Assault-Paths.md`.

### Thủy Long Gầm — giới hạn đã chốt

- Lượng cộng thêm vào Siết không có giới hạn cộng dồn; đạt trần gia hạn không ngăn Q tiếp tục kích Siết và cộng thêm sát thương trong thời gian đầm còn tồn tại.
- Trần gia hạn +2 giây tính riêng cho từng đầm, gồm đầm gốc và từng đầm bản sao; không dùng chung một trần cho toàn bộ lần E.
- Siết tức thời do Q kích hoạt và lượng tăng 10% ATK chỉ chịu một tỷ lệ sao chép: đầm gốc dùng tỷ lệ của Q (Q gốc = 100%); đầm sao chép dùng tỷ lệ đã chụp của đầm, không nhân thêm tỷ lệ Q. Quy tắc này áp dụng cả khi tỷ lệ chụp của Q và E khác nhau. Sát thương riêng của rồng Q vẫn dùng tỷ lệ của Q; tick Siết dùng lượng đã lưu trong đầm.
- Ví dụ ATK 100, Siết nền 50, CopyRate 40%: Q gốc/đầm gốc gây Siết 50 rồi tăng +10; ba trường hợp có Q hoặc đầm sao chép gây Siết 20 rồi tăng +4 (khi chưa có lượng cộng dồn). Lần Siết tức thời xảy ra trước khi cộng lượng tăng mới.

### Stage Kháng Chiến — trial có kết thúc

- Buff kỹ năng chỉ được cài bởi director Stage, không áp dụng Sandbox hoặc map chọn riêng. Sau 4 Q gốc commit thành công, Q thứ 5 cường hóa thành Thủy Ngục rồi đặt lại bộ đếm; miss vẫn đếm, cast lỗi/bản sao không đếm. Q không tiêu Mạch; READY dành cho E. Cách tích Mạch và Khô Mạch không đổi: Q cường hóa gốc trúng khi rồng trồi vẫn nhận tối đa +1 nếu nội tại cho phép, miss +0.
- Thủy Ngục tham khảo CONTENT/nhịp dự án cũ: Q Stage luôn chọn vị trí mặt đất theo con trỏ, giới hạn tầm Q rồi khóa điểm đáp lúc cast; không tự chọn tâm Thủy Vực Siết đang tồn tại. Khi cầu đáp tạo ngục 2s với cầu nước sáng bao mục tiêu; không tạo thêm hình đầm Thủy Hãm bên dưới. Rồng trồi thẳng lên sau 1,75s. Bán kính đầm E hiện tại (bao gồm tăng theo ải), hitbox Q, vùng giữ chân và hitbox rồng trồi dùng chung một giá trị chụp lúc cast; đường kính hình đầm E bằng 2 lần bán kính đó. Giữ chân chỉ khóa di chuyển, không khóa tấn công. Không homing/retarget; sát thương Q hiện tại gây đúng một lần lúc rồng trồi, không có damage lần đáp và không nhập Water Power/công thức legacy. Luật Siết/hút/gia hạn khi Q HIT giữ nguyên. Q B1 ngoài Stage vẫn tự khóa tâm đầm như trước.
- R sao chép payload Q cường hóa đã chụp: cũng tạo ngục, giữ thời gian/radius/control đầy đủ, sát thương Q nhân CopyRate một lần; không tiêu/cấp Mạch. Kính vẫn lóe rồi phóng cầu từ kính. Không tạo bản sao dây chuyền. Ngục và eruption chờ hủy khi caster chết, đổi ải, fail/finale hoặc Run kết thúc; root riêng theo từng caster/cast không xóa slow của nguồn khác.
- E READY Stage: bán kính đầm = bán kính tiến hóa hiện tại × [1 + 0,30 × (ải−1)]. Ải 1/2/3/4 lần lượt ×1/1,3/1,6/1,9 (cộng theo gốc, không nhân 1,3 lặp lại). Q thường và Q Thủy Ngục dùng cùng bán kính này; bản sao giữ bán kính đã chụp. Vòng ngắm, vùng hit/pull/slow/Siết và bản sao đều dùng radius đã chụp. Không tăng damage, duration, E thường/khiên hoặc tầm chọn chỉ vì đổi ải.

- Người thiết kế yêu cầu chuỗi Map 1 → 2 → 3 → 4. Stage riêng mở bằng `?stage=khang-chien`; các map chọn riêng và Sandbox giữ hành vi trước. Mục này thay thế giới hạn “chưa tự chuyển khu” ở phần map khi chạy Stage.
- Mở đầu tự chạy từ cuối Map 1, có 20 quái thường/tinh anh đuổi theo; dựng kết giới rồi bước ra ngoài. Kết giới bắt đầu chưa có hình/va chạm, được tạo trong cảnh mở đầu, sau đó tồn tại xuyên các map. Dân làng vẫn là NPC trang trí; HP thuộc kết giới bảo vệ họ.
- Kết giới Stage có 8.000 HP, hệ Thủy, DEF 0; không tự hồi. Sau mỗi đợt hoàn tất, nghi thức nước ngầm chủ động hồi 50% Max HP (4.000), clamp; không tự hồi đầy chỉ vì đổi Zone. HUD hiển thị HP và cảnh báo khi còn ≤25%. Mức HP và phạm vi hút quái là tuning trial trong config Stage.
- Quái Stage ưu tiên người chơi/đồng đội sống ở ngoài kết giới bất kể khoảng cách; giữa các actor ngoài kết giới chọn thù hận cao nhất rồi giữ mục tiêu/khoảng cách/ID như luật hiện có. Actor ở trong hoặc trên vành oval (xét vị trí chân) được bảo vệ và không bị quái nhắm/đánh trực tiếp. Khi tất cả mục tiêu hợp lệ vào trong, quái đánh kết giới; ra ngoài lại thì quái quay sang đuổi actor. Không xóa thù hận chỉ vì vào kết giới, timer giảm vẫn chạy bình thường. Bỏ luật khoảng cách 180/300 của Stage; Sandbox không đổi.
- Đạn lưu ID mục tiêu ở lúc phóng: đạn lạc nhắm actor bên ngoài vẫn bị vành kết giới chặn nhưng không trừ HP kết giới; đòn đã nhắm kết giới được hoàn tất theo va chạm thật. Melee/cú lao áp cùng luật, không gây damage kết giới chỉ vì vô tình chạm vành trong lúc đuổi người. Không retarget đạn đang bay; người đang ở trong vẫn được bảo vệ.
- Tiếp viện và boss xuất hiện theo ba cột đường Tây/cầu, Nam và Đông Nam, theo nhóm có khoảng cách, không spawn quanh vị trí Player. Đường nằm trong World data dùng chung các nền Kháng Chiến; AI đi theo các điểm đường đến khu giao chiến. Khi bị actor ngoài đánh tạo thù hận, hoặc đã ở trong tầm đánh mục tiêu, bỏ phần đường còn lại để giao chiến. Quái truy đuổi cảnh mở đầu giữ choreography riêng. F3 vẽ ba tuyến và điểm xuất hiện để kiểm tra.
- Đòn đánh phải chạm vành polygon thật mới gây damage qua Combat Core: đạn, đòn cận chiến hoặc cú lao. Kết giới là combat objective riêng, không là đồng đội chọn E/nối dây, không chiếm vùng chặn actor và không nhận buff/hồi máu. Quái ngắm mép gần nhất theo tâm hitbox, không ngắm tâm vùng trú ẩn.
- Kết giới về 0 HP làm Stage thất bại kể cả Pháp Sư còn sống: bỏ vành chặn, dừng AI/đạn/tiếp viện, hiện lý do kết giới vỡ. Kiểm tra này ưu tiên trước mốc boss 20%; cảnh diễn kết thúc đã bắt đầu không chạy combat thường.
- Bảng chỉ số Pháp Sư lão luyện hiện trước nút Ra trận. Preset trial Lv15, 75 điểm tiềm năng đã phân bổ, nhánh B1 đến Lv13. HP 3.000, MP 18.000, ATK 18.000, DEF 180, hồi MP 900/s, bạo kích 20%. Đây là modifier riêng cho Stage, không thay chỉ số cơ bản; preset giữ lựa chọn B1 đến Lv13, hai đại chiêu cốt truyện do Stage director xử lý riêng.
- Map 1/2/3 yêu cầu lần lượt 100/150/200 quái bị hạ thật, gồm quái truy đuổi ban đầu. Quái xuất hiện theo nhóm, tối đa 36/44/48 actor sống. Quái có rank/hệ/AI/va chạm thật. Dọn actor chết không tăng điểm lần hai. Chuyển map giữ nhân vật, HP, progression; hủy đạn và chiêu còn chờ của map cũ.
- Mỗi lần hoàn thành Map 1/2/3: MP giảm còn tối đa 5% Max MP (không tăng nếu đang thấp hơn), dừng combat/input/tiếp viện; chạy nhanh về kết giới ở map hiện tại 3s, cầu xin Thần Thành Hoàng 1,5s, rút nước ngầm 3s hồi dần MP về đầy và hồi 50% Max HP kết giới. HP nhân vật không được hồi từ nghi thức. Chạy ra ngoài 1,2s rồi đổi hình nền sang map kế tiếp và mở combat. Chỉ nghi thức mới hồi tài nguyên, không phải callback đổi map. Không nhận phần thưởng khi chưa đủ kill quota, kết giới vỡ hoặc Run đã kết thúc.
- Cảnh chuyển map rung nhẹ liên tục để báo quái sắp tràn tới; dừng rung khi cảnh kết thúc hoặc tạm dừng Dev/bảng nhân vật. Tôn trọng thiết lập giảm chuyển động. VFX nước ngầm chỉ đọc timeline; hồi MP/HP dùng Resource Restore/Healing Core, không phụ thuộc số frame.
- Đạn tinh anh dùng bán kính 6 (tăng từ 5) và hình kim dài nhọn, có lõi sáng. Ốc tinh anh vẫn giữ loại impact slime; boss giữ bán kính 10. Màu sắc nhận theo loại quái thật, không đoán từ ID instance.
- Map 4 dùng Giáp Tai Ương 1.000.000 HP, hệ Thổ, DEF 50 và tiếp viện thường/tinh anh. Boss Stage không tự hồi HP; quái còn lại giữ luật hồi phục/thù hận hiện tại. HP floor 20% chỉ chặn sát thương boss trong encounter này, damage pipeline vẫn ghi lượng HP mất thực; không phải stat miễn thương chung.
- Khi boss chạm 20% và Pháp Sư còn sống: dừng combat thường, tiêu hết MP, bắt đầu Thủy Long Giáng Thế riêng Stage. Quả cầu bay trong 1,5s rồi thủy vực bán kính 100 world units xuất hiện. Trong 5s tiếp theo, người chơi tự nhấn/thả Q tối đa 10 lần: không MP, không CD, không vận/biến hình; mỗi lần phóng một rồng nhanh từ trượng vào tâm đã khóa. Giữ Q không tự bắn; không có rồng hợp lực tự sinh. Rồng đến tâm kích một lần Siết theo tuning hiện tại (5% Max MP + lượng Siết đã tích), sau đó tăng Siết thêm 10% ATK tại lúc phóng. Các lần đến tâm xử lý riêng và chỉ đánh địch trong vùng; không tiêu/cấp Mạch, không sao chép, không gia hạn cửa sổ 5s. Quả cầu lớn theo số rồng đã tới, tối đa 10. Hết 5s, chờ rồng đang bay tới tâm rồi rồng cuối lao xuống trong 0,5s; giữ damage nổ nền đã chốt. Sau đó Bát Đại Hải Long gồm 8 rồng hội tụ, hạ boss và quái còn lại; Pháp Sư gục, dân làng sống, hiện màn hoàn thành. Không nhấn Q vẫn khép cảnh cốt truyện, không bù lượt thiếu. HUD hiện hướng dẫn Q, số lần bấm thật và thời gian còn lại. Mở Dev/bảng nhân vật hoặc mất focus sẽ tạm dừng thời gian và không nhận Q.
- Hai đại chiêu này là chuỗi diễn có damage xác nhận trong Stage, không phải implementation toàn cục của kỹ năng Lv15. Tuning cảnh cuối: Giáng Thế raw 250.000 → boss mất 100.000 HP sau DEF/hệ (10% Max HP boss); Bát Đại raw 500.000 mỗi địch còn sống, khép lại cảnh. Không cộng DOT từ nhiều quái thành sát thương boss; benchmark không biến thành công thức theo % HP mục tiêu. Hệ số gameplay Lv15 chính thức sẽ do người thiết kế chốt riêng.
- Chết trước cảnh hy sinh là thất bại, có chơi lại. Khi xem bảng nhân vật hoặc mở Dev, Stage tạm dừng. Dev có bỏ mở đầu/hoàn tất đợt/boss 20% phục vụ kiểm tra, không tự mở các nút này trong HUD người chơi. Nút Dev “Thử Thủy Long Giáng Thế” đi qua các đợt bằng cùng director rồi vào cảnh đại chiêu, không tự cộng lượt Q; giữ pause tới khi người dùng đóng Dev để không mất cửa sổ hợp lực. Lời dẫn đặt riêng trong `src/config/stages/khangChienStory.ts` để người thiết kế viết cốt truyện.

Kháng Chiến cập nhật: READY chỉ dành cho E; Q thứ 5 cường hóa sau 4 Q commit thành công. Miss vẫn đếm lần cast; cast thất bại/bản sao không tăng bộ đếm. Thủy Pháo click vận tối đa mỗi 3s, không tự bắn khi giữ. Kích thước/bán kính ×1,5 và đẩy 24 đơn vị là tuning thử nghiệm riêng Stage. Quái Stage tăng ATK ×1,5. Presentation chỉ hiện cầu Thủy Ngục sáng khi trúng, không tạo thêm hình đầm Thủy Hãm. Q Stage chọn theo con trỏ và dùng chung bán kính đầm E hiện tại cho hitbox Q/ngục/rồng trồi.

Bát Đại Hải Long trong Kháng Chiến: tụ 4 tư thế tại Pháp Sư trong 2,2s (mốc 7,5–9,7), khóa 8 điểm địch sống khi phóng, ưu tiên boss, dùng lại mục tiêu nếu ít hơn 8 địch. 8 rồng Q bay 0,9s; damage cinematic 500.000 mỗi địch còn sống vẫn qua Combat Core tại mốc 10,6; kết thúc tại giây 12. Tuning chỉ dành cho màn phô diễn Stage, chưa mở tiến hóa Lv15 toàn cục.

Cảnh cuối Kháng Chiến thay thế specification 20% và cửa sổ 5s cũ: xem docs/design/Khang-Chien-Finale.md. Boss 40% → cảnh báo chờ Q+E → 1 HP/0 MP khóa hồi → Q thật đủ 10 stack → Giáng Thế rồi Bát Đại → boss floor 1 → clone ăn mừng → phản đòn xuyên người → nhân vật chết. Tuning Bát Đại raw 1.000.000 riêng cinematic.
