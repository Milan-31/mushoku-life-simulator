import type {
  Character,
  ChronicleEntry,
  CreationDraft,
  DecisionOption,
  Difficulty,
  Ending,
  EntryKind,
  EventEffects,
  CustomCommand,
  CustomScene,
  Faction,
  GameState,
  PendingEvent,
  PendingTalk,
  Relation,
  RelationBond,
  ScenePatch,
  SceneStash,
  StatBar,
  Threads,
  YearbookEntry,
  YearEvent,
  YearView,
} from "../types";
import { originGroup } from "../data/creation";
import { evaluateAchievements } from "../data/achievements";
import { difficultyOf } from "../data/difficulty";
import {
  CATEGORY_ORDER,
  checkCommand,
  commandAvailable,
  emptySceneStash,
  gateOpen,
  gateReason,
  mergeSceneStash,
  pickOutcome,
  type PresetCommand,
  type PresetOutcome,
} from "../data/scenes";
import { PLACES, placeById, type PlaceDef } from "../data/places";
import { canonArrivals, canonById, homeOf, toRelation } from "../data/characters";
import {
  ACQUAINTANCE_LIMIT,
  CONTACT_MIN_STARS,
  RELATION_ACTIONS,
  acquaintanceLine,
  meetAcquaintance,
  openingLine,
} from "../data/acquaintances";
import { combatPower, skillById } from "../data/skills";
import { memoryOf, rememberEvent, rememberTalk, sanitizeMemory } from "./memory";
import { withBirthYear } from "./age";
import {
  hasSupernaturalBasis,
  judgeFatal,
  judgeIllness,
  judgeOldAge,
  spareChild,
  verdictLine,
  type DeathBasis,
  type DeathVerdict,
} from "./death";
import { canToggleCompanion, reachable, whereabouts } from "./presence";
import {
  emptyFamily,
  markSpouse,
  tryCanonBirth,
  tryCanonWedding,
  tryNpcBirth,
  tryPlayerBirth,
} from "./family";
import { eventById, pickEvent, toPending } from "./events";

/* ---------- 工具 ---------- */

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length) % arr.length];
}

export const MONTH_NAMES = ["霜月", "雪月", "芽月", "花月", "雨月", "阳月", "炎月", "穗月", "果月", "叶月", "雾月", "炉月"];

const ERA_START_YEAR: Record<string, number> = {
  神话时代: -100000,
  第一次人魔大战: -7000,
  战国时代: -5500,
  第二次人魔大战: -5000,
  拉普拉斯战役: -500,
  鲁迪乌斯时代: 407,
  战后时代: 427,
  自定义时代: 500,
};

export function eraYear(era: string): number {
  return ERA_START_YEAR[era] ?? 500;
}

function parseAge(age: string): number {
  const m = age.match(/(\d+)/);
  if (m) return Number(m[1]);
  return 20;
}

export function formatYear(year: number): string {
  return year < 0 ? `甲龙历前 ${Math.abs(year)} 年` : `甲龙历 ${year} 年`;
}

export function formatDate(year: number, month: number): string {
  return `${formatYear(year)} · ${MONTH_NAMES[(month - 1) % 12]}`;
}

/* ---------- 年鉴 ---------- */

/** 一条年鉴里最多留几件事。超了就优先留下抉择与成就 */
const YEAR_EVENT_LIMIT = 14;

/** 事件的重要性排序，越小越该留下 */
const KIND_RANK: Record<EntryKind, number> = {
  ending: 0,
  choice: 1,
  achievement: 2,
  action: 3,
  rumor: 4,
  world: 5,
};

function monthName(month: number): string {
  return MONTH_NAMES[(month - 1) % 12];
}

/**
 * 把某一年的纪事压成一条年鉴。
 * 世界动态只留每月第一句，作为这一年的时代底色；玩家自己的事留标题与首句。
 */
export function compactYear(year: number, age: number, entries: ChronicleEntry[]): YearbookEntry {
  const ofYear = entries.filter((e) => e.year === year);
  const world: string[] = [];
  for (const e of ofYear) {
    if (e.kind !== "world") continue;
    const line = e.lines[0];
    if (!line) continue;
    const text = `${monthName(e.month)}：${line}`;
    if (!world.includes(text)) world.push(text);
  }

  const events: YearEvent[] = ofYear
    .filter((e) => e.kind !== "world")
    .sort((a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind] || a.month - b.month)
    .slice(0, YEAR_EVENT_LIMIT)
    .sort((a, b) => a.month - b.month)
    .map((e) => ({
      month: e.month,
      kind: e.kind,
      title: e.title,
      text: (e.lines[0] ?? "").slice(0, 90),
    }));

  return { year, age, events, world: world.slice(0, 12) };
}

/** 年度视图能翻到的年份，从早到晚排好 */
export function yearOptions(s: GameState): number[] {
  const years = new Set(s.yearbooks.map((y) => y.year));
  years.add(s.year);
  return [...years].sort((a, b) => a - b);
}

/**
 * 读某一年的年鉴。
 * 往年读存档里的年鉴；当前这一年还没封存，直接从纪事里现取。
 */
export function buildYearView(s: GameState, year: number): YearView {
  const archived = s.yearbooks.find((y) => y.year === year);
  if (archived && year !== s.year) return { ...archived, archived: true };
  return { ...compactYear(year, year - s.birthYear, s.log), archived: false };
}

/** 这一年留下的事，按月份从早到晚 */
export function yearEvents(s: GameState, year: number): YearEvent[] {
  return buildYearView(s, year).events;
}

/** 旧存档没有年鉴：用现有纪事里还留着的那几年回填一次 */
function backfillYearbooks(s: GameState): YearbookEntry[] {
  const years = [...new Set(s.log.map((e) => e.year))].filter((y) => y < s.year).sort((a, b) => a - b);
  return years.map((y) => compactYear(y, y - s.birthYear, s.log));
}

/* ---------- 世界事件池 ---------- */

const WORLD_POOL: Record<string, string[]> = {
  阿斯拉王国: [
    "王位派系还在角力。第一王子派与第二王女派同席时，笑都到不了眼底。",
    "四大上级贵族又向各自领地加了一成税。平民的抱怨压在酒馆的低语里。",
    "一支菲托亚领的商队在罗亚町外被劫。冒险者公会挂出了护卫委托。",
    "王都亚尔斯办武会，贵族子弟轮番登台。胜负之外全是人情账。",
    "宫廷传出消息：一位上级贵族病重，继承人的名单还没定。",
    "边防报告，近来有黑魔术师在边境村落出没。魔术公会已经派人去查。",
  ],
  拉诺亚王国: [
    "魔法三大国的使节在拉诺亚王都密会。谈了什么都无人公开。",
    "拉诺亚国王和魔术公会为一处古代遗物的收藏权起了争执。",
    "王国贴出公告，招募民间魔术研究者参与一处遗迹的勘测。",
    "通往夏利亚的商路上，护送委托的价钱翻了一倍。",
  ],
  米里斯教团: [
    "教团照例征收什一税。乡下教区怨声不小，但都压在嗓子里。",
    "一位枢机主教在布告里重申：与魔族通婚者，视同异端。",
    "神殿骑士团在边境巡行。据说是在找一个「不洁者」。",
    "米里希昂的大圣堂举行弥撒。教皇的讲道被抄写成册，传往各地。",
  ],
  魔法大学: [
    "夏利亚的魔法大学开始招新生。特殊生的名额引来各地自荐者。",
    "大学禁书区又丢了一次东西。失物清单没有公开。",
    "几位教授就「无咏唱施法该不该必修」公开辩论，学生分成两派。",
    "一个学生私研禁忌魔术，被勒令退学。档案封存。",
  ],
  冒险者公会: [
    "各地公会的委托板照常更新。从除草到讨伐，价钱随行就市。",
    "一支 C 级队伍在迷宫里全军覆没。公会为要不要加悬赏吵个不停。",
    "S 级冒险者罕见地出现在分部，只取走一张委托就离开了。",
    "公会出新规：委托私下转卖者，查实即注销资格。",
  ],
  魔大陆: [
    "沙漠深处的古代迷宫又塌了一角。里面埋着什么，没有人知道。",
    "魔族几个部落在水源地起了冲突。旧怨又被翻出来。",
    "有斯佩路德族的行商出现在人族边境，随即被驱逐。",
    "魔大陆的天空泛着不祥的红。老人说，那是旧时代的颜色。",
  ],
  七大列强: [
    "关于列强顺位的传闻又起。没有人见过真正的交手。",
    "有人在远方见过一个自称列强的武者。真假难辨。",
    "列强的名号被写进酒馆赌盘。赔率每个月都在变。",
    "据说天空之城的方向，夜里升起过一道光柱。",
  ],
  人神: [
    "有个人做了一个温和的梦。梦里有人建议他去做一件小事。他醒来照做了。",
    "一位母亲梦见孩子会平安长大。她因此拦下了孩子明天的出行。",
    "一个年轻人「直觉」绕开了那条本会出事的路。没有人知道为什么。",
    "梦里的声音一如既往地友善，对代价一个字都没提。",
  ],
  你所在地区: [
    "你身边的镇子照常天亮，面包照常出炉。",
    "村里有人家添了孩子，也有人赶在冬天前搬走了。",
    "附近的集市开了，行商带来远方的消息，真假各一半。",
    "雨季推迟了。农户开始为收成发愁。",
  ],
};

const STYLE_LINES: Record<string, string[]> = {
  日常人生: ["邻居照旧在清晨劈柴，声音穿过薄雾。", "田里的活计不会因为世界的大事停下来。", "有人托你捎个口信，报酬是一顿饭。"],
  人神暗流: ["你最近做的梦有点怪。你说不清哪里怪。", "你听见一个温和的声音在建议你，态度近乎体贴。", "你莫名地想做一件事，越想越觉得理所应当。"],
  龙神轮回: ["有传言说，轮回者又从某个遥远的时间点出发了。", "某个「异常变量」被注意到了。你无法确认那是不是你。", "两百年一轮的耐心，凡人扛不住。"],
  宫廷阴谋: ["一封没有署名的信从门缝塞进来，字迹工整。", "有人在宴席上向你敬酒，目光却在数你身后站着几个家臣。", "你的名字被写进了某份名单。是哪一份，你无从得知。"],
  迷宫探索: ["公会的委托板上，关于迷宫的条目又多了一条。", "有队伍带回一件说不清用途的古代遗物。", "某个迷宫入口被封了，理由是「危险」。没人解释危险什么。"],
  血脉悲剧: ["你家族里那句老话又被提起。谁也不愿往深了谈。", "你祖父当年做过的某件事，正在你身上应验。", "血脉的代价，从来不问你愿不愿意。"],
  情感纠葛: ["有人在你门前站了很久，最后没有敲门。", "你想起一个人的名字，随即强迫自己不去想。", "有个承诺还悬在那里。两边都装作忘了。"],
  冒险史诗: ["远方传来消息，某处遗迹对外开放。去的人不少。", "传闻一件神级武器现世。无人能证实。", "一支跨大陆的商队正在招护卫，报酬优厚。"],
  剑之修行: ["道场里又有人被逐出师门，理由是态度不端。", "剑神流的新弟子在晨练里倒下了三个。", "你师父什么都没说，只是把木刀递给你。"],
  魔法大学日常: ["魔药课的实验又炸了一间教室。无人受伤。", "图书馆的座位一如既往地难抢。", "有位教授下课后留下一句没头没尾的忠告。"],
  种族冲突: ["集市上，一个异族孩子被人扔石头。没有人管。", "边境村庄拒绝给魔族行商供水，理由说得冠冕堂皇。", "有人贴出告示，写着「异类不该走在大路上」。"],
  极度现实: ["面粉涨价了。你算了算这个月还剩多少。", "有户人家的老人没熬过这阵寒。", "你手上的活计，和世界的大事毫无关系。"],
};

const RUMORS: string[] = [
  "酒馆里有人说，菲托亚领某处又冒出了转移事件的余烬。说的人自己都不信。",
  "传闻言，一名人神使徒已经潜入某座王都。没有任何证据。",
  "一个行商坚称，他在沙漠里见过会走路的石像。",
  "有人说洛琪希·米格路迪亚近日行踪不明，随即被同伴笑说是旧闻。",
  "一则告示称，剑之圣地今年不收外门弟子。落款很模糊。",
  "传闻拉普拉斯封印处的看守换了一批人。原因不明。",
  "有人说龙神奥尔斯帝德正朝这个方向来。这句话在赌局里赔率很高。",
  "一个孩子说他在井里听见有人低语，被大人打了一顿。",
  "商队说魔大陆深处出现了从未记载过的魔物。",
  "有人声称在天空之城下方捡到一片龙鳞，转手就卖了高价。",
  "传闻魔术公会正在秘密收购某类古代遗物。用途不明。",
  "你听到一个和你前世记忆里几乎一样的故事。你开始怀疑。",
];

