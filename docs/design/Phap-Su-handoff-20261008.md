# Dữ liệu tiếp nối Pháp Sư — 08/10/2026

Nguồn đối chiếu: chat “Cập nhật kỹ năng Pháp Sư Thủy” (01a10b03-5f7d-7671-8df2-a9de49f9e2c6), CORE_RULES.md, docs/design/Thuy-Long-Giang-The-draft.md và docs/design/Khang-Chien-Finale.md. Đây là bản đối chiếu, không thay thế specification hiện tại.

Bản này ghi lại trạng thái trước khi triển khai. Người dùng đã chọn hoàn thiện
lượt chơi thường; hiện hai nhánh đã có gameplay đến cấp 15 theo
[Water-Mage-Assault-Paths.md](Water-Mage-Assault-Paths.md).

## Nhánh thường trong Việt Phách

- A1 hiện là Thủy Nhân Mạch; B1 hiện là Thủy Long Mạch. A2/B2 tiếp tục khóa. Tên core và đường trong D:/kpah khác Việt Phách, không sao chép nguyên mapping.
- B1 đã triển khai cấp 5/7/9/11/13; cấp 15 Thủy Long Giáng Thế vẫn chưa cho chọn. A1 chưa triển khai gameplay các mốc, nên Bát Đại Hải Long chưa có chuỗi tiến hóa hoàn chỉnh.
- Thủy Long Giáng Thế đã được người dùng mô tả: thi triển 1,5s, tiêu toàn bộ MP hiện có, đưa quả cầu tới tâm chọn; tạo thủy vực bán kính 100 world units, rồng xoay gây một lần sát thương rồi bay lên. Tiếp theo 5s Khô Mạch; tối đa 10 Q do người chơi tự nhấn, miễn MP/CD, rồng dùng frame bay lao nhanh từ trượng tới tâm. Q kích Siết rồi tăng Siết; quả cầu lớn lên. Cuối cùng rồng lao xuống đớp cầu và nổ.
- Mục tiêu người dùng đặt: một lần thực hiện đầy đủ đại chiêu gây ít nhất 10% HP boss chuẩn 1.000.000 sau DEF/hệ. Đây là benchmark cân bằng, chưa phải sát thương theo % HP boss.
- Đề xuất tích Siết định kỳ + Siết tức thời do Q, mỗi AoE trúng chỉ tích rawDamage một lần, không nhân số quái; hệ số nổ 0,5 vẫn chưa chốt. Không đưa damage rồng Q vào Siết tích.
- Chưa chốt: điều kiện kích hoạt ngoài Stage, MP tối thiểu, hệ số damage từng phần, R sao chép phần nào, luật gia hạn và Q đang bay khi hết cửa sổ. Không lấy tuning cinematic để lấp các thông số này.

## Hai đại chiêu trong Kháng Chiến hiện tại

Specification mới tại Khang-Chien-Finale.md thay bản cũ boss 20% và cửa sổ tự kết thúc 5s:

1. Boss 40%: cảnh báo, chờ Q+E; chấp nhận đồng thời hoặc nối tiếp trong 0,6s.
2. Kích hoạt: nhân vật còn 1 HP, 0 MP, xóa khiên và khóa hồi; boss không xuống dưới 1 HP.
3. Cầu E bay 1,5s. Người chơi tự nhấn Q đủ 10 lượt, không auto-repeat, không tự bù lượt thiếu. Vòng Bát Đại tụ theo stack.
4. Giáng Thế raw 250.000; Bát Đại raw 1.000.000 qua Damage Core. Các mốc cuối tính từ Q thứ 10.
5. Dân tưởng thắng, giáp phản nổ làm pháp sư bị thương. Sau lời hiến hồn, HP/MP giữ 0; linh hồn tan vào Long Mạch và thanh tẩy đất/nước. Dân sống, nhà hỏng cần xây lại. Pha thanh tẩy 12s trước màn kết; pause khi Dev/bảng nhân vật/mất focus. VFX kỹ năng sẫm dần qua bốn map; xem `Khang-Chien-Story-Draft.md` và specification Finale cập nhật.

Đây là chuỗi riêng Stage đã có gameplay; không đồng nghĩa đã hoàn thành hai nhánh tiến hóa cấp 15 toàn game.

## Bát Đại Hải Long trong prototype D:/kpah

Tài liệu tham khảo, chưa phải luật đã chốt cho Việt Phách: READY + đủ n−1 dây; Q+E trong 0,4s rồi chọn tâm. Cầu E nâng lên, 8 rồng cuộn quanh; cầu đáp trước kích Thủy Ngục/Hải Long Xuất Thế, 8 rồng theo sau; tiêu 90/80/70/60% Max MP ứng với 0/1/2/3 dây và xả mạng. Prototype dùng hệ thống Water Power và đường A1/B1 khác Việt Phách, cần chuyển đổi có chủ đích.

## Điểm cần xác định trước khi triển khai tiếp

Hoàn thiện hai nhánh tiến hóa sử dụng trong mọi lượt chơi, hay hoàn thiện riêng chuỗi kết thúc Kháng Chiến. Hai phạm vi có luật kích hoạt, tài nguyên, damage và kết quả khác nhau.
