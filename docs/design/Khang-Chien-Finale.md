# Kháng Chiến — phản nổ và hiến hồn thanh tẩy

Specification cập nhật 08/10/2026. Cốt truyện đầy đủ tại `Khang-Chien-Story-Draft.md`. Kết quả mới: pháp sư tự nguyện hiến hồn sau phản kích, đất và nước sạch trở lại, dân làng sống; nhân vật không hồi sinh.

1. Boss chạm 40% HP: dừng combat, giữ HP boss ở mốc này, cuộn lại phình dần (tối đa ×1,8). Hiện cảnh báo phủ màn hình và hai icon đại chiêu nhấp nháy chậm. Chờ người chơi giữ Q+E đồng thời; không tự xác nhận và không tự hết giờ.
2. Q+E: tiêu toàn bộ MP, giảm HP còn đúng 1, bỏ lớp khiên. MP bị giữ ở 0 suốt chuỗi. Khóa gameplay thường, boss có HP floor 1.
3. Phóng quả cầu E trong 1,5s. Vòng Bát Đại xuất hiện dưới chân ngay từ tư thế 0. Mỗi lần nhấn Q thật (không auto-repeat) phóng một rồng bồi sức mạnh, thêm một stack. Tối đa 10, không tự sinh stack hay tự phóng nếu thiếu.
4. Đủ 10 Q: rồng Giáng Thế đến sau 0,5s (sau delivery Q cuối 0,22s). Bát Đại phóng sau 1s và chạm cùng điểm boss sau 1,9s. Bộ tư thế tụ tiến triển theo stack. Raw Giáng Thế 250.000; Bát Đại 1.000.000 là tuning trình diễn qua Damage Core; boss không thể xuống dưới 1 HP.
5. Sau Q thứ 10: 4,4s dân chạy tới; 5s giáp còn động; 6s dân tưởng đã thắng. Các model Cơ bản là presentation, không phải ally combat.
6. Sau 7,2s giáp phản nổ; 7,5s móng trúng pháp sư. Đồng hồ ×0,2 từ 7,2–8,1s. Dân ngừng nhảy từ lúc nổ. Pháp sư vẫn 1 HP và thấy đất còn nhiễm.
7. Sau 8,1–12,1s: trở về tốc độ cinematic thường, pháp sư nói lời hiến hồn. 12,1s thân xác gục, HP 0, MP 0; boss mất HP floor và tự hủy. Chuyển sang phase `purification`, không mở combat hoặc hồi sinh.
8. `purification`: 2s linh hồn rời thân, 6s sóng thanh tẩy và nền sạch crossfade lên, 4s dân đứng yên và trả lời đứa trẻ. Nhạc chiến đấu dừng, kết giới mờ dần, máy quay mở rộng. Cuối pha mới hiện “GIỌT NƯỚC CUỐI LÀNG” và nút chơi lại. Nhà hỏng và ruộng chết vẫn còn trên nền sạch.

Mọi thời gian cuối tính từ lần Q thứ 10, không từ lúc bấm Q+E. Dev / mất focus / bảng nhân vật tạm dừng cả timeline và nhạc. Không thay Water Mage ngoài Stage. Art gốc boss cuộn là content reference; dùng frame roll có sẵn để tránh nền caro. Hai icon người thiết kế cung cấp lưu nguyên bản trong public/assets/characters/mage/khang-chien-finale.

Input Q+E chấp nhận cả giữ đồng thời lẫn bấm nối tiếp Q→E/E→Q trong 0,6s theo đồng hồ Stage. Mất focus xóa phím chờ; auto-repeat và nhấn một phím nhiều lần không kích hoạt.

Clone khởi hành từ vị trí dân làng trong kết giới, Pháp Sư quay về phía dân làng khi ăn mừng. Boss chạm 1 HP co trong 0,35s xuống 42,5 world units (1/4 kích thước thường 170). Phản nổ/móng đọc đồng hồ chậm; lời hiến hồn và thanh tẩy đọc tốc độ cinematic thường. Không thay tốc độ gameplay thường.

Khung kết giữ dân đứng giãn quanh thi thể pháp sư trên vùng đất sạch; linh hồn đã tan vào Long Mạch. Khói/móng phản kích bị xóa khi bắt đầu thanh tẩy. Giữ cảnh tới khi chơi lại. Nền kết dùng `village-area-1-cleansed-dusk-realistic-v1.png`, không phải map chiến đấu thứ năm.

Mở đầu Map 1 giữ nhạc 24s: 0–6s thăm dò người đi ruộng/nước lạ; 6–10s quan sát đàn quái biến dị, camera lia nhóm đổ bộ rồi trả về; 10–14s lời gọi gom người bị thương/trẻ nhỏ; 14–20s lời hứa giữ đường về; 20–24s dựng kết giới trên nguồn sạch cuối. Bia giếng báo trước giá hiến hồn ở màn bắt đầu. Camera rung nhẹ, dừng khi pause/giảm chuyển động. Replay vẫn bắt đầu ở giây 24. Caption lấy từ `src/config/stages/khangChienStory.ts`.

Mở đầu cập nhật: nhân vật xuất phát đường dưới phải tại (1800,1200), đi thẳng lên (1800,780) trong 6s, sau cảnh lia quay về (1420,410) ở giây 20. Quái giữ đường đổ bộ và choreography trước đó. Rung mở đầu và chuyển map chỉ 220ms mỗi 3s, cường độ 0,0008.

