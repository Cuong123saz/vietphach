import type { MageRuntime } from '../../gameplay/characters/jobs/mage/MageRuntime';
import { copyRate } from '../../gameplay/characters/jobs/mage/WaterMageSkills';
import { waterCannonDamage } from '../../gameplay/characters/jobs/mage/WaterCannonCombat';
import { fullChargeDuration } from '../../gameplay/characters/jobs/mage/WaterCannon';
import { WATER_MAGE_RULES as R, WATER_MAGE_TUNING as T } from '../../config/balance/waterMage';
import { WATER_MAGE_PASSIVE, WATER_CANNON_DAMAGE } from '../../config/balance/waterCannon';
import { hasWaterLong, waterLongProfile, waterLongQRadius, waterMachDry } from '../../gameplay/characters/jobs/mage/WaterLongRules';
import { hasWaterHuman, waterUltimateKind } from '../../gameplay/characters/jobs/mage/WaterHumanRules';
import { WATER_EVOLUTION as EV } from '../../config/balance/waterEvolution';
import type { CastResult } from '../../gameplay/characters/jobs/mage/WaterMageSkills';

export type HudSkill = 'passive' | 'basic' | 'q' | 'e' | 'r';
export const HUD_SKILLS: readonly HudSkill[] = ['passive', 'basic', 'q', 'e', 'r'];
const HUD_ART_ROOT = '/assets/hud-water-v2';
const ART_NAMES: Record<HudSkill, string> = { passive: 'water-mach', basic: 'water-cannon', q: 'water-dragon', e: 'water-guard', r: 'water-mirror' };
export const SKILL_ART = (key: HudSkill, empoweredE = false) => `${HUD_ART_ROOT}/${key === 'e' && empoweredE ? 'water-long-ready' : ART_NAMES[key]}.png`;
export const SPECIAL_STATE_FRAME = `${HUD_ART_ROOT}/special-state-frame.png`;
export const EVOLUTION_ART: Readonly<Record<string, string | undefined>> = {
  'b1-15': `${HUD_ART_ROOT}/water-dragon-descent.png`,
  'a1-15': '/assets/characters/mage/khang-chien-finale/bat-dai-icon.png',
};

/** Visual states follow cast eligibility; presentation never consumes READY. */
export function waterMageHudVisuals(mage: MageRuntime, now: number) {
  const machStage = Math.max(0, Math.min(WATER_MAGE_PASSIVE.maxMach, mage.mach));
  const alive = mage.resources.currentHp > 0;
  return { machStage, machReady: machStage === WATER_MAGE_PASSIVE.maxMach,
    fullCharge: alive && mage.basicAttack.phase === 'full_charge',
    empoweredE: alive && !waterMachDry(mage, now) && hasWaterLong(mage, 7) && machStage === WATER_MAGE_PASSIVE.maxMach
      && mage.resources.currentMp >= T.e.mpCost && mage.waterSkills.cooldowns.e <= now };
}
export const numberText = (value: number) => value.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
export const secondsText = (value: number) => `${Math.max(0, value).toFixed(1).replace('.', ',')}s`;
const percent = (value: number) => `${numberText(value * 100)}%`;

