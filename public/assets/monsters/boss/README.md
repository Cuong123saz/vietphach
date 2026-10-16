# Tài nguyên boss

## Bộ boss vỏ gai

ID tài nguyên: `boss/spiked-shell-beast` (tên kỹ thuật theo hình dáng, chưa phải tên boss chính thức).

Ảnh: `/assets/monsters/boss/spiked-shell-beast/pose-sheet.png`.

PNG 1536 × 1024 có nền trong suốt, sao chép nguyên bản từ ảnh người dùng cung cấp. Giữ toàn bộ nét vẽ, chất nhầy, đất đá và hiệu ứng. Bản nguồn đối chiếu nằm tại `art/monsters/boss/spiked-shell-beast-original.png`.

Ảnh chứa 10 tư thế trong bố cục 3 / 3 / 4: nằm trên mặt đất, bật lên, lao cào, chui xuống đất, trồi lên, cuộn xoay và các tư thế cuộn vỏ phía dưới. Đây là mô tả hình ảnh, không phải specification kỹ năng.

## Trạng thái sử dụng

- Sẵn trong thư viện để tải làm ảnh tham chiếu hoặc chuẩn bị asset boss.
- Chưa cắt thành frame độc lập: bố cục không chia ô đều, một số hiệu ứng nằm sát hoặc chồng vùng cắt. Không dùng `load.spritesheet` với kích thước ô cố định.
- Chưa có atlas tọa độ, điểm neo, thứ tự hoạt ảnh hoặc thời lượng đã xác nhận. Không coi 10 tư thế là một chu kỳ animation.
- Chưa thêm boss vào map hay gameplay; không tự đặt HP, damage, collision hoặc phần thưởng.
- Không tạo ZIP, quản lý các file bằng Git cùng dự án.
# Tích hợp gameplay hiện tại

Giáp Tai Ương dùng chuỗi bốn kỹ năng: vùi đất/ẩn → trồi bắn hai lượt quạt cách 2 giây → nhảy → lao ngay khi đáp → hóa vỏ báo lăn 1 giây → lăn → vùi lại. Specification: `docs/design/Boss-Giap-Tai-Uong.md`; tuning: `src/config/balance/eliteEnemies.ts`; gameplay: `SpikedShellBoss.ts`. Presentation chọn các vùng frame riêng từ sheet gốc, giữ nguyên PNG; không nhập nền caro của ảnh chụp minh họa. Thử bằng mục Dev Giáp Tai Ương.

