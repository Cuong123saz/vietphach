# Tài nguyên 6 loại quái vật

Bộ tài nguyên boss được lưu riêng tại [`boss/README.md`](boss/README.md).

Bộ quái tinh anh được lưu riêng trong [`elite/README.md`](elite/README.md), gồm 10 ảnh khác nhau từ 11 ảnh bổ sung. Các tài nguyên quái thường bên dưới được giữ nguyên.

12 ảnh PNG nền trong suốt được cắt từ ảnh người dùng cung cấp. Giữ nguyên nét vẽ, màu sắc và kích thước điểm ảnh của vùng cắt; không vẽ lại. Đã bỏ nhãn chữ và các mảnh hình lân cận ở mép cắt. Bóng nền, chất nhầy và hiệu ứng chuyển động đi cùng tư thế được giữ lại.

| Loại quái | Thư mục | Tư thế bình thường | Tư thế thứ hai theo ảnh gốc |
| --- | --- | --- | --- |
| Ốc sên hại mùa | `crop-snail` | `normal.png` | `prepare-spray.png` — gồng chuẩn bị phun |
| Chuột lông bết | `flat-fur-rat` | `normal.png` | `jump-attack.png` — nhảy cào tấn công |
| Sâu róm | `caterpillar` | `normal.png` | `prepare-shot.png` — xù lông chuẩn bị bắn |
| Sâu róm đột biến | `mutant-caterpillar` | `normal.png` | `bristle-attack.png` — xù lông tấn công |
| Sâu róm đen | `black-caterpillar` | `normal.png` | `bristle-rage.png` — xù lông dữ tợn |
| Châu chấu | `grasshopper` | `normal.png` | `jump-attack.png` — nhảy tấn công |

Đường dẫn tài nguyên: `/assets/monsters/<thư mục>/<tư thế>.png`.

## Phạm vi sử dụng

- 6 quái thường trong Sandbox tự phát hiện và tấn công người chơi theo yêu cầu mới. Chuột/châu chấu đánh gần; ốc sên/các loại sâu bắn đạn. Dùng chung Combat Core; chưa có EXP/loot.
- Mỗi loại chỉ có hai ảnh độc lập, không phải chuỗi khung hình hoạt ảnh. Runtime chuyển normal → ảnh phát động → normal theo pha AI. Thời lượng và thông số được đặt riêng trong cấu hình Sandbox thử nghiệm.
- Các vùng cắt có kích thước khác nhau; chưa đồng nhất khung hình hoặc tỷ lệ hiển thị giữa các loại quái.
- HP/ATK/tốc độ/tầm đánh/nhịp đánh hiện dùng số thử nghiệm, chưa phải balance chính thức; không có phần thưởng hoặc cấp độ quái mới.
- Nhân vật thi triển, tia nước và viên đạn không nằm trong bộ tài nguyên này.
- Nguồn gốc giấy phép sử dụng thương mại chưa được cung cấp.

Ảnh tham chiếu nguyên bản được lưu tại `art/monsters/monster-reference-original.png` ở gốc dự án để đối chiếu; file này vẫn chứa toàn bộ ảnh nguồn.

## Tích hợp Sandbox

Thông số thử nghiệm tập trung ở `src/dev/sandbox/monsters.ts`, chưa phải balance chính thức. Element của quái thường lấy qua Enemy Element Core khi tạo, đòn đánh dùng chính hệ của quái. AI ở `src/gameplay/enemies/EnemyCombat.ts` và đăng ký qua Run. Đòn phát động khóa hướng/vùng đánh; mục tiêu né được, đạn bị vật cản chặn, damage đi qua DEF/Ngũ Hành/khiên/HP.

`MonsterTextures.ts` giữ ảnh nguyên bản, khai báo vùng thân cho ảnh phát động để tia/gai/vệt bay nằm sẵn trong PNG không trở thành hitbox thân. Scale và điểm neo dựa trên vùng thân, có xử lý flip trái/phải. Quái chết mờ đi, dừng AI và không còn là mục tiêu hợp lệ. Dev → Dừng / chạy AI quái dùng để thử kỹ năng; Hồi đầy HP / MP reset phòng thử kể cả khi người chơi đã gục, không thay luật hồi máu trong gameplay.

Thù hận theo tag nhân vật nguồn: cận chiến +5, tầm xa +10 mỗi hit gây sát thương.
Quái ưu tiên bảng điểm của chính nó. Sau 7s không nhận sát thương, điểm giảm với
tốc độ tăng dần và quái hồi 2% Max HP/s; nhận hit mới đặt lại timer. Sandbox hiển
thị TH và nhãn Hồi, Dev xem bảng điểm/mục tiêu. Đây là cơ chế phục hồi enemy được
người dùng yêu cầu, không thêm stat HP Regen cho nhân vật.
