import type { EvolutionMilestone, EvolutionOption } from '../../../progression/Evolution';

const descriptions:Record<string,string>={
  'core-ho':'Tối đa 3 dây; thực nhận Mạch hồi 1% Max MP cho bản thân và người nối.',
  'core-long':'Thực nhận Mạch hồi 1% Max MP cho bản thân và người nối.',
  'a1-7':'Tụ Thủy Bạo: E READY hút khiên E của mình và phóng cầu nước.',
  'a1-9':'Cầu đáp tạo Thủy Ngục 2s; rồng trồi sau 1,75s.',
  'a1-11':'Cầu chính sinh thêm 3 cầu quanh tâm, mỗi cầu có ngục và rồng.',
  'a1-13':'Kính R tiêu bởi Q/E sinh một rồng nhỏ mỗi dây, không proc tiếp.',
  'a1-15':'READY + đủ dây đồng đội + Q+E → click chọn tâm: cầu E rồi 8 Hải Long; xả mạng.',
  'b1-7':'E READY nối dây/buff solo rồi đặt đầm Thủy Hãm, không tạo khiên.',
  'b1-9':'Đầm lớn hơn; Q khóa tâm, kéo và gia hạn tối đa +2s mỗi đầm.',
  'b1-11':'Đầm gây Siết mỗi giây; Q dùng cùng vùng trúng với đầm.',
  'b1-13':'Q trúng kích Siết hiện tại rồi tăng Siết thêm 10% ATK.',
  'b1-15':'READY + ít nhất 50% MP + Q+E → click: tiêu hết MP, bồi tối đa 10 Q trong 5s rồi nổ.',
};
const option = (id: string, title: string, requires?: Record<string, string>, locked = false): EvolutionOption => ({ id, title, description:descriptions[id],requires, implemented: id==='core-long' || id==='core-ho' || /^(a1|b1)-(7|9|11|13|15)$/.test(id), locked });
const paths = [
  ['A1', 'Thủy Nhân Mạch / Công Phá', 'core-ho', false], ['A2', 'Thủy Nhân Mạch / Tiếp Dẫn', 'core-ho', true],
  ['B1', 'Thủy Long Mạch / Công Phá', 'core-long', false], ['B2', 'Thủy Long Mạch / Tiếp Dẫn', 'core-long', true],
] as const;
/** Việt Phách path names; mechanics use ATK / MP, never the prototype's WP. */
export const WATER_MAGE_EVOLUTION: readonly EvolutionMilestone[] = [
  { level: 5, title: 'Chọn nhánh', options: [option('core-ho', 'A1 · Thủy Nhân Mạch'), option('core-long', 'B1 · Thủy Long Mạch')] },
  { level: 7, title: 'Chọn hướng', options: paths.map(([path, title, core, locked]) => option(path.toLowerCase() + '-7', `${path} · ${title}`, { '5': core }, locked)) },
  ...([
    [9, 'Tương tác kỹ năng', ['Thủy Ngục', 'Thủy Long Tiếp Sức', 'Sóng Trong Đầm', 'Hộ Long']],
    [11, 'Hoàn thiện lối chơi', ['Hải Long Xuất Thế', 'Thủy Triều Đồng Hưởng', 'Thủy Vực Siết', 'Hộ Dẫn']],
    [13, 'Cường hóa sao chép', ['Vạn Mạch Sinh Long', 'Vạn Mạch Đồng Hưởng', 'Thủy Long Gầm', 'Song Kính Hộ Trận']],
    [15, 'Tiến hóa cuối', ['Bát Đại Hải Long', 'Vạn Mạch Đồng Quy', 'Thủy Long Giáng Thế', 'Hồi Thủy Hoàn Sinh']],
  ] as const).map(([level, title, names]) => ({ level, title, options: paths.map(([path, , core, locked], i) =>
    option(path.toLowerCase() + '-' + level, `${path} · ${names[i]}`, { '5': core, '7': path.toLowerCase() + '-7' }, locked)) })),
];
