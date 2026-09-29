import type { CanonHook, CanonTie, GameState, Relation, RelationBond } from "../types";
import { CANON_TIES } from "./canonTies";
import { CANON_HOOKS } from "./canonHooks";
import { CANON_SEEDS } from "./canonRoster";
import { withBirthYear } from "../engine/age";

/**
 * 原作人物名录。
 *
 * 依据《无职转生》原作（含项目内规则手册）整理，只收录可以在原作中点名的角色。
 * 每个人物都写明所属、身份、关系性质、初遇条件与可亲授的招式：
 * - 玩家不是鲁迪乌斯，所以这些人是「世界里的人」，不是玩家的附属。条件不满足时他们不会出现。
 * - 关系一旦建立就进入关系面板，与 AI 推演共用同一套关系网。
 * - 「高级技能只能由特殊事件或强大角色授予」这条规则的落点就在这里：
 *   grants 里的招式只能从对应人物身上拿到，练不出来。
 *
 * 名录分成三层，避免一个文件无限膨胀：
 * - 本文件：schema、初遇条件、开局一批最要紧的人物（CANON_CORE）。
 * - canonRoster.ts：其余上百位人物，用简写构造器写成 CANON_SEEDS。
 * - canonTies.ts / canonHooks.ts：人物之间的关系、以及各自的剧本参与，按名字挂表。
 *
 * 名录的用途有四处：开局的初始关系、每月推进时的新遇合、人物之间的关系网、AI 提示词里的原作参照。
 */

export interface CanonCharacter {
  /** 省略时等于 name */
  id?: string;
  name: string;
  /** 所属：王国、教团、流派或势力 */
  faction: string;
  /** 身份，作为关系面板里的 role */
  role: string;
  bond: RelationBond;
  /** 初遇时的起步好感，1 到 5 */
  stars: number;
  note: string;
  secret?: string;
  /** 此人能亲授的技能 id（见 src/data/skills.ts） */
  grants?: string[];
  /** 原作考据备注，用于关系面板与 AI 提示词 */
  lore: string;
  /** 与其他原作人物的关系，用于关系网中的人物间连线 */
  ties?: CanonTie[];
  /** 此人在剧本里登场的方式 */
  hook?: CanonHook;
  /** 初遇条件。玩家的人生走到这里，才会遇到这个人 */
  when: (s: GameState) => boolean;
  /**
   * 最早可能遇见的年份（甲龙历）。这是时间线上的硬门槛，与 when 分开写：
   * when 管「什么处境、什么身份、在什么地方」，since 只管「时候到了没有」。
   * 考据里写明年份的就照写；写不清的留空，由地点与声名去管。
   */
  since?: number;
  /** 考据里明确的驻地。填了就以它为准，见 homeOf */
  home?: string;
  /** 扩充条目用的地点条件，只用来推断驻地 */
  whereKeys?: WhereKey[];
}

/** 扩充名录的条目：条件写成数据而不是闭包，上百条也不会互相看不清 */
export interface CanonSeed {
  id?: string;
  name: string;
  faction: string;
  role: string;
  bond: RelationBond;
  stars: number;
  note: string;
  secret?: string;
  grants?: string[];
  lore: string;
  where?: WhereKey[];
  /** 声名门槛 */
  fame?: number;
  /** 最早出现的年份。甲龙历 */
  year?: number;
  /** 神话与远古就存在的人物，不受时代限制 */
  ageless?: boolean;
  /** 考据里明确的驻地。填了就以它为准，见 homeOf */
  home?: string;
}

const statOf = (s: GameState, key: string) => s.stats.find((x) => x.key === key)?.value ?? 0;
const has = (s: GameState, key: string, need: number) => statOf(s, key) >= need;
/** 鲁迪乌斯时代与战后时代共享同一批在世人物 */
const isRudyEra = (s: GameState) => s.character.era === "鲁迪乌斯时代" || s.character.era === "战后时代";

/**
 * 所在地判定一律看「人现在在哪儿」，不看创建时选的志向。
 *
 * 这条是硬规矩：`college === "拉诺亚魔法大学"` 或 `swordSchool === "剑神流"` 只说明这个人
 * 将来会进那所大学、会练那门流派，不代表他现在就站在讲堂里、站在道场上。
 * 早先按志向判定，结果是七岁的鲁迪乌斯在布耶纳村的院子里就认识了魔法大学与剑之圣地那一整批人。
 */
const atResidence = (s: GameState, ...places: string[]) => places.includes(s.character.residence);
/** 菲托亚领：村子与首府，两个地方挨着，但人是分得开的 */
const inFittoa = (s: GameState) => atResidence(s, "布耶纳村", "罗亚町");
const inBuena = (s: GameState) => atResidence(s, "布耶纳村");
const inRoa = (s: GameState) => atResidence(s, "罗亚町");
/** 阿斯拉王国的王都。贵族圈与王宫都在这里，和乡下不是一回事 */
const inAsura = (s: GameState) => atResidence(s, "王都亚尔斯");
const atCollege = (s: GameState) => atResidence(s, "魔法都市夏利亚");
const atSanctuary = (s: GameState) => atResidence(s, "剑之圣地");
const inMirees = (s: GameState) => atResidence(s, "米里希昂");
const inDemon = (s: GameState) => atResidence(s, "米格路德族之村");
const inLapan = (s: GameState) => atResidence(s, "迷宫都市拉潘");
const inShillon = (s: GameState) => atResidence(s, "西隆王国");
const inRanoah = (s: GameState) => atResidence(s, "拉诺亚王国");
const inSky = (s: GameState) => atResidence(s, "天空之城");
const swordAt = (s: GameState, tiers: string[]) => tiers.includes(s.character.swordTier);
const rankAt = (s: GameState, ranks: string[]) => ranks.includes(s.character.adventurerRank);
const HIGH = ["圣级", "王级", "帝级", "神级"];

