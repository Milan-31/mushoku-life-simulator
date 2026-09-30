import type { Option, OriginGroup } from "../types";

export const ERAS: Option[] = [
  { value: "神话时代", label: "神话时代", desc: "六神创世。甲龙历十万年前。" },
  { value: "第一次人魔大战", label: "第一次人魔大战", desc: "勇者亚尔斯终结大战。约前 7000 年。" },
  { value: "战国时代", label: "战国时代", desc: "诸国林立。约前 5500 年。" },
  { value: "第二次人魔大战", label: "第二次人魔大战", desc: "奇希利卡复活，大战八百年。前 5000–4200 年。" },
  { value: "拉普拉斯战役", label: "拉普拉斯战役", desc: "魔神遭封印，七英雄凋零。前 500–甲龙历元年。" },
  { value: "鲁迪乌斯时代", label: "鲁迪乌斯时代", desc: "转生者降世，转移事件爆发。甲龙历 407–427 年。" },
  { value: "战后时代", label: "战后时代", desc: "拉普拉斯复活之后。甲龙历 427 年＋。" },
  { value: "自定义时代", label: "自定义时代", desc: "由系统裁定一个未记载的年代。" },
];

export const ORIGINS: Option[] = [
  { value: "阿斯拉王国贵族子弟", label: "阿斯拉王国贵族子弟", desc: "四大上级贵族之一，庄园、家臣、政治人脉与负担并存。" },
  { value: "平民/农家子弟", label: "平民 / 农家子弟", desc: "出生于普通村庄。平民占世界人口的绝大多数。" },
  { value: "魔族后裔", label: "魔族后裔", desc: "出生于魔大陆。14 岁后外观不再改变，在人族世界备受歧视。" },
  { value: "米里斯教徒", label: "米里斯教徒", desc: "生于米里斯神圣国的虔诚家庭。信奉一夫一妻制。" },
  { value: "拉诺亚魔法大学学生", label: "拉诺亚魔法大学学生", desc: "来自世界各地的魔术学徒，可能成为特殊生。" },
  { value: "冒险者出身", label: "冒险者出身", desc: "在冒险者公会长大，从小接触委托、魔物、迷宫。" },
  { value: "剑之圣地学徒", label: "剑之圣地学徒", desc: "在剑神流圣地修行，追求剑道极致。" },
  { value: "西隆王国贵族", label: "西隆王国贵族", desc: "国王帕克斯治下。王子扎诺巴拥有超强怪力。" },
  { value: "转生者", label: "转生者", desc: "拥有前世记忆。婴儿期即有成年心智，也因此孤独。" },
  { value: "被召唤者", label: "被召唤者", desc: "身体被强行拉到六面世界，可能一夜之间离开现代社会。" },
  { value: "奴隶/家畜", label: "奴隶 / 家畜", desc: "在某些国家奴隶制合法。可能获得自由。" },
  { value: "迷宫探索者", label: "迷宫探索者", desc: "在贝卡利特大陆的古代迷宫中探索。可能永远回不来。" },
  { value: "长耳族/小人族/矿坑族", label: "长耳族 / 小人族 / 矿坑族", desc: "居住在青龙山脉的小种族，被大国忽视。" },
  { value: "兽族", label: "兽族", desc: "居住在南部大森林。泰德路迪亚族与亚德路迪亚族共治。" },
  { value: "被诅咒者", label: "被诅咒者", desc: "出生时带有某种诅咒，可能被教会视为异端。" },
  { value: "人神使徒", label: "人神使徒", desc: "被人神在梦中低语选中。低语以模糊的「建议」出现。" },
  { value: "龙神同伴", label: "龙神同伴", desc: "在奥尔斯帝德的轮回中曾帮助过龙神的人。" },
  { value: "魔王之裔", label: "魔王之裔", desc: "与魔界大帝奇希莉卡、五大魔王、不死魔王有血缘关系。" },
  { value: "自定义出身", label: "自定义出身与天赋", desc: "由玩家提出，系统按世界逻辑裁定可行性。" },
];

