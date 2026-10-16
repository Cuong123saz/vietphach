# Giáp Tai Ương — boss thử nghiệm

## Specification thay thế — bốn kỹ năng theo người thiết kế

Chuỗi mới thay toàn bộ hai đòn và enrage cũ: lặn bằng tư thế vùi đất → biến mất/không targetable dưới đất → trồi lên bắn ngay lượt gai vòng cung → sau 2,5 giây bắn lượt thứ hai, ngắm lại mục tiêu → nhảy tới vị trí mục tiêu đã chụp → hạ cánh khựng 0,3 giây rồi lao về hướng mục tiêu → hóa vỏ tròn, báo hướng trong 1,3 giây → lăn nhanh theo hướng khóa → lặn lại. Nhảy không gây damage dọc đường; lao/lăn mỗi đòn hit mỗi mục tiêu tối đa một lần. Không xuyên vật cản/kết giới.

Không còn phát gai 360° hoặc tăng gai dưới nửa HP. Thời gian giữa hai lượt 2,5 giây và báo lăn 1,3 giây đã chốt; thời lượng/tốc độ khác, số gai, góc quạt, HP/damage vẫn tuning. Độ cao nhảy chỉ thuộc Presentation. Sheet gốc có frame vùi đất/trồi/nhảy/lao/lăn riêng; không nhập nền caro trong ảnh chụp.

Chết/tắt AI/reset hủy chuỗi và dọn trạng thái dưới đất. Không có mục tiêu hợp lệ thì hủy chuỗi, nổi và chờ tìm lại; vẫn không về home. Acceptance gồm đúng hai lượt cách 2,5 giây, báo lăn đủ 1,3 giây, hướng khóa không đổi, dưới đất không coi là chết, hit không lặp và va chạm vẫn chặn chuyển động.

Tinh anh và boss chủ động tìm mục tiêu hợp lệ trên toàn khu, giữ truy đuổi dù mục tiêu đi xa điểm xuất hiện. Không có mục tiêu thì đứng chờ và tiếp tục tìm ở tick sau; không quay về home. Mục tiêu chết/rời khu/không targetable thì chọn lại theo luật phe và threat hiện tại. Không giữ mục tiêu đã chết. Quái thường vẫn dùng detection/leash/home.

Thiết kế mới từ pose-sheet người thiết kế cung cấp, đã triển khai bản thử trong Sandbox. Tên và chỉ số là đề xuất thử nghiệm, chưa là balance chính thức. Boss dùng hệ Thổ cho bản thử (chưa chốt nội dung); tinh anh dùng luật random hệ hiện tại.

Presentation dùng frame được chọn từ sheet, có body region riêng để không lấy bụi/ánh chém làm thân. Pha gameplay quyết định thời điểm damage; ảnh/tween không quyết định damage. Không coi 10 tư thế là chuỗi animation liên tục.

Phạm vi code đầu tiên: sáu tinh anh và boss có thể chọn riêng trong Dev, dùng cấu hình thử nghiệm tập trung. Tinh anh chuột/châu chấu dùng lao có va chạm; ốc/sâu bắn quạt; sâu đột biến bắn tỏa tròn; sâu đen có quạt rộng. Vũng nhầy và chuỗi hai lượt của tài liệu tinh anh vẫn TODO, không giả rằng đã có. Hai loại thiếu tư thế nghỉ dùng cùng ảnh tĩnh và dấu báo riêng.

Test gameplay không cần Phaser. Chuỗi không tự cấp phần thưởng hoặc cơ chế phá kết giới.

Điều chỉnh né đòn: khóa điểm trồi tại chân mục tiêu khi bắt đầu dưới đất, báo vòng trong 1,5 giây; boss trồi ở điểm đã khóa dù người chơi di chuyển. Đường tới điểm trồi vẫn bị kết giới/vật cản chặn. Bán kính đạn 10 thay 5; nghỉ 0,5 giây sau lượt bắn thứ hai trước khi nhảy. Hạ cánh khựng 0,3 giây trước khi lao. Các giá trị mới là tuning theo yêu cầu tăng thời gian né.

Nhịp khựng: sau đáp, sau lao và sau lăn đều dừng 0,3 giây, giữ tư thế và không phát hit mới trong pha nghỉ. Sau bắn giữ các khoảng nghỉ đã có (2,5 giây giữa hai lượt, 0,5 giây trước nhảy); không cộng thêm một khoảng nghỉ chồng lên chúng. Lăn vẫn có 1,3 giây báo né riêng sau nhịp khựng của lao.
