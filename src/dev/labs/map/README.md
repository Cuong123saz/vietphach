# Lab map và ải

Mở game rồi chọn **Mở Lab map**, hoặc truy cập `/?lab=1`.

Chọn Pháp sư để thử **Thủy Pháo**: nhấn chuột trái để tụ, nhả để bắn ngay. Giữ đủ lực đứng ở pose 03,
không tự bắn; nhả từ 03 mới bắn một phát. WASD vẫn hoạt động;
tốc độ giảm dần từ 100% xuống 0% khi tụ và trở lại 100% khi bắn. Aim theo
chuột; nhân vật đánh trái/phải, đạn bay mọi hướng. Đặt marker Quái để thử Hit.
Hiện chưa gây damage/trừ MP. Mất focus hủy input/chu kỳ để tránh bắn nền.

Trong mục **Chạy thử**, chọn **Model nhân vật → Cơ bản / Pháp sư**, rồi bấm **Chạy thử khu**. Lựa chọn được nhớ trong tab khi quay lại Lab hoặc tải lại trang. Pháp sư khởi tạo Mage Water Lv1 với Core Stats/Resources V0.1 và MP regen. Cơ bản giữ movement preview; cả hai dùng di chuyển/va chạm hiện có. Đã có đánh thường Thủy Pháo; chưa có skill Q/E/R hoặc bảng phân bổ Potential trong UI. Model không nằm trong dữ liệu ải xuất JSON.

1. Đặt tên ải, thêm/sắp xếp khu và chọn loại khu.
2. Chọn Nhân vật, Lối ra, Quái hoặc NPC rồi nhấp map để đặt.
3. Chữ nhật/hình tròn: nhấp để đặt, sau đó sửa kích thước trong Thuộc tính.
4. Đa giác: nhấp ít nhất 3 đỉnh, chọn Kết thúc đa giác; Esc hủy nét vẽ.
5. Chọn/kéo đối tượng hoặc nhập tọa độ world và chọn Áp dụng thay đổi.
6. Lưu ải lưu trên browser này. Xuất JSON để sao lưu hoặc trao đổi; Nhập JSON kiểm tra dữ liệu trước khi thay thế.
7. Chạy thử khu mở MainScene với dữ liệu đã thiết kế. WASD/mũi tên di chuyển, camera follow, vật cản có hiệu lực. Quái/NPC chỉ là marker; lối ra chỉ là vị trí, chưa chuyển khu.
8. Quay lại Lab giữ bản thiết kế. Ctrl+Z hoàn tác, Ctrl+Shift+Z làm lại trong phiên chỉnh sửa.

Catalog hiện có map Làng và ruộng cùng bốn trạng thái map Kháng Chiến; map Làng dùng chung ảnh với Kháng Chiến 1. Bộ ảnh hiện tại dùng chất liệu tự nhiên và giảm đốm nhiễu; nguồn ảnh và prompt nằm trong `public/assets/maps/README.md` và `art/maps/realistic-v1/prompts.md`. Loại khu là metadata; không tự áp luật chiến đấu, nhiệm vụ hoặc thương mại. Resource ID của quái/NPC là tên tham chiếu cho catalog gameplay sau này. Lab chỉ cho HP override của quái, không nhận damage/AI/skill.

`model.ts` chứa history, browser storage và loader dành cho editor. Schema, validator và collision nằm trong `src/world/`, dùng chung với game. `Lab.ts` là giao diện. App đọc dữ liệu playtest qua registry; Run tạo clone khu và state người chơi độc lập.

Collision mẫu là ví dụ kỹ thuật, chưa bao phủ nước, nhà, cây, hàng rào của map. Player trong Lab có bán kính 12, tốc độ 150 world units/giây để thử bố cục; đây không phải thông số nhân vật chính thức.

Kiểm tra: `npm run test:lab`, `npm test`, `npm run typecheck`, `npm run build`.

## Q — Thần Long Thủy, UX/VFX prototype
Đặt ít nhất một marker Quái, chọn Pháp sư và chạy thử. Đưa chuột gần mục tiêu
muốn chọn rồi nhấn Q. Chỉ chọn Enemy, đánh dấu vòng xanh; không target NPC/self/ally.
Một rồng dựng nước, xoắn thân, hình thành, khựng rồi lao cong và tan tại điểm đến.
Vị trí mục tiêu được chụp khi bắt đầu lao. Không damage/MP/cooldown chính thức;
chỉ chặn Q trong lúc một preview đang chạy để tránh chồng hình.
Debug bật mới thấy quỹ đạo. Đây không phải Hit gameplay hoặc homing.