/* ---------- 初始关系 ---------- */

/**
 * 关系性质由角色身份推定，用于关系网分组与 NPC 对话时的扮演依据。
 * 显式写了 bond 的以显式为准。
 */
export function inferBond(name: string, role: string): RelationBond {
  const text = `${name}${role}`;
  if (/母亲|父亲|妹|姐|兄|弟|养父|养母|族长|家主|家人|血亲/.test(text)) return "血亲";
  if (/师父|师范|师兄|师姐|弟子|同门|道场|剑圣/.test(text)) return "师门";
  if (/恋人|未婚|妻|夫|爱慕|情人/.test(text)) return "恋情";
  if (/宿敌|仇|政敌|敌手/.test(text)) return "宿敌";
  if (/同窗|同学|同僚|战友|同袍|同行|同伴|旅伴/.test(text)) return "同僚";
  if (/友|玩伴|挚交|知己/.test(text)) return "挚友";
  return "熟人";
}

function buildRelations(c: Character): Relation[] {
  const byGroup: Record<string, Relation[]> = {
    noble: [
      { name: "父亲", role: "家主", stars: 3, note: "他看重你，但更看重家族的名声。", secret: "他与一位旁支有未了结的旧账。" },
      { name: "母亲", role: "贵妇", stars: 4, note: "她在人前寡言，在灯下会教你识字。" },
      { name: "家庭教师", role: "剑术师范", stars: 3, note: "他教你的第一课是「别把剑当装饰」。" },
      { name: "政敌之子", role: "同辈贵族", stars: 2, note: "他对你笑着，手一直按在剑柄上。", secret: "他受命监视你家。" },
    ],
    commoner: [
      { name: "父亲", role: "农民", stars: 4, note: "他手上全是老茧，话不多。" },
      { name: "母亲", role: "农妇", stars: 5, note: "她总把最后一口留给你。" },
      { name: "邻家少年", role: "玩伴", stars: 4, note: "你们一起偷过果子，也一起挨过打。" },
      { name: "村中神父", role: "米里斯教徒", stars: 2, note: "他待你温和，但他也相信异族是不洁的。" },
    ],
    demon: [
      { name: "母亲", role: "米格路德族", stars: 5, note: "她把魔大陆的夜讲成了童话给你听。" },
      { name: "部落长老", role: "族长", stars: 3, note: "他护着你，也替你挡着部族里的闲话。" },
      { name: "人族行商", role: "往来商人", stars: 1, note: "他做你的生意，但从不肯与你同桌吃饭。" },
      { name: "讲述者", role: "流浪者", stars: 3, note: "他说，外面的人怕你，是因为他们只见过恶魔之枪。", secret: "他的来历从来没说清楚过。" },
    ],
    beast: [
      { name: "族长", role: "泰德路迪亚族", stars: 3, note: "他认可你的力气，不认可你的犹豫。" },
      { name: "兄长", role: "猎手", stars: 4, note: "他带你第一次进大森林。" },
      { name: "兽神祭司", role: "祭祀", stars: 3, note: "他说的预言很含糊，但没人敢笑。" },
      { name: "人族商人", role: "过境者", stars: 1, note: "他管你叫「半兽人」，脸上带着生意人的笑。" },
    ],
    mirees: [
      { name: "神父", role: "教区神父", stars: 4, note: "他教你祈祷，也教你回避某些人。" },
      { name: "母亲", role: "虔诚教徒", stars: 4, note: "她相信一夫一妻是唯一的正道。" },
      { name: "神殿骑士", role: "巡行者", stars: 2, note: "他握剑的手很稳，眼神很冷。" },
      { name: "异族流民", role: "逃亡者", stars: 2, note: "他在教堂后门躲了一夜，你看见了。", secret: "他信的是另一个名字。" },
    ],
    mystic: [
      { name: "养父", role: "庇护者", stars: 4, note: "他从不问你为什么和别的孩子不一样。" },
      { name: "同窗", role: "研习者", stars: 3, note: "他羡慕你学得快，也怕你学得快。" },
      { name: "低语", role: "不确定的存在", stars: 1, note: "它只在你睡着时出现，态度温和。", secret: "它对代价闭口不谈。" },
      { name: "旧识", role: "前世之人", stars: 2, note: "你在她眼里看见了另一个世界的影子。", secret: "她记得你说过的、你早该忘记的话。" },
    ],
  };
  const base = byGroup[c.originGroup] ?? byGroup.commoner;
  // 开局这批人都在你的出身地：你搬走了，他们还留在那儿
  return base.map((r) => ({ ...r, bond: r.bond ?? inferBond(r.name, r.role), place: c.residence }));
}

/* ---------- 初始势力 ---------- */

function buildFactions(c: Character): Faction[] {
  const seed = hash(c.name + c.politics) % 10;
  const val = (offset: number) => Math.max(-40, Math.min(60, seed * 4 - 12 + offset));
  return [
    { name: "阿斯拉王国", value: c.politics === "阿斯拉王室派" ? val(24) : val(0) },
    { name: "魔术公会", value: c.politics === "魔术公会派" ? val(26) : val(-4) },
    { name: "米里斯教团", value: c.faith === "米里斯教团" ? val(28) : val(-8) },
    { name: "冒险者公会", value: c.origin === "冒险者出身" ? val(30) : val(2) },
    { name: "魔法大学", value: c.college === "拉诺亚魔法大学" ? val(24) : val(0) },
    { name: "剑之圣地", value: c.origin === "剑之圣地学徒" ? val(26) : val(0) },
  ];
}

/* ---------- AI 推演载荷 ---------- */

/** AI 推演出的世界动态。为 null 时回退到本地文本池 */
export interface AiWorldTurn {
  lines: string[];
  rumor?: string;
  notice?: string;
  /** 世界本身对角色造成的数值影响（灾害、疫病、时局红利等），经夹取后落账 */
  stats?: Record<string, number>;
  lifespan?: number;
  factions?: Record<string, number>;
  /** AI 认为本月应发生抉择时可自带一个事件；是否采纳由难度的事件间隔决定 */
  event?: PendingEvent | null;
  /** 每 15 轮的强制自检由 AI 自己撰写；缺省时用模板文本 */
  selfCheck?: { snapshot: string[]; ooc: string[] };
  /** AI 判定这个月就要了这个人的命：由它给出死因，死亡流程仍由引擎执行 */
  fatal?: string;
  /** 本回合新增的长期设定，会并入存档里的自撰设定集 */
  canon?: string[];
  /**
   * 本回合长出来的场景与指令。只写进这一份存档，
   * 与 canon 同一性质：不进入游戏本体的任何内容文件。
   */
  scenes?: ScenePatch[];
}

/** AI 推演出的行动后果。数值由引擎二次校验并夹取，避免越界 */
export interface AiActionOutcome extends EventEffects {
  lines: string[];
  matched?: boolean;
  /** 这次行动的精力消耗。缺省时回退到规则表的取值 */
  energyCost?: number;
  /** AI 判定这次行动直接致命（跳崖、硬闯魔物巢穴等），由它给出死因 */
  fatal?: string;
  /** 本回合新增的长期设定 */
  canon?: string[];
  /** 本回合长出来的场景与指令，只写进这一份存档 */
  scenes?: ScenePatch[];
}

/** 自撰设定集的容量上限，避免存档与提示词无限膨胀 */
const CANON_LIMIT = 24;

/** 合并新设定：按内容去重，保留最近的若干条 */
function mergeCanon(prev: string[], incoming: string[] | undefined): string[] {
  if (!incoming?.length) return prev;
  const merged = [...prev];
  for (const item of incoming) {
    const line = item.trim();
    if (line && !merged.includes(line)) merged.push(line);
  }
  return merged.slice(-CANON_LIMIT);
}

/**
 * 效果数值的上下限。AI 结果校验（ai.ts）与本文件的落账共用这一份定义，避免两处数字漂移。
 */
export interface EffectLimits {
  /** 单项属性增减 */
  stat: number;
  /** 阶级进度成长 */
  tier: number;
  /** 关系好感变动（星级本身仍限制在 0-5） */
  star: number;
  /** 人生目标进度增减 */
  goal: number;
  /** 寿命增减（岁） */
  lifespan: number;
  /** 精力增减 */
  energy: number;
  /** 单次行动的精力消耗 */
  actionCost: number;
}

/** 常规上限：一次普通行动、一个月的世界动态，都按这个幅度结算 */
export const LIMITS: EffectLimits = {
  stat: 15,
  tier: 20,
  star: 3,
  goal: 8,
  lifespan: 2,
  energy: 40,
  actionCost: 25,
};

/**
 * 抉择事件的上限：常规的三倍，留给真正罕见的特殊事件。
 * 继承遗产、被判重刑、失去至亲、被诅咒缠身、捡到圣物、身份暴露、与列强正面交手，才用得上这个额度。
 * actionCost 一并保留只是为了保持结构一致，事件结算不使用它。
 */
export const EVENT_LIMITS: EffectLimits = {
  stat: 45,
  tier: 60,
  star: 9,
  goal: 24,
  lifespan: 6,
  energy: 120,
  actionCost: LIMITS.actionCost,
};

/** ---------- 效果落账 ---------- */

/** 可被效果改动的状态切片，供行动结算与抉择结算共用 */
interface EffectContext {
  stats: StatBar[];
  relations: Relation[];
  factions: Faction[];
  character: Character;
  tierProgress: { magic: number; sword: number; adventure: number };
  goalProgress: number;
  lifespan: number;
  energy: number;
  notices: string[];
  /** 已学技能 id。学会新技能时在这里累加 */
  skills: string[];
  /** 剧情标记。事件写入后，后续事件、场景与指令的门槛才打得开 */
  flags: string[];
  /** 当前年份。新认识的人要靠它定下出生年，年龄才会随年份长 */
  year: number;
}

/**
 * 把一组效果落到状态切片上。所有数值都在这里夹取，
 * 因此无论效果来自内置事件表还是 AI 推演，边界的控制点只有一个。
 * limits 缺省为常规上限；只有抉择事件会传入放宽的 EVENT_LIMITS。
 */
