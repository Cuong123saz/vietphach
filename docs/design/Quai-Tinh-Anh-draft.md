# Quái tinh anh — thiết kế đề xuất

Trạng thái: DRAFT, thiết kế mới cho Việt Phách hiện tại theo yêu cầu người thiết kế. Bản code thử đầu tiên đã có sáu tinh anh trong Sandbox: chuột/châu chấu lao, ốc/sâu bắn quạt, sâu đột biến bắn tròn. Nhảy tới điểm, vũng nhầy và hai lượt gai còn TODO; mô tả chi tiết bên dưới là mục tiêu thiết kế, chưa phải tất cả behavior đã triển khai. Không lấy behavior hoặc runtime từ project cũ. Tên riêng bên dưới là đề xuất, chưa là tên chính thức.

## Mục tiêu chung

Tinh anh buộc người chơi đổi cách di chuyển hoặc chọn thời điểm đánh. Không chỉ là quái thường phóng lớn và tăng HP. Mỗi loại có một đòn đặc trưng, dấu hiệu báo trước, cơ hội né và khoảng nghỉ để phản công. Không tự thêm miễn nhiễm Q, kháng khống chế hay khả năng xuyên kết giới.

Các thông số HP, ATK, DEF, tốc độ, tầm phát hiện, kích thước hitbox, số đạn, thời lượng từng pha, thời gian tồn tại vùng và phần thưởng đều UNDECIDED/TODO. Các con số thử nghiệm của quái thường không tự trở thành balance tinh anh.

## 1. Chuột tinh anh — Nanh Xé

- Asset: `elite/flat-fur-rat/ground.png`, `leap-slash.png`.
- Vai trò: áp sát, phạt người đứng yên; ưu tiên làm vertical slice đầu tiên vì có đủ hai tư thế.
- Đòn đặc trưng: Khóa hướng → co người báo đòn → lao theo đường thẳng → chém tại đoạn cuối → khựng lại hồi sức.
- Hướng và điểm lao được chụp khi bắt đầu báo đòn. Sau đó không bẻ hướng đuổi theo người chơi.
- Đường lao có dấu báo trên mặt đất. Khi chạm vật cản hoặc kết giới, dừng ở điểm hợp lệ; không dịch chuyển xuyên tường.
- Một lần lao chỉ gây damage một lần lên mỗi mục tiêu. Tiếp xúc thân khi đi bộ không tự gây damage.
- Đối phó: bước ngang khỏi đường lao, phản công khi chuột khựng lại. Q trúng vẫn chịu luật khống chế chung.
- Presentation: dùng ground khi chạy/báo đòn, leap-slash khi phát động. Hiệu ứng chém đỏ đã nằm trong PNG; không cộng thêm một vệt chém giống hệt. Không gọi hai ảnh là animation nhiều frame.

## 2. Châu chấu tinh anh — Liêm Phong

- Asset: `elite/grasshopper/ground.png`, `leap-slash.png`.
- Vai trò: ép người chơi rời vị trí bằng đòn nhảy tới điểm.
- Đòn đặc trưng: Báo vòng đáp tại vị trí mục tiêu → nhảy tới điểm đã chụp → chém khi đáp → hồi sức.
- Khác chuột: người chơi đọc vùng đáp thay vì đường lao. Quá trình nhảy không gây damage dọc đường.
- Nhảy bị giới hạn bởi khu vực hợp lệ và kết giới. Nếu điểm đáp không hợp lệ, chọn điểm hợp lệ trước khi hiện báo đòn; không thay điểm sau khi đã báo.
- Đối phó: rời vòng đáp; tận dụng khoảng nghỉ sau khi đáp. Không có đòn nhảy thứ hai bất ngờ trong bản đầu.
- Presentation: độ cao và bóng chân là giả lập hình ảnh; gameplay chỉ xử lý điểm di chuyển và hit lúc đáp.

## 3. Ốc sên tinh anh — Nhầy Độc

- Asset: `elite/crop-snail/normal.png`, `spray.png`.
- Vai trò: kiểm soát đường đi, giữ khoảng cách với người chơi.
- Đòn đặc trưng: Há miệng báo hướng → phun đạn chất nhầy → đạn chạm đất tạo vũng tạm thời → nghỉ.
- Đạn gây hit một lần; vũng chỉ làm chậm khi ở trong vùng, không gây thêm damage theo thời gian trong bản đầu. Mức chậm và thời hạn TODO.
- Rời vũng thì hết modifier của vũng. Nhiều vũng cùng loại không cộng dồn mức chậm; dùng mức mạnh nhất.
- Giới hạn số vũng đang tồn tại TODO để tránh phủ kín sân. Không sinh vũng xuyên qua kết giới sau khi đạn đã bị chặn.
- Đối phó: né đạn và vòng ra cạnh vùng nhầy để áp sát. Không tự thêm cơ chế phản damage từ vỏ.

