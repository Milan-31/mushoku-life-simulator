import type { EventEffects } from "../types";

/**
 * 技能库。招式名与流派特性依据《无职转生》原作设定整理：
 * - 剑神流：速度与一击必杀，主打先手，一击不中则拉开再打。奥义「光之太刀」，
 *   其下位上级技为「无音之太刀」，另有反击技「光返」。掌握光之太刀是自称剑圣的条件。
 * - 水神流：受け流し与反击，专守防卫，取「后的先」。初代水神留下五道奥义，
 *   习得其中三道者可称水神。「流」既是入门技，也是最高奥义之一。
 *   当世水神蕾伊达·莉亚以两道奥义组合出第六道奥义「剥奪剣界」。
 * - 北神流：不拘定式的实战流派，接近兵法。奇拔派主张动用一切道具、魔术与装备取胜。
 * - 斗气：以自身体内魔力覆盖全身，提升力量、速度、反射与耐久，并可强化武器。
 *   能缠绕斗气是上级剑士的门槛。
 * - 魔术：分火水风土等系统与治癒、神击等门类，另有把两系混成的混成魔术与极少数人掌握的
 *   无咏唱施法。
 *
 * 学得途径：
 * - 「普通」技能靠练习与积累，在修炼类指令的小概率结果里领悟。
 * - 「高级」技能只由特殊事件或强大角色授予，练习一辈子也练不出来。
 */

export type SkillGrade = "普通" | "高级";

export type SkillSchool = "剑神流" | "水神流" | "北神流" | "斗气" | "魔术" | "秘传";

export interface SkillDef {
  id: string;
  name: string;
  school: SkillSchool;
  grade: SkillGrade;
  /** 一句话说明，注重原作依据 */
  desc: string;
  /** 学会时的一次性成长 */
  effects: EventEffects;
  /** 战斗中的威力权重。数值越大，越能把胜负推向有利的一侧 */
  power: number;
  /** 建议的学习门槛，仅供界面提示与模型参考 */
  require?: string;
}