function applyEffects(ctx: EffectContext, effects: EventEffects, limits: EffectLimits = LIMITS): void {
  if (effects.stats) {
    for (const [key, value] of Object.entries(effects.stats)) {
      if (!STAT_KEYS.has(key)) continue;
      const delta = clamp(Math.round(Number(value) || 0), -limits.stat, limits.stat);
      if (delta !== 0) ctx.stats = bumpStat(ctx.stats, key, delta);
    }
  }
  if (effects.tier) {
    const gain = clamp(Math.round(effects.tier.gain) || 0, 0, limits.tier);
    if (effects.tier.kind === "magic") {
      const r = advanceTier(ctx.character.magicTier, gain, ctx.tierProgress.magic);
      ctx.character = { ...ctx.character, magicTier: r.tier };
      ctx.tierProgress.magic = r.progress;
    } else if (effects.tier.kind === "sword") {
      const r = advanceTier(ctx.character.swordTier, gain, ctx.tierProgress.sword);
      ctx.character = { ...ctx.character, swordTier: r.tier };
      ctx.tierProgress.sword = r.progress;
    } else if (effects.tier.kind === "adventure") {
      const r = advanceRank(ctx.character.adventurerRank, gain, ctx.tierProgress.adventure);
      ctx.character = { ...ctx.character, adventurerRank: r.rank };
      ctx.tierProgress.adventure = r.progress;
    }
  }
  if (effects.starDelta) {
    const { match, delta, note } = effects.starDelta;
    let idx = -1;
    if (match) idx = ctx.relations.findIndex((r) => r.name.includes(match));
    if (idx < 0 && ctx.relations.length > 0) {
      idx = 0;
      for (let i = 1; i < ctx.relations.length; i += 1) {
        if (ctx.relations[i].stars > ctx.relations[idx].stars) idx = i;
      }
    }
    if (idx >= 0) {
      const step = clamp(Math.round(delta) || 0, -limits.star, limits.star);
      ctx.relations = ctx.relations.map((r, i) => {
        if (i !== idx) return r;
        // 好感变化的原因写进这个人的长期记忆，而不是覆盖掉「他是谁」那句话
        const memory = note ? rememberEvent(memoryOf(r), note) : r.memory;
        return { ...r, stars: clamp(r.stars + step, 0, 5), memory };
      });
    }
  }
  if (effects.addRelation && !ctx.relations.some((r) => r.name === effects.addRelation!.name)) {
    const { role, stars, bond, canonId } = effects.addRelation;
    // 是原作人物时，按考据里的驻地安家（龙王之笛唤来的五龙将就该在天空之城），
    // 不是的话才落到玩家此刻所在的地方
    const canon = canonId ? canonById(canonId) : undefined;
    ctx.relations = [
      ...ctx.relations,
      // 新认识的人在这里就定下出生年与所在地，之后年龄随年份长、人留在原地
      withBirthYear(
        {
          ...effects.addRelation,
          role,
          stars: clamp(Math.round(stars) || 1, 1, 5),
          bond: bond ?? inferBond(effects.addRelation.name, role),
          place:
            effects.addRelation.place ?? (canon ? homeOf(canon, ctx.character.residence) : ctx.character.residence),
        },
        ctx.year,
      ),
    ];
  }
  if (effects.goal) {
    ctx.goalProgress = clamp(ctx.goalProgress + clamp(Math.round(effects.goal) || 0, -limits.goal, limits.goal), 0, 100);
  }
  if (effects.lifespan) {
    const years = clamp(Math.round(effects.lifespan) || 0, -limits.lifespan, limits.lifespan);
    if (years !== 0) ctx.lifespan = Math.max(30, ctx.lifespan + years);
  }
  if (effects.energy) {
    ctx.energy = clamp(ctx.energy + clamp(Math.round(effects.energy) || 0, -limits.energy, limits.energy), 0, 100);
  }
  if (effects.factions) {
    for (const [key, value] of Object.entries(effects.factions)) {
      if (!ctx.factions.some((f) => f.name === key)) continue;
      const delta = clamp(Math.round(Number(value) || 0), -limits.stat, limits.stat);
      if (delta === 0) continue;
      ctx.factions = ctx.factions.map((f) =>
        f.name === key ? { ...f, value: clamp(f.value + delta, -100, 100) } : f,
      );
    }
  }
  if (effects.notice) ctx.notices.push(effects.notice);
  // 剧情标记：只累加，不去重也不清除——「发生过」这件事本身不该被抹掉
  if (effects.flag) {
    const flag = effects.flag.trim();
    if (flag && !ctx.flags.includes(flag)) ctx.flags = [...ctx.flags, flag];
  }
  // 所在地：转移事件与迁居都从这里改。改了地方，能做的事情也就跟着变
  if (effects.residence && effects.residence.trim() && ctx.character.residence !== effects.residence.trim()) {
    ctx.character = { ...ctx.character, residence: effects.residence.trim() };
    ctx.notices.push(`你的所在地变成了「${effects.residence.trim()}」。`);
  }
  // 学会技能：把 id 记下来，并把该技能的一次性成长立刻落账
  if (effects.learnSkill) {
    const skill = skillById(effects.learnSkill);
    if (skill && !ctx.skills.includes(skill.id)) {
      ctx.skills = [...ctx.skills, skill.id];
      ctx.notices.push(`学会了「${skill.name}」（${skill.school}·${skill.grade}）`);
      applyEffects(ctx, skill.effects, limits);
    }
  }
}

/** 允许出现在效果里的属性键，其余一律忽略 */
const STAT_KEYS = new Set(["mana", "sword", "int", "charm", "faith", "wealth", "fame", "scheme", "health"]);

/**
 * 预设命令的收益随难度缩放。只放大正向收益：惩罚与代价保持原样，
 * 否则高难度下的失败会被「缩放」得不痛不痒。
 */
function scaleEffects(e: EventEffects, mul: number): EventEffects {
  const up = (v: number | undefined) => (v === undefined ? undefined : v > 0 ? Math.max(1, Math.round(v * mul)) : v);
  return {
    ...e,
    stats: e.stats
      ? Object.fromEntries(Object.entries(e.stats).map(([k, v]) => [k, up(v) ?? 0]))
      : undefined,
    tier: e.tier ? { ...e.tier, gain: up(e.tier.gain) ?? 0 } : undefined,
    goal: up(e.goal),
    energy: up(e.energy),
  };
}

/** 效果对「线索」面板的影响：先按提示词里的关键词推定，再让显式声明覆盖 */
function applyThreads(threads: Threads, effects: EventEffects | null | undefined): Threads {
  let next = threads;
  const notice = effects?.notice;
  if (notice?.includes("人神")) next = { ...next, humanGod: "低语已经出现过，而且你回应了它。" };
  if (notice?.includes("龙神")) next = { ...next, dragonGod: "你向那个方向走出了第一步。或许是错觉。" };
  if (effects?.threads) next = { ...next, ...effects.threads };
  return next;
}

/** ---------- 初始状态栏 ---------- */

function buildStats(c: Character): StatBar[] {
  const tierIdx = (t: string) => Math.max(0, ["未觉醒", "初级", "中级", "上级", "圣级", "王级", "帝级", "神级"].indexOf(t));
  const seed = hash(c.name + c.talents.join("+")) % 7;
  return [
    { key: "mana", label: "魔力", unit: "", value: 20 + tierIdx(c.magicTier) * 10 + seed, max: 100, tone: "gold" },
    { key: "sword", label: "剑术造诣", unit: "", value: 10 + tierIdx(c.swordTier) * 11 + (seed % 5), max: 100, tone: "teal" },
    { key: "int", label: "智力", unit: "", value: 30 + seed * 3, max: 100, tone: "gold" },
    { key: "charm", label: "魅力", unit: "", value: 25 + (seed * 4) % 30, max: 100, tone: "gold" },
    { key: "faith", label: "信仰", unit: "", value: c.faith === "无信" ? 5 : 40 + seed * 2, max: 100, tone: "teal" },
    { key: "wealth", label: "财富", unit: "枚", value: c.status === "贵族子弟" || c.status === "王子" ? 320 + seed * 20 : 8 + seed * 3, max: 2000, tone: "gold" },
    { key: "fame", label: "声望", unit: "", value: 5 + seed, max: 100, tone: "teal" },
    { key: "scheme", label: "密谋", unit: "", value: c.politics === "中立" ? 8 : 18 + seed, max: 100, tone: "crimson" },
    { key: "health", label: "健康", unit: "", value: 88 + (seed % 10), max: 100, tone: "teal" },
  ];
}

/** 寿命：出身、天赋与难度共同决定一个大致区间，玩家无法直接看到确切数字 */
function buildLifespan(c: Character, difficulty: string): number {
  let base = 62 + (hash(c.name + c.talents.join("+")) % 18);
  if (c.status === "贵族子弟" || c.status === "王子") base += 6;
  if (c.originGroup === "demon") base += 5;
  if (c.originGroup === "beast") base += 3;
  if (c.origin === "奴隶/家畜") base -= 5;
  if (c.blood === "被封印" || c.corruption !== "无") base -= 4;
  base += difficultyOf(difficulty).lifespanMod;
  return Math.max(35, Math.min(96, base));
}

/* ---------- 创建 ---------- */

export function createCharacter(d: CreationDraft): Character {
  const group = originGroup(d.origin);
  const name = d.name.trim() || "无名者";
  return {
    name,
    age: parseAge(d.age),
    gender: d.gender.trim() || "不详",
    era: d.era,
    origin: d.origin,
    originGroup: group,
    birthIdentity: d.birthIdentity,
    residence: d.residence,
    family: d.family.trim(),
    faith: d.faith,
    status: d.status,
    talents: d.talents,
    magicTier: d.magicTier,
    swordTier: d.swordTier,
    swordSchool: d.swordSchool,
    adventurerRank: d.adventurerRank,
    blood: d.blood,
    contract: d.contract,
    corruption: d.corruption,
    college: d.college,
    politics: d.politics,
    traits: [d.trait1, d.trait2, d.trait3].map((t) => t.trim()).filter(Boolean),
    goal: d.goal.trim() || "活下去，并弄清自己想要什么。",
    emotion: d.emotion,
    precious: d.precious.trim() || "母亲在灯下替你缝好衣角的那一夜。",
    painful: d.painful.trim() || "某个你至今说不出名字的离别。",
    style: d.style,
  };
}

/**
 * 开局的种子。
 *
 * 用来支持「原作模式扮演」：那套人生的起点年份、初始关系网、
 * 以及开场那段纪事都是写好的，不该由出身推定出来。
 * 不传就还是按出身自动生成，普通创建流程不受影响。
 */
export interface GameSeed {
  /** 起始年份。缺省用时代起始年 */
  year?: number;
  /** 初始关系网。给了就不再自动追加原作人物遇合 */
  relations?: Relation[];
  /** 开局的纪事正文。缺省用通用那一段 */
  openingLines?: string[];
}

export function createGameState(d: CreationDraft, seed?: GameSeed): GameState {
  const character = createCharacter(d);
  const year = seed?.year ?? eraYear(character.era);
  const month = 1;
  const difficulty = d.difficulty ?? "标准";
  const opening: ChronicleEntry = {
    id: "e0",
    year,
    month,
    kind: "world",
    title: "起点 · 你的人生开始于此",
    lines: seed?.openingLines ?? [
      `${character.name}，${character.age} 岁，${character.gender}。`,
      `出身：${character.origin}　｜　出生身份：${character.birthIdentity}`,
      `所在地：${character.residence}　｜　信仰：${character.faith}　｜　政治倾向：${character.politics}`,
      `特殊天赋：${character.talents.filter((t) => t !== "无").join(" · ") || "无"}`,
      character.family ? `家庭：${character.family}` : "家庭：由系统依据出身生成。",
      `模拟风格：${character.style}。`,
      "六面世界不会因为你出生而停下。你只是这个世界里刚刚睁开眼睛的一个人。",
      "每一回合代表一个月。用行动消耗精力，然后让时间往前走。死亡真实且不可逆。",
    ],
  };
  const base: GameState = {
    character,
    turn: 0,
    year,
    month,
    birthYear: year - character.age,
    lifespan: buildLifespan(character, difficulty),
    difficulty,
    deceased: false,
    energy: 100,
    actionsUsed: 0,
    goalProgress: 0,
    tierProgress: { magic: 10, sword: 10, adventure: 0 },
    stats: buildStats(character),
    // 开局的关系网（含原作模式指定的那一批）在建立时就定下出生年与所在地
    relations: (seed?.relations ?? buildRelations(character)).map((r) => ({
      ...withBirthYear(r, year),
      place: r.place ?? character.residence,
    })),
    factions: buildFactions(character),
    threads: {
      humanGod: character.status === "人神使徒" ? "低语已经出现过。它说它只是「建议」。" : "尚无接触。你不在棋局中，除非你走进去。",
      dragonGod: character.status === "龙神同伴" ? "你被记入过某一次轮回。虽然你自己未必知道。" : "未留意到你。你需要足够显著，才会被「异常变量」注意到。",
      innerStruggle: `你最痛的事：${character.painful}`,
      treasureMemory: character.precious,
      painMemory: character.painful,
    },
    log: [opening],
    yearbooks: [],
    family: emptyFamily(),
    notices: [],
    achievements: [],
    pendingEvent: null,
    pendingTalk: null,
    seenEvents: [],
    lastEventTurn: -99,
    aiEngagedTurn: -1,
    skills: [],
    flags: [],
    customScenes: emptySceneStash(),
    canon: [],
  };
  // 开局就可能遇上原作人物：条件满足的先进关系网，最多四位。
  // 关系网是种子指定的（原作模式），就不再追加——那批人本来就在他身边
  const met = seed?.relations ? [] : canonArrivals(base, 4);
  if (met.length > 0) {
    base.relations = [...base.relations, ...met.map((c) => toRelation(c, base.year, base.character.residence))];
    base.notices = [...base.notices, `你的人生里已经有一些名字：${met.map((c) => c.name).join("、")}`];
  }
  return evaluateAchievements(base).state;
}

/* ---------- 阶级推进 ---------- */

const TIER_ORDER = ["未觉醒", "初级", "中级", "上级", "圣级", "王级", "帝级", "神级"];
const RANK_ORDER = ["未注册", "F", "E", "D", "C", "B", "A", "S"];

function advanceTier(cur: string, gain: number, progress: number): { tier: string; progress: number } {
  let idx = Math.max(0, TIER_ORDER.indexOf(cur));
  let p = progress + gain;
  while (p >= 100 && idx < TIER_ORDER.length - 1) {
    p -= 100;
    idx += 1;
  }
  if (idx === TIER_ORDER.length - 1) p = Math.min(p, 99);
  return { tier: TIER_ORDER[idx], progress: p };
}

