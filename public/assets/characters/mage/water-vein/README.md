# Nội tại — Thủy Mạch

Thủy Mạch nối giữa các E — Thủy Hộ trên mặt đất. Khi tích hợp, hiệu ứng nằm trên nền đất và dưới nhân vật.

| File | Vai trò |
| --- | --- |
| `active-link.png` | Hình đậm ở hàng trên, dùng cho kỹ năng hiện tại. |
| `active-link-transparent.png` | Bản tách nền của hình đậm, được game sử dụng. |
| `future-link.png` | Hình nhạt ở hàng dưới, dự trữ cho phát triển sau này; chưa dùng hiện tại. |
| `source.png` | Ảnh nguồn nguyên bản 2172 × 724. |

Hai vùng cắt có kích thước 2172 × 362, giữ nguyên pixel và tỷ lệ.

Ảnh nguồn có nền ô caro được ghi vào pixel (alpha 255 ở nền), không phải nền trong suốt. Các vùng cắt cũng còn nền này và chưa sẵn sàng ghép lên map. Cần xử lý nền trước khi sử dụng; không coi đuôi PNG là bằng chứng có độ trong suốt.

Đã tích hợp qua `WaterSupportEffects.ts`. Dây nối tọa độ chân của caster và đồng đội trong trạng thái Thủy Mạch thực tế, nằm dưới cả hai nhân vật. Hình xoay và scale đồng đều theo độ dài dây, giữ tỷ lệ; không tự chọn đồng đội hoặc cấp hiệu ứng. Dây biến mất theo gameplay khi hết hạn/mất liên kết; không phụ thuộc thời hạn riêng của khiên E.

Bản tách nền được tạo bằng công cụ imagegen tích hợp với yêu cầu: chỉ xóa nền caro thành alpha thật, giữ sóng nước xanh, giọt nước, hình dạng và tỷ lệ; không thêm hình hay chữ. Bản nguồn/các vùng cắt gốc được giữ nguyên. `future-link.png` tiếp tục chỉ là tài nguyên dự trữ.