/**
 * 扩充名录里用的地点与身份条件。写成字符串而不是闭包，
 * 是为了让上百条人物数据能一眼看清门槛，也方便对照原作考据核对。
 */
export type WhereKey =
  | "菲托亚"
  | "罗亚"
  | "布耶纳村"
  | "阿斯拉"
  | "王都亚尔斯"
  | "魔法大学"
  | "夏利亚"
  | "剑之圣地"
  | "米里斯"
  | "米里希昂"
  | "魔大陆"
  | "米格路德村"
  | "迷宫都市拉潘"
  | "西隆王国"
  | "拉诺亚"
  | "天空之城"
  | "贵族"
  | "兽族"
  | "魔族"
  | "米里斯教徒"
  | "冒险者"
  | "剑士"
  | "魔术"
  | "被召唤者";

const WHERE: Record<WhereKey, (s: GameState) => boolean> = {
  菲托亚: inFittoa,
  罗亚: inRoa,
  布耶纳村: inBuena,
  阿斯拉: inAsura,
  王都亚尔斯: inAsura,
  魔法大学: atCollege,
  夏利亚: atCollege,
  剑之圣地: atSanctuary,
  米里斯: inMirees,
  米里希昂: inMirees,
  魔大陆: inDemon,
  米格路德村: inDemon,
  迷宫都市拉潘: inLapan,
  西隆王国: inShillon,
  拉诺亚: inRanoah,
  天空之城: inSky,
  贵族: (s) => s.character.originGroup === "noble",
  兽族: (s) => s.character.originGroup === "beast",
  魔族: (s) => s.character.originGroup === "demon",
  米里斯教徒: (s) => s.character.originGroup === "mirees" || s.character.faith === "米里斯教团",
  冒险者: (s) => s.character.adventurerRank !== "未注册",
  剑士: (s) => s.character.swordSchool !== "无",
  魔术: (s) => s.character.magicTier !== "未觉醒",
  被召唤者: (s) => s.character.origin === "被召唤者" || s.character.status === "被召唤者",
};

/**
 * 地点类条件各自对应哪一个所在地。
 * 用来给遇见的人安一个落脚地：你在夏利亚遇上的人，人就在夏利亚，
 * 而不是被记成「在布耶纳村」。区域类的条件（菲托亚、阿斯拉）没有单一地点，
 * 落到玩家当前所在地即可——既然在那个区域里遇见，他就在那一带。
 */
const WHERE_PLACE: Partial<Record<WhereKey, string>> = {
  罗亚: "罗亚町",
  布耶纳村: "布耶纳村",
  王都亚尔斯: "王都亚尔斯",
  魔法大学: "魔法都市夏利亚",
  夏利亚: "魔法都市夏利亚",
  剑之圣地: "剑之圣地",
  米里斯: "米里希昂",
  米里希昂: "米里希昂",
  魔大陆: "米格路德族之村",
  米格路德村: "米格路德族之村",
  迷宫都市拉潘: "迷宫都市拉潘",
  西隆王国: "西隆王国",
  拉诺亚: "拉诺亚王国",
  天空之城: "天空之城",
};

/**
 * 这个人该落在哪个地方。
 * 优先用写死的 home（考据里有明确驻地的那些），其次从 where 里挑一个地点类条件，
 * 都没有就退到玩家此刻所在的地方。
 */
export function homeOf(c: CanonCharacter, fallback: string): string {
  if (c.home) return c.home;
  for (const key of c.whereKeys ?? []) {
    const place = WHERE_PLACE[key];
    if (place) return place;
  }
  return fallback;
}

/** 扩充条目自身的门槛：时代、声名与地点。年份由 since 统一管 */
function seedGate(c: CanonSeed, s: GameState): boolean {
  if (!c.ageless && !isRudyEra(s)) return false;
  if (c.fame !== undefined && statOf(s, "fame") < c.fame) return false;
  if (c.where && c.where.length > 0 && !c.where.some((k) => WHERE[k](s))) return false;
  return true;
}

function expandSeeds(seeds: CanonSeed[]): CanonCharacter[] {
  return seeds.map((seed) => ({
    ...seed,
    id: seed.id ?? seed.name,
    since: seed.year,
    whereKeys: seed.where,
    when: (s: GameState) => seedGate(seed, s),
  }));
}