function advanceRank(cur: string, gain: number, progress: number): { rank: string; progress: number } {
  let idx = Math.max(0, RANK_ORDER.indexOf(cur));
  let p = progress + gain;
  while (p >= 100 && idx < RANK_ORDER.length - 1) {
    p -= 100;
    idx += 1;
  }
  if (idx === RANK_ORDER.length - 1) p = Math.min(p, 99);
  return { rank: RANK_ORDER[idx], progress: p };
}

/* ---------- 通用变更助手 ---------- */

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function bumpStat(stats: StatBar[], key: string, delta: number): StatBar[] {
  return stats.map((s) => (s.key === key ? { ...s, value: clamp(s.value + delta, 0, s.max) } : s));
}

function bumpRelation(relations: Relation[], delta: number): Relation[] {
  if (relations.length === 0) return relations;
  let idx = 0;
  for (let i = 1; i < relations.length; i += 1) {
    if (relations[i].stars > relations[idx].stars) idx = i;
  }
  return relations.map((r, i) => (i === idx ? { ...r, stars: clamp(r.stars + delta, 0, 5) } : r));
}

/* ---------- 月度推进 ---------- */

export function advanceMonth(prev: GameState, ai?: AiWorldTurn | null): GameState {
  if (prev.deceased) return prev;
  if (prev.pendingEvent) return prev;

  const turn = prev.turn + 1;
  let month = prev.month + 1;
  let year = prev.year;
  if (month > 12) {
    month = 1;
    year += 1;
  }
  // 跨年时把刚过完的那一年压成一条年鉴，年度视图才回得到很早以前
  const yearbooks =
    year !== prev.year ? [...prev.yearbooks, compactYear(prev.year, prev.year - prev.birthYear, prev.log)] : prev.yearbooks;
  const rng = mulberry32(hash(prev.character.name) + turn * 7919);
  const age = year - prev.birthYear;

  const lines: string[] = [];
  // 有 AI 推演时不再抽取本地文本池，避免无意义地消耗随机序列
  if (!ai?.lines?.length) {
    const keys = ["阿斯拉王国", "拉诺亚王国", "米里斯教团", "魔法大学", "冒险者公会", "魔大陆", "七大列强", "人神", "你所在地区"];
    for (const k of keys) {
      lines.push(`【${k}】${pick(rng, WORLD_POOL[k])}`);
    }
    const styleKeys = Object.keys(STYLE_LINES);
    const effectiveStyle = STYLE_LINES[prev.character.style]
      ? prev.character.style
      : styleKeys[Math.floor(rng() * styleKeys.length) % styleKeys.length];
    if (rng() < 0.5) {
      lines.push(`【${prev.character.style === "混合模式" ? "当下" : effectiveStyle}】${pick(rng, STYLE_LINES[effectiveStyle])}`);
    }
  }

  const entry: ChronicleEntry = {
    id: `m${turn}`,
    year,
    month,
    kind: "world",
    title: `${MONTH_NAMES[(month - 1) % 12]} · 世界动态`,
    lines: ai?.lines?.length ? ai.lines : lines,
    rumor: ai?.rumor?.trim() || pick(rng, RUMORS),
  };

  // 数值自然演化
  const cfg = difficultyOf(prev.difficulty);
  let stats = prev.stats.map((s) => ({ ...s }));
  const income = prev.character.status === "贵族子弟" || prev.character.status === "王子" ? 12 : 3;
  stats = bumpStat(stats, "wealth", Math.max(1, Math.round(income * cfg.incomeMul)));
  if (stats.every((s) => s.key !== "health")) {
    stats.push({ key: "health", label: "健康", unit: "", value: 90, max: 100, tone: "teal" });
  }
  if (age >= 45 && rng() < Math.min(1, 0.35 * cfg.healthDecayMul)) stats = bumpStat(stats, "health", -1);
  if (age >= 65 && rng() < Math.min(1, 0.4 * cfg.healthDecayMul)) stats = bumpStat(stats, "health", -1);
  if (rng() < 0.35) stats = bumpStat(stats, "fame", 1);

  const notices = [...prev.notices];
  let lifespan = prev.lifespan;
  let factions = prev.factions;
  let flags = prev.flags ?? [];
  if (ai?.notice?.trim()) notices.push(ai.notice.trim());
  // 世界本身也会作用于角色：灾害、疫病、时局红利、势力态度的变化，同样经夹取后落账
  if (ai && (ai.stats || ai.lifespan || ai.factions)) {
    const worldCtx: EffectContext = {
      stats,
      relations: prev.relations,
      factions,
      character: prev.character,
      tierProgress: prev.tierProgress,
      goalProgress: prev.goalProgress,
      lifespan,
      energy: prev.energy,
      notices,
      skills: [...prev.skills],
      flags: [...flags],
      year,
    };
    applyEffects(worldCtx, { stats: ai.stats, lifespan: ai.lifespan, factions: ai.factions });
    stats = worldCtx.stats;
    factions = worldCtx.factions;
    lifespan = worldCtx.lifespan;
    flags = worldCtx.flags;
  }
  const character = { ...prev.character, age };

  // 健康见底时先托一把：不到 12 岁不会因病而死，只留下病根。
  // 这一步要排在拼 next 之前，否则改到的健康写不进这一回合的状态
  const spared = spareChild(age, stats.find((s) => s.key === "health")?.value ?? 100);
  if (spared.spared) {
    stats = stats.map((s) => (s.key === "health" ? { ...s, value: spared.health } : s));
    notices.push(`${character.name}病得只剩一口气。这一关他挺过来了，但身子从此落下病根。`);
  }

  let log = [entry, ...prev.log].slice(0, 160);

  // 每 15 轮强制自检：AI 在场时由它自己撰写快照，否则用模板
  if (turn % 15 === 0) {
    log = [
      ai?.selfCheck ? aiSelfCheck({ ...prev, turn, year, month, stats, character }, ai.selfCheck) : selfCheck({ ...prev, turn, year, month, stats, character }),
      ...log,
    ].slice(0, 160);
    notices.push(`第 ${turn} 轮：已执行强制自检。`);
  }

  // 抉择事件：内置事件按难度的概率触发；AI 自带的事件改按「距上次事件的回合数」控制节奏，
  // 让模型的判断真正生效，而不是被一次掷骰作废
  let pendingEvent: GameState["pendingEvent"] = prev.pendingEvent;
  let lastEventTurn = prev.lastEventTurn;
  if (!pendingEvent && turn >= 2) {
    const builtinFires = rng() < cfg.eventRate;
    const aiFires = Boolean(ai?.event) && turn - prev.lastEventTurn >= cfg.eventGapTurns;
    if (aiFires && ai?.event) {
      pendingEvent = ai.event;
      lastEventTurn = turn;
    } else if (builtinFires) {
      const def = pickEvent({ ...prev, turn, year, month }, rng);
      if (def) {
        pendingEvent = toPending(def);
        lastEventTurn = turn;
      }
    }
  }

  const next: GameState = {
    ...prev,
    character,
    turn,
    year,
    month,
    lifespan,
    stats,
    factions,
    log,
    yearbooks,
    notices,
    energy: 100,
    actionsUsed: 0,
    pendingEvent,
    lastEventTurn,
    aiEngagedTurn: -1,
    flags,
    // 剧情自己长出来的场景与指令：模型给了就并进这一份存档
    customScenes: mergeSceneStash(prev.customScenes, ai?.scenes),
    canon: mergeCanon(prev.canon, ai?.canon),
  };

  // 死亡判定。三条路径都先过 engine/death.ts 那套规则：
  // AI 提出的死、寿数已尽、健康耗尽。门槛过不了就不判死。
  const healthValue = stats.find((s) => s.key === "health")?.value ?? 100;
  const healthDelta = healthValue - (prev.stats.find((s) => s.key === "health")?.value ?? 100);
  const at: DeathBasis = {
    age,
    lifespan,
    health: healthValue,
    healthDelta,
    inBattle: false,
    supernatural: hasSupernaturalBasis(character),
  };

  if (ai?.fatal?.trim()) {
    const verdict = judgeFatal(ai.fatal.trim(), at);
    if (verdict.ok) return die(next, ai.fatal.trim(), verdict);
    // 驳回：不判死。数值照旧落账，这件事降级成重伤，理由留在纪事里
    next.log = [
      makeEntry(`dn-${turn}`, next, "world", "重伤 · 从鬼门关被拽了回来", [verdict.reason]),
      ...next.log,
    ].slice(0, 160);
    next.notices = [...next.notices, `这个月险些就过去了。${verdict.reason}`];
  }

  if (age >= lifespan) {
    return die(next, `寿数已尽。${formatYear(year)}，${character.name}在 ${age} 岁上停止了呼吸。`, judgeOldAge(at));
  }
  if (healthValue <= 0) {
    return die(next, `久病不愈。${formatYear(year)}，${character.name}在 ${age} 岁上离开了这个世界。`, judgeIllness(at));
  }

  // 原作人物的遇合：条件一旦满足就进入关系网，每月最多出现一位，避免一次涌入
  const arrivals = canonArrivals(next, 1);
  if (arrivals.length > 0) {
    next.relations = [...next.relations, ...arrivals.map((c) => toRelation(c, next.year, next.character.residence))];
    next.notices = [...next.notices, `你的人生里出现了新的名字：${arrivals.map((c) => c.name).join("、")}`];
  }

  // 场合遇合：跟着处境认识一些不是原作人物的人，全部由本地引擎生成
  const met = maybeMeet(next, rng);
  if (met) {
    next.relations = [...next.relations, met];
    next.log = [makeEntry(`ac-${turn}`, next, "action", `结识 · ${met.name}`, [acquaintanceLine(met)]), ...next.log].slice(0, 160);
    next.notices = [...next.notices, `你认识了${met.name}（${met.role}）。`];
  }

  // 原作婚配的时间线：到年份就成婚、就添丁。消息只在玩家认识这对夫妻时才进入视野
  const wedding = tryCanonWedding(next);
  if (wedding) {
    next.seenEvents = [...next.seenEvents, wedding.key];
    next.relations = next.relations.map((r) =>
      wedding.names.some((n) => r.name === n) ? { ...r, bond: "恋情" as RelationBond, stars: Math.max(r.stars, 4) } : r,
    );
    next.log = [
      makeEntry(`cw-${turn}`, next, "action", `成婚 · ${wedding.names.join("与")}`, [wedding.line, wedding.detail]),
      ...next.log,
    ].slice(0, 160);
    next.notices = [...next.notices, wedding.notice];
  }

  const canonBorn = tryCanonBirth(next, rng);
  if (canonBorn) {
    next.seenEvents = [...next.seenEvents, canonBorn.key];
    next.relations = [...next.relations, canonBorn.child];
    next.family = { ...next.family, npcBirths: next.family.npcBirths + 1, npcLastBirthYear: next.year };
    next.log = [
      makeEntry(`cb-${turn}`, next, "action", `添丁 · ${canonBorn.child.name}`, [canonBorn.line, canonBorn.detail]),
      ...next.log,
    ].slice(0, 160);
    next.notices = [...next.notices, canonBorn.notice];
  }

  // 生育：玩家自己的孩子在成人之后才会走这条；别人家的孩子只在玩家认识那对夫妻时出现
  const born = tryPlayerBirth(next, rng);
  if (born) {
    next.relations = [...next.relations, born.child];
    next.family = { ...next.family, children: next.family.children + 1, lastBirthYear: next.year };
    next.log = [
      makeEntry(`bd-${turn}`, next, "action", `添丁 · ${born.child.name}`, [born.line, born.detail]),
      ...next.log,
    ].slice(0, 160);
    next.notices = [...next.notices, `你家里多了一个孩子：${born.child.name}。`];
  } else {
    const npcBorn = tryNpcBirth(next, rng);
    if (npcBorn) {
      next.relations = [...next.relations, npcBorn.child];
      const counts = next.family.npcCoupleBirths ?? {};
      next.family = {
        ...next.family,
        npcBirths: next.family.npcBirths + 1,
        npcLastBirthYear: next.year,
        npcCoupleBirths: npcBorn.coupleKey
          ? { ...counts, [npcBorn.coupleKey]: (counts[npcBorn.coupleKey] ?? 0) + 1 }
          : counts,
      };
      next.log = [
        makeEntry(`nb-${turn}`, next, "action", `别家添丁 · ${npcBorn.child.name}`, [npcBorn.line, npcBorn.detail]),
        ...next.log,
      ].slice(0, 160);
      next.notices = [...next.notices, `你听说${npcBorn.child.name}出生了。`];
    }
  }

  // 普通熟人太多时让最淡的那批自然退场。抉择事件也会写入关系，所以裁剪放在最后统一做
  const pruned = pruneAcquaintances(next.relations, ACQUAINTANCE_LIMIT);
  if (pruned.dropped.length > 0) {
    next.relations = pruned.kept;
    next.notices = [...next.notices, `${pruned.dropped.join("、")}这些人与你渐渐没了来往。`];
  }

  // 上一次的主动沟通如果一直没有回应，这段关系会淡下去
  const waiting = next.pendingTalk;
  if (waiting && turn - waiting.turn >= 2) {
    next.pendingTalk = null;
    next.relations = next.relations.map((r) =>
      r.name === waiting.name ? { ...r, stars: Math.max(0, r.stars - 1) } : r,
    );
    next.notices = [...next.notices, `${waiting.name}那次来找你，你没有回应。这件事就这么过去了。`];
  }

  // 羁绊角色主动来敲门：交情越深越可能来，同一个人两次之间要隔一段时间
  const contact = maybeContact(next, rng);
  if (contact) {
    next.pendingTalk = contact;
    next.relations = next.relations.map((r) => (r.name === contact.name ? { ...r, lastContactTurn: turn } : r));
    next.notices = [...next.notices, `${contact.name}主动来找你，正在等你回话。`];
  }

  return evaluateAchievements(next).state;
}