export const SKILL_INFO: Record<HudSkill, { name: string; key: string; role: string; description: string; rules: readonly string[]; copy: string; formula: string }> = {
  passive: {
    name: 'Thủy Mạch', key: 'Nội tại', role: 'Tích Mạch · Hỗ trợ',
    description: 'Tích đủ 4 Mạch để sẵn sàng tăng cường lần E gốc tiếp theo.',
    rules: ['Thủy Pháo đủ lực trúng địch hoặc Q gốc trúng ít nhất một địch: +1 Mạch, tối đa một lần mỗi đòn/cast.',
      'E thường áp khiên thành công và R tạo kính thành công: +1 Mạch. Mạch tối đa 4, không tràn.',
      'E READY tạo liên kết hoặc kích hoạt buff bản thân: tiêu toàn bộ Mạch, không cộng lại điểm.'],
    copy: 'Mạch và Thủy Mạch mang tag [Độc Nhất]. Bản sao không tích Mạch, tạo hoặc làm mới liên kết, hay kích hoạt buff Tinh Thần.',
    formula: `Mạch = min(${WATER_MAGE_PASSIVE.maxMach}, Mạch + 1)`,
  },
  basic: {
    name: 'Thủy Pháo', key: 'Chuột trái', role: 'Vận lực · Sát thương Thủy',
    description: 'Giữ chuột trái để vận lực, thả để bắn về hướng con trỏ. Vận càng lâu, đạn càng mạnh; tốc chạy giảm dần khi vận.',
    rules: ['Đủ lực và trúng địch mới nhận +1 Mạch. Vận đủ rồi bắn trượt không cấp điểm.', 'Sát thương được chụp khi đạn được tạo, sau đó xét va chạm thực tế.'],
    copy: 'Thủy Kính chỉ sao chép Q và E gốc, không sao chép Thủy Pháo.',
    formula: `Damage = ATK × (${numberText(WATER_CANNON_DAMAGE.base)} + ${numberText(WATER_CANNON_DAMAGE.charge)} × ChargeRatio)`,
  },
  q: {
    name: 'Thần Long Thủy Biến', key: 'Q', role: 'Vị trí mặt đất · Sát thương Thủy',
    description: 'Triệu hồi một Thủy Long lao xuống vị trí mặt đất đã khóa khi dùng chiêu, tạo vụ nổ nước.',
    rules: ['Giới hạn vị trí theo tầm Q. Rồng không bám địch và không đổi điểm đáp khi địch di chuyển.',
      'Q gốc trúng ít nhất một địch: +1 Mạch. Nhiều địch trúng vẫn chỉ +1; trượt vẫn nổ nước nhưng không gây sát thương.'],
    copy: `Sau ${secondsText(R.copyDelay)}, kính lóe sáng rồi phóng rồng thẳng tới đúng điểm đáp của Q gốc, bỏ giai đoạn vận và tạo hình. Không đổi mục tiêu, không tích Mạch.`,
    formula: `Tổng sát thương nền Q = ${numberText(R.qDamage)} × ATK`,
  },
  e: {
    name: 'Thủy Hộ', key: 'E', role: 'Bản thân / Đồng đội · Khiên',
    description: 'Tạo khiên nước lên đồng đội dưới con trỏ trong màn hình. Không chọn ai thì dùng lên bản thân.',
    rules: ['E chưa READY: tạo khiên đầy đủ lên người nhận và +1 Mạch. Dây đang tồn tại không tự làm E thường chia khiên.',
      'E READY lên đồng đội: nối dây, chia tổng khiên 50/50 cho bản thân và người được nối. E READY lên bản thân tự chọn đồng đội có % HP thấp nhất trong màn hình; hòa thì xét HP hiện tại, rồi ID.',
      `Mỗi E READY nối dây tiêu 4 Mạch và làm mới toàn bộ liên kết ${R.linkDuration}s. Cơ bản một dây; nối người mới thay dây cũ. Đi xa không đứt, chết/rời sân/mất hợp lệ hoặc hết hạn thì hủy.`,
      `Không có đồng đội hợp lệ trên sân: E READY lên bản thân cho khiên đầy đủ, tiêu Mạch, +${R.soloSpiritPerLevel} × cấp Tinh Thần trong ${R.soloDuration}s. Thay thế và làm mới, không cộng chồng buff.`,
      'Có đồng đội trên sân nhưng ngoài màn hình: E READY lên bản thân cho khiên đầy đủ, giữ READY, không nhận buff solo. Đồng đội vào sân được xét ở lần E READY tiếp theo.',
      `Mỗi lần cấp khiên là một lớp riêng, tồn tại ${R.shieldDuration}s và cộng thêm vào phần còn lại. Sát thương trừ lớp hết hạn sớm nhất trước; không làm mới thời gian các lớp cũ.`],
    copy: 'Sao chép đúng người nhận và tỷ lệ chia của E gốc. E gốc chia 50/50 thì bản sao cũng chia 50/50 trên tổng khiên × CopyRate. Mỗi phần có thời hạn riêng; người mất hợp lệ mất phần của họ, không chuyển phần đó cho người khác. Không nối dây, làm mới dây hoặc cấp buff Tinh Thần.',
    formula: `Tổng khiên = ${percent(R.shieldRatio)} Max MP · mỗi người khi nối dây = Tổng khiên / 2`,
  },
  r: {
    name: 'Thủy Kính Tam Tượng', key: 'R', role: 'Sao chép · Hỗ trợ',
    description: `Tạo ${R.mirrorCount} Thủy Kính tồn tại ${R.mirrorDuration}s. Mỗi Q hoặc E gốc hợp lệ tiếp theo tiêu một kính để sao chép.`,
    rules: [`Tạo kính thành công: +1 Mạch. Bản sao được lên lịch sau ${secondsText(R.copyDelay)}, không tiêu MP và không kích hoạt hồi chiêu.`,
      'Bản sao giữ cơ chế và hiệu ứng được phép sao chép; lượng sát thương/khiên nhân CopyRate. Hiệu ứng [Độc Nhất] bị loại bỏ, bản sao không sinh thêm bản sao.',
      'Dùng lại R thay các kính chưa dùng và làm mới thời gian; bản sao đã lên lịch vẫn tiếp tục.',
      'Q sao chép giữ vị trí mặt đất. E sao chép giữ người nhận; người mất hợp lệ bị hủy phần đó, không hoàn kính.'],
    copy: 'Thủy Kính chỉ sao chép Q/E gốc. R, Mạch, liên kết Thủy Mạch và buff Tinh Thần không được sao chép.',
    formula: `CopyRate = clamp(${percent(R.copyBase)} + Max MP / ${R.copyMpDivisor}, ${percent(R.copyBase)}, ${percent(R.copyMax)})`,
  },
};

