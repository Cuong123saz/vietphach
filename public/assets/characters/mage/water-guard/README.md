# E — Thủy Hộ

Hai tài nguyên hình ảnh theo ý nghĩa người dùng xác nhận:

| File | Vai trò |
| --- | --- |
| `active-mark.png` | Dấu ấn biểu thị Thủy Hộ còn tồn tại và còn thời gian hiệu lực. |
| `damage-response.png` | Hiệu ứng xuất hiện khi người đang có Thủy Hộ chịu sát thương. |
| `source.png` | Ảnh nguồn nguyên bản, chứa cả hai hình. |

Đường dẫn gốc: `/assets/characters/mage/water-guard/`.

Cắt hai vùng độc lập từ PNG 2032 × 774, giữ pixel gốc và alpha, không vẽ lại hoặc thay đổi tỷ lệ. Giữ khoảng trống của vùng cắt để không mất giọt nước và viền sáng.

Đã tích hợp qua `WaterSupportEffects.ts`. Dấu ấn nằm dưới chân, dưới nhân vật, chỉ hiện khi còn ít nhất một phần khiên `water-e` chưa hết hạn và còn lượng khiên. Khiên từ nghề/kỹ năng khác không bật dấu này. Nhiều phần khiên E dùng chung một dấu, thời hạn từng phần vẫn do gameplay quản lý.

Điểm đứng trùng tâm oval nước trên mặt đất (x = 50%, y = 590/774 của ảnh gốc), không lấy tâm khung alpha chứa giọt nước và rune vươn lên. Vì vậy nhân vật đứng giữa vòng.

`damage-response.png` bật khi có hit xác nhận vào người đang có khiên E, kể cả hit phá hết khiên. Hiển thị 0,35 giây và bám theo người nhận; đây chỉ là thời gian trình diễn, không cấp khiên, không gây damage. Ảnh được dùng theo tỷ lệ gốc; khung texture chỉ bỏ khoảng alpha trống, không sửa pixel nguồn.