/** 主动沟通之间至少隔这么多回合，免得同一个人月月来敲门 */
const CONTACT_COOLDOWN = 8;

/**
 * 普通熟人的容量裁剪。超出之后从好感最低的那批里退场，
 * 好感 3 星以上的不动——真正的朋友不会因为「人太多了」被挤掉。
 */
function pruneAcquaintances(list: Relation[], limit: number): { kept: Relation[]; dropped: string[] } {
  // 家人不参与裁剪：孩子与配偶不会因为「人太多了」被挤掉
  const own = list.filter((r) => !r.canonId && !r.family);
  const over = own.length - limit;
  if (over <= 0) return { kept: list, dropped: [] };
  const weak = own
    .filter((r) => r.stars <= 2)
    .sort((a, b) => a.stars - b.stars)
    .slice(0, over);
  if (weak.length === 0) return { kept: list, dropped: [] };
  const names = new Set(weak.map((r) => r.name));
  return { kept: list.filter((r) => !names.has(r.name)), dropped: weak.map((r) => r.name) };
}

/** 场合遇合：只判断「这个月会不会遇上人」，容量交给 pruneAcquaintances 统一管 */
function maybeMeet(s: GameState, rng: () => number): Relation | null {
  const own = s.relations.filter((r) => !r.canonId && !r.family);
  // 装满了又没有一个淡交可以退场时，这个月就不遇上新的人
  if (own.length >= ACQUAINTANCE_LIMIT && !own.some((r) => r.stars <= 2)) return null;
  // 魅力让人更容易被记住，但遇合本身仍是低频的事
  const charm = s.stats.find((x) => x.key === "charm")?.value ?? 0;
  const chance = 0.16 + Math.min(0.16, charm / 700);
  if (rng() >= chance) return null;
  return meetAcquaintance(s, rng);
}

/**
 * 羁绊角色的主动沟通。
 * 只有此刻能跟你当面说上话的人才会来敲门：同处一地的，或者跟你随行的。
 * 你搬走之后，留在老家的人来不了——想再见到他们，得回去。
 */
function maybeContact(s: GameState, rng: () => number): PendingTalk | null {
  if (s.pendingTalk) return null;
  const candidates = s.relations.filter(
    (r) =>
      r.stars >= CONTACT_MIN_STARS &&
      reachable(s, r) &&
      s.turn - (r.lastContactTurn ?? -99) >= CONTACT_COOLDOWN,
  );
  if (candidates.length === 0) return null;
  // 不是每个月都有人来，也不是同一个人总来
  if (rng() >= 0.15 + Math.min(0.1, candidates.length * 0.02)) return null;
  const weighted = candidates.flatMap((r) => Array.from({ length: Math.max(1, r.stars - 2) }, () => r));
  const who = weighted[Math.floor(rng() * weighted.length) % weighted.length];
  return { name: who.name, line: openingLine(who, rng), turn: s.turn };
}

/**
 * 关系互动。与预设指令一样走本地结算，不消耗 AI 额度，但要占一次行动。
 * 这是关系网真正推动剧情的入口：互动换回来的不只是好感，还可能是消息与人情。
 */
export function interactWithRelation(
  prev: GameState,
  name: string,
  actionId: string,
): { state: GameState; ok: boolean; reason?: string } {
  if (prev.deceased) return { state: prev, ok: false, reason: "这一段人生已经结束了。" };
  if (prev.pendingEvent) return { state: prev, ok: false, reason: "先回应本月的抉择。" };
  const action = RELATION_ACTIONS.find((a) => a.id === actionId);
  if (!action) return { state: prev, ok: false, reason: "没有这个做法。" };
  const cfg = difficultyOf(prev.difficulty);
  if (prev.actionsUsed >= cfg.actionsPerMonth) {
    return { state: prev, ok: false, reason: `本月行动次数已用完（上限 ${cfg.actionsPerMonth} 次）。` };
  }
  const rel = prev.relations.find((r) => r.name === name);
  if (!rel) return { state: prev, ok: false, reason: "关系面板里没有这个人。" };
  // 人不在跟前：这套互动都是当面的事，隔着半个大陆做不了。回到他所在的地方再开口
  if (!reachable(prev, rel)) {
    return { state: prev, ok: false, reason: whereabouts(prev, rel).reason };
  }
  if (rel.stars < action.minStars) {
    return { state: prev, ok: false, reason: `交情还不够。${action.label}需要好感 ${action.minStars} 星以上。` };
  }

  const rng = mulberry32(hash(`${prev.character.name}:${name}:${actionId}:${prev.turn}:${prev.actionsUsed}`));
  const { lines, effects, ok } = action.run(rel, rng);
  const entry = makeEntry(`rx-${prev.turn}-${hash(name + actionId) % 100000}`, prev, "action", `${action.label} · ${name}`, lines, effects.rumor);

  const ctx: EffectContext = {
    stats: prev.stats.map((s) => ({ ...s })),
    relations: prev.relations.map((r) => ({ ...r })),
    factions: prev.factions.map((f) => ({ ...f })),
    character: prev.character,
    tierProgress: { ...prev.tierProgress },
    goalProgress: prev.goalProgress,
    lifespan: prev.lifespan,
    energy: prev.energy,
    notices: [...prev.notices],
    skills: [...prev.skills],
    flags: [...(prev.flags ?? [])],
    year: prev.year,
  };
  applyEffects(ctx, effects);
  // 成婚：数值落完账之后，把这个人真正立为配偶，生育才会从这里开始
  if (action.marksSpouse && ok) {
    ctx.relations = ctx.relations.map((r) => (r.name === name ? markSpouse(r) : r));
    ctx.notices.push(`你和${name}成了一个家的人。`);
  }
  const state = evaluateAchievements({
    ...prev,
    character: ctx.character,
    stats: ctx.stats,
    relations: ctx.relations,
    factions: ctx.factions,
    tierProgress: ctx.tierProgress,
    goalProgress: ctx.goalProgress,
    lifespan: ctx.lifespan,
    energy: ctx.energy,
    notices: ctx.notices,
    skills: ctx.skills,
    flags: ctx.flags,
    threads: applyThreads(prev.threads, effects),
    actionsUsed: prev.actionsUsed + 1,
    log: [entry, ...prev.log].slice(0, 160),
  }).state;
  return { state, ok: true };
}

/** 关掉或应下这次主动沟通。回应与否都不占行动，只有真的说话才结算 */
export function clearPendingTalk(prev: GameState): GameState {
  return prev.pendingTalk ? { ...prev, pendingTalk: null } : prev;
}

/* ---------- 同行 ---------- */

/**
 * 带着一个人一起走，或者让他留在这儿。
 *
 * 这件事不占行动：它不是这个月的工作，只是一句交代。但它改的是很实在的东西——
 * 随行的人走到哪儿都能开口，留下来的人你搬走之后就见不到了。
 * 只有此刻说得上话的人才问得出口；配偶与子女是家里人，本来就在你身边，用不着另外交代。
 */
export function setCompanion(
  prev: GameState,
  name: string,
  on: boolean,
): { state: GameState; ok: boolean; reason?: string } {
  if (prev.deceased) return { state: prev, ok: false, reason: "这一段人生已经结束了。" };
  const rel = prev.relations.find((r) => r.name === name);
  if (!rel) return { state: prev, ok: false, reason: "关系面板里没有这个人。" };
  if (!canToggleCompanion(rel)) {
    return { state: prev, ok: false, reason: `${name}是你的家里人，本来就在你身边，用不着另外交代。` };
  }
  if (!reachable(prev, rel)) {
    return { state: prev, ok: false, reason: `得当面说才行。${whereabouts(prev, rel).reason}` };
  }
  return {
    state: { ...prev, relations: prev.relations.map((r) => (r.name === name ? { ...r, follows: on } : r)) },
    ok: true,
  };
}

/**
 * 只更新记忆、不产生纪事。
 * 给「谈过但没法结算」的场合用（AI 不可用、或整段对话没有产生任何影响）：
 * 影响可以没有，但「你们见过面」这件事必须留下。
 */
export function noteTalkMet(prev: GameState, name: string): GameState {
  if (!prev.relations.some((r) => r.name === name)) return prev;
  return {
    ...prev,
    relations: prev.relations.map((r) =>
      r.name === name ? { ...r, memory: rememberTalk(memoryOf(r), prev.turn) } : r,
    ),
  };
}

/* ---------- 迁居 ---------- */

export interface RelocationOption {
  place: PlaceDef;
  /** 现在走不走得过去 */
  ok: boolean;
  /** 走不过去的原因，界面上直接显示 */
  reason: string;
  /** 是不是当前就在的地方 */
  here: boolean;
}

/** 全部去处，含当前所在地。界面自己决定怎么排 */
export function relocationOptions(s: GameState): RelocationOption[] {
  return PLACES.map((place) => {
    const here = place.residence === s.character.residence;
    const ok = here || gateOpen(s, place.unlock);
    return { place, here, ok, reason: ok ? "" : gateReason(s, place.unlock) };
  });
}

/**
 * 迁居：换一个地方生活。
 *
 * 代价是这一整个月——路上就要花掉那么多时间，所以剩下的行动次数一次用尽。
 * 它改的是处境（所在地），不是属性；因此也只走 applyEffects 这一条落账通道。
 */
export function relocate(prev: GameState, placeId: string): { state: GameState; ok: boolean; reason?: string } {
  if (prev.deceased) return { state: prev, ok: false, reason: "这一段人生已经结束了。" };
  if (prev.pendingEvent) return { state: prev, ok: false, reason: "先回应本月的抉择。" };
  const place = placeById(placeId);
  if (!place) return { state: prev, ok: false, reason: "没有这个去处。" };
  if (place.residence === prev.character.residence) {
    return { state: prev, ok: false, reason: `你已经住在${place.name}了。` };
  }
  if (!gateOpen(prev, place.unlock)) {
    return { state: prev, ok: false, reason: `走不过去：${gateReason(prev, place.unlock)}。` };
  }
  const cfg = difficultyOf(prev.difficulty);
  if (prev.actionsUsed >= cfg.actionsPerMonth) {
    return { state: prev, ok: false, reason: "本月的行动次数已经用完，走不动了。推进一个月再动身。" };
  }

  const from = prev.character.residence;
  const entry = makeEntry(`mv-${prev.turn}-${place.id}`, prev, "action", `迁居 · ${from} → ${place.name}`, [
    "你把能带的东西都带上了，路上走了整整一个月。",
    place.desc,
    `${place.region}。${place.canon}`,
  ]);

  const ctx: EffectContext = {
    stats: prev.stats.map((s) => ({ ...s })),
    relations: prev.relations.map((r) => ({ ...r })),
    factions: prev.factions.map((f) => ({ ...f })),
    character: prev.character,
    tierProgress: { ...prev.tierProgress },
    goalProgress: prev.goalProgress,
    lifespan: prev.lifespan,
    energy: prev.energy,
    notices: [...prev.notices],
    skills: [...prev.skills],
    flags: [...(prev.flags ?? [])],
    year: prev.year,
  };
  // 路途劳顿与新的所在地都挂在同一组效果上，边界仍然只有 applyEffects 一个控制点
  applyEffects(ctx, { energy: -10, residence: place.residence });

  const state = evaluateAchievements({
    ...prev,
    character: ctx.character,
    stats: ctx.stats,
    relations: ctx.relations,
    factions: ctx.factions,
    tierProgress: ctx.tierProgress,
    goalProgress: ctx.goalProgress,
    lifespan: ctx.lifespan,
    energy: ctx.energy,
    notices: ctx.notices,
    skills: ctx.skills,
    flags: ctx.flags,
    // 这一整个月都花在路上了
    actionsUsed: cfg.actionsPerMonth,
    log: [entry, ...prev.log].slice(0, 160),
  }).state;
  return { state, ok: true };
}

