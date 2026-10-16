# Pháp Sư · model V2

Tạo 08/10/2026 bằng ImageGen tích hợp. Mẫu phong cách là `archer/poses-v1.png`; nhận diện là Pháp Sư nam trẻ tuổi. Áo lam thêu sóng, trượng đồng ngọc Thủy, tóc nâu cột gọn. Hai PNG gốc alpha được giữ nguyên. Prompt đầy đủ nằm trong `asset.json`.

- `poses.png`: bốn hướng đứng; Thủy Pháo, vận lực, chờ Q, ra lệnh Q. Dáng ra lệnh còn dùng cho động tác đánh ở finale để giữ cùng tạo hình.
- `run.png`: bốn khung mỗi hướng phải, trước, sau, trái.

Runtime tách silhouette alpha, giữ phần tóc/trượng vượt ô danh nghĩa, loại mảnh ảnh cạnh bên. Mọi dáng dùng canvas 128 × 96 và gốc chân (64,88). Dáng đứng cao khoảng 74 world px, tương tự Cung Thủ. Chạy gập chân có silhouette 66 px, căn theo thân/đầu và một mặt đất chung cho mỗi vòng chạy. Chân nhấc khỏi đất vẫn giữ được độ cao. HUD dùng chân dung từ đúng bộ model mới. Không thay VFX hay chỉ số kỹ năng.

Nguồn model cũ được lưu ở thư mục Mage gốc; chúng không còn dùng cho model đang chơi. Bảng soát dáng: `/outputs/mage-model/review.html` trên máy phát triển.