export const BIRTH_IDENTITIES: Option[] = [
  { value: "贵族庄园", label: "贵族庄园" },
  { value: "农家", label: "农家" },
  { value: "魔族村落", label: "魔族村落" },
  { value: "米里斯教团家庭", label: "米里斯教团家庭" },
  { value: "魔法大学宿舍", label: "魔法大学宿舍" },
  { value: "冒险者公会", label: "冒险者公会" },
  { value: "剑之圣地", label: "剑之圣地" },
  { value: "西隆王宫", label: "西隆王宫" },
  { value: "转生者家庭", label: "转生者家庭" },
  { value: "被召唤者据点", label: "被召唤者据点" },
  { value: "奴隶市场", label: "奴隶市场" },
  { value: "迷宫都市", label: "迷宫都市" },
  { value: "青龙山脉", label: "青龙山脉" },
  { value: "南部大森林", label: "南部大森林" },
  { value: "被诅咒的村庄", label: "被诅咒的村庄" },
  { value: "人神使徒网络", label: "人神使徒网络" },
  { value: "龙神据点", label: "龙神据点" },
  { value: "魔王城堡", label: "魔王城堡" },
  { value: "自定义", label: "自定义" },
];

export const RESIDENCES: Option[] = [
  { value: "布耶纳村", label: "布耶纳村", desc: "阿斯拉王国菲托亚领的农业村庄。" },
  { value: "罗亚町", label: "罗亚町", desc: "菲托亚领首府。" },
  { value: "王都亚尔斯", label: "王都亚尔斯", desc: "阿斯拉王国首都。" },
  { value: "魔法都市夏利亚", label: "魔法都市夏利亚", desc: "魔术公会总部，中央大陆的魔术中心。" },
  { value: "米里希昂", label: "米里斯神圣国首都米里希昂" },
  { value: "米格路德族之村", label: "魔大陆米格路德族之村" },
  { value: "迷宫都市拉潘", label: "贝卡利特大陆迷宫都市拉潘" },
  { value: "西隆王国", label: "西隆王国" },
  { value: "拉诺亚王国", label: "拉诺亚王国" },
  { value: "剑之圣地", label: "剑之圣地" },
  { value: "天空之城", label: "天空之城" },
  { value: "龙鸣山", label: "龙鸣山" },
  { value: "自定义", label: "自定义" },
];

export const FAITHS: Option[] = [
  { value: "米里斯教团", label: "米里斯教团" },
  { value: "魔术公会", label: "魔术公会" },
  { value: "剑之圣地", label: "剑之圣地" },
  { value: "冒险者公会", label: "冒险者公会" },
  { value: "无信", label: "无信" },
  { value: "人神", label: "人神" },
  { value: "龙神", label: "龙神" },
  { value: "自定义", label: "自定义" },
];

export const STATUSES: Option[] = [
  { value: "贵族子弟", label: "贵族子弟" },
  { value: "平民", label: "平民" },
  { value: "魔族", label: "魔族" },
  { value: "教徒", label: "教徒" },
  { value: "学生", label: "学生" },
  { value: "冒险者", label: "冒险者" },
  { value: "剑士", label: "剑士" },
  { value: "王子", label: "王子" },
  { value: "转生者", label: "转生者" },
  { value: "被召唤者", label: "被召唤者" },
  { value: "奴隶", label: "奴隶" },
  { value: "迷宫探索者", label: "迷宫探索者" },
  { value: "被诅咒者", label: "被诅咒者" },
  { value: "人神使徒", label: "人神使徒" },
  { value: "龙神同伴", label: "龙神同伴" },
  { value: "魔王之裔", label: "魔王之裔" },
];

export const TALENTS: Option[] = [
  { value: "无", label: "无", desc: "不携带任何特殊天赋。" },
  { value: "强大魔力", label: "强大魔力", desc: "天生魔力量远超常人。" },
  { value: "剑术天赋", label: "剑术天赋", desc: "对剑的领悟快于同门。" },
  { value: "无咏唱施法", label: "无咏唱施法", desc: "不经咏唱即可发动魔术。" },
  { value: "斗气感知", label: "斗气感知", desc: "能察觉他人身上的斗气。" },
  { value: "转生记忆", label: "转生记忆", desc: "带着前世的记忆出生。" },
  { value: "召唤术天赋", label: "召唤术天赋", desc: "与异界之物建立联系。" },
  { value: "炼金术天赋", label: "炼金术天赋", desc: "对物质转化有直觉。" },
  { value: "语言天赋", label: "语言天赋", desc: "接触过的语言很快上手。" },
  { value: "商业嗅觉", label: "商业嗅觉", desc: "对价格与时机敏感。" },
  { value: "军事直觉", label: "军事直觉", desc: "在混乱中看清局势。" },
  { value: "虔诚感召", label: "虔诚感召", desc: "信仰在你身上格外清晰。" },
  { value: "贵族血统", label: "贵族血统", desc: "出身带来的天然话语权。" },
  { value: "魔族血脉", label: "魔族血脉", desc: "魔族的血在你身上流动。" },
  { value: "龙族血脉", label: "龙族血脉", desc: "稀薄却不容忽视的龙血。" },
  { value: "人神印记", label: "人神印记", desc: "你被人神在梦中标记。" },
  { value: "龙神祝福", label: "龙神祝福", desc: "某一次轮回里，有人替你留了后手。" },
  { value: "诅咒抗性", label: "诅咒抗性", desc: "对诅咒与侵蚀有额外抵抗。" },
  { value: "预言能力", label: "预言能力", desc: "偶尔看见尚未发生的事。" },
  { value: "随机", label: "随机（交由系统裁定）", desc: "由系统依据出身与时代自行裁定。" },
];