/** 开局一批最要紧的人物。条件与招式写在这里，其余人物见 canonRoster.ts */
const CANON_CORE: CanonCharacter[] = [
  /* ---------- 格雷拉特家与菲托亚领 ---------- */
  {
    id: "paul",
    name: "保罗·格雷拉特",
    faction: "阿斯拉王国 · 菲托亚领",
    role: "驻在骑士",
    bond: "熟人",
    stars: 3,
    note: "他教你握剑的姿势，也教你什么时候不该出剑。他看人的眼光比他自己承认的准。",
    secret: "他是伯雷亚斯家的嫡子，因为一个女人被逐出了家门。",
    lore: "保罗·格雷拉特，伯雷亚斯·格雷拉特家嫡子，曾任 S 级冒险者队伍「黑狼之牙」队长，剑神流、水神流、北神流三派均修至上级。因与女仆莉莉娅的关系被逐出家门，后在菲托亚领布耶纳村任驻在骑士。甲龙历 422 年，他在拯救塞妮丝的转移迷宫战役中战死，这是不可改变的锚点。",
    grants: ["tk_cloak", "ng_adapt"],
    // 布耶纳村的驻在骑士。人在罗亚是遇不上他的
    home: "布耶纳村",
    when: (s) => isRudyEra(s) && inBuena(s),
  },
  {
    id: "zenith",
    name: "塞妮丝·格雷拉特",
    faction: "阿斯拉王国 · 菲托亚领",
    role: "治癒魔术师",
    bond: "熟人",
    stars: 4,
    note: "她会给你处理伤口，一边处理一边数落你不爱惜自己。",
    lore: "塞妮丝·格雷拉特，「黑狼之牙」的治疗师，嫁给保罗后定居布耶纳村。菲托亚领转移事件中与诺伦一同被转移，后在转移迷宫中失去意识，长年不醒。",
    grants: ["mg_healing"],
    home: "布耶纳村",
    when: (s) => isRudyEra(s) && inBuena(s),
  },
  {
    id: "lilia",
    name: "莉莉娅",
    faction: "格雷拉特家",
    role: "女仆",
    bond: "熟人",
    stars: 2,
    note: "她把家里的一切都收得整整齐齐，包括不该被你看见的那部分。",
    secret: "她曾是西隆王国的宫廷剑士，因故沦为奴隶。",
    lore: "莉莉娅，格雷拉特家的女仆，原为西隆王国宫廷剑士，后成为奴隶，被保罗买下。她与保罗生下女儿爱夏。",
    home: "布耶纳村",
    when: (s) => isRudyEra(s) && inBuena(s),
  },
  {
    id: "aisha",
    name: "爱夏·格雷拉特",
    faction: "格雷拉特家",
    role: "莉莉娅之女",
    bond: "熟人",
    stars: 3,
    note: "她学什么都快，快得让大人有点不安。",
    lore: "爱夏·格雷拉特，保罗与莉莉娅之女，鲁迪乌斯同父异母的妹妹。头脑极好，善于处理实务与人心。",
    home: "布耶纳村",
    when: (s) => isRudyEra(s) && inBuena(s) && s.character.age >= 16,
  },
  {
    id: "norn",
    name: "诺伦·格雷拉特",
    faction: "格雷拉特家",
    role: "保罗与塞妮丝之女",
    bond: "熟人",
    stars: 2,
    note: "她一直在等一个人回来，自己也知道等不到。",
    lore: "诺伦·格雷拉特，保罗与塞妮丝之女。转移事件中与母亲一同被转移，此后长期活在兄长的阴影与自己的愧疚里。",
    home: "布耶纳村",
    when: (s) => isRudyEra(s) && inBuena(s) && s.character.age >= 18,
  },
  {
    id: "sauros",
    name: "绍罗斯·伯雷亚斯·格雷拉特",
    faction: "阿斯拉王国 · 四大上级贵族",
    role: "菲托亚领领主",
    bond: "熟人",
    stars: 2,
    note: "他谈领地、税赋与联姻，谈得像在算一笔已经算过很多遍的账。",
    lore: "绍罗斯·伯雷亚斯·格雷拉特，四大上级贵族之首伯雷亚斯家的家主，统治菲托亚领，首府罗亚。艾莉丝的祖父。",
    home: "罗亚町",
    when: (s) => isRudyEra(s) && inRoa(s) && (s.character.originGroup === "noble" || has(s, "fame", 45)),
  },
  {
    id: "philip",
    name: "菲莉普·伯雷亚斯·格雷拉特",
    faction: "阿斯拉王国 · 伯雷亚斯家",
    role: "伯雷亚斯家嫡子",
    bond: "熟人",
    stars: 3,
    note: "他待人客气得过分，客气到你会开始回想自己刚才说了什么。",
    lore: "菲莉普·伯雷亚斯·格雷拉特，绍罗斯之子，艾莉丝的父亲。他善于经营人脉，也善于把女儿当成筹码，对这一点他并不完全心安。",
    home: "罗亚町",
    when: (s) => isRudyEra(s) && inRoa(s) && s.character.originGroup === "noble",
  },
  {
    id: "eris",
    name: "艾莉丝·伯雷亚斯·格雷拉特",
    faction: "阿斯拉王国 · 伯雷亚斯家",
    role: "伯雷亚斯家千金",
    bond: "挚友",
    stars: 3,
    note: "她出手比说话快。被她打过的院子，第二天还会有人去数那些剑痕。",
    secret: "她讨厌读书，却会为了一个人把字一个个认下来。",
    lore: "艾莉丝·伯雷亚斯·格雷拉特，菲托亚领首府罗亚领主之女，红发，性情凶暴，剑术天赋出众。剑神流，后由剑神加尔·法利昂亲自指点。转移事件中与鲁迪乌斯一同被抛到魔大陆。",
    grants: ["sg_wrist_drop"],
    // 罗亚领主之女。要见到她，人得在罗亚；年份下限取她与鲁迪乌斯同岁这一点
    home: "罗亚町",
    since: 414,
    when: (s) => isRudyEra(s) && inRoa(s),
  },
  {
    id: "ghislaine",
    name: "基列奴·泰德路迪亚",
    faction: "剑之圣地 · 伯雷亚斯家",
    role: "剑王 · 护卫",
    bond: "师门",
    stars: 3,
    note: "她几乎不说话。她示范一遍，你做不到，她就再示范一遍。",
    lore: "基列奴·泰德路迪亚，兽族泰德路迪亚族出身，兽神直系后裔，剑神加尔·法利昂门下，剑王级剑士，曾任艾莉丝的护卫与剑术师范。左手因旧伤而发达，靠魔力弥补。",
    grants: ["tk_cloak", "sg_wrist_drop"],
    // 艾莉丝的护卫。跟着主家在罗亚，或在剑之圣地的本山
    home: "罗亚町",
    since: 414,
    when: (s) => isRudyEra(s) && (inRoa(s) || atSanctuary(s)),
  },

  /* ---------- 布耶纳村与近邻 ---------- */
  {
    id: "roxy",
    name: "洛琪希·米格路迪亚",
    faction: "魔大陆 · 米格路德族",
    role: "水圣级魔术师",
    bond: "师门",
    stars: 4,
    note: "她个子小，声音也轻，但讲起魔术来一句多余的都没有。",
    secret: "她离开部族，是因为族人不会长高、也不会变老这件事，让她成了异类。",
    lore: "洛琪希·米格路迪亚，米格路德族，水系统圣级魔术师，鲁迪乌斯的第一位魔术师父。甲龙历 373 年生。她曾被人神设计感染魔石病，于甲龙历 424 至 427 年间死去——这是不可改变的锚点。",
    grants: ["mg_waterfall", "mg_ice_field"],
    when: (s) => isRudyEra(s) && (inFittoa(s) || atCollege(s)),
  },
  {
    id: "sylphie",
    name: "希露菲叶特",
    faction: "布耶纳村",
    role: "长耳族少女",
    bond: "挚友",
    stars: 4,
    note: "她被人欺负的时候不出声，学会魔术之后就再没有被人欺负过。",
    secret: "她分不清自己身上流的是哪一族的长耳，也一直不敢去问。",
    lore: "希露菲叶特，长耳族（精灵）混血，布耶纳村的鲁迪乌斯幼驯染，鲁迪乌斯的第一个朋友与第一个学生。转移事件中头发由绿转白。后在阿斯拉王宫成为第二王女爱丽儿的护卫，化名「菲兹」。",
    grants: ["mg_air_burst"],
    when: (s) => isRudyEra(s) && inFittoa(s),
  },

  /* ---------- 黑狼之牙 ------------------ */
  {
    id: "gies",
    name: "基斯·努卡迪亚",
    faction: "冒险者",
    role: "情报屋",
    bond: "熟人",
    stars: 2,
    note: "他什么都能聊，什么都聊得恰到好处——恰到好处得让你事后回想。",
    secret: "他是人神的暗子。这件事在奥尔斯帝德的每一次轮回里都没有被察觉。",
    lore: "基斯·努卡迪亚，「黑狼之牙」成员，不善武，专长情报、探索与交涉。他极度擅长隐藏自己，是人神的核心暗子，也是龙神无数轮回失败的直接原因之一。",
    // 四处跑的情报屋，没有固定驻地
    when: (s) => isRudyEra(s) && (has(s, "fame", 25) || rankAt(s, ["D", "C", "B", "A", "S"])),
  },
  {
    id: "talhand",
    name: "塔尔韩德",
    faction: "黑狼之牙（已解散）",
    role: "矿坑族魔术师",
    bond: "熟人",
    stars: 2,
    note: "他穿着比谁都厚的铠甲，理由是自己跑得太慢。",
    lore: "塔尔韩德，矿坑族出身，因专注于魔术而被同族轻视。「黑狼之牙」成员。队伍散伙后重新单干，转移事件后与洛琪希、艾莉娜丽洁同行，寻访失踪者。",
    grants: ["mg_mud_swamp"],
    when: (s) => isRudyEra(s) && (inDemon(s) || inAsura(s)) && has(s, "fame", 15),
  },
  {
    id: "elinalise",
    name: "艾莉娜丽洁·多拉贡罗德",
    faction: "黑狼之牙（已解散）",
    role: "长耳族剑士",
    bond: "熟人",
    stars: 2,
    note: "她说话直白，直白到你怀疑她在替你省力气。",
    secret: "她身上的诅咒让她必须汲取他人的魔力，她把这当成一辈子的事扛了下来。",
    lore: "艾莉娜丽洁·多拉贡罗德，长耳族，「黑狼之牙」成员，以细剑与盾战法为长。年轻时与保罗一行结伴，后因队伍解散决裂，转而在贝卡利特大陆的迷宫都市与保罗重逢并和解。嫁给克里夫·格利摩尔。",
    grants: ["ng_field_medic"],
    when: (s) => isRudyEra(s) && (rankAt(s, ["C", "B", "A", "S"]) || s.character.residence === "迷宫都市拉潘"),
  },
  {
    id: "ruijerd",
    name: "瑞杰路德·斯佩路迪亚",
    faction: "斯佩路德族",
    role: "斯佩路德族战士",
    bond: "同僚",
    stars: 3,
    note: "他额上有一颗红宝石。他递给你东西的时候，总是先把刀放下。",
    secret: "他背着一族被恶魔之枪牵连的罪名，正在替被诅咒的后代找一条活路。",
    lore: "瑞杰路德·斯佩路德族战士，因恶魔之枪的诅咒而被世人恐惧，绰号「Dead End（出会えば死）」。他护送过被抛到魔大陆的鲁迪乌斯与艾莉丝。",
    grants: ["ng_adapt", "tk_cloak"],
    // 魔大陆的队伍是甲龙历 418 年组成的
    since: 418,
    when: (s) => isRudyEra(s) && (inDemon(s) || s.character.originGroup === "demon") && has(s, "fame", 20),
  },

  /* ---------- 拉诺亚魔法大学 ---------- */
  {
    id: "zanoba",
    name: "扎诺巴·西隆",
    faction: "西隆王国",
    role: "第三王子",
    bond: "同僚",
    stars: 3,
    note: "他看人偶的眼神比看人亲切。他的手能把石头捏成粉。",
    secret: "他幼年亲手杀死了同父异母的弟弟，此事把他自己变成了一个不敢碰人的存在。",
    lore: "扎诺巴·西隆，西隆王国第三王子，甲龙历 397 年生。天生怪力与异常坚硬的肉体，是所谓「被诅咒的魔力」造成的。痴迷人偶，后入拉诺亚魔法大学，与鲁迪乌斯、克里夫交好，参与魔导铠与自动人偶的研制。",
    grants: ["mg_stone_cannon"],
    // 魔法大学的同窗。大学在夏利亚，人也只在这儿遇得上
    home: "魔法都市夏利亚",
    since: 422,
    when: (s) => isRudyEra(s) && atCollege(s),
  },
  {
    id: "cliff",
    name: "克里夫·格利摩尔",
    faction: "米里斯教团",
    role: "魔法大学特别生",
    bond: "同僚",
    stars: 3,
    note: "他自称天才，而且不介意把这三个字说给所有人听。",
    secret: "他是现任米里斯教皇的孙子，此事在教团内也极少有人知道。",
    lore: "克里夫·格利摩尔，米里斯教皇之孙，人族与小人族混血。魔术天赋出众，精通治癒、解毒、神击与火系统至上级，长于诅咒研究与魔法阵构造。拉诺亚魔法大学特别生，后成为米里斯教皇，娶艾莉娜丽洁为妻。",
    grants: ["mg_binding", "mg_exorcist", "mg_shine_healing"],
    home: "魔法都市夏利亚",
    since: 422,
    when: (s) => isRudyEra(s) && atCollege(s),
  },
  {
    id: "ariel",
    name: "爱丽儿·阿涅摩伊·阿斯拉",
    faction: "阿斯拉王国 · 王室",
    role: "第二王女",
    bond: "同僚",
    stars: 2,
    note: "她说话的时候一直看着你的手，不看你的脸。",
    lore: "爱丽儿·阿涅摩伊·阿斯拉，阿斯拉王国第二王女，王位派系之一的首领，任拉诺亚魔法大学学生会会长。身边有护卫路克与化名「菲兹」的希露菲叶特。",
    home: "魔法都市夏利亚",
    when: (s) => isRudyEra(s) && atCollege(s),
  },
  {
    id: "luke",
    name: "路克·诺托斯·格雷拉特",
    faction: "阿斯拉王国 · 诺托斯家",
    role: "王女护卫",
    bond: "同僚",
    stars: 2,
    note: "他讲话随便，但从不把自己人以外的人当自己人。",
    lore: "路克·诺托斯·格雷拉特，诺托斯家出身，皮雷蒙之子，爱丽儿·阿斯拉的护卫，鲁迪乌斯的表亲。剑术与外表都不差，长于应酬。",
    home: "魔法都市夏利亚",
    when: (s) => isRudyEra(s) && atCollege(s),
  },
  {
    id: "nanahoshi",
    name: "七星静香",
    faction: "拉诺亚魔法大学",
    role: "被召唤者",
    bond: "同僚",
    stars: 2,
    note: "她穿着不属于这个世界的衣服，在图书馆最里面翻一堆没人看得懂的书。",
    secret: "她来到这个世界纯属意外，她唯一的目标是回家。",
    lore: "七星静香（ナナホシ・シズカ），与秋人一同被召唤到六面世界的日本人，肉体停止成长并失去魔力，长年在拉诺亚魔法大学研究返回原世界的方法。她不是这个世界的人，也不打算在这里留下感情。",
    grants: ["mg_chantless"],
    home: "魔法都市夏利亚",
    when: (s) => isRudyEra(s) && atCollege(s),
  },

  /* ---------- 米里斯教团 ---------- */
  {
    id: "mirees_pope",
    name: "米里斯教皇",
    faction: "米里斯教团",
    role: "教皇",
    bond: "熟人",
    stars: 1,
    note: "他在布告里重申一夫一妻是唯一的正道，然后回到自己的书房里算政治的账。",
    lore: "米里斯教团现任教皇，克里夫·格利摩尔的祖父。他主张与魔族对话而非一味排斥，因此被教团内的强硬派视为异端。",
    grants: ["mg_shine_healing"],
    home: "米里希昂",
    when: (s) => isRudyEra(s) && inMirees(s) && (has(s, "faith", 40) || has(s, "fame", 45)),
  },

  /* ---------- 剑之圣地 ---------- */
  {
    id: "gal",
    name: "加尔·法利昂",
    faction: "剑之圣地",
    role: "剑神",
    bond: "师门",
    stars: 2,
    note: "他衡量你的方式很直接：让你站到他对面，然后看你能站多久。",
    lore: "加尔·法利昂，当代剑神，剑神流本部道场之长，七大列强第六位。纯血人族中几乎是公认最强，在其他流派也有帝级才能。他带出了基列奴、艾莉丝、女儿妮娜与侄子奇诺等人。",
    grants: ["sg_silent_blade", "sg_light_blade", "sg_light_reflect"],
    home: "剑之圣地",
    when: (s) => atSanctuary(s) && (swordAt(s, ["上级", ...HIGH]) || has(s, "sword", 45)),
  },
  {
    id: "nina",
    name: "妮娜·法利昂",
    faction: "剑之圣地",
    role: "剑神之女 · 剑圣",
    bond: "师门",
    stars: 3,
    note: "她的剑比同辈都快，快到她自己也还在琢磨怎么用它。",
    lore: "妮娜·法利昂，剑神加尔·法利昂之女，剑神流。十六岁成为剑圣，剑速快过同辈的艾莉丝，后与表哥奇诺·布里兹成婚。",
    grants: ["sg_wrist_drop"],
    home: "剑之圣地",
    when: (s) => isRudyEra(s) && atSanctuary(s),
  },
  {
    id: "gino",
    name: "奇诺·布里兹",
    faction: "剑之圣地",
    role: "剑圣",
    bond: "师门",
    stars: 2,
    note: "他能把该赢的比试输掉，而且输得让人看不出他是故意的。",
    lore: "奇诺·布里兹，剑帝蒂莫西·布里兹之子，剑神加尔的侄子。十二岁成为当时最年少的剑圣，后来击败加尔继任剑神，升入七大列强第六位，此后未曾败北。",
    grants: ["sg_silent_blade"],
    home: "剑之圣地",
    when: (s) => isRudyEra(s) && atSanctuary(s) && swordAt(s, ["中级", "上级", ...HIGH]),
  },
  {
    id: "reida",
    name: "蕾伊达·莉亚",
    faction: "水神流",
    role: "水神",
    bond: "师门",
    stars: 1,
    note: "她出手之前会先闭上眼。等她睁开，你已经输了。",
    lore: "蕾伊达·莉亚，当代水神，水神流之长。初代水神留下五道奥义，习得三道者方可称水神；她把其中两道叠合，创出第六道奥义「剥奪剣界」。伊佐露缇是她的弟子与孙女。",
    grants: ["wg_nagare", "wg_five_arts", "wg_deprivation"],
    home: "剑之圣地",
    when: (s) => atSanctuary(s) && s.character.swordSchool === "水神流" && swordAt(s, ["上级", ...HIGH]),
  },
  {
    id: "izolte",
    name: "伊佐露缇",
    faction: "水神流",
    role: "水王",
    bond: "师门",
    stars: 2,
    note: "她的剑从来不迎上来，只是把你的剑一点点引到空处。",
    lore: "伊佐露缇，水神蕾伊达·莉亚的弟子与孙女，水神流剑士，水王级。与剑神流的妮娜、艾莉丝互为对手。",
    grants: ["wg_nagare"],
    home: "剑之圣地",
    when: (s) => atSanctuary(s) && s.character.swordSchool === "水神流",
  },
  {
    id: "alexander",
    name: "亚历山大·C·雷白克",
    faction: "北神流",
    role: "北神",
    bond: "宿敌",
    stars: 1,
    note: "他随身带着一把不属于这个时代的剑，看人的时候像在挑该从哪一处下手。",
    lore: "亚历山大·C·雷白克，当代北神，七大列强第七位。身具不死魔族血统，近乎不死，持有最强级别的剑「王龙剑卡夏库特」。",
    grants: ["ng_kippa"],
    // 北神居无定所，只在路上遇上
    when: (s) => s.character.swordSchool === "北神流" && swordAt(s, [...HIGH]) && has(s, "fame", 50),
  },
  {
    id: "randolph",
    name: "蓝道夫·马利安",
    faction: "王龙王国 · 黑龙骑士团",
    role: "死神",
    bond: "宿敌",
    stars: 1,
    note: "他右眼裹着眼带。他说那是他自己挖的，语气里没有一丝惋惜。",
    lore: "蓝道夫·马利安，王龙王国黑龙骑士团骑士，七大列强第五位「死神」。持有魔眼「空绝眼」，因无法关闭而以眼带遮蔽。北神流帝级、水神流王级相当的实力，在作品中长期担任帕克斯的贴身护卫。",
    home: "西隆王国",
    // 西隆政变与帕克斯之死在甲龙历 435 年
    since: 435,
    when: (s) => isRudyEra(s) && inShillon(s) && has(s, "fame", 40),
  },

  /* ---------- 王国与宫廷 ---------- */
  {
    id: "pilemon",
    name: "皮雷蒙·诺托斯·格雷拉特",
    faction: "阿斯拉王国 · 四大上级贵族",
    role: "米尔博茨领领主",
    bond: "熟人",
    stars: 2,
    note: "他谈的是粮价，眼睛盯的是你身后站着谁。",
    lore: "皮雷蒙·诺托斯·格雷拉特，四大上级贵族诺托斯家家主，统治米尔博茨领，保罗之弟，路克之父。他支持第二王女爱丽儿一系。",
    home: "王都亚尔斯",
    when: (s) => isRudyEra(s) && inAsura(s) && s.character.originGroup === "noble" && has(s, "fame", 35),
  },
  {
    id: "pax",
    name: "帕克斯·西隆",
    faction: "西隆王国",
    role: "国王",
    bond: "宿敌",
    stars: 1,
    note: "他把国家当成一件可以随时掀翻的棋盘。",
    lore: "帕克斯·西隆，西隆王国国王，扎诺巴同父异母的弟弟。他篡夺王位，以阴谋与暴力统治，是死神蓝道夫的雇主。",
    home: "西隆王国",
    since: 435,
    when: (s) => isRudyEra(s) && inShillon(s),
  },

  /* ---------- 魔王与魔大陆 ---------- */
  {
    id: "kishirika",
    name: "奇希莉卡·奇希莉斯",
    faction: "魔大陆",
    role: "魔界大帝",
    bond: "熟人",
    stars: 1,
    note: "她像孩子一样说话，像孩子一样要东西，转身就消失在沙里。",
    lore: "奇希莉卡·奇希莉斯，魔界大帝，不死魔族。她发出「魔眼」给遇上的人，条件只是让人听她讲一会儿话。",
    home: "米格路德族之村",
    // 甲龙历 418 年，魔眼是从她手里得到的
    since: 418,
    when: (s) => isRudyEra(s) && inDemon(s) && has(s, "fame", 30),
  },
  {
    id: "badigadi",
    name: "巴迪冈迪",
    faction: "魔大陆 · 不死魔族",
    role: "不死魔王",
    bond: "熟人",
    stars: 2,
    note: "他站得比谁都随意，好像这具身体死不了是件麻烦事。",
    lore: "巴迪冈迪，不死魔王，魔王之裔。第二次人魔大战时穿上斗神铠与拉普拉斯决战，双双陨落。斗神铠有自我意识，会侵蚀穿戴者的精神。",
    home: "米格路德族之村",
    when: (s) => isRudyEra(s) && inDemon(s) && has(s, "fame", 45),
  },

  /* ---------- 龙族与棋局 ---------- */
  {
    id: "perugius",
    name: "佩尔基乌斯·朵拉",
    faction: "天空之城",
    role: "甲龙王",
    bond: "熟人",
    stars: 1,
    note: "他从空中说话，声音不高，但你会本能地想站直。",
    lore: "佩尔基乌斯·朵拉，甲龙王，居于天空之城，拥有五龙将。拉普拉斯战役中活下来的七英雄之一。五龙将体内埋着龙族秘宝，是通往无之世界人神居所的钥匙。他持有一支笛子，凡人吹响即可唤来迎者。",
    grants: ["sg_dragon_gate", "mg_alpha_strike"],
    home: "天空之城",
    // 甲龙历 429 年，他为齐格哈鲁特赐名萨拉丁
    since: 429,
    when: (s) => has(s, "fame", 60),
  },
  {
    id: "orsted",
    name: "奥尔斯帝德",
    faction: "龙族",
    role: "龙神",
    bond: "熟人",
    stars: 1,
    note: "他只问了你一句，等你回答完，人已经不在了。",
    secret: "他在这两百年里已经轮回过两百余次，从未赢过。",
    lore: "奥尔斯帝德，第一百代龙神，初代龙神之子，七大列强第二位。习得世间现存一切剑术与魔术，魔力恢复速度是常人的千分之一。他以甲龙历 330 年为起点，每两百年轮回一次，寻找击败人神的方法。他会在轮回中注意「异常变量」。",
    grants: ["mg_chantless"],
    // 甲龙历 425 年，龙神正式进入这个故事
    since: 425,
    when: (s) => s.turn >= 24 && (has(s, "fame", 55) || s.character.origin === "龙神同伴"),
  },
  {
    id: "hitogami",
    name: "人神",
    faction: "无之世界",
    role: "低语者",
    bond: "熟人",
    stars: 1,
    note: "它只在你要睡着的时候说话，语气温和，像替你想了很多年。",
    secret: "它只会建议，从不命令——因为它要的是你自己走过去。",
    lore: "人神，隐藏在无之世界的存在，拥有未来视。他通过梦境筛选使徒，用话术诱使对方自行走向他需要的方向。他无法强制任何人。基斯是他的暗子。",
    when: (s) =>
      (s.character.status === "人神使徒" ||
        s.character.origin === "人神使徒" ||
        s.character.talents.includes("人神印记") ||
        s.threads.humanGod.includes("低语已经出现")) &&
      s.threads.humanGod !== "你还不知道任何与神有关的传闻。",
  },
  {
    id: "laplace",
    name: "拉普拉斯",
    faction: "魔神",
    role: "魔神（封印中）",
    bond: "宿敌",
    stars: 1,
    note: "你只在石碑上见过那个名字。它排在最前面，且没有被划掉。",
    lore: "拉普拉斯，魔龙王与技神本就是同一存在的两半。魔龙王拉普拉斯为魔神，七大列强第四位，史上最顶尖的魔力总量，被封印后仍在等待复活；技神拉普拉斯为七大列强第一位，失去了魔力却保留了一切技巧。他在甲龙历 425 年后复活，是原作者反复预告的灾难。",
    // 复活在甲龙历 425 年之后
    since: 425,
    when: (s) => has(s, "fame", 50),
  },
  {
    id: "kalia",
    name: "轰雷的克里亚奈特",
    faction: "天空之城 · 五龙将",
    role: "五龙将",
    bond: "熟人",
    stars: 1,
    note: "她的声音从很远的地方传来，落下来的时候，地上的石子会跳一下。",
    lore: "轰雷的克里亚奈特，甲龙王佩尔基乌斯的五龙将之一，负责接引。光辉的阿尔曼菲同为五龙将，负责迎接吹响龙王之笛的人。五龙将体内埋有龙族秘宝。",
    home: "天空之城",
    // 五龙将随侍甲龙王，与佩尔基乌斯同一时间进入这个故事
    since: 429,
    when: (s) => has(s, "fame", 65),
  },
];