function baseWaterMageSkillInfo(mage:MageRuntime,key:HudSkill) {
  const base=SKILL_INFO[key],p=waterLongProfile(mage);
  if(hasWaterHuman(mage)){
    if(key==='passive')return {...base,rules:[...base.rules,'Thủy Nhân Mạch: tối đa 3 dây, tồn tại 10s. Mỗi điểm Mạch thực nhận hồi cho bản thân và người nối 1% Max MP của Pháp Sư.']};
    if(key==='e' && hasWaterHuman(mage,7))return {...base,name:hasWaterHuman(mage,11)?'Hải Long Xuất Thế':hasWaterHuman(mage,9)?'Thủy Ngục':'Tụ Thủy Bạo',
      description:'E thường vẫn tạo khiên. Khi READY: click chọn tâm, hút các lớp khiên E do mình tạo trên bản thân và người đang nối, rồi phóng cầu nước.',
      rules:['Chỉ hút khiên E của chính Pháp Sư còn hiệu lực; khiên từ nguồn khác giữ thời hạn riêng.',
        'Tiêu 15 MP và 4 Mạch; tự nối đồng đội chưa nối có % HP thấp nhất trong màn hình, hoặc buff Tinh Thần khi solo. Tối đa 3 dây.',
        `Niệm ${EV.human.charge}s rồi cầu bay ${EV.human.flight}s. Bán kính cầu chính ${EV.human.radius}.`,
        ...(hasWaterHuman(mage,9)?['Cầu đáp gây damage, giữ chân 2s; rồng trồi sau 1,75s gây cùng lượng damage. Không cấp thêm Mạch.']:[]),
        ...(hasWaterHuman(mage,11)?['Cầu chính tạo thêm 3 cầu quanh tâm, mỗi cầu có ngục và rồng riêng.']:[]),
        ...(hasWaterHuman(mage,13)?['Khi tiêu một kính R bởi Q/E: thêm một rồng nhỏ mỗi dây, damage 10% Q nền × CopyRate; không kích Mạch hoặc sao chép tiếp.']:[])],
      copy:'Sao chép lượng damage và cụm cầu đã chụp, nhân CopyRate một lần. Không hút khiên, tiêu MP, nối dây hoặc cấp buff lần hai.',
      formula:`Damage cầu / rồng = MP đã tiêu + khiên E hút được × ${EV.human.shieldConversion}`};
  }
  if(key==='passive' && hasWaterLong(mage))return {...base,rules:[...base.rules,
    'Thủy Long Mạch: mỗi lần thực nhận +1 Mạch hồi cho bản thân và người đang nối 1% Max MP của Pháp Sư. Đủ 4/4, trượt hoặc bản sao không cấp thêm MP.']};
  if(key==='q' && hasWaterLong(mage,9))return {...base,description:'Thủy Lực cường hóa cách dùng Q. Khi đầm còn tồn tại, Q tự khóa vào tâm đầm.',
    rules:[`Sát thương còn ${percent(p.qDamageMultiplier)} Q nền; thời gian vận còn ${percent(p.qChargeMultiplier)}; hồi chiêu ${p.qCooldown}s. Thời gian rồng bay giữ nguyên.`,
      'Q trúng địch trong đầm: hút thêm và gia hạn 0,5s, tối đa cộng 2s mỗi đầm; một cast chỉ gia hạn một lần.',
      ...(p.dot?[`Bán kính nhận đòn Q bằng đầm: ${numberText(p.radius)}.`]:[]),
      ...(p.roar?['Q kích hút gây ngay một lần Siết hiện tại, rồi tăng Siết thêm 10% ATK hiện tại. Tạo đầm mới đặt lại lượng tăng.']:[]),
      'Q gốc trúng: tối đa +1 Mạch. Q sao chép không tích Mạch.'],
    copy:'Q sao chép giữ tọa độ, sát thương rồng nhân CopyRate. Siết chỉ giảm một lần: trong đầm sao chép dùng tỷ lệ của đầm. Được hút/gia hạn tối đa +2s riêng mỗi đầm.',
    formula:`Q = 2 × ATK × ${p.qDamageMultiplier}`};
  if(key==='e' && hasWaterLong(mage,7))return {...base,description:'E thường vẫn tạo khiên Thủy Hộ. E READY chọn vị trí đặt đầm Thủy Hãm, giữ cơ chế tự nối dây hoặc buff Tinh Thần khi solo.',
    rules:['E chưa READY: khiên đầy đủ và +1 Mạch khi áp dụng thành công, không chia qua dây đang có.',
      'E READY: bấm E, click chọn vị trí trong màn hình; E hoặc Esc để hủy. Click thành công mới tiêu MP và 4 Mạch. Không tạo khiên.',
      'Tự nối với đồng đội có % HP thấp nhất trong màn hình; hòa thì HP hiện tại, rồi ID. Khi solo: +5 × cấp Tinh Thần trong 10s, thay thế và làm mới.',
      `Đầm tồn tại 4s, bán kính ${numberText(p.radius)}; gây 20% Max MP một lần khi hình thành. Hút ${p.pull} px/s và giảm ${percent(p.slow)} tốc chạy.`,
      'Đầm còn tồn tại: Khô Mạch chặn mọi nguồn hồi điểm; E khóa hồi chiêu. Đầm cuối kết thúc mới bắt đầu hồi chiêu E.',
      ...(p.dot?['Siết: 5% Max MP mỗi giây lên địch trong đầm.']:[]),
      'Tự nối đồng đội thấp % HP nhất trong màn hình trước rồi tạo đầm; solo buff bản thân trước. Có đồng đội nhưng không nối được thì hủy E, không tiêu tài nguyên.',
      'Dây được làm mới 10s; khiên E thường đã có vẫn giữ thời hạn riêng.'],
    copy:'E thường sao chép khiên. E READY sao chép đầm sau 1,5s, sát thương/Siết nhân CopyRate, thời gian riêng; không nối dây, không buff Tinh Thần, không tích Mạch.',
    formula:'Khiên E thường / sát thương hình thành đầm = 20% Max MP'};
  if(key==='r' && hasWaterLong(mage,7))return {...base,rules:[...base.rules.slice(0,-1),
    'Q sao chép giữ vị trí mặt đất. E thường sao chép đúng người nhận khiên; E READY sao chép đầm tại vị trí gốc, sát thương và Siết nhân CopyRate.']};
  return base;
}
export interface StageFinaleQView {count:number;max:number;remaining:number;forming:boolean;paused:boolean}
export function waterMageSkillInfo(mage:MageRuntime,key:HudSkill,finale?:StageFinaleQView) {
  if(key==='q' && finale)return {name:'Thủy Long Giáng Thế',key:'Q',role:'Đại chiêu riêng Stage · Hợp lực',
    description:'Sau khi quả cầu tới tâm, nhấn/thả Q liên tục trong 5 giây để phóng rồng từ trượng vào quả cầu.',
    rules:[`Tối đa ${finale.max} Q. Không tốn MP, không hồi chiêu và bỏ giai đoạn vận/biến hình. Giữ Q không tự bắn.`,
      'Mỗi rồng tới tâm kích một lần Siết hiện tại rồi tăng Siết thêm 10% ATK. Cầu lớn theo số rồng đã tới thật.',
      'Không tiêu/cấp Mạch, không gia hạn cửa sổ hợp lực. Hết thời gian vẫn khép cảnh cốt truyện, không bù Q còn thiếu.'],
    copy:'Các Q hợp lực của cảnh cuối không được sao chép.',formula:'Siết = 5% Max MP + lượng Siết đã tích; sát thương nổ cuối giữ tuning Stage.'};
  let info=baseWaterMageSkillInfo(mage,key);const buff=mage.waterSkills.encounterBuff,kind=waterUltimateKind(mage);
  if(key==='q' && kind){
    const descent=kind==='descent',name=descent?'Thủy Long Giáng Thế':'Bát Đại Hải Long';
    info={...info,description:`${info.description} Cấp 15: READY + Q+E trong ${EV.ultimate.comboWindow}s, click chọn tâm để dùng ${name}.`,
      rules:[...info.rules,`Đại chiêu hồi ${EV.ultimate.cooldown}s. Q/E nền phải hết hồi chiêu, không có chiêu gốc đang bay hoặc đầm đang tồn tại. Esc hủy chọn tâm trước khi tiêu tài nguyên.`,
        ...(descent?[`Cần ít nhất ${EV.descent.minimumMpRatio*100}% Max MP; tiêu toàn bộ MP hiện có. Tụ 1,5s, thủy vực bán kính 100.`,
          'Trong 5s tiếp theo: nhấn/thả Q tối đa 10 lần, miễn MP/CD, rồng bay nhanh từ trượng tới tâm. Q trúng kích Siết hiện tại rồi tăng 10% ATK; không gia hạn. Không tự bắn khi giữ phím.',
          'Siết định kỳ và Siết do Q trúng được tích một lần mỗi AoE, bất kể số địch. Nổ cuối = 50% lượng Siết tích. Q đã nhận trước hết giờ vẫn được xử lý.',
          'Sức mạnh giảm theo tỷ lệ MP thực tiêu / Max MP tại lúc bắt đầu. Khô Mạch chặn cấp Mạch; E/R và đánh thường khóa trong chuỗi. Nhân vật vẫn di chuyển và có thể chết.']
          :['Cần đủ dây cho mọi đồng đội còn sống: solo 0, đội tối đa 3 đồng đội. Chi phí 90/80/70/60% Max MP theo 0/1/2/3 dây.',
            'Tụ 1,5s; cầu E đáp trước, tạo cụm Hải Long/Thủy Ngục, rồi đúng 8 rồng lao vào tâm. Xả toàn mạng khi bắt đầu.']),
        `Tuning thử: hệ số damage đại chiêu ×${EV.ultimate.power}, được tách riêng để cân bằng.`],
      copy:'Đại chiêu cấp 15 và Q bồi sức mạnh không tiêu kính R và không được sao chép. Q/E thường vẫn sao chép theo nhánh.',
      formula:descent?`Q bồi = 0,25 ATK chụp × (MP tiêu / Max MP) × ${EV.ultimate.power}; nổ = 50% Siết tích`
        :`Mỗi Hải Long = 2 ATK × 1,25 × ${EV.ultimate.power}; cầu = (MP tiêu + 1,5 × khiên hút) × ${EV.ultimate.power}`};
    if(mage.waterSkills.ultimate)info={...info,name,role:'Đại chiêu · Đang thi triển'};
  }
  if(!buff)return info;
  if(key==='passive')return {...info,description:`Stage Kháng Chiến: đủ 4 Mạch dùng E cường hóa${buff.readyEHealRatio?`, hồi ${Math.round(buff.readyEHealRatio*100)}% máu tối đa`:''}. Q có bộ đếm cường hóa riêng.`,rules:[...info.rules,
    'Q không tiêu Mạch. Sau 4 Q gốc thi triển thành công, Q tiếp theo tạo Thủy Ngục; trượt vẫn đếm, bản sao và chiêu bị từ chối không đếm.']};
  if(key==='r' && buff.rPhaseSeconds)return {...info,description:`Stage Kháng Chiến: R cho ${buff.rPhaseSeconds}s vô ảnh: đi xuyên đội hình quái, giải mọi khống chế đang dính và không thể bị chọn làm mục tiêu. Hồi chiêu ${buff.rCooldown??12}s.`,
    rules:[...info.rules,'Trong lúc vô ảnh, đạn và vùng sát thương của quái xuyên qua người; quái đang kéo lê sẽ mất mục tiêu.']};
  if(key==='q')return {...info,description:`Stage Kháng Chiến: Q chọn mặt đất theo con trỏ, không tự khóa tâm Thủy Vực Siết. Sau ${buff.qEmpowerAfter??4} Q thành công, Q tiếp theo tạo Thủy Ngục.`,rules:[...info.rules.filter(rule=>!rule.startsWith('Bán kính nhận đòn Q')),
    `Đầm E, vùng Q, Thủy Ngục và rồng trồi cùng bán kính ${numberText(waterLongQRadius(mage))}. Điểm đáp khóa lúc cast, giới hạn theo tầm Q.`,
    `Cầu nước sáng bao mục tiêu khi đáp; rồng trồi lên sau ${buff.prisonEruptDelay}s.`,
    `Thủy Ngục giữ chân địch trong vùng ${buff.prisonDuration}s; vẫn cho địch tấn công. Khi hình thành gây sát thương Q. Rồng gốc trồi lên tiêu 40% MP hiện tại, gây sát thương Q cộng lượng MP đã tiêu. Bản sao không tiêu thêm MP.`,
    'Q không tiêu Mạch. Q cường hóa gốc trúng khi rồng trồi lên vẫn được +1 Mạch theo nội tại hiện tại; trượt không được điểm.'],
    copy:'Bản sao của Q cường hóa cũng tạo Thủy Ngục, giữ chân và trồi rồng; sát thương nhân CopyRate một lần. Không tiêu hoặc cấp Mạch; giữ đúng vị trí gốc.'};
  if(key==='e')return {...info,rules:[...info.rules,
    `Buff Stage · ải ${buff.mapIndex}: bán kính đầm E × ${numberText(buff.eRadiusMultiplier)} = ${numberText(waterLongProfile(mage).radius*buff.eRadiusMultiplier)}. Ải 1 gốc; mỗi ải tiếp theo +30% bán kính gốc${buff.mapIndex===4?'; ải cuối thêm ×1,25 bán kính':''}. Sát thương, thời gian và khiên E thường giữ nguyên.`]};
  return info;
}

