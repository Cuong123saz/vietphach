# Hai nhánh Công Phá Pháp Sư Thủy — lượt chơi thường

Triển khai 08/10/2026. Nguồn: dữ liệu và quyết định trong chat “Cập nhật kỹ năng Pháp Sư Thủy”, bản Giáng Thế 06/10 và cơ chế A1 của D:/kpah. Mapping giữ theo Việt Phách: **A1 Thủy Nhân Mạch, B1 Thủy Long Mạch**. Không nhập Water Power. A2/B2 vẫn khóa.

## Chọn nhánh và thao tác

Chọn lần lượt mốc 5/7/9/11/13/15 trong C → Tiến hóa. Không đổi nhánh hoặc bỏ mốc.
E thường tiếp tục tạo khiên. E READY từ cấp 7 mở chọn tâm; click mới commit,
E/Esc hủy. Q thường vẫn chọn mặt đất; riêng B1 có đầm thì khóa tâm như trước.

Cấp 15: đủ 4 Mạch, Q/E hết hồi chiêu, không có chiêu gốc đang bay hoặc đầm:
bấm **Q+E hoặc E+Q trong 0,4s**, rồi click tâm trong màn hình và trong tầm 600.
Esc, mất focus hoặc mở bảng hủy chọn chưa commit. Một phím riêng chờ tối đa 0,4s
rồi thực hiện Q/E thường khi đại chiêu đang đủ điều kiện. Auto-repeat bị bỏ qua.
Combat và hoạt ảnh tạm dừng khi Dev/bảng nhân vật/mất focus. Đại chiêu hồi 20s
từ lúc commit; chi phí/điều kiện được kiểm tra lại tại click. Thiếu điều kiện
không đổi MP/Mạch/khiên/dây. Nhân vật có thể di chuyển, nhận damage và chết.

## A1 — Thủy Nhân Mạch

| Mốc | Gameplay |
|---|---|
| 5 | Tối đa 3 dây. READY E cơ bản nối/làm mới dây 10s; khiên cơ bản giữ cách chia hiện tại. Mỗi +1 Mạch thực hồi 1% Max MP cho bản thân và người nối. |
| 7 · Tụ Thủy Bạo | E READY tiêu 15 MP/4 Mạch, hút các lớp khiên E còn hiệu lực do chính Mage cấp trên bản thân và người đang nối. Damage cầu = 15 + 1,5 × khiên hút. Niệm 0,6s, bay 0,6s, bán kính 50. |
| 9 · Thủy Ngục | Cầu đáp gây damage và giữ chân 2s, vẫn cho địch tấn công. Sau 1,75s rồng trồi gây cùng lượng damage trong vùng; không cấp thêm Mạch. |
| 11 · Hải Long Xuất Thế | Cầu chính sinh 3 cầu quanh tâm, cách tâm 65, cùng vùng trúng/ngục/rồng. Các vùng có thể cùng trúng mục tiêu lớn. |
| 13 · Vạn Mạch Sinh Long | Q/E gốc tiêu một kính R: thêm một rồng nhỏ mỗi dây hiện có, 10% Q nền × CopyRate. Rồng phụ không cấp Mạch hoặc sao chép tiếp. |
| 15 · Bát Đại Hải Long | Đủ dây cho mọi đồng đội hợp lệ còn sống (tối đa 3 đồng đội; solo 0). Tổng cost 90/80/70/60% Max MP theo 0/1/2/3 dây. Hút khiên E của mình, xả mạng khi commit, tụ 1,5s; cầu E đáp với đầy đủ ngục/cụm, rồi đúng 8 rồng bay 0,9s tới tâm. |

E READY ưu tiên nối đồng đội chưa nối có % HP thấp nhất trong màn hình; hòa xét HP/ID.
Solo dùng buff Tinh Thần nền. Có đồng đội nhưng không hỗ trợ được thì hủy E.
E thường không hút khiên. Không hút khiên nguồn khác hoặc khiên đã hết hạn.
R sao chép damage/cụm/ngục E đã chụp sau 1,5s, bay 0,6s; không tiêu thêm MP,
hút khiên, nối dây hoặc cấp buff. Q/E thường giữ CopyRate V0.1.

Damage Bát Đại: cầu/ngục/rồng trồi = `(MP tiêu + 1,5 × khiên hút) × 120`;
mỗi Hải Long = `2 ATK × 1,25 × 120`. Cụm Hải Long cũng qua Damage Core.

## B1 — Thủy Long Mạch

Mốc 5–13 giữ gameplay hiện tại: hồi MP từ Mạch thực nhận, đầm E, Q khóa tâm,
kéo/gia hạn +2s riêng từng đầm, Siết và tăng Siết 10% ATK. Bản sao chỉ giảm một
lần tương tác Siết. E thường giữ khiên.