Tự hồi MP của Kháng Chiến giảm còn 300/giây (1/3 trước đây). Ngay khi kết thúc đợt, lời nhắc: Kết giới đang suy yếu, mau mau gia cố lại! Trong 3 giây rút nước ngầm và hồi kết giới, nền map tiếp theo phủ dần lên nền hiện tại; hoàn tất trước lúc nhân vật quay ra. Nghi thức vẫn hồi đầy MP.

VFX kỹ năng sẫm dần qua bốn map bằng `KhangChienWaterTint`: trắng nguyên bản → xanh xám → xanh tím → tím lam. Nội suy trong 3s rút nước; chỉ nhuộm danh sách texture kỹ năng Thủy, giữ màu base/flash của từng hiệu ứng. Nhân vật, HUD và dấu cảnh báo quái giữ màu riêng. Linh hồn và sóng thanh tẩy cuối sáng trắng xanh, độc lập với màu kỹ năng đã cạn.

Bản Cloudflare chỉ mở Stage Kháng Chiến: build bằng npm run build -- --mode khang-chien --outDir dist-stage-release. VITE_STAGE_ONLY=1 ép stage/character, khóa Dev và debug; local mặc định không đổi. Deploy Cloudflare Pages project vietphach-khang-chien từ thư mục dist-stage-release.

Điện thoại: joystick trái và Đánh/Q/E/R bên phải; chạm kỹ năng chọn địch gần nhất, kéo từ nút để định hướng. E thường dùng khiên bản thân, E READY đặt đầm tại mục tiêu. Khi boss tự bạo có nút Q+E riêng, sau đó chạm Q 10 lần; không tự bắn. Nút chỉ bật trong pha hợp lệ; thả/hủy cảm ứng và mất focus dừng joystick. Khuyến nghị màn ngang.

HUD điện thoại dùng class has-touch-controls theo maxTouchPoints hoặc any-pointer coarse: ẩn dock desktop, khung HP/MP 172px và nhiệm vụ dưới khung, caption nhỏ ở mép trên. Joystick 96px, nút 48px. Bắt đầu thử requestFullscreen trong thao tác người dùng; nếu trình duyệt không hỗ trợ vẫn tiếp tục game.

PWA: manifest fullscreen landscape, icons PNG 192/512. Offline download via service worker caches entire build from offline-files.json. Build then run node scripts/prepare-offline.cjs <output-dir> before deploy. Installation removes browser chrome where supported; offline assets do not guarantee improved rendering FPS.

Tối ưu bản online: không tạo nhãn debug trên từng quái; không xuất hitbox/statistics Dev mỗi frame. Nén deploy: build → node scripts/compress-release.cjs <dir> → node scripts/prepare-offline.cjs <dir> → deploy toàn bộ thư mục. Sprite WebP lossless giữ nguyên alpha và kích thước; nền map realistic quality 90, các ảnh map khác quality 82. _redirects 200 giữ URL PNG cũ; offline list tải qua alias để cache đúng URL gameplay. Lần đo ảnh 170.5 MiB → 95.1 MiB là số đo của bộ ảnh cũ; toàn bản khi đó khoảng 105.7 MiB. Cache offline v3 yêu cầu tải lại bản offline mới.

Tải offline mở dialog riêng ngay khi bấm: progress và số tài nguyên, hướng dẫn dữ liệu lưu trong trình duyệt; hoàn tất báo 100%. Chờ service worker tối đa 15s, không nhận progress 60s báo lỗi; mỗi request download timeout 45s. Không báo thành công khi lỗi hoặc hết thời gian.

### Replay texture reuse
Scene restart reuses complete character, cannon, dragon, support and finale atlases. Boss matte removal runs only when its derived texture is missing. This avoids repeating pixel scans and texture uploads on replay, including offline. Gameplay rules are unchanged. Validation: 218 tests, typecheck and stage build pass. Phone frame rate still needs device verification.

Thủy Ngục: hình thành gây damage Q nền; rồng gốc trồi lên tiêu 40% MP tại thời điểm triệu hồi, thêm đúng lượng MP đó vào raw damage Q. Bản sao gây hai đợt Q đã nhân CopyRate, không tiêu thêm MP. Sát thương hình thành không kích thêm nội tại/Siết. Test hai đợt, vùng trúng và chi phí MP đã qua.

Rồng sau Thủy Ngục dùng danh sách ID địch thực sự nhận đòn khi ngục hình thành. Không kiểm tra lại khoảng cách khi trồi lên; bỏ qua mục tiêu chết/không còn là địch, không đánh địch mới vào vùng. Mỗi ngục gốc/bản sao có danh sách riêng. Test địch rời vùng và địch mới vào đã qua.

Thủy Pháo xuyên qua địch; mỗi viên gây sát thương một lần mỗi mục tiêu, đẩy mục tiêu đã trúng theo quãng đường còn bay (tôn trọng vật cản) cho tới khi hết tầm hoặc chạm vật cản. Mỗi viên kích Siết tối đa một lần khi trúng địch trong đầm có Siết. Không tăng stack Siết thêm. Kiểm tra 219 test qua.