/** 天赋最多可选的项数 */
export const TALENT_LIMIT = 8;

/** 「无」与「随机」是独占项，与其它天赋互斥；普通天赋可叠加 */
export const EXCLUSIVE_TALENTS = ["无", "随机"];

export function isExclusiveTalent(value: string): boolean {
  return EXCLUSIVE_TALENTS.includes(value);
}

/** 返回新的选中列表；超出上限时原样返回，由调用方提示玩家 */
export function toggleTalent(current: string[], value: string): string[] {
  if (isExclusiveTalent(value)) {
    return current.includes(value) ? [] : [value];
  }
  const withoutExclusive = current.filter((t) => !isExclusiveTalent(t));
  if (withoutExclusive.includes(value)) return withoutExclusive.filter((t) => t !== value);
  if (withoutExclusive.length >= TALENT_LIMIT) return current;
  return [...withoutExclusive, value];
}

export const TIERS = ["未觉醒", "初级", "中级", "上级", "圣级", "王级", "帝级", "神级"];
export const MAGIC_TIERS: Option[] = TIERS.map((t) => ({ value: t, label: t }));
export const SWORD_TIERS: Option[] = TIERS.map((t) => ({ value: t, label: t }));

export const SWORD_SCHOOLS: Option[] = [
  { value: "无", label: "无" },
  { value: "剑神流", label: "剑神流" },
  { value: "水神流", label: "水神流" },
  { value: "北神流", label: "北神流" },
];

export const ADVENTURER_RANKS: Option[] = [
  { value: "未注册", label: "未注册" },
  { value: "F", label: "F 级" },
  { value: "E", label: "E 级" },
  { value: "D", label: "D 级" },
  { value: "C", label: "C 级" },
  { value: "B", label: "B 级" },
  { value: "A", label: "A 级" },
  { value: "S", label: "S 级" },
];

export const BLOOD_STATES: Option[] = [
  { value: "无", label: "无" },
  { value: "未觉醒", label: "未觉醒" },
  { value: "已觉醒", label: "已觉醒" },
  { value: "被封印", label: "被封印" },
  { value: "被压制", label: "被压制" },
  { value: "未知", label: "未知" },
];

export const CONTRACT_STATES: Option[] = [
  { value: "无", label: "无" },
  { value: "人神契约", label: "人神契约" },
  { value: "龙神契约", label: "龙神契约" },
  { value: "魔术公会契约", label: "魔术公会契约" },
  { value: "魔王契约", label: "魔王契约" },
  { value: "未知", label: "未知" },
];

export const CORRUPTION_STATES: Option[] = [
  { value: "无", label: "无" },
  { value: "家族腐化", label: "家族腐化" },
  { value: "黑魔术腐化", label: "黑魔术腐化" },
  { value: "被诅咒者", label: "被诅咒者" },
  { value: "恶魔之枪影响", label: "恶魔之枪影响" },
  { value: "未知", label: "未知" },
];

export const COLLEGE_TENDENCIES: Option[] = [
  { value: "系统判定", label: "系统判定", desc: "由系统依据出身与天赋裁定。" },
  { value: "拉诺亚魔法大学", label: "拉诺亚魔法大学" },
  { value: "剑之圣地", label: "剑之圣地" },
  { value: "冒险者公会", label: "冒险者公会" },
  { value: "米里斯教团", label: "米里斯教团" },
  { value: "魔术公会", label: "魔术公会" },
  { value: "宫廷", label: "宫廷" },
  { value: "未入学/成年/其他", label: "未入学 / 成年 / 其他" },
];

export const POLITICAL_LEANS: Option[] = [
  { value: "阿斯拉王室派", label: "阿斯拉王室派" },
  { value: "贵族派", label: "贵族派" },
  { value: "魔术公会派", label: "魔术公会派" },
  { value: "米里斯教团派", label: "米里斯教团派" },
  { value: "冒险者公会派", label: "冒险者公会派" },
  { value: "人神派", label: "人神派" },
  { value: "龙神派", label: "龙神派" },
  { value: "中立", label: "中立" },
  { value: "自定义", label: "自定义" },
];

