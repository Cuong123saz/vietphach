import type { EvolutionMilestone, EvolutionOption } from '../../../progression/Evolution';
const NAMES={a1:['Truy Tâm Tiễn','Lùi Bước Giương Cung','Xuyên Tán','Song Mộc Tiễn','Thần Mộc Xuyên Thiên'],
  a2:['Dẫn Tiễn','Phong Bộ','Cộng Nhịp','Tán Diệp Tiễn','Vạn Diệp Đồng Hành'],
  b1:['Độc Nha','Liên Đằng','Ngạnh Đằng','Thu Hoạch Đằng','Vạn Tiễn Thành Lâm'],
  b2:['Dưỡng Mầm','Hộ Bì','Ghép Rễ','Tán Lá Phân Sinh','Thần Mộc Hộ Sinh']} as const;
const DETAILS={a1:['Q tháo Truy Ấn gây thêm damage.','E đặt hạt tại chân rồi lùi có va chạm.','Q xuyên tối đa năm địch.','Q dùng Khai Cung sinh thêm Vĩ Tiễn.','6 Sinh Tức + Q/E → click: tụ cung, ba tên lớn xuyên cùng đường.'],
  b1:['Vườn gây damage Mộc mỗi giây.','Hai vườn gần nhau nối hành lang làm chậm.','Q để lại đường gai sau chuyến bay.','Q Khai Cung thu hoạch một vườn để nổ.','6 Sinh Tức + Q/E → click: ba loạt tên rồi rừng gai sáu nhịp.']} as const;
const option=(id:string,title:string,description:string,requires?:Record<string,string>,locked=false):EvolutionOption=>({id,title,description,requires,locked,implemented:!locked});
export const WOOD_ARCHER_EVOLUTION:readonly EvolutionMilestone[]=[
  {level:5,title:'Chọn lõi Mộc',options:[option('wood-hunt','Liệp Mộc','Tên thường đặt Truy Ấn; đòn thường/Q vào Ấn +15% raw.'),
    option('wood-grove','Linh Lâm','Hai slot hạt/vườn; E hồi 6s, vườn chậm 25% trong 8s.')]},
  ...([7,9,11,13,15] as const).map((level,index)=>({level,title:level===7?'Chọn hướng':level===15?'Đại chiêu':'Tiến hóa',
    options:(['a1','a2','b1','b2'] as const).map(path=>option(`wood-${path}-${level}`,`${path.toUpperCase()} · ${NAMES[path][index]}`,
      path==='a1'||path==='b1'?DETAILS[path][index]:'Tiếp Dẫn đang khóa theo yêu cầu người thiết kế.',
      {'5':path.startsWith('a')?'wood-hunt':'wood-grove',...(level>7?{'7':`wood-${path}-7`}:{})},path==='a2'||path==='b2'))})),
];