const CANON_BY_ID = new Map<string, CanonCharacter>();
const CANON_BY_NAME = new Map<string, CanonCharacter>();

/**
 * 人物之间的关系只写一次。这里把每条关系补成双向，
 * 这样无论从哪一方查，都能在关系面板和关系网里看到同一个连接。
 */
function withSymmetricTies(list: CanonCharacter[]): CanonCharacter[] {
  const byName = new Map(list.map((c) => [c.name, c]));
  const extra = new Map<string, CanonTie[]>();
  for (const c of list) {
    for (const tie of c.ties ?? []) {
      const other = byName.get(tie.with);
      if (!other) continue;
      const back = extra.get(other.name) ?? [];
      if (
        !(other.ties ?? []).some((t) => t.with === c.name) &&
        !back.some((t) => t.with === c.name)
      ) {
        back.push({ with: c.name, kind: tie.kind });
        extra.set(other.name, back);
      }
    }
  }
  return list.map((c) => {
    const add = extra.get(c.name);
    return add ? { ...c, ties: [...(c.ties ?? []), ...add] } : c;
  });
}

/** 挂上关系表与剧本钩子。两张表都以名录里的名字为键 */
function attachLinks(list: CanonCharacter[]): CanonCharacter[] {
  return list.map((c) => ({
    ...c,
    ties: CANON_TIES[c.name] ?? c.ties,
    hook: CANON_HOOKS[c.name] ?? c.hook,
  }));
}