export const SKILLS: SkillDef[] = [
  /* ---------- 剑神流 ---------- */
  {
    id: "sg_wrist_drop",
    name: "剑神流·腕落",
    school: "剑神流",
    grade: "普通",
    desc: "以剑击折对手手臂的技法。用木剑也一样能废掉一条胳膊，是剑神流里最实用的一手。",
    effects: { tier: { kind: "sword", gain: 10 }, stats: { sword: 4 } },
    power: 6,
    require: "剑术初级以上",
  },
  {
    id: "sg_silent_blade",
    name: "剑神流·无音之太刀",
    school: "剑神流",
    grade: "高级",
    desc: "光之太刀的下位上级技。挥斩时刀身不发出声音，对手往往在察觉到之前就已经中刀。",
    effects: { tier: { kind: "sword", gain: 18 }, stats: { sword: 7 } },
    power: 22,
    require: "剑术上级以上，由剑神流师范亲授",
  },
  {
    id: "sg_light_reflect",
    name: "剑神流·光返",
    school: "剑神流",
    grade: "高级",
    desc: "针对光之太刀的反击技。剑神流内部用以对付同门的一手，能不能用出来取决于对光之太刀理解到什么程度。",
    effects: { tier: { kind: "sword", gain: 16 }, stats: { sword: 6, int: 3 } },
    power: 30,
    require: "已掌握光之太刀或与之相当的剑速",
  },
  {
    id: "sg_light_blade",
    name: "剑神流·光之太刀",
    school: "剑神流",
    grade: "高级",
    desc: "剑神流奥义。把全部斗气灌注进一次挥斩，并借非惯用手消除剑尖的抖动。练至极致，剑尖可及光速。掌握此技，才有资格自称剑圣。",
    effects: { tier: { kind: "sword", gain: 20 }, stats: { sword: 9, fame: 8 }, notice: "你用了剑神流的奥义。" },
    power: 40,
    require: "剑术圣级以上，由剑神或剑帝级人物亲授",
  },

  /* ---------- 水神流 ---------- */
  {
    id: "wg_nagare",
    name: "水神流·流",
    school: "水神流",
    grade: "普通",
    desc: "卸开对手的攻击并破坏其架势。它既是水神流的入门技，也是最高奥义之一——差别只在练到什么地步。",
    effects: { tier: { kind: "sword", gain: 9 }, stats: { sword: 3, int: 3 } },
    power: 8,
    require: "剑术初级以上",
  },
  {
    id: "wg_five_arts",
    name: "水神流·五奥义（三道）",
    school: "水神流",
    grade: "高级",
    desc: "初代水神留下的五道奥义。习得其中三道，便有资格自称水神。你手里的是残缺的那部分。",
    effects: { tier: { kind: "sword", gain: 20 }, stats: { sword: 8, int: 4 }, notice: "你触到了水神流的顶端。" },
    power: 34,
    require: "剑术王级以上，由水神亲授",
  },
  {
    id: "wg_deprivation",
    name: "水神流·剥奪剣界",
    school: "水神流",
    grade: "高级",
    desc: "当世水神蕾伊达·莉亚把两道奥义叠合后创出的第六道奥义。它不是防守，是让对手的剑失去存在的余地。",
    effects: { tier: { kind: "sword", gain: 20 }, stats: { sword: 9, int: 5 }, notice: "你见到了水神流的第六道奥义。" },
    power: 44,
    require: "已习得五奥义中的三道，并得到水神认可",
  },

  /* ---------- 北神流 ---------- */
  {
    id: "ng_adapt",
    name: "北神流·应变",
    school: "北神流",
    grade: "普通",
    desc: "北神流没有定式。它教的是怎么在不该活下来的场合活下来：地形、距离、对手的习惯，都能拿来用。",
    effects: { tier: { kind: "sword", gain: 9 }, stats: { sword: 3, scheme: 3 } },
    power: 7,
    require: "剑术初级以上",
  },
  {
    id: "ng_field_medic",
    name: "北神流·战场急救",
    school: "北神流",
    grade: "普通",
    desc: "战斗中自己处理伤口，断了几根手指也照样握剑。北神流被说成兵法而非剑术，多半是因为这一手。",
    effects: { stats: { health: 6, int: 2 } },
    power: 4,
    require: "受过一次真正的重伤",
  },
  {
    id: "ng_kippa",
    name: "北神流·奇拔派",
    school: "北神流",
    grade: "高级",
    desc: "不拘手段的一派：掷沙、撒网、用道具、放魔术、扔装备，只要能赢就行。北神二世所创。",
    effects: { tier: { kind: "sword", gain: 17 }, stats: { sword: 6, scheme: 5 } },
    power: 26,
    require: "由北神流师范以上的人物亲授",
  },

  /* ---------- 斗气 ---------- */
  {
    id: "tk_sense",
    name: "斗气感知",
    school: "斗气",
    grade: "普通",
    desc: "察觉体内流动的魔力。普通人靠长期锻炼也能自然领悟，是能不能往上走的分水岭。",
    effects: { stats: { mana: 4, sword: 3 } },
    power: 5,
    require: "长期锻炼",
  },
  {
    id: "tk_cloak",
    name: "斗气缠绕",
    school: "斗气",
    grade: "高级",
    desc: "把魔力紧贴在全身，力量、速度、反射、耐力一并提升，连手里的武器也会变硬。能做到这一步，才算是上级剑士。",
    effects: { tier: { kind: "sword", gain: 16 }, stats: { sword: 8, health: 5 } },
    power: 24,
    require: "剑术中级以上，且已能感知斗气",
  },

  /* ---------- 魔术·火系统 ---------- */
  {
    id: "mg_fireball",
    name: "火球弾（ファイアボール）",
    school: "魔术",
    grade: "普通",
    desc: "初级火系统魔术。掌心大小的火球。火系统的入门，也是大多数人一辈子会用的那一手。",
    effects: { stats: { mana: 3 } },
    power: 5,
    require: "火系统初级",
  },
  {
    id: "mg_heat_hand",
    name: "灼熱手（ヒートハンド）",
    school: "魔术",
    grade: "普通",
    desc: "火系统魔术，给手上加温。和水混着用可以烧热水。战场上的用处不在杀伤。",
    effects: { stats: { mana: 2, health: 2 } },
    power: 2,
    require: "火系统初级",
  },
  {
    id: "mg_flame_slice",
    name: "火断（フレイムスライス）",
    school: "魔术",
    grade: "高级",
    desc: "火系统魔术。挥出炎之斩击，把对手连人带甲烧断。射程与杀伤都远胜火球。",
    effects: { stats: { mana: 5 } },
    power: 15,
    require: "火系统上级",
  },
  {
    id: "mg_exodus_flame",
    name: "極炎火弾（エグゾダスフレイム）",
    school: "魔术",
    grade: "高级",
    desc: "上級火系統魔术。造出巨大火球，足以把比常人稍强的哥布林烧成灰。",
    effects: { stats: { mana: 7, int: 3 }, notice: "你放出了上級火系統的魔术。" },
    power: 26,
    require: "火系统上级，且魔力储备足够",
  },

  /* ---------- 魔术·水系统 ---------- */
  {
    id: "mg_water_ball",
    name: "水弾（ウォーターボール）",
    school: "魔术",
    grade: "普通",
    desc: "初级水系统魔术。掌中生成水球。单独用来打架威力有限，但它可以和别的系统混成。",
    effects: { stats: { mana: 3 } },
    power: 4,
    require: "水系统初级",
  },
  {
    id: "mg_waterfall",
    name: "水滝（ウォーターフォール）",
    school: "魔术",
    grade: "普通",
    desc: "水系统魔术，造出一道水瀑。它不是攻击手段，而是造雾三步里的第一步。",
    effects: { stats: { mana: 3 } },
    power: 3,
    require: "水系统初级",
  },
  {
    id: "mg_splash_flow",
    name: "水砲（スプラッシュフロウ）",
    school: "魔术",
    grade: "高级",
    desc: "中级水系统魔术。造出相当大的水块，足以把木造房屋的墙整片冲垮。",
    effects: { stats: { mana: 5 } },
    power: 14,
    require: "水系统中级以上",
  },
  {
    id: "mg_ice_break",
    name: "氷霜撃（アイシクルブレイク）",
    school: "魔术",
    grade: "高级",
    desc: "中级水系统魔术。造出巨大冰块砸落，可以轻易砸穿砖墙。",
    effects: { stats: { mana: 6 } },
    power: 18,
    require: "水系统中级以上",
  },
  {
    id: "mg_ice_field",
    name: "氷結領域（アイシクルフィールド）",
    school: "魔术",
    grade: "高级",
    desc: "水系统魔术，压低周围温度。本身杀不了人，但和水瀑、地热混起来就能造雾，也能让地面结冰。",
    effects: { stats: { mana: 6 } },
    power: 16,
    require: "水系统上级",
  },
  {
    id: "mg_frost_nova",
    name: "フロストノヴァ",
    school: "魔术",
    grade: "高级",
    desc: "把水蒸与氷結領域同时或接连发动，冻住周围所有物体的表面。这招证明了魔术的强度不只在单发。",
    effects: { stats: { mana: 7, int: 3 } },
    power: 22,
    require: "同时掌握水蒸与氷結領域",
  },
  {
    id: "mg_deep_mist",
    name: "濃霧（ディープミスト）",
    school: "魔术",
    grade: "高级",
    desc: "按水滝、地热、氷結領域的顺序发动，造出浓雾。用来遮蔽视线、掩护撤退或偷袭。",
    effects: { stats: { mana: 5, scheme: 4 } },
    power: 12,
    require: "掌握水滝、地熱与氷結領域三道魔术",
  },
  {
    id: "mg_cumulonimbus",
    name: "豪雷積層雲（キュムロニンバス）",
    school: "魔术",
    grade: "高级",
    desc: "水圣级魔术。在广范围上空招来雷雨。这是把一整片天空当成武器的魔术，代价同样是一整片天空。",
    effects: { stats: { mana: 9, int: 4 }, notice: "你动用了圣级的魔术。" },
    power: 38,
    require: "水系统圣级以上，由水圣级或更高者授业",
  },

  /* ---------- 魔术·风与土 ---------- */
  {
    id: "mg_air_burst",
    name: "衝撃波（エアバースト）",
    school: "魔术",
    grade: "普通",
    desc: "初级风系统魔术。震动空气把人或物掀飞。鲁迪乌斯用它做回避位移，可见这类魔术的用法不只在杀伤。",
    effects: { stats: { mana: 4 } },
    power: 5,
    require: "风系统初级",
  },
  {
    id: "mg_earth_lance",
    name: "土槍（アースランサー）",
    school: "魔术",
    grade: "普通",
    desc: "初级土系统魔术。自地面生出土枪。把枪尖削平再猛力发射，就能当成投射装置用。",
    effects: { stats: { mana: 4 } },
    power: 6,
    require: "土系统初级",
  },

  /* ---------- 魔术·雷 ---------- */
  {
    id: "mg_electric",
    name: "電撃（エレクトリック）",
    school: "魔术",
    grade: "高级",
    desc: "鲁迪乌斯把雷光小型化后的自创版本，压低威力与范围以减少误伤。魔力消耗反而比雷光更大。",
    effects: { stats: { mana: 6, int: 4 } },
    power: 20,
    require: "已掌握雷光，并吃过一次误伤的亏",
  },
  {
    id: "mg_lightning",
    name: "雷光（ライトニング）",
    school: "魔术",
    grade: "高级",
    desc: "水王级魔术。压缩豪雷积层云后落下强力落雷，可以贯穿斗气直接伤人。在近处发动，自己也会被波及。",
    effects: { stats: { mana: 8, int: 4 }, notice: "你唤下了一道落雷。" },
    power: 36,
    require: "水系统王级以上，且能承受斗气被贯穿的反噬",
  },

  /* ---------- 魔术·治癒与神击 ---------- */
  {
    id: "mg_healing",
    name: "治癒魔术（ヒーリング）",
    school: "魔术",
    grade: "普通",
    desc: "初级治癒魔术。能封住烫伤、擦伤这类伤口，也能缓解肌肉酸痛与晕船。战场上最缺的就是这种人。",
    effects: { stats: { mana: 3, health: 4 } },
    power: 3,
    require: "治癒系统初级",
  },
  {
    id: "mg_exhealing",
    name: "治癒魔术（エクスヒーリング）",
    school: "魔术",
    grade: "普通",
    desc: "中级治癒魔术。能接上骨折这类不轻的伤。在战场上，它比任何攻击魔术都稀缺。",
    effects: { stats: { mana: 3, health: 6 } },
    power: 4,
    require: "治癒系统中级",
  },
  {
    id: "mg_shine_healing",
    name: "治癒魔术（シャインヒーリング）",
    school: "魔术",
    grade: "高级",
    desc: "上級治癒魔术。能把四肢的断面封住止血，但已经失去的部分不会长回来。",
    effects: { stats: { mana: 6, health: 9 } },
    power: 8,
    require: "治癒系统上级",
  },
  {
    id: "mg_exorcist",
    name: "神撃魔术（エクソシストレート）",
    school: "魔术",
    grade: "普通",
    desc: "初级神撃魔术。放出白光，能伤到幽灵一类没有实体的东西。对人没什么用。",
    effects: { stats: { mana: 3, faith: 3 } },
    power: 4,
    require: "神撃系统初级",
  },

  /* ---------- 秘传·混成与高阶 ---------- */
  {
    id: "mg_mud_swamp",
    name: "泥沼（マッドドロップ）",
    school: "秘传",
    grade: "高级",
    desc: "水魔术与土魔术混成，造出沼泽限制对手行动。鲁迪乌斯能把周围一整片地都变成泥沼。",
    effects: { stats: { mana: 6, int: 4 } },
    power: 20,
    require: "水、土两系均达中级，并理解混成原理",
  },
  {
    id: "mg_disturb",
    name: "乱魔（ディスタブマジック）",
    school: "秘传",
    grade: "高级",
    desc: "对正在发动的魔术送入魔力并加以搅乱，使其中止或受阻。防身与破坏术式的通用手段。",
    effects: { stats: { mana: 5, int: 6 } },
    power: 18,
    require: "对魔力操作有极细致的控制力",
  },
  {
    id: "mg_stone_cannon",
    name: "岩砲弾（混成魔术）",
    school: "秘传",
    grade: "高级",
    desc: "把土系与风系混成的魔术。压缩岩石后高速射出，威力远超任何单系初级魔术。鲁迪乌斯的招牌之一。",
    effects: { stats: { mana: 7, int: 4 }, notice: "你把两个系统混在了一起。" },
    power: 28,
    require: "两个系统均达中级，并理解混成的原理",
  },
  {
    id: "mg_chantless",
    name: "无咏唱施法",
    school: "秘传",
    grade: "高级",
    desc: "不经过咏唱直接发动魔术。极少数人才能掌握，它把魔术从「一门技艺」变成了「身体的一部分」。",
    effects: { stats: { mana: 8, int: 5 }, notice: "你不再需要开口就能发动魔术。" },
    power: 32,
    require: "魔术中级以上，且有人示范过原理",
  },
  {
    id: "mg_binding",
    name: "結界魔术",
    school: "秘传",
    grade: "高级",
    desc: "以魔力铺出一个被划定的范围，隔开内外。守村子、守营地、守一个将死的人，靠的都是这一手。",
    effects: { stats: { mana: 7, faith: 3 } },
    power: 16,
    require: "治癒与土系统均有造诣，并得到传授",
  },
  {
    id: "sg_dragon_gate",
    name: "召喚術·前龍門・後龍門",
    school: "秘传",
    grade: "高级",
    desc: "甲龙王佩尔基乌斯以名召唤的两道门：前龙门吸走周围连同斗气在内的魔力，后龙门把那些魔力放出去。",
    effects: { stats: { mana: 8, int: 5 }, notice: "你被允许念出那个名字。" },
    power: 34,
    require: "由甲龙王佩尔基乌斯或其认可的召唤术士亲授",
  },
  {
    id: "mg_alpha_strike",
    name: "甲龍手刀『一断』",
    school: "秘传",
    grade: "高级",
    desc: "甲龙王佩尔基乌斯的手刀。挥手落下，光刃离手飞出，足以把疲惫的不死魔王一刀两断。",
    effects: { tier: { kind: "sword", gain: 20 }, stats: { sword: 8, mana: 4 }, notice: "你学到了甲龙王的手刀。" },
    power: 38,
    require: "由甲龙王佩尔基乌斯亲自传授",
  },
  {
    id: "mg_time_fragment",
    name: "時間魔术（残篇）",
    school: "秘传",
    grade: "高级",
    desc: "已经失传的魔术门类，世上只剩残篇与极少数人会用的片段。它触到的是这个世界最深的一条规矩。",
    effects: { stats: { mana: 9, int: 7 }, notice: "你碰到了一门不该还在的魔术。" },
    power: 42,
    require: "由掌握時間魔术的人物授予，且运气足够",
  },
];

const SKILL_BY_ID = new Map(SKILLS.map((s) => [s.id, s]));

export function skillById(id: string): SkillDef | undefined {
  return SKILL_BY_ID.get(id);
}

/** 战斗威力：已学技能之和。战斗结算用它把胜负推向有利的一侧 */
export function combatPower(learned: string[]): number {
  return learned.reduce((sum, id) => sum + (skillById(id)?.power ?? 0), 0);
}

export const SCHOOL_ORDER: SkillSchool[] = ["剑神流", "水神流", "北神流", "斗气", "魔术", "秘传"];

/** 按流派归组，供技能面板显示 */
export function groupSkillsBySchool(learned: string[]): { school: SkillSchool; items: SkillDef[] }[] {
  const items = learned.map(skillById).filter((s): s is SkillDef => Boolean(s));
  return SCHOOL_ORDER.map((school) => ({ school, items: items.filter((s) => s.school === school) })).filter(
    (g) => g.items.length > 0,
  );
}
