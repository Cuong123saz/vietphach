/** Dialogue follows the existing music cues; the director owns gameplay and finale timing. */
export const KHANG_CHIEN_STORY={
  openingBeats:[
    {at:0,text:'Nước kênh đổi màu. Người làm ruộng vẫn chưa về…'},
    {at:6,text:'Chuột, sâu, châu chấu… Chúng đang tràn về làng!'},
    {at:10,text:'Về gốc đa! Đỡ người bị thương, dắt trẻ nhỏ đi trước!'},
    {at:14,text:'“Thầy đưa chúng con về nhà chứ?”\n“Ta sẽ giữ đường về.”'},
    {at:20,text:'Nước sạch chỉ còn dưới gốc đa.\nBà con ở trong vòng nước, ta sẽ chặn chúng!'},
  ],
  barrier:'Nước sạch chỉ còn dưới gốc đa. Bà con ở trong vòng nước!',
  sortie:'Không thể để chúng phá kết giới. Ta sẽ ra ngoài nghênh chiến.',
  /** Big centre announcement for the first seconds of the fight, then the small defendHint. */
  announceTitle:'KẾT GIỚI QUÁ MỎNG MANH!',
  announceLines:['Hãy đưa thân mình ra chống đỡ: bật E để tạo giáp.','Chạy thật nhanh ra khỏi kết giới, dùng Thủy Pháo (đánh thường) đẩy lùi kẻ địch!'],
  defendHint:'Bảo vệ kết giới · Đánh thường: đẩy lùi · E: khiên chắn đạn',
  briefing:'Pháp Sư lão luyện · Thủy Long Mạch',
  prelude:'Sáng nay, nước kênh đục đen; người đi ruộng trở về với những vết thương lạ. Pháp sư xuống bờ nam tìm người còn mắc kẹt.',
  vow:'Bia bên giếng cổ ghi: “Nước giữ được thân người. Muốn gột uế tận gốc, phải có một linh hồn tự nguyện trở về Long Mạch.”',
  maps:['Bảo vệ làng','Làng điêu tàn','Quái vật tràn tới','Giáp Tai Ương'],
  renewalReturn:'Kết giới đang suy yếu, mau mau gia cố lại!',
  renewalPrayer:[
    'Uế đã ngấm xuống đất. Xin cho con mượn dòng nước sạch để giữ làng!',
    'Nguồn sạch đang cạn… Xin cho con giữ kết giới thêm một đợt nữa!',
    'Giáp Tai Ương ở ngay dưới chân ta. Bà con đừng bước khỏi vòng nước!',
  ],
  renewalDraw:[
    'Nước ngầm tiếp sức kết giới. Ngoài kia, Uế Mạch vẫn lan…',
    'Nước rút xuống, phép cũng sẫm lại. Gốc đa là nơi sạch cuối cùng.',
    'Đây là phần nước cuối cùng. Hạ nó vẫn chưa đủ để cứu đất này.',
  ],
  renewalSortie:'Kết giới đã được tiếp sức. Ta phải chặn đợt quái tiếp theo!',
  sacrifice:'Dốc toàn bộ sức mạnh · Thủy Long Giáng Thế',
  eight:'Bát Đại Hải Long',
  offering:'“Ta đã hứa giữ đường về.\nXin nhận linh hồn ta… trả dòng nước sạch cho làng.”',
  soulRise:'Pháp sư hiến dâng linh hồn cho Long Mạch.',
  cleansing:'Linh hồn hòa vào dòng nước. Uế Mạch tan khỏi đất và kênh…',
  farewell:'“Thầy ơi… mình về nhà được chưa?”\n“Được rồi, con. Thầy đã mở đường cho chúng ta.”',
  complete:'Đất và nước đã được thanh tẩy. Dân làng sống sót và có thể dựng lại quê nhà.\nPháp sư đã hiến dâng linh hồn cho Long Mạch; người không trở lại.',
  failed:'Pháp Sư đã gục trước khi ngăn được cuộc tấn công.',
  barrierFailed:'Kết giới đã vỡ. Dân làng không còn được bảo vệ.',
} as const;

export function khangChienOpeningCaption(clock:number):string{
  return [...KHANG_CHIEN_STORY.openingBeats].reverse().find(beat=>clock>=beat.at)?.text??'';
}
