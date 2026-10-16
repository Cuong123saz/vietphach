# Quái Uế Mạch — thiết kế và bản tích hợp v1

Áp dụng cho bốn map Stage Kháng Chiến. Quái là sinh vật phá mùa bị Uế Mạch biến đổi; hình dáng và hành vi phải bắt nguồn từ loài, môi trường bùn nước và mức nhiễm uế. Bộ Sandbox cũ vẫn phục vụ các bài thử hệ thống chung.

## Phản biện thiết kế

Chỉ tăng gai, phủ đen và thêm ánh sáng không tạo ra một hệ quái có bản sắc. Người chơi cần nhìn dáng là đoán được vai trò, nhìn tư thế là biết sắp có đòn gì, và có thể chỉ ra vì sao mình trúng. Mỗi loài dưới đây có một chức năng chính. Tinh anh nâng mức áp lực bằng cơ chế cụ thể.

## Tạo hình và vai trò

| Loài | Hình dáng | Quái thường | Tinh anh và cách đối phó |
| --- | --- | --- | --- |
| Chuột Bùn | Lông nâu bết, đuôi cuộn, nanh ngà; tinh anh có mảng giáp hữu cơ nứt trên vai | Thu người 0,75 giây rồi lao ngắn | Thu người 0,9 giây, lao và kéo người trúng 96 đơn vị. Né ngang hoặc dùng Thủy Pháo ngắt đòn |
| Châu Chấu Giáp Rạ | Chân sau dài, giáp xanh ô liu pha màu rạ; tinh anh có giáp ống chân như vỏ cây | Cú nhảy vào điểm chốt lúc cất cánh, vòng đáp bán kính 32 | Hai cú đáp bán kính 54; mỗi cú bay 0,85 giây, nghỉ giữa hai cú 0,55 giây. Rời vòng đầu rồi quan sát vòng thứ hai |
| Ốc Nhựa Uế | Vỏ xoắn phong hóa, chân mềm ướt, cổ phun; tinh anh có vỏ gãy và đường uế đen | Nhổ một khối nhựa chậm, giảm tốc nhẹ | Hai khối nhựa cách nhau 0,6 giây, giảm tốc còn 55% trong 1,6 giây. Mỗi khối chốt hướng trước khi bắn 0,3 giây; đổi hướng sau khi đường báo đòn rõ lên |
| Sâu Gai Rễ | Thân xanh xám, gai nâu gỉ; tinh anh có vòng vỏ cây và đầu gai ngà | Bắn ba gai theo quạt hẹp | Dựng cung gai trên đường đi, báo trước 0,95 giây sau khi phóng. Tồn tại 3 giây, hồi chiêu dựng tường 5 giây; đổi đường hoặc vòng qua hai đầu cung |
| Sâu Hắc Châm | Thân than xám, đường đốt tím rất trầm, quạt gai ngà; tinh anh có quạt gai và giáp rõ hơn | Phóng một châm xương | Ghim vùng đất bán kính 64 vào hướng di chuyển dự đoán. Có 1,25 giây báo trước sau khi phóng; ghim 0,65 giây rồi để lại vùng gai 2,5 giây. Rời vòng đã chốt |
| Sâu Túi Uế | Thân nâu gỉ và túi nhựa đen trên lưng; tinh anh có túi lớn nối thành cụm | Nhổ uế và để lại vệt bùn khi di chuyển | Phun ba khối uế theo quạt. Cả hai cấp để lại vũng bán kính 44: báo 0,35 giây rồi hoạt động 4 giây. Vũng gây sát thương theo nhịp và làm chậm; tránh chạy bám sát phía sau |
| Giáp Tai Ương | Đầu thú có nanh, lông bùn, vỏ xoắn lớn bị rễ uế siết, móng ngà | Boss của map 4 | Đào xuống, báo điểm trồi, triệu hồi năm tinh anh; hai lần nhảy có vòng đáp; cuộn giáp rồi lăn thẳng theo hành lang đã báo. Móng và giáp tiếp tục hiện diện trong đoạn phản nổ cuối truyện |

## Quy tắc kỹ năng đã tích hợp

- Chuột và châu chấu bị đẩy/kéo chuẩn bị phản công 1 giây. Hướng chốt ở 0,3 giây cuối; tốc độ lao 340, tầm 420. Đòn đi thẳng, có thể né ngang; một lần đẩy/kéo mới ngắt đòn đang chuẩn bị hoặc đang lao.
- Báo đòn dùng viền tối, màu đất nung và đầu gai màu xương. Viền nhạt rõ hơn khi hướng đã chốt. Đường dự đoán vùng gai/tường còn mảnh; vùng đã phóng có viền rõ và vòng tiến độ.
- Vùng trúng lấy trực tiếp bán kính và đa giác của hệ chiến đấu. Vũng uế hiển thị toàn bộ hình tròn gây hại. Tường gai dùng cùng đa giác với vật cản; tường chỉ trở thành vật cản khi không có nhân vật đứng bên trong.
- Boss báo trước cú nhảy 0,8 giây, bay 0,95 giây, nghỉ 0,7 giây khi đáp. Điểm báo được chặn ở cùng phía với kết giới/vật cản. Đáp gây một lần sát thương trong vùng; lúc bay có thể vượt qua nhân vật. Lăn báo trước 1,4 giây, hướng cố định, tốc độ 360 trong 1,1 giây.
- Hiệu ứng dùng thời gian trận đấu: tạm dừng thì vòng tiến độ, đạn và dấu va chạm cùng dừng. Chế độ giảm chuyển động bỏ rung và hạt chuyển động, giữ dấu báo cần thiết.
- Màu quái trầm dần qua map nhưng giữ đường giáp, gai và vùng cơ thể sáng vừa đủ để đọc dáng. Chuyển động dựa trên ba tư thế mỗi cấp: thường trực, chuẩn bị, ra đòn; boss có sáu tư thế riêng. Đây chưa phải hoạt ảnh khung hình đầy đủ cho từng bước chân.

## Tài nguyên và kiểm tra

- 7 atlas PNG 1536×1024 trong `public/assets/monsters/ue-mach-v1/`: 6 loài × 2 cấp × 3 tư thế, thêm 6 tư thế boss, tổng 42 hình.
- Ảnh có alpha thật. Game tách khung và vùng thân từ alpha; không xóa nền bằng màu, không đưa đạn hay hiệu ứng nền vào vùng thân.
- Prompt và nguồn ảnh đã chọn: `art/monsters/ue-mach-v1/prompts.md`. Dùng công cụ imagegen tích hợp; giữ nguyên ảnh nguồn.
- Kiểm tra tự động bao gồm chốt hướng hai lần phun, né phản công thẳng, một đợt đẩy mới nhắm lại, vũng uế chưa kích hoạt không gây hại, hết hạn xóa vùng, boss đáp đúng một lần và dấu đáp không vượt kết giới, atlas không cắt xuyên hình quái.
- Cần đánh giá độ khó bằng chơi thử với người thật trước khi coi các con số này là cân bằng cuối. Các chỉ số HP/ATK và số lượng quái của Stage hiện được giữ theo bộ cân bằng đã có.