export const CANON_CHARACTERS: CanonCharacter[] = withSymmetricTies(
  attachLinks([...CANON_CORE, ...expandSeeds(CANON_SEEDS)]),
);

for (const c of CANON_CHARACTERS) {
  const id = c.id ?? c.name;
  c.id = id;
  CANON_BY_ID.set(id, c);
  CANON_BY_NAME.set(c.name, c);
}

export function canonById(id: string): CanonCharacter | undefined {
  return CANON_BY_ID.get(id);
}

export function canonByName(name: string): CanonCharacter | undefined {
  return CANON_BY_NAME.get(name);
}

/**
 * 把名录条目转成关系网条目。
 * year 是遇见的年份，用来给他定下出生年；fallbackPlace 是「实在不知道他住哪儿」时的退路，
 * 一般传玩家此刻所在的地方。他该落在哪个地方由 homeOf 决定，不是你站的地方。
 */
export function toRelation(c: CanonCharacter, year: number, fallbackPlace: string): Relation {
  return withBirthYear(
    {
      name: c.name,
      role: c.role,
      stars: c.stars,
      note: c.note,
      secret: c.secret,
      bond: c.bond,
      canonId: c.id,
      lore: c.lore,
      ties: c.ties,
      place: homeOf(c, fallbackPlace),
    },
    year,
  );
}