## 4. Sâu róm tinh anh — Tiễn Gai

- Asset hiện có: `elite/caterpillar/projectile-spray.png`. Chưa có tư thế nghỉ riêng được xác nhận.
- Vai trò: ép né đạn theo hình quạt.
- Đòn đặc trưng: Báo hướng quạt → đứng yên phun một loạt gai → nghỉ.
- Mỗi gai là projectile riêng, bị vật cản chặn theo luật hiện tại. Không tự dẫn đường sau khi phóng.
- Mỗi projectile chỉ hit một lần trên cùng mục tiêu; giới hạn damage tổng một loạt TODO.
- Đối phó: bước vào khe giữa gai hoặc di chuyển sang bên trước khi phóng.
- Chưa triển khai Presentation hoàn chỉnh cho đến khi có tư thế nghỉ. Không lấy ảnh sâu đột biến làm normal của loại này vì hình dáng khác nhau.

## 5. Sâu róm đen tinh anh — Hắc Châm

- Asset: `elite/black-caterpillar/bristled.png`, `projectile-spray.png`.
- Vai trò: ép người chơi giữ nhịp né thay vì chạy thẳng liên tục.
- Đòn đặc trưng: Gồng gai → bắn lượt đầu theo hướng đã chụp → báo lượt tiếp theo → bắn lệch sang hướng còn lại của quạt → nghỉ dài.
- Hai lượt đều có dấu báo; không bắn lượt thứ hai ngay lập tức. Hướng được chụp từ đầu chuỗi, không xoay theo người chơi giữa hai lượt.
- Đối phó: né lượt đầu rồi đọc vùng trống của lượt sau; phản công sau chuỗi. Không có nguyền rủa, hút MP hoặc khóa kỹ năng trong bản đầu.
- Presentation: không coi gai vẽ sẵn trong ảnh là projectile gameplay. Projectile thật có vòng đời/hit riêng, tránh vẽ đè trùng lên vùng gai có sẵn.

## 6. Sâu đột biến tinh anh — Gai Bạo

- Asset hiện có: `elite/mutant-caterpillar/bristled.png`. Chỉ có một tư thế.
- Vai trò: gây áp lực ở cự ly gần, trái với các sâu thiên về bắn xa.
- Đòn đặc trưng: Dừng bò, báo vòng nguy hiểm quanh thân → phát gai tỏa quanh mình → nghỉ.
- Vòng báo là vùng nguy hiểm sắp xảy ra, không gây damage. Đòn phát gai dùng projectile theo hướng cố định; số hướng TODO.
- Đối phó: lùi khỏi vùng báo hoặc giữ khoảng cách. Không tự thêm phản damage khi người chơi đánh thân.
- Asset tư thế phát động còn thiếu: TODO. Không dùng ảnh phun gai của sâu có râu để giả thành animation của sâu đột biến.

## Ranh giới implementation

- Character/enemy definition và cấu hình chọn behavior. Core hiện tại xử lý targeting, hit, damage, projectile, status và movement.
- Chuỗi báo đòn/phát động/hồi sức thuộc gameplay và có thời gian rõ ràng. Presentation đọc pha/event để hiển thị; không dùng thời lượng tween để quyết định hit.
- AI quái vẫn bị kết giới nước chặn. Player tiếp tục được đi qua.
- Đòn pending bị hủy khi chết hoặc tắt AI. Bật lại AI không phát đòn đang lưu và không khóa movement Player.
- Dấu báo phải đọc được trên cả bốn map Kháng Chiến; ưu tiên viền rõ và biểu tượng, không chỉ dựa vào màu đỏ/xanh.
- Không tạo module cho cả sáu loại trước. Thực hiện Nanh Xé trước; chỉ mở rộng abstraction khi behavior tiếp theo thật sự cần.

## Acceptance khi triển khai Nanh Xé

1. Di chuyển mục tiêu sau khi báo đòn không làm đổi hướng lao đã chụp.
2. Mục tiêu đứng ngoài đường/điểm hit không nhận damage; trong vùng nhận đúng một lần.
3. Lao không xuyên vật cản hoặc kết giới, kể cả delta time lớn.
4. Sau lao có pha hồi sức trước khi được đánh tiếp.
5. Chết/tắt AI hủy đòn; bật lại không phát đòn cũ.
6. Run mới không giữ controller, hit registry hoặc projectile của run cũ.
7. Gameplay test không import Phaser; typecheck/test/build phải qua.

## Những quyết định còn mở

- Chốt tên và nhận diện hệ của từng loại: TODO. Không suy hệ chỉ từ màu asset.
- Cấu hình balance và thưởng: TODO, chưa tự áp dụng số chính thức.
- Thời điểm xuất hiện, wave và độ khó theo Map 1–4: TODO.
- Bổ sung tư thế cho Tiễn Gai/Gai Bạo: TODO.
