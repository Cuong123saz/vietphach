# Cung Thủ Mộc · Asset prototype V1

Tạo 08/10/2026 bằng công cụ ImageGen tích hợp (`image_gen.imagegen`), nền trong suốt. PNG gốc đã được sao chép vào project; không phụ thuộc đường dẫn cache của Codex. Ba asset tự tạo, không lấy nhân vật/bow hoặc phép Thủy của Mage để đổi màu.

| File | Nội dung / cách dùng |
|---|---|
| `poses-v1.png` | Atlas 4×2: idle xuống/phải/lên/trái; chạy phải 0/1; bắn phải; giương đại chiêu phải. Trích cell, chuẩn hóa cao 74, foot anchor chung; animation chạy ngang hai frame, mirror sang trái. |
| `jade-arrow-v1.png` | Tên nằm ngang hướng phải, đầu ngọc, thân dây leo và đuôi lá; xoay theo projectile thật. |
| `bramble-v1.png` | Cụm dây leo gai Mộc, nhựa vàng; dùng cho vườn và rừng B1. |

## Bộ prompt / brief cuối

### Character atlas

Stylized-concept, painted 2.5D action RPG character sprite atlas, true transparent background. Exactly eight isolated poses in a four-column by two-row grid, one consistent Vietnamese female Wood Archer. Emerald leaf cape and tunic, cream trousers, bronze and jade curved bow, ponytail, quiver. Row 1: idle facing down, right, up, left. Row 2: running right frame 0, running right frame 1, firing right, ultimate bow-draw right. Full body including feet and complete bow inside each cell, consistent proportions and rendering. No background, effects, ground plane, labels or text.

### Jade arrow

Stylized-concept single horizontal RIGHT-pointing celestial Wood arrow for a painted 2.5D action RPG, true transparent background. Complete sprite: ornate bronze twisted-vine shaft, luminous jade spearhead, leaf-feather fins and sparse gold ribbon tail. Clear directional silhouette and fine emerald/gold magical details. No character, bow, dragon, text or background.

### Bramble

Stylized-concept single fan-shaped Wood bramble eruption for a painted 2.5D action RPG, true transparent background including space between branches. Jade vines and wooden thorns with golden sap cracks and leafy tips, rising from bottom center; complete sprite with room around its silhouette. No ground plane, character, dragon, text or rectangular fog background.

Runtime VFX còn có vòng lá/rune, dây cung, glow/trail, mưa tên và lớp tối nền dựng bằng Phaser. Chúng không tạo hit và không thay đổi ngân sách damage. Có camera shake/flash ngắn và hỗ trợ reduced motion. PNG gốc không chứa hitbox; geometry nhân vật/quái tách khỏi hào quang và đường tên.