/* ---------- 玩家行动结算 ---------- */

interface Rule {
  re: RegExp;
  tier?: "magic" | "sword" | "adventure";
  gain?: number;
  stat?: string;
  statGain?: number;
  energyCost?: number;
  goal?: number;
  star?: number;
  lines: string[];
}

const RULES: Rule[] = [
  {
    re: /练|修行|挥剑|道场|剑术|师父|太刀|斗气|晨练/,
    tier: "sword",
    gain: 14,
    stat: "sword",
    statGain: 3,
    energyCost: 18,
    goal: 2,
    lines: [
      "同一个动作你重复了上千次，到最后手臂不像自己的。",
      "师父没有夸你。他只在你收刀时点了一下头。",
      "这一刀，终于没有多余的动作。",
    ],
  },
  {
    re: /魔术|魔法|咏唱|阵法|炼金|研究|魔力|禁书|实验/,
    tier: "magic",
    gain: 14,
    stat: "mana",
    statGain: 3,
    energyCost: 18,
    goal: 2,
    lines: [
      "你对着空处咏唱，直到嗓子发哑，法阵的纹路才第一次合上。",
      "图书馆的长夜没有尽头。但有一页，你终于看懂了。",
      "你失败了十七次。第十八次，指尖有了一点温度。",
    ],
  },
  {
    re: /冒险|委托|讨伐|魔物|护送|公会|迷宫|探索|狩猎/,
    tier: "adventure",
    gain: 16,
    stat: "fame",
    statGain: 4,
    energyCost: 22,
    goal: 3,
    lines: [
      "委托比你预想的麻烦，报酬比你预想的少。",
      "回程路上你想：所谓冒险，大半是在走路和等。",
      "公会的柜台小姐收走委托单，盖了一个很小的章。",
    ],
  },
  {
    re: /买|卖|经商|开店|面包|店铺|收入|交易|摆摊|赚钱/,
    stat: "wealth",
    statGain: 60,
    energyCost: 14,
    goal: 2,
    lines: ["账本上的数字第一次朝好的方向动了一点。", "你学着把话说得客气，把价压得实在。", "生意不好不坏，但够撑到下个月。"],
  },
  {
    re: /结交|朋友|酒馆|宴会|拜访|聊天|人脉|社交/,
    stat: "charm",
    statGain: 4,
    energyCost: 12,
    star: 1,
    goal: 2,
    lines: ["你在酒馆坐到很晚。有人记住了你的名字。", "你学会在别人开口之前，先听。", "这顿酒花了些钱，换来一个愿意替你说话的人。"],
  },
  {
    re: /陪|照顾|探望|写信|家人|母亲|父亲|妹妹|家/,
    stat: "charm",
    statGain: 3,
    energyCost: 10,
    star: 1,
    goal: 3,
    lines: ["你陪家人待了整整一天。没有人提正事。", "你把想说的话写成信，寄了出去。", "你忽然发现，他们的白发比你记忆里多了。"],
  },
  {
    re: /祈祷|教会|米里斯|神父|弥撒|信仰/,
    stat: "faith",
    statGain: 6,
    energyCost: 10,
    lines: ["你跪在冷石板上，心里想的其实是别的事。", "神父说，米里斯看着你。你没有回答。", "信仰不能当饭吃。但它能让人熬过某些夜。"],
  },
  {
    re: /锻炼|跑步|劳作|干活|修行身体|健康/,
    stat: "health",
    statGain: 4,
    energyCost: 14,
    lines: ["你出了一身汗。身体比昨天听话一点。", "你开始规律地活动。至少这个月，你没有病倒。"],
  },
  {
    re: /求医|看病|吃药|医生|疗伤/,
    stat: "health",
    statGain: 10,
    energyCost: 8,
    lines: ["医生看了很久，最后只开了一副贵得离谱的药。", "你按医嘱静养。有些地方不好，但也没有更坏。"],
  },
  {
    re: /打听|传闻|情报|调查|消息/,
    stat: "scheme",
    statGain: 5,
    energyCost: 8,
    lines: ["你在不同的酒馆问了同一个问题，得到三个答案。", "你拼起一些碎片。它们还连不成图。", "有人不愿多说。这本身就是有用的信息。"],
  },
  {
    re: /旅行|前往|出发|离开|启程|上路|搬迁/,
    stat: "fame",
    statGain: 3,
    energyCost: 20,
    goal: 2,
    lines: ["路比你想象的远，人比你想象的冷。", "你在某个岔路口停下，回头看了一眼来处。", "新地方的风是陌生的。但天空是一样的。"],
  },
  {
    re: /爱|告白|结婚|求婚|喜欢|思念|成婚/,
    stat: "charm",
    statGain: 5,
    energyCost: 12,
    goal: 4,
    star: 1,
    lines: ["你把想说的话咽了回去，改说了一句天气。", "有些话一旦说出口，两个人的关系就回不去了。", "你想了很久，最后什么也没写，把那封信烧了。"],
  },
  {
    re: /人神|低语|梦境|建议/,
    energyCost: 6,
    lines: [
      "那个声音又在建议你。它每一句都对，正因如此才可怕。",
      "你问它代价是什么。它没有回答，只是笑了笑。",
      "你开始记下每一次「建议」，想找出规律。你什么也没找到。",
    ],
  },
  {
    re: /龙神|奥尔斯帝德|轮回/,
    energyCost: 6,
    lines: [
      "你没有见到龙神。你只是听说了那个名字，然后失眠了一整晚。",
      "如果真有轮回者，他会怎么看待你的选择？你不知道。",
      "你把这个念头压了下去。它太重了。",
    ],
  },
  {
    re: /诅咒|血脉|恶魔之枪|契约/,
    energyCost: 8,
    lines: [
      "你翻了很多旧书。关于诅咒的记载，都停在「无解」两个字上。",
      "你身上那点说不清的东西又发作了一次。很轻，却提醒你它还在。",
      "契约的条款你读了三遍。第三遍才读出里面藏着的陷阱。",
    ],
  },
  {
    re: /休息|什么都不做|发呆|睡觉|生活|闲/,
    stat: "health",
    statGain: 3,
    energyCost: -30,
    lines: ["你什么都没做。日子就这么过去了一个月。", "你睡了很多觉。醒来时世界还是原样，但你缓过来了。", "你坐在门口看了一下午云。这也算一种生活。"],
  },
];

function resolveRules(text: string): Rule | null {
  for (const r of RULES) if (r.re.test(text)) return r;
  return null;
}

export type ActionBlock = "limit" | "energy" | "requirement";

/**
 * 一次行动。三条通道，彼此不重叠：
 * - 预设命令（command 有值）：完全由本地引擎结算，不消耗 AI 额度
 * - 自由输入 + AI 可用：交给模型推演，并把这一个月标记为「AI 剧情月」
 * - 自由输入 + 未开 AI：退回本地规则表，人生照常推进
 */
export function resolveAction(
  prev: GameState,
  raw: string,
  ai?: AiActionOutcome | null,
  command?: PresetCommand | null,
): { state: GameState; entry: ChronicleEntry; matched: boolean; blocked?: ActionBlock } {
  const text = raw.trim();
  const turn = prev.turn;

  if (prev.deceased) {
    const entry = makeEntry(`a${turn}-end`, prev, "action", "无法行动", ["这一段人生已经结束了。"]);
    return { state: prev, entry, matched: false };
  }

  // 每月行动次数上限：精力再多，一个月也做不完所有事
  const limit = difficultyOf(prev.difficulty).actionsPerMonth;
  if (prev.actionsUsed >= limit) {
    const entry = makeEntry(`a${turn}-limit`, prev, "action", "本月行动已用尽", [
      `「${prev.difficulty}」难度下，一个月最多行动 ${limit} 次。你已经用完了。`,
      "把时间往前推一格。有些事只能等到下个月。",
    ]);
    return { state: { ...prev, log: [entry, ...prev.log].slice(0, 160) }, entry, matched: false, blocked: "limit" };
  }

  // 预设指令的执行条件：能力与身份不到，这件事就做不了。界面会提前拦一次，这里再拦一次
  if (command) {
    const gate = checkCommand(prev, command);
    if (!gate.ok) {
      const entry = makeEntry(`a${turn}-req`, prev, "action", `你的行动 · ${command.label} · 条件不足`, [
        `这件事你现在做不了：${gate.reason}。`,
        "不是不能做，是还没到能做的份上。",
      ]);
      return { state: { ...prev, log: [entry, ...prev.log].slice(0, 160) }, entry, matched: false, blocked: "requirement" };
    }
    // 场合门槛：人不在能这么做的地方，这条指令本来就不该出现在面板上
    if (!commandAvailable(prev, command)) {
      const entry = makeEntry(`a${turn}-place`, prev, "action", `你的行动 · ${command.label} · 处境不符`, [
        `这件事你现在做不了：你不在能这么做的地方。`,
        "地方决定你能做什么。换地方要走「迁居」。",
      ]);
      return { state: { ...prev, log: [entry, ...prev.log].slice(0, 160) }, entry, matched: false, blocked: "requirement" };
    }
  }

  const rule = resolveRules(text);
  const cfg = difficultyOf(prev.difficulty);
  // 精力消耗优先取 AI 的判断（它可以按要求把艰难的行动定得更贵），
  // 预设命令用命令自带的基数，其余才用规则表
  const aiCost = command ? undefined : ai?.energyCost;
  const presetCost = command ? command.cost : (rule?.energyCost ?? 10);
  const baseCost = typeof aiCost === "number" ? clamp(Math.round(aiCost) || 0, 0, LIMITS.actionCost) : presetCost;
  const cost = baseCost > 0 ? Math.max(1, Math.round(baseCost * cfg.actionCostMul)) : baseCost;

  // 精力不足：无收益，也不消耗
  if (cost > 0 && prev.energy < cost) {
    const entry = makeEntry(`a${turn}-tired`, prev, "action", `你的行动 · ${shorten(text)}`, [
      "你的精力已经见底了。这个月你连握紧拳头都觉得费劲。",
      "让时间往前走一点，或者干脆休息一个月。",
    ]);
    return { state: { ...prev, log: [entry, ...prev.log].slice(0, 160) }, entry, matched: false, blocked: "energy" };
  }

  const rng = mulberry32(hash(prev.character.name + text) + turn);
  const ctx: EffectContext = {
    stats: prev.stats.map((s) => ({ ...s })),
    relations: prev.relations.map((r) => ({ ...r })),
    factions: prev.factions.map((f) => ({ ...f })),
    character: prev.character,
    tierProgress: { ...prev.tierProgress },
    goalProgress: prev.goalProgress,
    lifespan: prev.lifespan,
    energy: clamp(prev.energy - cost, 0, 100),
    notices: [...prev.notices],
    skills: [...prev.skills],
    flags: [...(prev.flags ?? [])],
    year: prev.year,
  };
  const lines: string[] = [];
  let matched = false;
  /** 只有真的用了模型，才把这个月标记为 AI 剧情月 */
  let engagedAi = false;
  let outcomeTier: string | undefined;
  /** 预设指令抽中的那一档。它挂了特殊事件时，结算后要跟着翻开 */
  let chosen: PresetOutcome | undefined;

  if (!command && ai?.lines?.length) {
    // AI 推演：叙述与数值都由它给，但全部经 applyEffects 夹取后才落账
    applyEffects(ctx, ai);
    lines.push(...ai.lines.slice(0, 6));
    matched = ai.matched ?? true;
    engagedAi = true;
  } else if (command) {
    // 预设命令：本地引擎按剧情先筛出此刻成立的档，再按三档概率抽一档。
    // 战斗类命令额外吃已学技能的威力：招式越全，越不容易翻车。
    const favor = command.category === "战斗" ? Math.min(30, Math.floor(combatPower(ctx.skills) / 4)) : 0;
    chosen = pickOutcome(command, prev, rng(), favor);
    const gain = cfg.gainMul;
    applyEffects(ctx, scaleEffects(chosen.effects, gain));
    lines.push(...chosen.lines);
    matched = true;
    outcomeTier = chosen.tier;
  } else if (rule) {
    const tierGain = Math.max(1, Math.round(rule.gain! * cfg.gainMul));
    applyEffects(ctx, {
      tier: rule.tier ? { kind: rule.tier, gain: tierGain } : undefined,
      stats: rule.stat ? { [rule.stat]: Math.max(1, Math.round((rule.statGain ?? 2) * cfg.gainMul)) } : undefined,
      goal: Math.max(1, Math.round((rule.goal ?? 2) * cfg.gainMul)),
    });
    if (rule.star) ctx.relations = bumpRelation(ctx.relations, rule.star);
    lines.push(pick(rng, rule.lines));
    matched = true;
  } else {
    lines.push("世界没有特别回应你的举动。它照常运转，像什么都没发生。");
    lines.push("你做的事被记在了你自己的账上，而不是世界的。");
    ctx.goalProgress = clamp(ctx.goalProgress + Math.max(1, Math.round(cfg.gainMul)), 0, 100);
  }

  const entry = makeEntry(
    `a${turn}-${hash(text) % 100000}`,
    prev,
    "action",
    outcomeTier ? `你的行动 · ${command!.label} · ${outcomeTier}` : `你的行动 · ${shorten(text)}`,
    lines,
    ai?.rumor?.trim() || undefined,
  );

  // 特殊事件：这一档结果挂了 triggerEvent 就把它翻开。同一个事件只翻一次，
  // 选项与后果都写在事件自己身上（见 engine/events.ts），事件结算仍走 resolveEvent
  let pendingEvent: GameState["pendingEvent"] = prev.pendingEvent;
  if (chosen?.triggerEvent && !prev.seenEvents.includes(chosen.triggerEvent)) {
    const def = eventById(chosen.triggerEvent);
    if (def) pendingEvent = toPending(def);
  }

  const next = evaluateAchievements({
    ...prev,
    character: ctx.character,
    tierProgress: ctx.tierProgress,
    stats: ctx.stats,
    relations: ctx.relations,
    factions: ctx.factions,
    goalProgress: ctx.goalProgress,
    lifespan: ctx.lifespan,
    energy: ctx.energy,
    notices: ctx.notices,
    skills: ctx.skills,
    flags: ctx.flags,
    threads: applyThreads(prev.threads, ai),
    actionsUsed: prev.actionsUsed + 1,
    customScenes: mergeSceneStash(prev.customScenes, ai?.scenes),
    canon: mergeCanon(prev.canon, ai?.canon),
    aiEngagedTurn: engagedAi ? prev.turn : prev.aiEngagedTurn,
    pendingEvent,
    log: [entry, ...prev.log].slice(0, 160),
  }).state;

  // AI 判定这次行动直接致命（跳崖、硬闯魔物巢穴等）。
  // 走的是与月度推进同一套规则：过不了门槛就不判死，降级成重伤
  if (ai?.fatal?.trim()) {
    const healthValue = next.stats.find((s) => s.key === "health")?.value ?? 100;
    const at: DeathBasis = {
      age: next.character.age,
      lifespan: next.lifespan,
      health: healthValue,
      healthDelta: healthValue - (prev.stats.find((s) => s.key === "health")?.value ?? 100),
      inBattle: command?.category === "战斗",
      supernatural: hasSupernaturalBasis(next.character),
    };
    const verdict = judgeFatal(ai.fatal.trim(), at);
    if (verdict.ok) return { state: die(next, ai.fatal.trim(), verdict), entry, matched };
    entry.lines.push(verdict.reason);
    return { state: { ...next, notices: [...next.notices, `这次险些就过去了。${verdict.reason}`] }, entry, matched };
  }

  // 健康见底同样先托一把，与月度推进一致
  const spared = spareChild(next.character.age, next.stats.find((s) => s.key === "health")?.value ?? 100);
  if (spared.spared) {
    const stats = next.stats.map((s) => (s.key === "health" ? { ...s, value: spared.health } : s));
    return {
      state: {
        ...next,
        stats,
        notices: [...next.notices, `${next.character.name}病得只剩一口气。这一次他挺过来了。`],
      },
      entry,
      matched,
    };
  }

  return { state: next, entry, matched };
}

