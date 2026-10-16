# Thủy Long Giáng Thế — bản thiết kế đang thảo luận

Lưu trữ lịch sử: gameplay lượt chơi thường đã triển khai ngày 08/10/2026 theo
[Water-Mage-Assault-Paths.md](Water-Mage-Assault-Paths.md). Các đề xuất/chưa chốt
bên dưới mô tả thời điểm 06/10, không còn là danh sách phần chưa làm hiện tại.

Ngày cập nhật: 2026-10-06. Dành cho B1 cấp 15; chưa triển khai gameplay.

## Diễn biến người dùng đã mô tả

- Thi triển 1,5s, tiêu toàn bộ MP hiện có. Nhân vật bắn quả cầu lên không trung, bay nhanh tới tâm đã chọn và đứng cố định tại tâm.
- Tạo Thủy Vực Siết bán kính 100 world px (cùng đơn vị radius với đầm hiện tại), đường kính 200. Hút theo Thủy Vực Siết.
- Rồng xoay một vòng gây một lần damage, sau đó bay lên trời. Hệ số damage chưa chốt.
- Trong 5s tiếp theo: Khô Mạch, Q không cooldown và không tiêu MP. Tối đa 10 Q có hiệu lực.
- Q bỏ triệu hồi/vận/biến hình; dùng frame bay của rồng lao thẳng cực nhanh từ trượng pháp sư vào tâm. Đây là sửa rõ cho mô tả trước, không bỏ hoàn toàn hình rồng ở Q.
- Q vẫn kích Siết tức thời và tăng Siết như cơ chế hiện tại; mỗi Q làm quả cầu lớn thêm một nấc rồi xoay. Kích thước cuối và nhịp input chưa chốt.
- Kết thúc: rồng lao xuống đớp quả cầu ở tâm, gây nổ theo lượng DOT tích được nhân hệ số chưa chốt.

## Đề xuất đang chờ chốt

- Tích Siết định kỳ và Siết tức thời do Q. Không tích damage riêng của rồng Q, rồng mở đầu, tạo đầm hoặc vụ nổ.
- Chỉ tích một lần cho mỗi lần Siết AoE thực sự trúng ít nhất một Enemy, dùng rawDamage của lần đó. Không nhân lượng tích với số quái; vụ nổ áp damage gốc cho từng mục tiêu qua Damage Core một lần.
- Dùng rawDamage có xác nhận hit để tránh áp DEF/ngũ hành hai lần khi tạo damage nổ. Nếu muốn tích damage sau giảm trừ hoặc tổng toàn bộ mục tiêu thì cần một thiết kế khác, không tự đổi pipeline.
- Hệ số nổ thử 50%. Chưa phải balance chính thức.
- Mô hình bảng tính dùng Max MP 1000, ATK 100, 10 Q trúng tại 0,25s + 0,4s mỗi lần; Siết nền 5% Max MP, tăng 10% ATK/Q, nhịp 1s. Chưa có R, quái rời đầm, thay đổi ATK hoặc chết sớm.
- Nếu tick và Q cùng thời điểm, tick định kỳ xảy ra trước Q theo runtime hiện tại.
- Ví dụ: Siết định kỳ 590; Siết tức thời do Q 950; lượng tích đề xuất 1540; nổ x0,5 = 770 rawDamage/mục tiêu.

## Chưa được chốt

- Hệ số tạo đầm, rồng xoay mở đầu, damage rồng Q ở Lv15 và hệ số nổ cuối.
- Lv15 có giữ cơ chế gia hạn đầm +2s hay thời gian 5s cố định; các luật Lv13 vẫn giữ nguyên cho Lv13.
- R sao chép phần nào ở Lv15, bản sao Q có dùng chung giới hạn 10 hay không.
- Mốc tiêu MP trong 1,5s, điều kiện MP tối thiểu, E READY/hỗ trợ, hủy khi chết và cách xử lý Q đang bay khi hết 5s.

Bảng tính so sánh: outputs/long-descent-20261006/Thuy-Long-Giang-The.xlsx.

## Trial nhiều quái và boss — đề xuất mới, chưa chốt

- Mục tiêu tạm: boss 1.000.000 HP, trận 120s. Người dùng đang được hỏi thời gian mong muốn; 120s chưa phải quyết định đã duyệt.
- Cần trung bình 8.333,33 damage thực/s trong cả trận. DEF 50 và cùng hệ cần khoảng 16.666,67 damage gốc/s nếu bỏ crit.
- Người dùng chốt mức tối thiểu của đại chiêu: 10% HP boss làm mục tiêu cân bằng. Với boss chuẩn 1.000.000 HP, toàn bộ kỹ năng cần ít nhất 100.000 damage thực sau DEF/hệ khi thực hiện đầy đủ. Đây chưa phải cơ chế damage bằng % Max HP mục tiêu; chỉ số và hệ số triển khai vẫn cần chốt.
- Giữ chu kỳ 20s làm đề xuất thử: 100.000 damage thực tương đương 5.000 DPS. Phần đòn thường/kỹ năng khác cần trung bình 3.333,33 DPS thực để đạt mục tiêu trận 120s. Chu kỳ và thời gian trận chưa được người dùng duyệt.
- Ngân sách HP thử cho quái thường 4.000–8.000, tinh anh 30.000–60.000. Chưa chứng minh thời gian hạ bằng gameplay, chưa áp vào stats.
- Chỉ số Lv15 hiện tại khi dồn 75 Tinh Thần: ATK 49,5 / Max MP 460 / MP regen 5; thêm buff solo +75 Tinh Thần: ATK 87 / Max MP 760 / MP regen 8.
- Trong ví dụ 10 Q, các phần damage đã tính lần lượt 1.227,825 và 2.103,45 rawDamage; chưa gồm tạo đầm/rồng mở đầu/R. Giữ nguyên sức mạnh hiện tại không phù hợp boss 1 triệu HP trong vài phút.
- Quái hiện tại hồi 2% Max HP/s sau 7s không bị đánh: boss 1 triệu sẽ hồi 20.000 HP/s. Đề xuất boss chỉ hồi về đầy khi reset trận, chưa đổi gameplay.
- Đề xuất sức mạnh kỹ năng Lv15 phụ thuộc tỷ lệ MP thực tiêu / Max MP để tránh cast với rất ít MP vẫn có đủ damage. Công thức và MP tối thiểu chưa chốt.