/** 当前条件已满足、且尚未进入关系面板的人物。每次推进最多加入 limit 个 */
export function canonArrivals(s: GameState, limit = 2): CanonCharacter[] {
  const known = new Set<string>();
  for (const r of s.relations) {
    if (r.canonId) known.add(r.canonId);
    if (r.name) known.add(r.name);
  }
  const list: CanonCharacter[] = [];
  for (const c of CANON_CHARACTERS) {
    if (known.has(c.id ?? c.name) || known.has(c.name)) continue;
    // 时间线是硬门槛：年份没到，条件再合适也不会出现
    if (c.since !== undefined && s.year < c.since) continue;
    if (c.when(s)) list.push(c);
    if (list.length >= limit) break;
  }
  return list;
}

/** 此人与玩家已经建立关系，说明见过面 */
export function canonKnown(s: GameState, c: CanonCharacter): boolean {
  const id = c.id ?? c.name;
  return s.relations.some((r) => r.canonId === id || r.name === c.name);
}

/**
 * 原作名录摘要，供 AI 提示词使用。
 * 按所属分组后只给名字与身份：上百号人逐条写明所属会把提示词撑得过长，
 * 而玩家已经认识的人，其详细考据本来就写在关系条目的 lore 里。
 */
export function canonRosterBrief(): string {
  const groups = new Map<string, string[]>();
  for (const c of CANON_CHARACTERS) {
    const line = `${c.name}·${c.role}`;
    const arr = groups.get(c.faction);
    if (arr) arr.push(line);
    else groups.set(c.faction, [line]);
  }
  const list = [...groups].map(([faction, members]) => `${faction}：${members.join("、")}`).join("\n");
  return [
    "【原作人物名录】以下是《无职转生》原作中真实存在的人物，写到他们时必须与所属、身份一致，不要张冠李戴，也不要让未出场的角色凭空登场。",
    "玩家是独立于这些人的一个人，遇到谁取决于条件与地点。名录：",
    list,
  ].join("\n");
}

/** 某人与其他原作人物的关系，写成一行，供关系面板与 AI 提示词使用 */
export function tieText(ties?: CanonTie[]): string {
  if (!ties || ties.length === 0) return "";
  return ties.map((t) => `${t.with}（${t.kind}）`).join("、");
}
