export interface ForestStoryBeat { title: string; speaker: string; lines: readonly string[]; action: string }
export const KIEU_NGAO_BRIEFINGS: readonly ForestStoryBeat[] = [
  { title: 'Mũi Tên Cuối Rừng', speaker: 'Cung thủ', lines: [
    'Thầy và đội săn đã mất tích sau tiếng tù và. Ta mang cây cung ông trao, lần theo đường tên vào rừng.',
    'Ông từng dặn: “Trong rừng này, đừng tin điều con chỉ nghe thấy.” Nhưng ta đã vượt mọi bài thử của ông. Lần này, ta sẽ đưa thầy về.',
  ], action: 'Lần theo dấu thầy' },
  { title: 'Người được cứu', speaker: 'Cung thủ', lines: ['Qua cầu, ta thấy những thợ săn còn sống bị đàn thú vây. Dấu tên của thầy vẫn chỉ về phía bìa rừng.', 'Ta cho rằng ông đánh dấu đường cho người bị thương. Ta phải tìm ông trước khi quá muộn.'], action: 'Giải vây đội săn' },
  { title: 'Ranh giới', speaker: 'Thợ săn', lines: ['“Nó đuổi chúng tôi đến đây rồi dừng lại. Mộc Lộc không bước qua vòng đá.”', 'Phía sâu trong rừng, tiếng tù và vang lên. Người vừa được cứu bỏ cả vũ khí để chạy về. Ta vẫn tiến tới.'], action: 'Tiến đến vòng đá' },
  { title: 'Lõi sau tim', speaker: 'Giọng thầy', lines: ['Bộ rễ giữ thầy trong ngực Mộc Lộc. Mỗi nhịp thở của con vật lại siết ông chặt hơn.', '“Lõi nằm sau tim nó. Bắn đi, con.”', 'Ba rễ phụ che đường tên. Ta chỉ cần phá chúng. Ta tin vào tay mình hơn những lời cảnh báo.'], action: 'Phá rễ, cứu thầy' },
];
export const KIEU_NGAO_CLUES: readonly ForestStoryBeat[] = [
  { title: 'Tên chỉ ra ngoài', speaker: 'Cung thủ', lines: ['Mũi tên cắm nghiêng về phía làng. Hai mũi sau cũng cùng hướng. Đây là dấu riêng của thầy.', '“Thầy muốn người bị thương biết đường về. Còn ta đủ sức đi tiếp.”'], action: 'Đi sâu hơn' },
  { title: 'Họ sợ tiếng tù và', speaker: 'Thợ săn', lines: ['“Quay về đi. Thầy cậu đã bảo chúng tôi chạy. Nếu nghe tiếng tù và, đừng tìm nơi nó phát ra.”', '“Ta vừa cứu các người khỏi đàn thú. Ta cũng sẽ cứu được thầy.”', 'Người thợ săn lắc đầu. Ông không sợ con quái đang nằm dưới đất. Ông sợ âm thanh trong rừng.'], action: 'Tìm vòng đá cổ' },
  { title: 'Mộc Lộc dừng lại', speaker: 'Cung thủ', lines: ['Mộc Lộc đứng bên kia những khối đá. Nó nhìn những người đang chạy, hạ sừng, rồi lùi vào rừng.', 'Một giọng nói gọi đúng tên ta. Là giọng thầy. Ta bước qua ranh giới mà con vật vừa tránh.', '“Con đã bắn trúng mọi bia của ta. Con sẽ không trượt lần này.”'], action: 'Bước vào Tim Rừng' },
];
export const KIEU_NGAO_REVEAL: readonly ForestStoryBeat[] = [
  { title: 'Bắn trúng', speaker: 'Cung thủ', lines: ['Phát tên xuyên vào lõi. Mộc Lộc đổ xuống, bộ rễ bung ra. Ta đỡ lấy thầy trước khi ông chạm đất.', 'Ông vẫn còn sống. Ta đã làm được.'], action: 'Nghe thầy nói' },
  { title: 'Giọng nói', speaker: 'Người thầy', lines: ['“Con… đã nghe giọng ta sao?”', 'Ông nhìn mũi tên trong lõi. Bàn tay đang nắm áo ta buông xuống.', '“Ta chưa từng gọi con vào rừng.”'], action: 'Nhìn vào phong ấn' },
  { title: 'Phần cuối cùng', speaker: 'Cung thủ', lines: ['Mộc Lộc là thân xác giữ phong ấn. Thầy đã tự nguyện để bộ rễ giữ mình, trở thành phần cuối cùng còn thiếu.', 'Thứ bị nhốt trong ngực nó đã mượn giọng ông. Từng rễ ta phá là một khóa bị mở. Phát tên cuối cắt đứt phần khóa còn lại.', 'Thầy bò về vòng đá đã vỡ. Ông chỉ kịp đặt tay lên một mảnh đá trước khi chết.'], action: 'Nhìn con đường về' },
  { title: 'Uế chảy ra ngoài', speaker: 'Cung thủ', lines: ['Ta đã tưởng những vệt đen đang lan vào rừng. Giờ nhìn từ Tim Rừng, ta thấy chúng chảy về phía làng.', 'Không có con quái nào nữa để bắn. Không có phát tên nào thu lại được.', 'Ta quay về qua con đường mình đã mở.'], action: 'Tự đi về' },
];
export const KIEU_NGAO_RETURN: readonly string[] = [
  'Mũi tên cảnh báo đầu tiên vẫn chỉ ra khỏi rừng. Tiếng tù và giờ vọng từ phía làng.',
  'Cây cầu vẫn ở đó. Nước dưới cầu đã im. Vệt đen đang chảy về phía làng.',
  'Chỗ những thợ săn từng ngồi đã trống. Không còn ai xin ta quay về.',
];