/** Presentation snapshot only. Reading expired shield layers must not mutate combat. */
export function waterMageHudModel(mage: MageRuntime, now: number,finale?:StageFinaleQView,ultimateStatus?:CastResult) {
  const long=hasWaterLong(mage,7),profile=waterLongProfile(mage);
  const shieldLayers = (mage.shields ?? []).filter(layer => layer.amount > 0 && layer.expiresAt > now);
  const rate = copyRate(mage.stats.maxMp);
  const mirrors = mage.waterSkills.mirrors.expiresAt > now ? mage.waterSkills.mirrors.count : 0;
  const links = mage.waterSkills.links.filter(link => link.expiresAt > now);
  const skillStatus = (key: HudSkill) => {
    if (key === 'passive') return waterMachDry(mage,now)?'Khô Mạch':mage.mach === WATER_MAGE_PASSIVE.maxMach ? 'READY' : `${mage.mach}/${WATER_MAGE_PASSIVE.maxMach}`;
    if (mage.resources.currentHp <= 0) return 'Đã gục';
    if(key==='q' && finale)return finale.paused?'Tạm dừng':finale.forming?'Tụ cầu':finale.remaining<=0?'Giáng Thế'
      :finale.count>=finale.max?'Đủ rồng':`${finale.count}/${finale.max} Q`;
    const u=mage.waterSkills.ultimate;
    if(u && key==='q')return now<u.opensAt?'Tụ cầu':u.kind==='eight'?'8 Hải Long':now>=u.endsAt?'Giáng Thế':`${u.qCount}/10 Q`;
    if(u && (key==='e' || key==='r' || key==='basic'))return 'Đang dùng đại chiêu';
    if (key === 'basic') return mage.basicAttack.phase === 'full_charge' ? 'ĐỦ LỰC'
      : mage.basicAttack.phase === 'charging' ? percent(mage.basicAttack.progress)
      : mage.basicAttack.recoveryRemaining > 0 ? secondsText(mage.basicAttack.recoveryRemaining) : 'Giữ / thả';
    if(key==='e' && waterMachDry(mage,now))return 'Khóa hồi chiêu';
    const remaining = mage.waterSkills.cooldowns[key] - now;
    if (remaining > 0) return secondsText(remaining);
    if (mage.resources.currentMp < T[key].mpCost) return 'Thiếu MP';
    if (key === 'q' && mage.waterSkills.scheduled.some(e => e.kind === 'q-impact' && e.cast.execution === 'original')) return 'Thi triển';
    if(key==='q' && ultimateStatus?.ok)return 'Q+E sẵn sàng';
    if(key==='q' && mage.waterSkills.encounterBuff && mage.waterSkills.qCastsSinceEmpower>=(mage.waterSkills.encounterBuff.qEmpowerAfter??4))return 'Thủy Ngục';
    return 'Sẵn sàng';
  };
  const details: Record<HudSkill, string> = {
    passive: `${mage.mach}/${WATER_MAGE_PASSIVE.maxMach} Mạch${mage.mach === WATER_MAGE_PASSIVE.maxMach ? ' · READY' : ''}`,
    basic: `${numberText(waterCannonDamage(mage.stats.atk, 0))} → ${numberText(waterCannonDamage(mage.stats.atk, 1))} sát thương nền · đủ lực ${secondsText(fullChargeDuration(mage.stats.attackSpeedRating))}`,
    q: `${numberText(mage.stats.atk * R.qDamage*profile.qDamageMultiplier)} sát thương nền · bản sao ${numberText(mage.stats.atk * R.qDamage *profile.qDamageMultiplier* rate)}`,
    e: long?`E thường: ${numberText(mage.stats.maxMp*R.shieldRatio)} khiên · READY: ${numberText(mage.stats.maxMp*R.shieldRatio)} sát thương đầm · bán kính ${numberText(profile.radius*(mage.waterSkills.encounterBuff?.eRadiusMultiplier??1))}`
      :`${numberText(mage.stats.maxMp * R.shieldRatio)} tổng khiên · ${numberText(mage.stats.maxMp * R.shieldRatio / 2)} mỗi người khi nối · bản sao tổng ${numberText(mage.stats.maxMp * R.shieldRatio * rate)}`,
    r: `${percent(rate)} CopyRate · ${mirrors}/${R.mirrorCount} kính · ${secondsText(mirrors ? mage.waterSkills.mirrors.expiresAt - now : 0)} còn lại`,
  };
  if(finale)details.q=`${finale.count}/${finale.max} Q hợp lực · ${secondsText(finale.remaining)} còn lại · 0 MP · không hồi chiêu`;
  const kind=waterUltimateKind(mage),u=mage.waterSkills.ultimate;
  const ultimateHint=!kind?'':u?(now<u.opensAt?`Tụ cầu · ${secondsText(u.opensAt-now)}`:u.kind==='descent'
    ?`${u.qCount}/10 Q · ${secondsText(u.endsAt-now)} · Siết tích ${numberText(u.accumulated)}`:'8 Hải Long đang lao xuống')
    :mage.mach!==4?'Đại chiêu cần 4/4 Mạch':(mage.waterSkills.ultimateCooldown??0)>now?`Đại chiêu hồi ${secondsText(mage.waterSkills.ultimateCooldown!-now)}`
    :ultimateStatus?.ok?'Q+E → click dùng đại chiêu':ultimateStatus?.reason==='mp'?'Đại chiêu thiếu MP':ultimateStatus?.reason==='target'?'Đại chiêu cần đồng đội / đủ dây hợp lệ'
    :ultimateStatus?.reason==='busy'?'Chờ đầm / chiêu gốc kết thúc':ultimateStatus?.reason==='cooldown'?'Chờ Q và E hồi chiêu':'Q+E → click dùng đại chiêu';
  return { rate, mirrors, links, shield: shieldLayers.reduce((sum, layer) => sum + layer.amount, 0), shieldLayers,
    ultimateHint,
    mirrorRemaining: mirrors ? mage.waterSkills.mirrors.expiresAt - now : 0,
    spiritRemaining: mage.temporarySpirit ? Math.max(0, mage.waterSkills.soloBuffExpiresAt - now) : 0,
    pendingCopies: mage.waterSkills.scheduled.filter(e => e.kind === 'copy-q' || e.kind === 'copy-e' || e.kind==='copy-swamp').length,
    skillStatus, details };
}

