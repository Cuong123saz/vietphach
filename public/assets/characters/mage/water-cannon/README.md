# Thủy Pháo — nguồn presentation

Model nhân vật hiện tại dùng `../model-v2/poses.png`, cùng phong cách Cung Thủ. Các pose PNG ở thư mục này được giữ làm nguồn cũ; VFX nước, cầu, đạn và rồng vẫn đang dùng. Điểm đầu trượng hiện tại: Thủy Pháo (28,-37), vận lực Q (22,-65), lật ngang khi quay trái.

`source.png` là bản sao nguyên vẹn ảnh người dùng cung cấp, 2155 × 730 pixel,
nền đen đặc. Không vẽ lại. Presentation trích pose 02/03/04 và VFX riêng bằng
canvas; pose chỉ loại pixel gần đen (ngưỡng 5), giữ tóc/nét tối thay vì
flood-fill với ngưỡng 38. VFX khôi phục alpha từ nền đen và dùng normal
blending để giữ màu xanh. Orb sáng dần bằng tint xám đến trắng, alpha luôn 1.
Ảnh nền đen không thể khôi phục alpha gốc hoàn hảo. Trang phục pose trong sheet khác Mage idle/run hiện có.

Pose RIGHT là gốc, LEFT lật ngang. Muzzle offset RIGHT (27, -34) world units,
LEFT (-27, -34); đây là điểm neo presentation, không phải stat/balance.
Timing tụ lực lấy từ gameplay attackInterval. Fire/impact chỉ là hiệu ứng
ngắn, không làm chậm nhịp bắn hoặc quyết định Hit/Damage.

## Tài nguyên vận lực mới
`charge-character.png` là pose nhân vật alpha gốc trước model V2, được lưu
nguyên vẹn để tham khảo. Model V2 dùng canvas 128 × 96, neo chân (64,88).
`charge-water.png` là sheet nước alpha gốc: trái đang tụ, phải tối đa.
Hai hiệu ứng neo tại chân, hòa chuyển và tăng chiều cao theo chargeProgress;
FULL_CHARGE giữ mức tối đa. Nước nằm sau nhân vật và lật theo hướng đánh.
Kích thước nước 88/96 và offset chân +7 là tuning presentation.
Đã bỏ pose bắn cũ. Khi nhả, nhân vật dùng lại idle/run; hiệu ứng tụ và đạn vẫn hoạt động.
Projectile và impact vẫn lấy từ source.png cũ.

`full-water-loop.png`: sheet alpha 4 × 2, 8 frame, dùng riêng ở FULL_CHARGE.
Căn đáy vòng nước mỗi frame, lặp 10 fps; bỏ co giãn sục sôi giả ở mức cuối.

`impact.png`: ảnh va chạm alpha gốc mới, tâm bung (88%,57%), xoay theo hướng đạn.
Giữ rõ 0.65 giây rồi tan 0.35 giây; không dùng crop nổ nước cũ.

Quả cầu dùng đủ 4 hình hàng dưới source.png, hòa chuyển theo chargeProgress.
Ở FULL_CHARGE giữ hình 04, xoay 0.5 rad/giây quanh tâm; nhả hoặc bắt đầu chu kỳ mới reset góc.

`dragon-dive.png`: sheet RGBA gốc 2172 × 724, không phải grid bốn ô đều.
Tách theo bốn silhouette alpha liên thông lớn nhất để giữ đủ đuôi, bỏ mảnh xanh
của hình kế bên. Các frame dùng canvas chung 681 × 728 và điểm neo đầu riêng.
Khi đổi pose, hình mới giữ rõ hoàn toàn; hình cũ đi cùng đầu rồng rồi tan trong 80 ms.

`dragon-impact.png`: ảnh va chạm Q mới do người dùng cung cấp, giữ nguyên PNG.
Tâm bung (90%,56%) neo ở điểm chạm, trục hướng phải xoay theo hướng rồng bay.
Pose rồng đã tạo hình/bay dùng chung chiều cao 88, giữ tỷ lệ gốc hai trục.

`q-poses.png`: sheet hai tư thế alpha gốc. Trái là pose chờ 1 sau khi bắn cầu;
phải là động tác ra lệnh 2 trước dive. Chuẩn hóa theo thân/neo chân, hướng trái
lật ngang; texture dùng cùng canvas model 128 × 96 để giữ cả tóc và đầu trượng.
