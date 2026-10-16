# Tài nguyên quái tinh anh

10 PNG khác nhau từ 11 ảnh người dùng cung cấp. Các file sử dụng được sao chép nguyên bản, giữ nguyên nền trong suốt, màu sắc, hiệu ứng và khung 1254 × 1254 pixel. Không cắt, vẽ lại hoặc thay đổi tỷ lệ.

| Loại đối chiếu với bộ quái trước | File | Ảnh đính kèm | Mô tả hình ảnh |
| --- | --- | --- | --- |
| Ốc sên hại mùa tinh anh | `crop-snail/normal.png` | 1 | Miệng khép, vỏ gai phủ chất nhầy |
| Ốc sên hại mùa tinh anh | `crop-snail/spray.png` | 2 | Há miệng phun chất nhầy |
| Chuột lông bết tinh anh | `flat-fur-rat/ground.png` | 3 | Tư thế trên mặt đất, lông gai |
| Chuột lông bết tinh anh | `flat-fur-rat/leap-slash.png` | 4 | Tư thế lao với hiệu ứng chém đỏ |
| Sâu róm đột biến tinh anh | `mutant-caterpillar/bristled.png` | 5 | Thân cam có đốm, gai đỏ, không thấy râu |
| Sâu róm tinh anh | `caterpillar/projectile-spray.png` | 6 | Thân vàng xanh có râu, phun các vật thể nhọn |
| Sâu róm đen tinh anh | `black-caterpillar/bristled.png` | 7 | Thân tối, gai đỏ tím, há miệng |
| Sâu róm đen tinh anh | `black-caterpillar/projectile-spray.png` | 11 (bổ sung) | Phun gai tím, hiệu ứng nằm chung trong ảnh |
| Châu chấu tinh anh | `grasshopper/ground.png` | 9 | Tư thế trên mặt đất |
| Châu chấu tinh anh | `grasshopper/leap-slash.png` | 10 | Tư thế lao với hiệu ứng chém xanh |

Tên loại là đối chiếu hình dáng với bộ quái trước, không phải tên mới do người dùng xác nhận. Riêng ảnh 5 và 6 khác đặc điểm râu, đốm thân và gai nên được lưu thành hai loại riêng; không xem là hai khung hình của cùng một loại.

Ảnh 8 có SHA-256 giống hoàn toàn ảnh 7. Giữ cả hai bản gốc trong `art/monsters/elite/sources` để đối chiếu, chỉ đưa một bản vào bộ sử dụng.

## Sử dụng

Đường dẫn: `/assets/monsters/elite/<thư mục>/<tư thế>.png`.

- Đã tích hợp vào Sandbox: Dev có mục thử riêng cho sáu tinh anh. Chỉ số thử nghiệm ở `src/config/balance/eliteEnemies.ts`; chưa là balance chính thức. Chuột/châu chấu lao có va chạm; ốc/các sâu bắn quạt hoặc tỏa tròn. Hai loại thiếu tư thế dùng ảnh tĩnh, không giả chuỗi animation.
- Hiệu ứng nằm chung trong ảnh, chưa có lớp hiệu ứng độc lập.
- Khung ảnh bằng nhau không đồng nghĩa kích thước thân quái hoặc điểm neo bằng nhau. Giữ nguyên bố cục gốc.
- Đây là ảnh độc lập, chưa phải chuỗi hoạt ảnh. Sâu róm và sâu róm đột biến mỗi loại mới có một ảnh; sâu róm đen đã có hai ảnh khác nhau.
- Thiết kế mới và code thử nghiệm được người dùng yêu cầu sau khi nhập bộ tài nguyên. Không thay PNG gốc; không lấy gameplay từ project cũ. Asset `caterpillar/bristled.png` hiện là ảnh sâu đột biến theo đối chiếu hình dáng, khác loài với `caterpillar/projectile-spray.png`.

Ảnh xem trước: `art/monsters/elite/asset-preview.png` ở gốc dự án.