/* ---------- 抉择事件结算 ---------- */

export function resolveEvent(prev: GameState, optionId: string): { state: GameState; entry: ChronicleEntry } {
  const pending = prev.pendingEvent;
  if (!pending) {
    const entry = makeEntry(`ev-none-${prev.turn}`, prev, "choice", "无事发生", ["此刻并没有需要你抉择的事。"]);
    return { state: prev, entry };
  }
  const def = eventById(pending.id);
  const option: DecisionOption | undefined = pending.options.find((o) => o.id === optionId);
  const defOption = def?.options.find((o) => o.id === optionId);

  const rng = mulberry32(hash(prev.character.name + pending.id + optionId) + prev.turn);

  const ctx: EffectContext = {
    stats: prev.stats.map((s) => ({ ...s })),
    relations: prev.relations.map((r) => ({ ...r })),
    factions: prev.factions.map((f) => ({ ...f })),
    character: prev.character,
    tierProgress: { ...prev.tierProgress },
    goalProgress: prev.goalProgress,
    lifespan: prev.lifespan,
    energy: prev.energy,
    notices: [...prev.notices],
    skills: [...prev.skills],
    flags: [...(prev.flags ?? [])],
    year: prev.year,
  };
  // 内置事件走事件表；AI 推演的事件把叙述与后果直接挂在选项上，两者共用同一套落账逻辑
  const lines: string[] = defOption
    ? [...defOption.lines]
    : option?.lines?.length
      ? [...option.lines]
      : ["你做出了一个决定。"];

  const outcome = defOption?.outcome ?? option?.outcome;
  // 抉择事件是唯一使用放宽上限的地方
  if (outcome) applyEffects(ctx, outcome, EVENT_LIMITS);

  // 高风险选项的代价（受难度影响）
  const cfg = difficultyOf(prev.difficulty);
  if (option?.risk === "高") {
    if (rng() < 0.3) {
      ctx.stats = bumpStat(ctx.stats, "health", -Math.round(28 * cfg.riskMul));
      ctx.lifespan = Math.max(30, ctx.lifespan - 2);
      lines.push("这一次你赌输了。代价来得很直接，身体先替你付了账。");
    } else if (rng() < 0.5) {
      ctx.stats = bumpStat(ctx.stats, "health", -Math.round(10 * cfg.riskMul));
      lines.push("你全身而退，但也付出了一些说不清的代价。");
    }
  }

  const entry = makeEntry(`ev-${pending.id}-${prev.turn}`, prev, "choice", `抉择 · ${pending.title}`, lines, outcome?.rumor);

  let next: GameState = {
    ...prev,
    character: ctx.character,
    stats: ctx.stats,
    relations: ctx.relations,
    factions: ctx.factions,
    tierProgress: ctx.tierProgress,
    goalProgress: ctx.goalProgress,
    lifespan: ctx.lifespan,
    energy: ctx.energy,
    notices: ctx.notices,
    skills: ctx.skills,
    flags: ctx.flags,
    threads: applyThreads(prev.threads, outcome),
    pendingEvent: null,
    seenEvents: [...prev.seenEvents, pending.id],
    log: [entry, ...prev.log].slice(0, 160),
  };

  const health = ctx.stats.find((s) => s.key === "health")?.value ?? 100;
  if (health <= 0) {
    next = die(next, `抉择的代价。${formatYear(prev.year)}，${prev.character.name}在 ${prev.character.age} 岁上没能挺过来。`);
    return { state: next, entry };
  }

  return { state: evaluateAchievements(next).state, entry };
}

/* ---------- AI 剧情月 ---------- */

/**
 * 玩家本月是否自由输入过。只有这种月份才把世界动态交给模型推演；
 * 全程只用预设命令的月份不会产生任何 AI 调用。
 */
export function isAiMonth(s: GameState): boolean {
  return s.aiEngagedTurn === s.turn;
}

/* ---------- 角色对话结算 ---------- */

export interface TalkSettlement {
  /** 跟谁谈的。长期记忆挂在这个人身上 */
  name: string;
  /** 对话要点，作为纪事标题 */
  title: string;
  /** 结算叙述 */
  lines: string[];
  effects: EventEffects | null;
  rumor?: string;
  /** 模型写下的一段记忆，长期保留；缺省时只记次数与时间 */
  memory?: string;
  /** 这次交谈里出现的关键事实 */
  facts?: string[];
}

/**
 * 一段角色对话结束后，由 AI 判定它给现实留下了什么。
 * 与行动结算共用同一套字段与夹取规则：对话占一次行动，也会把这个月标记为 AI 剧情月。
 *
 * 无论有没有数值影响，这个人的长期记忆都会被更新——
 * 「你们谈过几次、上次说了什么」是会一直留在这段关系里的。
 */
export function settleTalk(prev: GameState, settle: TalkSettlement): { state: GameState; entry: ChronicleEntry } {
  const entry = makeEntry(
    `tk-${prev.turn}-${hash(settle.title) % 100000}`,
    prev,
    "action",
    `对话 · ${shorten(settle.title)}`,
    settle.lines.length > 0 ? settle.lines.slice(0, 6) : ["这段交谈留下了痕迹。"],
    settle.rumor?.trim() || undefined,
  );

  const rel = prev.relations.find((r) => r.name === settle.name);
  // 记忆先落账：即使这一步之后因为死亡而提前返回，他也记得你来过
  const remembered = rel
    ? prev.relations.map((r) =>
        r.name === settle.name ? { ...r, memory: rememberTalk(memoryOf(r), prev.turn, settle.memory, settle.facts ?? []) } : r,
      )
    : prev.relations;

  if (prev.deceased || !settle.effects) {
    return { state: { ...prev, relations: remembered, log: [entry, ...prev.log].slice(0, 160) }, entry };
  }
  const ctx: EffectContext = {
    stats: prev.stats.map((s) => ({ ...s })),
    relations: remembered.map((r) => ({ ...r })),
    factions: prev.factions.map((f) => ({ ...f })),
    character: prev.character,
    tierProgress: { ...prev.tierProgress },
    goalProgress: prev.goalProgress,
    lifespan: prev.lifespan,
    energy: prev.energy,
    notices: [...prev.notices],
    skills: [...prev.skills],
    flags: [...(prev.flags ?? [])],
    year: prev.year,
  };
  applyEffects(ctx, settle.effects);
  const state = evaluateAchievements({
    ...prev,
    character: ctx.character,
    stats: ctx.stats,
    relations: ctx.relations,
    factions: ctx.factions,
    tierProgress: ctx.tierProgress,
    goalProgress: ctx.goalProgress,
    lifespan: ctx.lifespan,
    energy: ctx.energy,
    notices: ctx.notices,
    skills: ctx.skills,
    flags: ctx.flags,
    threads: applyThreads(prev.threads, settle.effects),
    actionsUsed: prev.actionsUsed + 1,
    aiEngagedTurn: prev.turn,
    log: [entry, ...prev.log].slice(0, 160),
  }).state;
  return { state, entry };
}

/* ---------- 难度调节 ---------- */

/** 切换难度：按难度差调整剩余寿命上限，并记入纪事。当下状态不受影响，后续演化按新难度计算。 */
export function changeDifficulty(prev: GameState, difficulty: Difficulty): GameState {
  if (prev.deceased || prev.difficulty === difficulty) return prev;
  const from = difficultyOf(prev.difficulty);
  const to = difficultyOf(difficulty);
  const lifespan = Math.max(30, Math.min(99, prev.lifespan + (to.lifespanMod - from.lifespanMod)));
  const entry: ChronicleEntry = makeEntry(
    `diff-${prev.turn}-${hash(difficulty)}`,
    prev,
    "world",
    `难度调整 · ${from.label} → ${to.label}`,
    [
      `你把这个世界的规则调成了「${to.label}」。${to.desc}`,
      "已经发生的事不会改写。往后每一步，都按新的规则来算。",
    ],
  );
  const notices = [...prev.notices, `难度已设为「${to.label}」。`];
  return {
    ...prev,
    difficulty,
    lifespan,
    notices,
    log: [entry, ...prev.log].slice(0, 160),
  };
}

/* ---------- 死亡与结局 ---------- */

/**
 * 收尾：把死亡写进存档。
 * verdict 是判定规则给出的结论，会一并写进终章，让人看得到这次凭什么死得成。
 */
