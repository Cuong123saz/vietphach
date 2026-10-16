# R — Thủy Kính Vạn Tượng

Tên thư mục `water-mirror-three-aspects` giữ nguyên theo bộ tài nguyên đã chuẩn bị.

| Số lượt sử dụng còn lại | Tài nguyên hiển thị |
| --- | --- |
| 3 | `charges-3.png` |
| 2 | `charges-2.png` |
| 1 | `charges-1.png` |
| 0 | Không hiển thị hình ảnh; ẩn hoặc loại bỏ đối tượng hiển thị. |

Đường dẫn gốc: `/assets/characters/mage/water-mirror-three-aspects/`.

`source.png` là ảnh gốc 2172 × 724. Ba trạng thái được cắt theo thứ tự trái sang phải, mỗi vùng 724 × 724, giữ nguyên pixel, tỷ lệ và alpha trong suốt. Không vẽ lại.

Khi tích hợp, số lượt còn lại phải lấy từ trạng thái gameplay. Hai điểm màu xám trong ảnh còn 1 lượt là phần thiết kế của trạng thái đó; khi hết cả 3 lượt phải ẩn toàn bộ hình, không tiếp tục hiển thị một phiên bản màu xám hoặc mờ.

Đã tích hợp qua `WaterSupportEffects.ts`. Cụm kính rộng 60 đơn vị world, gần bằng chiều cao nhân vật (64); tâm lệch trái 52 đơn vị và cao hơn điểm chân 76 đơn vị, hơi cao hơn đỉnh đầu. Luôn ở phía trái màn hình, không đổi bên khi nhân vật quay hướng. Đổi nguyên hình theo `waterSkills.mirrors.count`; hết lượt hoặc hết thời gian thì ẩn toàn bộ. Ba hình dùng chung khung alpha và scale để không nhảy vị trí/kích thước khi tiêu kính. Số lượt, thời hạn, MP và cơ chế sao chép lấy từ gameplay, hình không tự quản lý chúng.

Q/E sao chép dùng cùng điểm xuất phát `waterMirrorOrigin()` với hình kính. Mỗi lần sao chép lóe sáng xanh trắng ở kính trong 0,18 giây, rồi phóng chiêu. Q bỏ hoàn toàn orb vận lực/tạo hình/anticipation: rồng ở dạng bay lao thẳng từ tâm kính đến tọa độ Q gốc, bay 0,65 giây rồi nổ nước và tính AoE/Damage. Gameplay và VFX cùng dùng `WATER_MAGE_COPY_TIMING`; Q gốc vẫn dùng chuỗi thi triển 2,31 giây.

E sao chép phát luồng nước sau lóe sáng đến từng người thực sự được cấp khiên, kể cả hai phần 50/50. Luồng E là VFX 0,4 giây, không thêm projectile/hit/giáp và không trì hoãn thời điểm cấp khiên. Bản sao đã lên lịch vẫn dùng vị trí kính khi bắt đầu thi triển dù số kính chưa dùng đã về 0; trường hợp này chỉ lóe orb tại điểm phóng, không hiện lại cụm kính 3/2/1 giả. Lóe sáng và luồng bay được hủy khi caster chết hoặc scene đóng.