Lv15 **Thủy Long Giáng Thế** cần ít nhất 50% Max MP, tiêu toàn bộ MP hiện có.
Chụp Max MP/ATK trước buff hỗ trợ của lần cast. Tụ 1,5s, tạo thủy vực bán kính
100, gây damage tạo đầm và một lần rồng mở đầu xoay quanh vùng. Trong 5s kế tiếp:

- Khô Mạch; khóa E/R và đánh thường; hồi MP tự nhiên vẫn chạy.
- Tối đa 10 Q người chơi tự nhấn/thả, 0 MP/CD, rồng bay 0,22s vào tâm đã khóa.
- Q chỉ kích Siết/tăng Siết khi trúng địch trong vùng, theo thứ tự Siết rồi tăng.
- Cửa sổ cố định 5s, không gia hạn. Q đã nhận trước deadline được chờ tới tâm.
- Siết định kỳ mỗi 1s và Siết tức thời do Q trúng tích rawDamage **một lần mỗi
  AoE**, không nhân số quái. Damage tạo đầm/rồng Q/rồng mở đầu/Thủy Pháo không tích.
- Cuối chuỗi rồng giáng xuống trong 0,5s, nổ = 50% Siết tích, mỗi mục tiêu qua
  DEF/hệ/khiên một lần. Cắt dây sau impact; không tự cấp Mạch.

Đặt `r = MP tiêu / Max MP lúc bắt đầu`, `P = 120` (tuning thử):

| Thành phần | Raw damage |
|---|---|
| Tạo đầm | 20% MP tiêu × P |
| Rồng mở đầu | 2 ATK chụp × r × P |
| Siết nền | 5% MP tiêu × P / nhịp |
| Tăng Siết mỗi Q trúng | 10% ATK tại hit × r × P |
| Damage riêng rồng Q | 0,25 ATK chụp × r × P |
| Nổ cuối | 50% raw Siết tích |

Đại chiêu cả hai nhánh và Q bồi B1 không sao chép, không tiêu kính R. Các chiêu
thường ngoài chuỗi vẫn dùng kính. Chết/hết run hủy toàn bộ chiêu đang chờ,
ngục/đầm/slow; không gây damage muộn. Dùng đại chiêu không hi sinh HP hoặc kết
thúc lượt chơi. Stage Kháng Chiến giữ chuỗi riêng của nó.

## Tuning và số đo

Các lựa chọn triển khai chưa được người thiết kế chốt trước đây (ghép phím,
50% MP tối thiểu, 20s CD, luật R đại chiêu, các hệ số chuyển ATK/MP) là tuning
thử, tập trung ở `src/config/balance/waterEvolution.ts`.

Benchmark: Lv15, 75 Tinh Thần, ATK 49,5 / Max MP 460 trước buff solo; boss
1.000.000 HP, DEF 50, hệ Thủy; không Crit, đứng ở tâm đủ chuỗi, không buff Stage
hoặc khiên ngoài. B1 có buff solo nền sau commit, lượng tăng Siết dùng ATK tại hit.
10 Q bắt đầu 1,6s, cách nhau 0,4s. Đây là đo damage, chưa đo thời gian hạ boss
trong trận có di chuyển, né đòn, hồi MP và các kỹ năng khác.

| Kịch bản | Damage thực | Máu boss |
|---|---:|---:|
| B1 đủ MP, đủ 10 Q | 111.792 | 11,18% |
| B1 50% MP, đủ 10 Q | 55.896 | 5,59% |
| B1 đủ MP, không Q | 21.810 | 2,18% |
| A1 solo, không khiên hút | 109.080 | 10,91% |

Mục tiêu tối thiểu 10% được xác nhận trong cấu hình benchmark B1 đầy đủ;
không có công thức damage theo % HP mục tiêu. A1 hút nhiều khiên hoặc các cụm
cùng trúng mục tiêu lớn có thể mạnh hơn; cần chơi thử trước khi coi là balance cuối.

`node scripts/verify-water-evolution.cjs` lưu số đo ở
`outputs/water-evolution/benchmark.json`. `npm test` gồm ca MP/READY/cooldown/
party quota, 10 Q, deadline, crowd độc lập, R, death/reset, HUD và ghép phím.

Thử nhanh: Sandbox → Dev → **Thử A1/B1 cấp 15** → đóng Dev → Q+E → click bia.
Preset dùng progression thật, phân 75 Tinh Thần, hồi tài nguyên, dừng AI;
A1 chuẩn bị dây. Bia thử đổi thành 1 triệu HP/DEF 50. Đây chỉ là công cụ Dev.