function die(state: GameState, cause: string, verdict?: DeathVerdict): GameState {
  const ending: Ending = {
    year: state.year,
    month: state.month,
    age: state.character.age,
    cause,
    kind: verdict?.kind,
    basis: verdict?.basis,
    epilogue: composeEpilogue(state),
  };
  const entry: ChronicleEntry = {
    id: `end-${state.turn}`,
    year: state.year,
    month: state.month,
    kind: "ending",
    title: "终章 · 这一段人生走到了尽头",
    lines: [cause, verdictLine(verdict?.kind, verdict?.basis), ...ending.epilogue].filter(Boolean),
  };
  const next: GameState = {
    ...state,
    deceased: true,
    deathCause: cause,
    ending,
    pendingEvent: null,
    pendingTalk: null,
    log: [entry, ...state.log].slice(0, 160),
  };
  return evaluateAchievements(next).state;
}

function composeEpilogue(s: GameState): string[] {
  const c = s.character;
  const out: string[] = [];
  out.push(`出身：${c.origin}　｜　最后所在地：${c.residence}　｜　享年 ${c.age} 岁。`);

  const mage = TIER_ORDER.indexOf(c.magicTier);
  const sword = TIER_ORDER.indexOf(c.swordTier);
  const rank = RANK_ORDER.indexOf(c.adventurerRank);
  const careers: string[] = [];
  if (rank >= 6) careers.push(`一位 ${c.adventurerRank} 级冒险者`);
  else if (rank >= 3) careers.push("一个靠委托吃饭的人");
  if (mage >= 4) careers.push(`${c.magicTier}魔术师`);
  else if (mage >= 2) careers.push("会几手魔术的人");
  if (sword >= 4) careers.push(`${c.swordTier}剑士`);
  else if (sword >= 2) careers.push("剑术尚可的人");
  out.push(careers.length > 0 ? `世人记得你，是作为${careers.join("、")}。` : "世人未必记得你。你只是安静地活过。");

  const wealth = s.stats.find((x) => x.key === "wealth")?.value ?? 0;
  const fame = s.stats.find((x) => x.key === "fame")?.value ?? 0;
  out.push(`你留下了 ${wealth} 枚金币，和 ${fame} 点声望。这些数字会被时间很快抹平。`);

  const closest = [...s.relations].sort((a, b) => b.stars - a.stars)[0];
  if (closest) {
    out.push(
      closest.stars >= 4
        ? `你身边始终有「${closest.name}」。在你所有的账目里，这是唯一划算的一笔。`
        : `到最后，「${closest.name}」也没有真正走近你。你们之间隔着一层说不清的东西。`,
    );
  }

  const goalDone = s.goalProgress >= 100;
  out.push(
    goalDone
      ? `你最初想做的事——「${c.goal}」——做到了。`
      : `你最初想做的事是「${c.goal}」。这件事只完成了一半多一点（${Math.round(s.goalProgress)}%）。`,
  );

  out.push(`这一段人生里，你解锁了 ${s.achievements.length} 项成就。`);
  out.push("六面世界还在继续。人神的棋局没有停，龙神的轮回还在往前走。");
  return out;
}

/* ---------- 强制自检（每 15 轮） ---------- */

/** AI 自撰快照：结构由引擎固定，内容由模型填写 */
function aiSelfCheck(s: GameState, content: { snapshot: string[]; ooc: string[] }): ChronicleEntry {
  const fallback = selfCheck(s);
  return {
    id: `check-${s.turn}`,
    year: s.year,
    month: s.month,
    kind: "world",
    title: `第 ${s.turn} 轮 · AI 自检（剧情快照）`,
    lines: [
      ...(content.snapshot.length > 0 ? content.snapshot : fallback.lines.slice(0, 5)),
      ...(content.ooc.length > 0 ? content.ooc : fallback.lines.slice(5, 7)),
      "自检完毕。系统等待你的指令，不续写剧情。",
    ],
  };
}

function selfCheck(s: GameState): ChronicleEntry {
  return {
    id: `check-${s.turn}`,
    year: s.year,
    month: s.month,
    kind: "world",
    title: `第 ${s.turn} 轮 · AI 自检（剧情快照）`,
    lines: [
      `【时间】${formatDate(s.year, s.month)}　【地点】${s.character.residence}`,
      `【玩家】${s.character.name}　${s.character.age} 岁　${s.character.status}　魔术：${s.character.magicTier}　剑术：${s.character.swordTier}　冒险者：${s.character.adventurerRank}`,
      `【当前目标】${s.character.goal}　（进度 ${Math.round(s.goalProgress)}%）　【情感倾向】${s.character.emotion}`,
      `【人神关注】${s.threads.humanGod}`,
      `【龙神关注】${s.threads.dragonGod}`,
      "【OOC 自检】人物行为是否偏离设定：未发现　｜　世界规则是否被破坏：未发现　｜　历史时间线是否有误：未发现",
      "【OOC 自检】玩家信息是否被提前泄露：未发现　｜　魔术规则是否被破坏：未发现　｜　情感逻辑是否断裂：未发现",
      "自检完毕。系统等待你的指令，不续写剧情。",
    ],
  };
}

/* ---------- 小工具 ---------- */

function shorten(text: string): string {
  return text.length > 24 ? `${text.slice(0, 24)}…` : text;
}

function makeEntry(
  id: string,
  s: GameState,
  kind: ChronicleEntry["kind"],
  title: string,
  lines: string[],
  rumor?: string,
): ChronicleEntry {
  return { id, year: s.year, month: s.month, kind, title, lines, rumor };
}

/* ---------- 导入导出 ---------- */

/**
 * 存档里的场景增量：逐字段校验，坏数据直接丢掉。
 * 效果数值刻意不在这里夹取——它会在结算时经过 applyEffects，边界只有一个控制点。
 */
function sanitizeSceneStash(raw: unknown): SceneStash {
  if (!raw || typeof raw !== "object") return emptySceneStash();
  const src = raw as Partial<SceneStash>;
  const scenes: CustomScene[] = Array.isArray(src.scenes)
    ? src.scenes
        .filter(
          (s): s is CustomScene =>
            Boolean(s) && typeof s.id === "string" && typeof s.name === "string" && s.name.trim() !== "",
        )
        .map((s) => ({
          id: s.id,
          name: s.name.trim().slice(0, 12),
          desc: typeof s.desc === "string" && s.desc.trim() ? s.desc.trim().slice(0, 80) : "这一段人生里新出现的地方。",
        }))
    : [];

  const byScene: Record<string, CustomCommand[]> = {};
  if (src.byScene && typeof src.byScene === "object") {
    for (const [sceneId, list] of Object.entries(src.byScene)) {
      if (!Array.isArray(list)) continue;
      const clean = list
        .filter(
          (c): c is CustomCommand =>
            Boolean(c) && typeof c.id === "string" && typeof c.label === "string" && c.label.trim() !== "",
        )
        .map((c) => ({
          id: c.id,
          label: c.label.trim().slice(0, 24),
          category: CATEGORY_ORDER.includes(c.category) ? c.category : ("探索" as CustomCommand["category"]),
          cost: clamp(Math.round(Number(c.cost) || 0), -30, 30),
          hint: typeof c.hint === "string" ? c.hint.trim().slice(0, 60) : "",
          lines: Array.isArray(c.lines)
            ? c.lines.filter((l): l is string => typeof l === "string" && l.trim() !== "").slice(0, 4)
            : [],
          effects: (c.effects && typeof c.effects === "object" ? c.effects : {}) as EventEffects,
        }))
        .filter((c) => c.lines.length > 0);
      if (clean.length > 0) byScene[sceneId] = clean;
    }
  }
  return { scenes, byScene };
}

/** 补齐旧版或缺失字段，避免载入后出现 NaN 或运行时崩溃 */
export function normalizeState(raw: GameState): GameState {
  // 补齐上游字段，后面的年鉴回填要用到 birthYear 与 year
  const birthYear = typeof raw.birthYear === "number" ? raw.birthYear : raw.year - 20;
  const scratch: GameState = { ...raw, birthYear, log: Array.isArray(raw.log) ? raw.log : [] };
  const yearbooks = Array.isArray(raw.yearbooks) && raw.yearbooks.length > 0
    ? raw.yearbooks
    : backfillYearbooks(scratch);
  // 旧存档的「天赋」是单选字符串，载入时升级成数组
  const legacyTalent = (raw.character as { talent?: string } | undefined)?.talent;
  const talents = Array.isArray(raw.character?.talents)
    ? raw.character.talents
    : legacyTalent
      ? [legacyTalent]
      : ["无"];

  return {
    ...raw,
    character: raw.character ? { ...raw.character, talents } : raw.character,
    energy: typeof raw.energy === "number" ? raw.energy : 100,
    actionsUsed: typeof raw.actionsUsed === "number" ? raw.actionsUsed : 0,
    lifespan: typeof raw.lifespan === "number" ? raw.lifespan : 70,
    difficulty: raw.difficulty ?? "标准",
    goalProgress: typeof raw.goalProgress === "number" ? raw.goalProgress : 0,
    tierProgress: raw.tierProgress ?? { magic: 0, sword: 0, adventure: 0 },
    stats: Array.isArray(raw.stats) ? raw.stats : [],
    // 旧存档里的关系没有 bond，载入时按身份补上，关系网才有分组；
    // 也没有出生年，按现在的年份补一次，年龄从这一刻起随年份长。
    // place 不在这里补：旧档里的人本来就没有落脚地，硬派一个会凭空切断联系
    relations: Array.isArray(raw.relations)
      ? raw.relations.map((r) =>
          withBirthYear(
            {
              ...r,
              bond: r.bond ?? inferBond(r.name, r.role),
              memory: sanitizeMemory(r.memory),
              place: typeof r.place === "string" && r.place.trim() ? r.place.trim() : undefined,
              follows: typeof r.follows === "boolean" ? r.follows : undefined,
            },
            raw.year,
          ),
        )
      : [],
    factions: Array.isArray(raw.factions) ? raw.factions : [],
    log: Array.isArray(raw.log) ? raw.log : [],
    yearbooks,
    // 家庭状态：旧存档没有就从关系里数一遍
    family: {
      children:
        typeof raw.family?.children === "number"
          ? Math.max(0, Math.round(raw.family.children))
          : (Array.isArray(raw.relations) ? raw.relations.filter((r) => r.family?.kind === "子女").length : 0),
      npcBirths:
        typeof raw.family?.npcBirths === "number" ? Math.max(0, Math.round(raw.family.npcBirths)) : 0,
      lastBirthYear:
        typeof raw.family?.lastBirthYear === "number" ? Math.max(0, Math.round(raw.family.lastBirthYear)) : undefined,
      npcLastBirthYear:
        typeof raw.family?.npcLastBirthYear === "number"
          ? Math.max(0, Math.round(raw.family.npcLastBirthYear))
          : undefined,
      npcCoupleBirths:
        raw.family?.npcCoupleBirths && typeof raw.family.npcCoupleBirths === "object"
          ? Object.fromEntries(
              Object.entries(raw.family.npcCoupleBirths)
                .filter(([k, v]) => typeof k === "string" && typeof v === "number" && Number.isFinite(v))
                .map(([k, v]) => [k, Math.max(0, Math.round(v as number))]),
            )
          : undefined,
    },
    notices: Array.isArray(raw.notices) ? raw.notices : [],
    achievements: Array.isArray(raw.achievements) ? raw.achievements : [],
    seenEvents: Array.isArray(raw.seenEvents) ? raw.seenEvents : [],
    lastEventTurn: typeof raw.lastEventTurn === "number" ? raw.lastEventTurn : -99,
    aiEngagedTurn: typeof raw.aiEngagedTurn === "number" ? raw.aiEngagedTurn : -1,
    // 只保留还存在的技能 id，避免旧存档里的失效引用混进来
    skills: Array.isArray(raw.skills) ? raw.skills.filter((id): id is string => typeof id === "string" && Boolean(skillById(id))) : [],
    // 剧情标记与存档级场景：旧存档没有就补空，不改变既有内容
    flags: Array.isArray(raw.flags) ? raw.flags.filter((f): f is string => typeof f === "string" && Boolean(f.trim())) : [],
    customScenes: sanitizeSceneStash(raw.customScenes),
    canon: Array.isArray(raw.canon) ? raw.canon.filter((c): c is string => typeof c === "string").slice(-CANON_LIMIT) : [],
    pendingEvent: raw.pendingEvent ?? null,
    pendingTalk: raw.pendingTalk ?? null,
    deceased: Boolean(raw.deceased),
  };
}

export function parseSaveText(text: string): GameState | null {
  try {
    const parsed = JSON.parse(text) as { state?: GameState } & Partial<GameState>;
    const state = (parsed.state ?? parsed) as GameState;
    if (!state?.character?.name) return null;
    return normalizeState(state);
  } catch {
    return null;
  }
}

export function exportSaveText(state: GameState): string {
  return JSON.stringify({ version: 1, savedAt: new Date().toISOString(), state }, null, 2);
}