export const EMOTIONS: Option[] = [
  { value: "渴望爱", label: "渴望爱" },
  { value: "恐惧爱", label: "恐惧爱" },
  { value: "隐藏爱", label: "隐藏爱" },
  { value: "利用爱", label: "利用爱" },
  { value: "不懂爱", label: "不懂爱" },
  { value: "失去爱", label: "失去爱" },
  { value: "自定义", label: "自定义" },
];

export const SIM_STYLES: Option[] = [
  { value: "极度现实", label: "极度现实", desc: "物价、疾病、天灾、平庸与疲惫都是真实的。" },
  { value: "冒险史诗", label: "冒险史诗", desc: "委托、迷宫、远方与传闻不断。" },
  { value: "宫廷阴谋", label: "宫廷阴谋", desc: "派系、联姻、密信与背叛。" },
  { value: "魔法大学日常", label: "魔法大学日常", desc: "课程、同窗、实验与图书馆长夜。" },
  { value: "剑之修行", label: "剑之修行", desc: "晨练、道场、师承与一次次败北。" },
  { value: "迷宫探索", label: "迷宫探索", desc: "陷阱、遗物、补给与黑暗。" },
  { value: "种族冲突", label: "种族冲突", desc: "偏见、仇视、边境与看不见的墙。" },
  { value: "日常人生", label: "日常人生", desc: "田地、店铺、邻人与四季。" },
  { value: "人神暗流", label: "人神暗流", desc: "梦中的低语，与任何人的建议。" },
  { value: "龙神轮回", label: "龙神轮回", desc: "异常变量、龙神的注视与两百年。" },
  { value: "血脉悲剧", label: "血脉悲剧", desc: "祖先的罪孽在你身上应验。" },
  { value: "情感纠葛", label: "情感纠葛", desc: "爱、嫉妒、承诺与错过。" },
  { value: "混合模式", label: "混合模式", desc: "由系统在多种基调间自然切换。" },
];

export const AGE_PRESETS = ["7 岁", "10 岁", "14 岁", "18 岁", "成年"];

const ORIGIN_GROUP: Record<string, OriginGroup> = {
  "阿斯拉王国贵族子弟": "noble",
  "西隆王国贵族": "noble",
  "平民/农家子弟": "commoner",
  "冒险者出身": "commoner",
  "剑之圣地学徒": "commoner",
  "拉诺亚魔法大学学生": "commoner",
  "被召唤者": "commoner",
  "奴隶/家畜": "commoner",
  "迷宫探索者": "commoner",
  "长耳族/小人族/矿坑族": "commoner",
  "魔族后裔": "demon",
  "魔王之裔": "demon",
  "被诅咒者": "demon",
  "兽族": "beast",
  "米里斯教徒": "mirees",
  "转生者": "mystic",
  "人神使徒": "mystic",
  "龙神同伴": "mystic",
  "自定义出身": "mystic",
};

export function originGroup(origin: string): OriginGroup {
  return ORIGIN_GROUP[origin] ?? "commoner";
}

export function createEmptyDraft(): import("../types").CreationDraft {
  return {
    era: "鲁迪乌斯时代",
    origin: "平民/农家子弟",
    birthIdentity: "农家",
    name: "",
    age: "10 岁",
    gender: "男",
    residence: "布耶纳村",
    family: "",
    faith: "无信",
    status: "平民",
    talents: ["随机"],
    magicTier: "未觉醒",
    swordTier: "初级",
    swordSchool: "无",
    adventurerRank: "未注册",
    blood: "无",
    contract: "无",
    corruption: "无",
    college: "系统判定",
    politics: "中立",
    trait1: "",
    trait2: "",
    trait3: "",
    goal: "",
    emotion: "渴望爱",
    precious: "",
    painful: "",
    style: "混合模式",
    difficulty: "标准",
    mainlineMode: "随机",
  };
}

/** 主线引导的两个选项。游戏内规则手册与创建界面读的是同一份文案 */
export const MAINLINE_MODES: Option[] = [
  {
    value: "随机",
    label: "随机抽取一条主线",
    desc: "创建存档时从二十条主线里抽一条（按出身、时代、所在地、天赋加权），开场后由 AI 按你的主角改写一遍，之后每年按你实际做过的事再微调。",
  },
  {
    value: "不介入",
    label: "不要主线",
    desc: "这一局不抽主线，只剩自由行动、抉择事件与原作人物的遇合。适合只想随便活一辈子的人。",
  },
];