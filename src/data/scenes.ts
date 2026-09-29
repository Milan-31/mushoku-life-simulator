import type {
  CommandCategory,
  CustomCommand,
  EventEffects,
  GameState,
  ScenePatch,
  SceneStash,
} from "../types";
import { TIERS } from "./creation";
import { PLACES } from "./places";
import { anyoneAround } from "../engine/presence";

/**
 * 预设命令库。
 *
 * 设计原则：
 * - 预设命令完全由本地引擎结算，不消耗 AI 额度；只有玩家自由输入才触发 AI 推演。
 * - 每条命令都有三档结果：大概率是日常、中概率是值得一说的转折、小概率是罕见事件。
 * - 命令按场景归组，场景面板按类别归纳，玩家在哪里、就能做什么。
 * - 场景与命令都可以带「剧情门槛」：门没开就不出现在面板上。
 *   剧情自己长出来的场景与命令（AI 生成）则存在存档里，见 types.ts 的 SceneStash。
 */

export type { CommandCategory };

export type OutcomeTier = "大概率" | "中概率" | "小概率";

export interface PresetOutcome {
  tier: OutcomeTier;
  lines: string[];
  effects: EventEffects;
  /**
   * 这一档结果只在某个剧情状态下才成立。留空表示任何时候都可能。
   * 有了它，同一条指令在不同处境下会开出不同的戏——这就是「剧情分支」。
   * 判定用的是与场景、指令同一套门槛（见 SceneGate），所以条件也是数据，不是闭包。
   */
  when?: SceneGate;
  /**
   * 结算完这一档之后，翻开一个特殊事件（抉择事件 id，见 engine/events.ts）。
   * 事件只会被翻开一次，之后不再重复；它自己写明了选项与后果。
   */
  triggerEvent?: string;
}

export interface PresetCommand {
  id: string;
  label: string;
  category: CommandCategory;
  /** 精力消耗基数，结算时会再乘难度系数 */
  cost: number;
  /** 一句话说明，作为按钮悬停提示 */
  hint: string;
  outcomes: PresetOutcome[];
  /**
   * 可执行条件。填了之后，条件不满足时指令在面板上显示为不可执行，并给出原因；
   * 引擎也会在结算时二次拒绝，避免绕过界面直接调用。
   */
  require?: CommandRequirement;
  /**
   * 剧情门槛。门没开时这条指令不出现在面板上——它属于还没走到的处境。
   * 与 require 的分工：require 管「做不做得了」，gate 管「这条指令现在存不存在」。
   */
  gate?: SceneGate;
}

/**
 * 剧情门槛。用年份、剧情标记与经历过的事件来表达「你现在走到哪儿了」。
 * 全部是数据，没有闭包，因此可以随场景表一起被判断，也能被 AI 生成的场景复用。
 * 同一层里的各项是「且」的关系；需要「或」时用 any 包一层。
 */
export interface SceneGate {
  /** 年份下限（含） */
  minYear?: number;
  /** 年份上限（含） */
  maxYear?: number;
  /** 需要这段人生里发生过某件事（见 EventEffects.flag） */
  flag?: string;
  /** 尚未发生过某件事时才成立 */
  notFlag?: string;
  /** 需要经历过某个抉择事件 */
  seenEvent?: string;
  /** 尚未经历过某个抉择事件时才成立 */
  notSeenEvent?: string;
  /** 至少掌握其中一个技能 */
  anySkill?: string[];
  /** 属性下限，全部满足 */
  stats?: Record<string, number>;
  /** 属性下限，满足其中任一项即可 */
  anyStats?: Record<string, number>;
  /** 出身需为其中任一项 */
  origin?: string[];
  /** 剑术流派需为其中任一项 */
  swordSchool?: string[];
  /** 信仰需为其中任一项 */
  faith?: string[];
  /** 冒险者等级下限：F 到 S */
  adventurerRank?: string;
  /** 某段关系的好感下限 */
  relation?: { name: string; minStars: number };
  /** 所在地需为其中任一项 */
  residence?: string[];
  /** 任一子条件成立即可。用来表达「或」 */
  any?: SceneGate[];
}

/**
 * 预设指令的执行条件。用来表达「以你现在的能力与身份，这件事做不做得了」。
 * 所有字段都是可选的，全部满足才可执行；forbid 是硬性禁止。
 */
export interface CommandRequirement {
  /** 年龄下限 */
  minAge?: number;
  /** 属性下限，键与角色属性一致：mana / sword / int / charm / faith / wealth / fame / scheme / health */
  stats?: Record<string, number>;
  /** 剑术阶级下限（未觉醒＜初级＜…＜神级） */
  swordTier?: string;
  /** 魔术阶级下限 */
  magicTier?: string;
  /** 冒险者等级下限：F 到 S */
  adventurerRank?: string;
  /** 出身需包含其中任一项 */
  origin?: string[];
  /** 所在地需为其中任一项 */
  residence?: string[];
  /** 剑术流派需为其中任一项 */
  swordSchool?: string[];
  /** 信仰需为其中任一项 */
  faith?: string[];
  /** 政治倾向需为其中任一项 */
  politics?: string[];
  /** 至少掌握其中一个技能 */
  anySkill?: string[];
  /** 需要同时掌握全部技能 */
  allSkills?: string[];
  /** 需要某段关系的好感达到下限，name 写名字的一部分 */
  relation?: { name: string; minStars: number };
  /**
   * 此刻身边得有能当面说上话的人（同处一地的，或与你随行的）。
   * 与 SceneGate 里的同名字段分工一致：那里管「这条指令存不存在」，这里管「做不做得了」——
   * 所以「陪家人」用这个字段时会让按钮灰掉并写明原因，而不是整块消失。
   */
  anyoneHere?: boolean;
  /** 硬性禁止：满足任一项即不可执行 */
  forbid?: {
    origin?: string[];
    residence?: string[];
    swordSchool?: string[];
    faith?: string[];
    politics?: string[];
  };
}

export interface SceneDef {
  id: string;
  name: string;
  /** 面板标题下的一句场景描述 */
  desc: string;
  /** 角色是否处于该场景，用于自动定位；玩家仍可自由切换 */
  match: (s: GameState) => boolean;
  /** 剧情门槛：门没开时这个场景不出现在面板上 */
  gate?: SceneGate;
  commands: PresetCommand[];
}

/** 三档概率的权重。大概率是日复一日，小概率是罕见时刻 */
export const TIER_WEIGHT: Record<OutcomeTier, number> = { 大概率: 62, 中概率: 28, 小概率: 10 };

/** 场景面板上的类别顺序 */
export const CATEGORY_ORDER: CommandCategory[] = [
  "战斗",
  "修炼",
  "学术",
  "冒险",
  "谋生",
  "社交",
  "探索",
  "隐秘",
  "信仰",
  "家庭",
  "休养",
];

/** 紧凑写法：一条命令 + 三档结果 */
function cmd(
  id: string,
  label: string,
  category: CommandCategory,
  cost: number,
  hint: string,
  big: [string[], EventEffects],
  mid: [string[], EventEffects],
  small: [string[], EventEffects],
  require?: CommandRequirement,
  gate?: SceneGate,
): PresetCommand {
  return {
    id,
    label,
    category,
    cost,
    hint,
    require,
    gate,
    outcomes: [
      { tier: "大概率", lines: big[0], effects: big[1] },
      { tier: "中概率", lines: mid[0], effects: mid[1] },
      { tier: "小概率", lines: small[0], effects: small[1] },
    ],
  };
}

const has = (s: GameState, key: string, need: number) => (s.stats.find((x) => x.key === key)?.value ?? 0) >= need;
const age = (s: GameState) => s.character.age;

/**
 * 场合场景的所在地门槛。
 *
 * 「你的行动」里的场景分两类：
 * - 场所类（集市、公会、大学、道场、王都、教会、迷宫、暗巷、佣兵营地、书库）严格跟着所在地走：
 *   人不在那儿，这一格就不该出现。要换地方只能用「迁居」。
 * - 状态类（家中、旅途边缘的几处、战斗）不跟所在地：你总得有个落脚的地方，麻烦也总会自己找上你。
 *
 * 门槛写成数据，界面与引擎读的是同一份，所以「看得见」和「做得了」永远一致。
 */
const VENUE_GATE = {
  /** 集市与小铺子：有村子、有镇子、有街市的地方 */
  market: { residence: ["布耶纳村", "罗亚町", "米格路德族之村", "西隆王国", "拉诺亚王国"] },
  /** 冒险者公会：有分部的城镇 */
  guild: {
    residence: ["罗亚町", "王都亚尔斯", "魔法都市夏利亚", "米里希昂", "迷宫都市拉潘", "西隆王国", "拉诺亚王国"],
  },
  /** 拉诺亚魔法大学：只有夏利亚 */
  academy: { residence: ["魔法都市夏利亚"] },
  /** 剑之道场：只有剑神流的总本山 */
  dojo: { residence: ["剑之圣地"] },
  /** 王都贵族圈：只有阿斯拉的王都 */
  court: { residence: ["王都亚尔斯"] },
  /** 教会与神殿：教团的根在米里希昂 */
  temple: { residence: ["米里希昂"] },
  /** 迷宫与野外：地下有东西的地方，与满是沙海的地方 */
  dungeon: { residence: ["迷宫都市拉潘", "米格路德族之村"] },
  /** 暗巷与地下社会：大到能藏住人的城 */
  underworld: { residence: ["王都亚尔斯", "罗亚町", "西隆王国", "拉诺亚王国", "迷宫都市拉潘"] },
  /** 佣兵营地与边境：有兵、有仗、有边的地方 */
  frontier: { residence: ["西隆王国", "迷宫都市拉潘", "龙鸣山"] },
  /** 书库与研究室：纸最多的地方 */
  library: { residence: ["魔法都市夏利亚", "拉诺亚王国"] },
  /** 罗亚町的地方道场：教头是退了役的冒险者，教的是最实用的那几手 */
  townDojo: { residence: ["罗亚町"] },
  /** 王都演武场：近卫与贵族子弟共用的一块场地 */
  royalYard: { residence: ["王都亚尔斯"] },
  /** 旅途：脚下是路，不是家 */
  road: { residence: ["米格路德族之村", "迷宫都市拉潘", "龙鸣山"] },
} satisfies Record<string, SceneGate>;

/** 家中不跟所在地：人在哪儿都得有个睡觉的地方 */
export const SCENES: SceneDef[] = [
  {
    id: "home",
    name: "家中",
    desc: "屋子的味道没变，脚步声也没变。在这里，没有一件事需要赶。",
    match: () => true,
    commands: [
      cmd(
        "home_family",
        "陪家人过完一个月",
        "家庭",
        10,
        "只说吃穿，不谈正事",
        [
          ["这个月你哪儿也没去。饭桌上没人提正事，说的都是谁家牲口下了崽。", "母亲又把你的碗添满。你说了两次够了。"],
          { stats: { charm: 4 }, starDelta: { match: "", delta: 1, note: "你陪了他们一整个月" }, goal: 3, notice: "家里的气氛比上个月缓和。" },
        ],
        [
          ["你陪父亲补院墙。他把锤子递过来，没再看你怎么握。", "妹妹要你讲外面的事，你只挑了能讲的那几件。"],
          { stats: { charm: 3, health: 2 }, starDelta: { match: "", delta: 1, note: "他开始把你当成能做事的人" }, goal: 2 },
        ],
        [
          ["你想好好待在家里，心思却一直在别处。", "一碗饭吃到见底，你才发现自己一句话也没说。"],
          { stats: { charm: 1 }, goal: 1 },
        ],
        // 家里人得在跟前。搬走了、身边没人，这条灰掉并写明原因
        { anyoneHere: true },
      ),
      cmd(
        "home_rest",
        "在家歇上一个月",
        "休养",
        -30,
        "把身体养回来，代价是时间",
        [
          ["你睡了很久。醒来时窗外的光已经斜了，身上轻了一些。", "那些攒了很久的累，你一件件放下。"],
          { stats: { health: 6 }, energy: 20, goal: 1 },
        ],
        [
          ["你什么也没做。日子一天接一天，没留下什么。", "母亲说，你总算看着像个人了。"],
          { stats: { health: 4 }, energy: 12 },
        ],
        [
          ["闲下来，那些不想想起的事全回来了。", "你躺到中午才起，反而更累。"],
          { stats: { health: 1 }, energy: -6 },
        ],
      ),
      cmd(
        "home_drill",
        "在家练基本功",
        "修炼",
        12,
        "不求出彩，只求不断",
        [
          ["你在院子里重复最基础的那几个动作，直到手自己会动。", "没人看着，反倒容易做进去。"],
          { tier: { kind: "sword", gain: 12 }, stats: { sword: 3 }, goal: 1 },
        ],
        [
          ["后院挥剑，动作比上个月少了两处多余。", "这种进步没法给谁看，只能自己知道。"],
          { tier: { kind: "sword", gain: 9 }, stats: { sword: 2 } },
        ],
        [
          ["练到一半心思就跑了。", "你收了剑，不勉强自己了。"],
          { tier: { kind: "sword", gain: 3 } },
        ],
      ),
      cmd(
        "home_chores",
        "照看家里的活计",
        "谋生",
        12,
        "院子、牲口、账本，总得有人管",
        [
          ["这个月的活你全揽了。牲口没病，账也没烂。", "父亲没说什么，把钥匙留在了桌上。"],
          { stats: { wealth: 60, health: 2 }, goal: 2 },
        ],
        [
          ["干了一个月，钱没多几个，院子倒干净了。", "你学会了怎么把一件事一次做完。"],
          { stats: { wealth: 35, health: 1 }, goal: 1 },
        ],
        [
          ["干活时砸坏了一样东西，赔了几个铜币。", "没人说你，你自己记着。"],
          { stats: { wealth: -25 } },
        ],
      ),
    ],
  },
  {
    id: "village",
    name: "村镇与集市",
    desc: "叫卖声、牲口味、半熟不熟的脸。这里的事没人记，也没人停。",
    match: (s) => ["布耶纳村", "罗亚町", "米格路德族之村", "西隆王国", "拉诺亚王国"].includes(s.character.residence),
    gate: VENUE_GATE.market,
    commands: [
      cmd(
        "village_stall",
        "去集市摆摊做点生意",
        "谋生",
        14,
        "把手里有的东西换成钱",
        [
          ["摊子比你想的受欢迎。收摊时钱袋比来时沉。", "有人记住了你家卖的东西，说下次还来。"],
          { stats: { wealth: 110, charm: 3 }, goal: 3 },
        ],
        [
          ["生意不好不坏，够撑到下个月。", "你学会了把话说得软，把价咬得死。"],
          { stats: { wealth: 55, charm: 2 }, goal: 2 },
        ],
        [
          ["守了一天，卖出去三件。", "隔壁摊主掰了半个饼给你。你说了谢谢。"],
          { stats: { wealth: 8, charm: 1 } },
        ],
      ),
      cmd(
        "village_gossip",
        "和邻里闲聊",
        "社交",
        8,
        "村口的信息比公告栏灵通",
        [
          ["你在井边站了一下午，听了半个村子的家事。", "其中一条，后来在某件事上帮了你一次。"],
          { stats: { charm: 3, scheme: 4 }, starDelta: { match: "", delta: 1, note: "邻里开始愿意同你说话" } },
        ],
        [
          ["你听了几件琐事，也被人问了近况。", "这村子没有秘密，只有还没轮到你知道的那部分。"],
          { stats: { charm: 2, scheme: 2 } },
        ],
        [
          ["你插了句话，插错了人。", "从那以后，有人对你客气了很多。是疏远的那种客气。"],
          { stats: { charm: -3, scheme: 1 } },
        ],
      ),
      cmd(
        "village_news",
        "打听附近的传闻",
        "探索",
        8,
        "真话通常混在三种说法里",
        [
          ["同一个问题你在三个地方问过，凑出了一件本不该知道的。", "线索你记在心里，谁也没说。"],
          { stats: { scheme: 6, int: 2 }, goal: 3 },
        ],
        [
          ["打听来的都是零碎，连不成一张图。", "但至少你知道该往哪个方向再问。"],
          { stats: { scheme: 4 }, goal: 2 },
        ],
        [
          ["没人肯跟你说实话。", "这本身就是消息——这里有件事被人按住了。"],
          { stats: { scheme: 2 } },
        ],
      ),
      cmd(
        "village_eavesdrop",
        "听墙角",
        "隐秘",
        8,
        "有些话只在以为没人听见时才说",
        [
          ["你听见一个名字，还有一笔数目。", "记下了。没说。"],
          { stats: { scheme: 5 }, notice: "你知道了一件别人以为你不会知道的事。" },
        ],
        [
          ["没听到要紧的，只有抱怨和叹气。", "你悄悄退开了。"],
          { stats: { scheme: 3 } },
        ],
        [
          ["你被看见了。对方看你的那一眼，说明没有下次。", "你陪着笑退了出去。"],
          { stats: { scheme: 1, charm: -3 } },
        ],
      ),
    ],
  },
  {
    id: "guild",
    name: "冒险者公会",
    desc: "委托板、酒气、盖章的动静。有人正为几枚金币押上性命。",
    match: (s) => age(s) >= 12,
    gate: VENUE_GATE.guild,
    commands: [
      cmd(
        "guild_take",
        "接下一件委托",
        "冒险",
        22,
        "讨伐、护送、采集，总有一件适合你",
        [
          ["委托比预想的麻烦，你活着回来，报酬一分没少。", "柜台在卡片上盖了个很小的章。那个章有用。"],
          { tier: { kind: "adventure", gain: 18 }, stats: { fame: 6, health: -3 }, goal: 4 },
        ],
        [
          ["回程路上你想，所谓冒险，大半是在走路和等。", "但委托完成了。也就这些。"],
          { tier: { kind: "adventure", gain: 13 }, stats: { fame: 4, wealth: 40 }, goal: 3 },
        ],
        [
          ["委托失败了。肩上多了道口子。", "公会没追究，只把这个月的记录划掉。"],
          { tier: { kind: "adventure", gain: 4 }, stats: { health: -6, fame: -2 } },
        ],
      ),
      cmd(
        "guild_drink",
        "和同行喝酒",
        "社交",
        12,
        "酒桌上认识的人，比战场上救你的人多",
        [
          ["你在酒馆坐到很晚。一个老手把自己踩过的坑逐个讲给你听。", "有人记住了你的名字。"],
          { stats: { charm: 5, sword: 2 }, starDelta: { match: "", delta: 2, note: "你们在同一张桌上喝到天亮" } },
        ],
        [
          ["你听了一晚的故事，也讲了一个自己的。", "这顿酒花了钱，换来个肯替你说话的人。"],
          { stats: { charm: 3, wealth: -30 }, starDelta: { match: "", delta: 1, note: "酒肉之交，但可靠" } },
        ],
        [
          ["你说多了，有人听出了你的底细。", "回去的路上，你一直在想哪句话不该说。"],
          { stats: { charm: 2, scheme: -3, wealth: -40 } },
        ],
      ),
      cmd(
        "guild_board",
        "研究委托板与地图",
        "探索",
        6,
        "先看清楚，再动手",
        [
          ["委托板上的每张纸你都读了一遍，看出了公会没明说的规律。", "下个月往哪走，你心里有数了。"],
          { stats: { scheme: 5, int: 3 }, goal: 3 },
        ],
        [
          ["记下了几条路线和价钱。", "现在没用。将来未必。"],
          { stats: { scheme: 3, int: 2 }, goal: 2 },
        ],
        [
          ["看了一下午，全是重复的委托。", "你怀疑公会自己也没想清楚。"],
          { stats: { int: 2 } },
        ],
      ),
      cmd(
        "guild_spar",
        "在训练场和人过招",
        "修炼",
        18,
        "公会后院总有人愿意比划一下",
        [
          ["你和三个人过招，输两场，学到三样东西。", "最后一场赢下来，连你自己都没料到。"],
          { tier: { kind: "sword", gain: 16 }, stats: { sword: 5, health: -2 }, goal: 2 },
        ],
        [
          ["你被摔了几回，也摔了别人一回。", "身体记住了点什么。"],
          { tier: { kind: "sword", gain: 11 }, stats: { sword: 3, health: -2 } },
        ],
        [
          ["输得很干脆，对方连汗都没出。", "可你有生以来第一次感到体内有东西在动。"],
          { tier: { kind: "sword", gain: 5 }, stats: { health: -4 }, learnSkill: "tk_sense" },
        ],
      ),
    ],
  },
  {
    id: "academy",
    name: "魔法大学",
    desc: "讲堂、宿舍、深夜还亮着的实验室。这里的钱是拿脑子换的。",
    match: (s) => s.character.origin.includes("大学") || s.character.residence === "魔法都市夏利亚" || has(s, "mana", 40),
    gate: VENUE_GATE.academy,
    commands: [
      cmd(
        "academy_class",
        "去上课",
        "学术",
        12,
        "听不懂的部分，将来会用到",
        [
          ["教授提了个没人答得上来的问题。你答上来了。", "他记住了你的名字。在这里，这不是件小事。"],
          { tier: { kind: "magic", gain: 16 }, stats: { int: 6, mana: 4 }, goal: 3 },
        ],
        [
          ["笔记记了满满一本。其中一页后来救过你。", "魔术的规律，比想的更像一门语法。"],
          { tier: { kind: "magic", gain: 12 }, stats: { int: 4, mana: 3 }, goal: 2 },
        ],
        [
          ["你在课上睡着了。被点到名字，答得牛头不对马嘴。", "你决定以后少熬夜。"],
          { tier: { kind: "magic", gain: 4 }, stats: { int: 2 } },
        ],
      ),
      cmd(
        "academy_practice",
        "练习咏唱与法阵",
        "修炼",
        18,
        "把知道的东西变成能做到的东西",
        [
          ["你对着空处一遍遍咏唱，直到嗓子发哑，法阵才第一次完整合上。", "那一瞬间很安静。"],
          { tier: { kind: "magic", gain: 18 }, stats: { mana: 6 }, goal: 3 },
        ],
        [
          ["失败十七次。第十八次，指尖有了一点温度。", "你把过程记了下来。"],
          { tier: { kind: "magic", gain: 13 }, stats: { mana: 4 }, goal: 2 },
        ],
        [
          ["法阵在眼前散了，袖子还烧了个洞。", "可散之前的形状是错的。你顺着那个错，摸到了另一种起手式。"],
          { tier: { kind: "magic", gain: 5 }, stats: { health: -2 }, learnSkill: "mg_earth_lance" },
        ],
      ),
      cmd(
        "academy_friends",
        "和同学来往",
        "社交",
        10,
        "未来的对手与同伴，现在都还是学生",
        [
          ["你替一个同学摆平了他的麻烦。他没道谢，但从那以后把你当自己人。", "在魔法大学，这种关系比学分值钱。"],
          { stats: { charm: 5, int: 3 }, addRelation: { name: "同窗", role: "同学", stars: 3, note: "他在你替他解围之后，开始把你算作一伙" } },
        ],
        [
          ["你和几个人熬夜赶完了课题。", "过程很吵。结果还行。"],
          { stats: { charm: 3, int: 2 } },
        ],
        [
          ["你被晾在一边了。他们讨论时，声音会忽然低下去。", "这件事你记住了。"],
          { stats: { charm: -3, scheme: 2 } },
        ],
      ),
      cmd(
        "academy_forbidden",
        "去禁书区",
        "隐秘",
        14,
        "有些页被锁起来，是有理由的",
        [
          ["你在禁书区翻到一段被人涂掉的记载。", "你抄了下来。之后花了一个月，确认自己没看错。"],
          { stats: { int: 6, scheme: 4, mana: 3 }, notice: "你读到了不该流传的东西。" },
        ],
        [
          ["翻到几页不合规矩的术式。", "没抄。只把大致的形状记住了。"],
          { stats: { int: 4, scheme: 2 } },
        ],
        [
          ["你被管理员撞见。", "教务处的名册上多了你的名字，还有一份不太好的印象。"],
          { stats: { int: 2, charm: -4 } },
        ],
      ),
      cmd(
        "academy_mentor",
        "请教授示范一次",
        "学术",
        18,
        "有人示范一遍，胜过自己瞎练一年",
        [
          ["教授当着你的面放了一次魔术，没开口。", "你盯着他的手看了三遍。第四遍，你做到了。"],
          { tier: { kind: "magic", gain: 18 }, stats: { mana: 6, int: 4 }, learnSkill: "mg_chantless", goal: 4 },
        ],
        [
          ["教授讲了半天原理，写了两页纸给你。", "你回去照着试，摸到了门槛。"],
          { tier: { kind: "magic", gain: 14 }, stats: { mana: 5, int: 3 }, learnSkill: "mg_healing", goal: 3 },
        ],
        [
          ["教授很忙，只丢下一句：「先把咏唱练熟。」", "你心里不服，还是去练了。"],
          { tier: { kind: "magic", gain: 7 }, stats: { int: 3 } },
        ],
      ),
    ],
  },
  {
    id: "dojo",
    name: "剑之道场",
    desc: "木地板的响声、汗味，同一个动作被重复一万遍也不吭声。",
    match: (s) => s.character.origin.includes("剑之圣地") || s.character.swordSchool !== "无" || has(s, "sword", 30),
    gate: VENUE_GATE.dojo,
    commands: [
      cmd(
        "dojo_swing",
        "重复同一个动作",
        "修炼",
        18,
        "直到手臂不再属于自己",
        [
          ["同一个动作重复了上千次。收刀时，师父点了下头。", "他从不夸人。所以这一下头，你记了很久。"],
          { tier: { kind: "sword", gain: 18 }, stats: { sword: 6 }, goal: 3 },
        ],
        [
          ["这一次，你的刀多一个动作都没有。", "镜子里的人，比上个月干净。"],
          { tier: { kind: "sword", gain: 14 }, stats: { sword: 4 }, goal: 2 },
        ],
        [
          ["动作越练越僵，师兄纠正了你三次。", "第三次他攥住你的手腕，把角度硬掰过来。那一下你懂了。"],
          { tier: { kind: "sword", gain: 6 }, stats: { health: -2 }, learnSkill: "sg_wrist_drop" },
        ],
      ),
      cmd(
        "dojo_spar",
        "和师兄对练",
        "修炼",
        20,
        "被打中，才知道自己空在哪里",
        [
          ["第三十回合，你找到师兄的破绽，真打中了。", "他愣了一下，笑了。"],
          { tier: { kind: "sword", gain: 17 }, stats: { sword: 5, health: -3 }, starDelta: { match: "", delta: 1, note: "他开始认真对待你的剑" } },
        ],
        [
          ["你输了很多次。但每一回都比上一回多撑几合。", "进步就这些。"],
          { tier: { kind: "sword", gain: 12 }, stats: { sword: 3, health: -3 } },
        ],
        [
          ["你被打倒在地，肋骨疼了半个月。", "但师兄那记卸力的手法你看清了，回去自己试成了。"],
          { tier: { kind: "sword", gain: 5 }, stats: { health: -8 }, learnSkill: "wg_nagare" },
        ],
      ),
      cmd(
        "dojo_watch",
        "看别人练剑",
        "探索",
        6,
        "看得懂别人的剑，才看得懂自己的",
        [
          ["看了整整一下午，忽然明白自己一直缺什么。", "你没当场去练，只是站着，把那个感觉记牢。"],
          { tier: { kind: "sword", gain: 10 }, stats: { int: 4, sword: 3 }, goal: 2 },
        ],
        [
          ["你注意到师范出手时有个习惯。", "这个习惯说明了不少。"],
          { stats: { int: 3, scheme: 3 } },
        ],
        [
          ["什么也没看出来，只觉得大家的剑都很快。", "于是你不看剑，改看脚。第二天就看出一条规律。"],
          { tier: { kind: "sword", gain: 3 }, learnSkill: "ng_adapt" },
        ],
      ),
      cmd(
        "dojo_tend",
        "处理伤口、调养身体",
        "休养",
        8,
        "剑士的身体也是剑的一部分",
        [
          ["旧伤认真处理了，连练习的节奏也改了。", "身体比上个月听话得多。"],
          { stats: { health: 8 }, energy: 10, goal: 2 },
        ],
        [
          ["养了半个月的伤。有些好了，有些会一直留下去。", "干这行的，身上都欠着几笔旧账。"],
          { stats: { health: 5 }, energy: 6 },
        ],
        [
          ["急着回去练剑，伤口又裂了。", "师父看了你一眼，什么都没说。"],
          { stats: { health: -4 } },
        ],
      ),
      cmd(
        "dojo_master",
        "向师范求教",
        "修炼",
        20,
        "有些东西只能由人亲手交给你",
        [
          ["师范让你把同一个起手做了三遍，第三遍才开口。", "那一句只有六个字。你练了三年，都没摸到过。"],
          { tier: { kind: "sword", gain: 18 }, stats: { sword: 6 }, learnSkill: "sg_silent_blade", goal: 4 },
        ],
        [
          ["师范陪你拆了一下午的招。", "他没夸你，只是把你留下的破绽一个个指出来。"],
          { tier: { kind: "sword", gain: 14 }, stats: { sword: 5, int: 3 }, goal: 3 },
        ],
        [
          ["师范只说：你还没到学这个的时候。", "你回去，把基础又练了一个月。"],
          { tier: { kind: "sword", gain: 7 }, stats: { int: 3 } },
        ],
      ),
    ],
  },
  {
    id: "capital",
    name: "王都贵族圈",
    desc: "香氛、丝绸、笑。每句话都压着第二层，而真的那层从不出口。",
    match: (s) => s.character.origin.includes("贵族") || s.character.residence === "王都亚尔斯" || has(s, "fame", 30),
    gate: VENUE_GATE.court,
    commands: [
      cmd(
        "capital_banquet",
        "参加宴会",
        "社交",
        16,
        "场面上要做的，是让别人记住你",
        [
          ["你在宴上说了句恰到好处的话，被一位有分量的人记住了。", "他后来提起你，用的称呼是「那个年轻人」。"],
          { stats: { charm: 6, fame: 5 }, factions: { 阿斯拉王国: 8 }, goal: 4 },
        ],
        [
          ["一整晚你都撑过去了。笑很累，但有用。", "你学会了几个场面上的说法。"],
          { stats: { charm: 4, fame: 3 }, factions: { 阿斯拉王国: 4 }, goal: 2 },
        ],
        [
          ["你说错了一句话，被人不动声色地绕开。", "那一晚，再没人过来跟你搭话。"],
          { stats: { charm: -3, fame: -2 }, factions: { 阿斯拉王国: -5 } },
        ],
      ),
      cmd(
        "capital_intrigue",
        "打探宫廷动向",
        "隐秘",
        14,
        "王都的墙很厚，但人心不厚",
        [
          ["你拼出了两派角力的轮廓，还知道了一个本不该知道的名字。", "你把名字写下来，又烧了。"],
          { stats: { scheme: 7, int: 3 }, notice: "你摸到了王都权力结构的一条裂缝。" },
        ],
        [
          ["你确认了几件传闻的真假。", "一半真，一半假。这本身就是答案。"],
          { stats: { scheme: 4, int: 2 } },
        ],
        [
          ["你的打听被人察觉了。", "有人开始留意你。不是你想要的那种留意。"],
          { stats: { scheme: 2, fame: -3 }, factions: { 阿斯拉王国: -4 } },
        ],
      ),
      cmd(
        "capital_invest",
        "做些本钱上的事",
        "谋生",
        14,
        "贵族最擅长的从来不是剑",
        [
          ["你押对了一桩买卖，进项比一年的俸禄还多。", "有人开始打听，你这个名字是怎么来的。"],
          { stats: { wealth: 260, fame: 3 }, goal: 3 },
        ],
        [
          ["本钱回来一半。没赚多少，也没亏。", "在这个圈子里，不亏就算赢。"],
          { stats: { wealth: 120 } },
        ],
        [
          ["你信错了人。钱出去了，人没了。", "这堂课的学费不便宜。"],
          { stats: { wealth: -140, scheme: 3 } },
        ],
      ),
      cmd(
        "capital_commission",
        "接下贵族私下的委托",
        "冒险",
        18,
        "台面下的事，报酬总是更好",
        [
          ["你办成了。对方没多问，把酬金和一句「以后还找你」一起给了你。", "你心里清楚，多了一条路。"],
          { stats: { fame: 5, wealth: 120, scheme: 3 }, factions: { 阿斯拉王国: 10 }, goal: 4 },
        ],
        [
          ["办得不漂亮，但办成了。", "对方收下结果，没问过程。"],
          { stats: { wealth: 70, fame: 2 }, factions: { 阿斯拉王国: 4 }, goal: 2 },
        ],
        [
          ["你搞砸了，还多了一个不愿再见到你的人。", "有些门关上的时候，是没有声音的。"],
          { stats: { fame: -5, health: -4 }, factions: { 阿斯拉王国: -8 } },
        ],
      ),
    ],
  },
  {
    id: "church",
    name: "教会与神殿",
    desc: "石板地很凉，烛火很稳。米里斯看着每一个人，也看着不说实话的人。",
    match: (s) => s.character.faith.includes("米里斯") || s.character.origin.includes("米里斯") || has(s, "faith", 30),
    gate: VENUE_GATE.temple,
    commands: [
      cmd(
        "church_pray",
        "祈祷",
        "信仰",
        8,
        "跪下来的时候，人会诚实一点",
        [
          ["你跪在冰冷的石板上，忽然想通了一件压了很久的事。", "神父说，你那天出来时脸色不一样了。"],
          { stats: { faith: 8, health: 3 }, goal: 3 },
        ],
        [
          ["跪了很久。心里想的其实是别的事。", "但你没起来。"],
          { stats: { faith: 6 } },
        ],
        [
          ["祈祷到一半睡着了。醒来时神殿已经空了。", "有点羞愧，也有点松快。"],
          { stats: { faith: 3, energy: 4 } },
        ],
      ),
      cmd(
        "church_talk",
        "和神父交谈",
        "社交",
        8,
        "他们听过太多人的秘密，所以话很少",
        [
          ["神父和你聊了很久，最后只说了一句你正需要听的话。", "后来那句话你常想起。"],
          { stats: { faith: 5, charm: 3, int: 3 }, starDelta: { match: "", delta: 1, note: "他记得你这个人" } },
        ],
        [
          ["你们谈教义，也谈天气。", "出去的时候，比进来时平静。"],
          { stats: { faith: 4, charm: 2 } },
        ],
        [
          ["神父看出你在说谎，但没有点破。", "那种沉默，比责备更难受。"],
          { stats: { faith: 2, charm: -2 } },
        ],
      ),
      cmd(
        "church_archive",
        "翻查教会档案",
        "隐秘",
        12,
        "教会记了很多事，也包括不该记的",
        [
          ["你在旧册子里找到一个被划掉的名字，还有旁边的日期。", "那个日期，跟你身上的某件事对得上。"],
          { stats: { scheme: 7, int: 4 }, notice: "教会的档案里有与你相关的记录。" },
        ],
        [
          ["翻到些地方志和人事记录。", "大多无聊。有两条值得记。"],
          { stats: { int: 4, scheme: 2 } },
        ],
        [
          ["你被告知档案不外借。", "看守的口气客气得像一堵墙。"],
          { stats: { faith: 1, charm: -2 } },
        ],
      ),
      cmd(
        "church_heal",
        "在教会静养",
        "休养",
        6,
        "修女们的照料不比药差",
        [
          ["你住进神殿的侧院。修女们的照料比药管用。", "离开的时候，身子轻了，心也轻了。"],
          { stats: { health: 9, faith: 3 }, energy: 14, lifespan: 1 },
        ],
        [
          ["按教会的规矩起居，吃得清淡。", "至少这个月没再坏下去。"],
          { stats: { health: 6, faith: 2 }, energy: 8 },
        ],
        [
          ["住不惯。夜里总醒，白天也没精神。", "你提前走了。"],
          { stats: { health: 1 } },
        ],
      ),
    ],
  },
  {
    id: "labyrinth",
    name: "迷宫与野外",
    desc: "石头、霉味、滴水声。这里不欢迎活人，活人却总往里去。",
    match: (s) => s.character.origin.includes("迷宫") || has(s, "fame", 20),
    gate: VENUE_GATE.dungeon,
    commands: [
      cmd(
        "labyrinth_delve",
        "深入迷宫",
        "冒险",
        26,
        "越深，越值钱，也越难回来",
        [
          ["你在第四层找到一个没被开过的石室。", "里面的东西，够你一阵子不用为钱发愁。"],
          { tier: { kind: "adventure", gain: 20 }, stats: { fame: 8, wealth: 220, health: -6 }, goal: 6 },
        ],
        [
          ["往下推了两层，带回些能卖的东西。", "回程每一步，都比去时沉。"],
          { tier: { kind: "adventure", gain: 14 }, stats: { fame: 5, wealth: 110, health: -5 }, goal: 3 },
        ],
        [
          ["第二层撞上不该撞上的东西，扔下装备逃了出来。", "还能自己走路回来，已经算运气好。"],
          { tier: { kind: "adventure", gain: 6 }, stats: { health: -12, fame: -2 } },
        ],
      ),
      cmd(
        "labyrinth_map",
        "绘制路线与地图",
        "探索",
        14,
        "活着回来的人，靠的常是纸和笔",
        [
          ["你把这一层的地形整理成一张能用的图。", "这张图后来卖了两次，一次比一次贵。"],
          { stats: { int: 5, scheme: 4, wealth: 110 }, goal: 4 },
        ],
        [
          ["补全了半张地图。", "剩下的那半，得有人肯陪你再去一趟。"],
          { stats: { int: 4, wealth: 45 }, goal: 2 },
        ],
        [
          ["图画错了，害自己多绕了两天。", "你把纸撕了，重画。"],
          { stats: { int: 2, health: -3 } },
        ],
      ),
      cmd(
        "labyrinth_hunt",
        "狩猎魔物",
        "冒险",
        22,
        "先活下来，再谈别的",
        [
          ["你干净利落地解决了一头难缠的家伙。", "围观的人记住了你出手的样子。"],
          { tier: { kind: "adventure", gain: 16 }, stats: { fame: 6, sword: 3, wealth: 90 }, goal: 4 },
        ],
        [
          ["打到些能换钱的东西。", "身上多了两道口子。"],
          { tier: { kind: "adventure", gain: 11 }, stats: { fame: 3, wealth: 55, health: -5 }, goal: 2 },
        ],
        [
          ["你反过来被追了一路。", "最后是别人替你收的尾。"],
          { tier: { kind: "adventure", gain: 4 }, stats: { health: -10, fame: -3 } },
        ],
      ),
      cmd(
        "labyrinth_camp",
        "在营地休整",
        "休养",
        8,
        "活着回来的人有资格睡一觉",
        [
          ["在营地睡了两天两夜。醒来时伤口已经结痂。", "篝火旁边，同伴替你守着。"],
          { stats: { health: 8 }, energy: 12, goal: 1 },
        ],
        [
          ["处理伤口、补装备、吃口热的。", "下次能不能回来，靠的就是这些小事。"],
          { stats: { health: 5 }, energy: 8 },
        ],
        [
          ["营地夜里不太平。你几乎没合眼。", "天一亮就走了。"],
          { stats: { health: 1, energy: -6 } },
        ],
      ),
    ],
  },
  {
    id: "underworld",
    name: "暗巷与地下社会",
    desc: "湿墙、暗号、压低的声音。这里的规矩，比法律硬。",
    match: (s) => has(s, "scheme", 35) || s.character.origin.includes("奴隶") || s.character.origin.includes("诅咒"),
    gate: VENUE_GATE.underworld,
    commands: [
      cmd(
        "under_buy",
        "收买消息",
        "隐秘",
        14,
        "钱能买到话，买不到真话",
        [
          ["你付了钱，拿到一条真正有用的消息。", "从那以后，卖消息的人对你格外客气。"],
          { stats: { scheme: 7, int: 3 }, notice: "你掌握了某人的把柄。" },
        ],
        [
          ["买到些零碎的说法，真假自己分。", "至少知道了下一个问题该去哪儿问。"],
          { stats: { scheme: 4, wealth: -40 } },
        ],
        [
          ["喂给你的消息是假的，钱也花了。", "回头再找，摊子早就空了。"],
          { stats: { wealth: -70, scheme: -2 } },
        ],
      ),
      cmd(
        "under_trade",
        "做灰色买卖",
        "谋生",
        18,
        "来钱快的事，代价从不写在明面上",
        [
          ["做成了几笔。钱来得太快，快得你有点不安。", "那种不安，你没细想。"],
          { stats: { wealth: 190, scheme: 5 }, goal: 3 },
        ],
        [
          ["赚了些辛苦钱，也学会了怎么不在账本上留痕。", "这门手艺有用，也有风险。"],
          { stats: { wealth: 95, scheme: 4 } },
        ],
        [
          ["货砸在手里，还被人盯上。", "你换了个住处。"],
          { stats: { wealth: -110, scheme: 2, health: -4 } },
        ],
      ),
      cmd(
        "under_boss",
        "和地头蛇打交道",
        "社交",
        14,
        "先让对方觉得你还有用",
        [
          ["一句话里，你同时给了对方面子和台阶。", "他记住了你。这次是好的那种。"],
          { stats: { charm: 4, scheme: 5 }, starDelta: { match: "", delta: 2, note: "他在你身上看到了可用之处" } },
        ],
        [
          ["谈成了些事，没握手，也没立字据。", "在这种地方，这两样都不算数。"],
          { stats: { charm: 3, scheme: 3 } },
        ],
        [
          ["说错了话，被按在墙上警告了一回。", "你活着走出了那条巷子。"],
          { stats: { charm: -3, health: -6, scheme: 2 } },
        ],
      ),
      cmd(
        "under_job",
        "接下见不得光的活",
        "冒险",
        22,
        "报酬很高，前提是你别问为什么",
        [
          ["办完事，对方把钱放在桌上，多看了你一眼。", "那一眼的意思，是以后还会有活。"],
          { stats: { wealth: 240, scheme: 6, fame: -3 }, goal: 3 },
        ],
        [
          ["办得干净，没留下名字。", "这正是对方要的。"],
          { stats: { wealth: 130, scheme: 4 } },
        ],
        [
          ["你碰了不该碰的东西，被追了两条街。", "钱留下，换回一条命。"],
          { stats: { health: -12, wealth: -80, scheme: 2 } },
        ],
      ),
    ],
  },
  {
    id: "road",
    name: "旅途",
    desc: "风、尘土、别人的村子。路走久了，人自己会变。",
    match: (s) => has(s, "fame", 15),
    gate: VENUE_GATE.road,
    commands: [
      cmd(
        "road_travel",
        "启程前往新地方",
        "探索",
        20,
        "路比想象的远，人比想象的冷",
        [
          ["路上你撞见了一幕，让你看事情的角度变了。", "说不上好。但从那以后，你不一样了。"],
          { stats: { int: 5, charm: 3, scheme: 4 }, goal: 5, notice: "你见过了一件事，从此看世界的方式变了。" },
        ],
        [
          ["在某个岔路口停下，回头看了眼来处。", "然后继续往前走。"],
          { stats: { int: 3, scheme: 3 }, goal: 3 },
        ],
        [
          ["路上下雨，你病了一场。", "新地方的风是陌生的。只有天空还是一样。"],
          { stats: { health: -5, int: 2 } },
        ],
      ),
      cmd(
        "road_companion",
        "和旅伴相处",
        "社交",
        10,
        "一起走过难路的人，关系不一样",
        [
          ["一段难走的路，你们是一起熬过来的。", "有些话不用说，对方也知道。"],
          { stats: { charm: 4 }, addRelation: { name: "旅伴", role: "同行者", stars: 3, note: "你们在同一个屋檐下躲过雨，也从同一口锅里吃过饭" } },
        ],
        [
          ["你们聊了很多。", "在路上，人比平时坦白。"],
          { stats: { charm: 3, int: 2 }, starDelta: { match: "", delta: 1, note: "路上的交情" } },
        ],
        [
          ["合不来，最后还是各走各的。", "分开的时候，谁也没回头。"],
          { stats: { charm: -2 } },
        ],
      ),
      cmd(
        "road_walk",
        "慢慢走，不着急",
        "休养",
        -10,
        "在路上把身体和心都放慢",
        [
          ["走了整整一个月，什么也没做成。", "但你比出发时干净。"],
          { stats: { health: 6, int: 3 }, energy: 14, goal: 2 },
        ],
        [
          ["走得很慢，看了很多。", "有些风景解决不了任何问题，只是让人好受一点。"],
          { stats: { health: 4, int: 2 }, energy: 8 },
        ],
        [
          ["路上时间耗光了，钱袋也丢了。", "你学会了把东西缝进内衬。"],
          { stats: { health: 2, wealth: -60 } },
        ],
      ),
      cmd(
        "road_chore",
        "沿途打零工",
        "谋生",
        14,
        "手艺人在哪儿都饿不死",
        [
          ["在某个小镇的手工作坊做了一个月。", "作坊主想留你。你婉拒了，收下他写的一封推荐信。"],
          { stats: { wealth: 105, charm: 3, int: 2 }, goal: 2 },
        ],
        [
          ["做了些力气活，换到食宿和一点钱。", "够接着走。"],
          { stats: { wealth: 55, health: 2 } },
        ],
        [
          ["工钱被扣了一截。", "你没争。只记住了那个镇子的名字。"],
          { stats: { wealth: 15, scheme: 2 } },
        ],
      ),
    ],
  },
  {
    id: "battle",
    name: "战斗",
    desc: "刀已经出鞘。这里没有第二次机会，只有回得来的人和回不来的人。",
    match: (s) => age(s) >= 12,
    commands: [
      cmd(
        "bt_duel",
        "一对一决斗",
        "战斗",
        24,
        "正面交手，双方条件相当",
        [
          ["第三合，你看穿了对手出剑的习惯，先一步压住他的手腕。", "结束后他行了礼。在同行里，这算认了你的本事。"],
          { tier: { kind: "sword", gain: 16 }, stats: { sword: 5, fame: 5, health: -3 }, goal: 3 },
        ],
        [
          ["赢了。赢得不轻松。", "回去的路上，你把每一合都想了一遍。"],
          { tier: { kind: "sword", gain: 11 }, stats: { sword: 3, fame: 3, health: -5 }, goal: 2 },
        ],
        [
          ["对方的剑比你想的快。肩胛被划开，血把袖子浸透了。", "但你没白挨。那把剑的轨迹，你记了一辈子。"],
          { tier: { kind: "sword", gain: 9 }, stats: { sword: 4, health: -12, fame: -2 }, learnSkill: "sg_wrist_drop" },
        ],
      ),
      cmd(
        "bt_melee",
        "被卷入一场混战",
        "战斗",
        26,
        "敌我交错，没人顾得上你",
        [
          ["乱局里你守住了自己的位置，还顺手救起两个人。", "战后有人递酒过来，什么也没说。"],
          { tier: { kind: "sword", gain: 15 }, stats: { sword: 4, fame: 7, health: -6 }, goal: 4 },
        ],
        [
          ["这一场，你活着打完了。", "有些东西，永远留在了那片泥地上。"],
          { tier: { kind: "sword", gain: 10 }, stats: { fame: 4, health: -8 }, goal: 2 },
        ],
        [
          ["你被砍中两次，最后靠装死躲过去。", "爬出战场时，天已经黑了。"],
          { stats: { health: -16, fame: -3 }, learnSkill: "ng_field_medic" },
        ],
      ),
      cmd(
        "bt_guard",
        "守住某个人",
        "战斗",
        26,
        "不能退，退了后面的人就没了",
        [
          ["你把要护的人挡在身后，一步没退。", "事后他说，记住了你的背影。"],
          { stats: { fame: 6, sword: 4, health: -6 }, tier: { kind: "sword", gain: 13 }, starDelta: { match: "", delta: 2, note: "你替他挡了刀" }, goal: 4 },
        ],
        [
          ["人护住了，自己也挨了几下。", "这行里，能让自己心安的事不多，这是其中一件。"],
          { stats: { fame: 4, health: -7 }, tier: { kind: "sword", gain: 9 }, starDelta: { match: "", delta: 1, note: "他欠你一次" }, goal: 2 },
        ],
        [
          ["你没能护住。", "人散开以后，你站在原地很久。"],
          { stats: { health: -12, fame: -2 }, starDelta: { match: "", delta: -1, note: "那一幕他没法忘掉" } },
        ],
      ),
      cmd(
        "bt_hunt",
        "追杀一个目标",
        "战斗",
        24,
        "主动出手，主动权在你手上",
        [
          ["追上目标，解决了。干净利落。", "这让某些人，对你多了一分顾忌。"],
          { stats: { sword: 5, scheme: 4, wealth: 130, fame: 4 }, tier: { kind: "sword", gain: 14 }, goal: 4 },
        ],
        [
          ["目标跑了半座城，还是被你堵住。", "代价是这个月别的什么都没做成。"],
          { stats: { sword: 3, wealth: 70, health: -5 }, tier: { kind: "sword", gain: 9 }, goal: 2 },
        ],
        [
          ["目标跟丢了，还在暗巷里挨了埋伏。", "这套路，对方显然比你熟。"],
          { stats: { health: -14, scheme: 3, fame: -3 } },
        ],
      ),
      cmd(
        "bt_challenge",
        "与远强于自己的人过招",
        "战斗",
        28,
        "输是必然的，问题是你输得多难看",
        [
          ["对方只用了单手，第七合却逼得他换了站姿。", "收手时他多看了你一眼。那一眼比任何夸奖都有用。"],
          { tier: { kind: "sword", gain: 20 }, stats: { sword: 7, int: 4, fame: 6 }, learnSkill: "tk_cloak", goal: 5 },
        ],
        [
          ["全程被压着打，但撑过了二十合。", "回去才发现，自己以前练的有半数都是错的。"],
          { tier: { kind: "sword", gain: 14 }, stats: { sword: 5, int: 3, health: -8 }, goal: 3 },
        ],
        [
          ["一招都没接住。", "对方收手，说了句「先学会站」，走了。"],
          { tier: { kind: "sword", gain: 8 }, stats: { sword: 3, health: -16, charm: -3 } },
        ],
      ),
      cmd(
        "bt_retreat",
        "撤退、保命",
        "战斗",
        -6,
        "退不是输，活着才是本钱",
        [
          ["你看出这一仗打不赢，果断撤了。", "后来证明，这个判断救了你一命。"],
          { stats: { int: 5, health: 2, scheme: 3 }, energy: 10, goal: 2 },
        ],
        [
          ["退得不算好看，但身上没多几道口子。", "有人笑你。你没理。"],
          { stats: { int: 3, health: 1 }, energy: 6 },
        ],
        [
          ["撤退时乱了阵脚，装备丢了，脸也丢了。", "至少人还在。"],
          { stats: { health: -6, fame: -3, wealth: -60 } },
        ],
      ),
    ],
  },
  {
    id: "camp",
    name: "佣兵营地与边境",
    desc: "旗子、号声、泥地。这里的人拿命换工钱，谁也不问对方为什么来。",
    match: (s) => age(s) >= 16 && (has(s, "fame", 25) || has(s, "sword", 40)),
    gate: VENUE_GATE.frontier,
    commands: [
      cmd(
        "camp_battle",
        "参加一场战斗",
        "冒险",
        28,
        "活下来的那部分，才算经历",
        [
          ["混战里你救起两个人，位置也没丢。", "战后有人递酒给你，什么也没说。"],
          { tier: { kind: "adventure", gain: 20 }, stats: { fame: 8, sword: 4, health: -8 }, goal: 6 },
        ],
        [
          ["这一仗，你活着打完了。", "有些东西，留在了那片泥地上。"],
          { tier: { kind: "adventure", gain: 14 }, stats: { fame: 5, health: -8 }, goal: 3 },
        ],
        [
          ["你受了重伤，是被人抬下来的。", "醒来时，仗已经打完了。"],
          { tier: { kind: "adventure", gain: 6 }, stats: { health: -18, fame: -2 }, lifespan: -1 },
        ],
      ),
      cmd(
        "camp_drill",
        "跟着操练",
        "修炼",
        20,
        "军中的练法不好看，但管用",
        [
          ["军中那套笨办法，你练熟了。", "比道场里那些讲究的技法，更能让人活下来。"],
          { tier: { kind: "sword", gain: 17 }, stats: { sword: 5, health: 3 }, goal: 2 },
        ],
        [
          ["跟着操练了整整一个月。", "身体开始记住队列的节奏。"],
          { tier: { kind: "sword", gain: 12 }, stats: { sword: 3, health: 2 } },
        ],
        [
          ["你被教官当众罚了一回。", "此后练得更狠，却没什么长进。"],
          { tier: { kind: "sword", gain: 5 }, stats: { health: -3 } },
        ],
      ),
      cmd(
        "camp_mates",
        "和战友相处",
        "社交",
        12,
        "一起挨过冻的人，会记得彼此",
        [
          ["你替一个伤员顶了一班岗。", "这事没人提。但所有人都知道。"],
          { stats: { charm: 4, fame: 4 }, addRelation: { name: "战友", role: "同袍", stars: 3, note: "你替他顶过一整夜的岗" } },
        ],
        [
          ["和几个人混熟了。", "他们讲的笑话很粗。你笑了。"],
          { stats: { charm: 3, fame: 2 } },
        ],
        [
          ["你和人起了冲突。", "打了一架。然后各自走开。"],
          { stats: { charm: -3, health: -4 } },
        ],
      ),
      cmd(
        "camp_intel",
        "打探军情与调度",
        "隐秘",
        14,
        "知道下一仗在哪儿打，比会打更重要",
        [
          ["你摸清了指挥层的意图，还知道一个没有公开的调动。", "这条消息，将来会很值钱。"],
          { stats: { scheme: 7, int: 4 }, notice: "你提前知道了一场尚未公布的行动。" },
        ],
        [
          ["听到些调动的传闻。", "有的对得上，有的对不上。"],
          { stats: { scheme: 4, int: 2 } },
        ],
        [
          ["打听得太明显，被上头警告了一次。", "你把嘴闭上了。"],
          { stats: { scheme: 2, fame: -3 } },
        ],
      ),
    ],
  },
  {
    id: "library",
    name: "书库与研究室",
    desc: "纸的味道、天光、翻页声。有人在这儿用一辈子换一页纸。",
    match: (s) => has(s, "int", 45),
    gate: VENUE_GATE.library,
    commands: [
      cmd(
        "lib_study",
        "研读一整月",
        "学术",
        12,
        "读得慢，但读进去了",
        [
          ["你在某一页上停了很久，忽然懂了前面三百页在说什么。", "那种感觉，像一扇门开了。"],
          { stats: { int: 8, mana: 3 }, tier: { kind: "magic", gain: 12 }, goal: 4 },
        ],
        [
          ["读完一整卷，笔记做了很多。", "笔记比书本身更有用。"],
          { stats: { int: 5 }, tier: { kind: "magic", gain: 8 }, goal: 2 },
        ],
        [
          ["翻了一个月的书，没找到想要的东西。", "但你知道了：它已经不在这里。"],
          { stats: { int: 3 } },
        ],
      ),
      cmd(
        "lib_experiment",
        "做实验与验证",
        "学术",
        18,
        "知道和做到之间隔着很多次失败",
        [
          ["假设成立。比你预想的还漂亮。", "结果你记了三遍。"],
          { stats: { int: 6, mana: 5 }, tier: { kind: "magic", gain: 16 }, goal: 4 },
        ],
        [
          ["验证了一半，推翻了一半。", "被推翻的那半，同样有价值。"],
          { stats: { int: 4, mana: 3 }, tier: { kind: "magic", gain: 10 }, goal: 2 },
        ],
        [
          ["实验出了事故，桌上烧了个洞。", "器具的钱，你赔了。"],
          { stats: { int: 2, wealth: -60 } },
        ],
      ),
      cmd(
        "lib_recall",
        "依据文献修正术式",
        "修炼",
        16,
        "把书上的字变成手上的动作",
        [
          ["你照着文献改了自己的术式，效果出奇地稳。", "这一改，往后会一直跟着你。"],
          { tier: { kind: "magic", gain: 18 }, stats: { mana: 6, int: 3 }, goal: 3 },
        ],
        [
          ["调了几个环节，念起来顺多了。", "改动不大，长期有用。"],
          { tier: { kind: "magic", gain: 13 }, stats: { mana: 4, int: 2 } },
        ],
        [
          ["改动出了问题，练了半个月又改回去。", "至少你确认了，原来的写法是有道理的。"],
          { tier: { kind: "magic", gain: 5 } },
        ],
      ),
      cmd(
        "lib_copy",
        "抄录不外传的东西",
        "隐秘",
        14,
        "手抄一遍，胜过读十遍",
        [
          ["抄完整整一卷，也是真的读懂了。", "这本书的主人，不该把它放在这儿。"],
          { stats: { int: 7, scheme: 4, mana: 4 }, notice: "你手上多了一份不该存在的抄本。" },
        ],
        [
          ["抄了几页关键的内容。", "字很丑。内容是对的。"],
          { stats: { int: 4, scheme: 2 } },
        ],
        [
          ["抄的时候被人撞见，抄本被收走。", "连你的名字一起。"],
          { stats: { int: 2, charm: -4 } },
        ],
      ),
    ],
  },
  {
    id: "town-dojo",
    name: "罗亚道场",
    desc: "镇子边上的一间旧道场。教头是退了役的冒险者，收钱不多，也不问你从哪儿来。",
    match: (s) => s.character.residence === "罗亚町",
    gate: VENUE_GATE.townDojo,
    commands: [
      cmd(
        "td_drill",
        "在旧道场跟着练",
        "修炼",
        10,
        "地上的坑是几十年踩出来的",
        [
          ["教头不纠正你，只让你跟着前面的人做。", "做到第七天，你的收刀终于没有多余的停顿。"],
          { tier: { kind: "sword", gain: 9 }, stats: { sword: 2 }, goal: 1 },
        ],
        [
          ["练了一整个月，动作比来时干净了一点。", "就一点。这一点已经很值。"],
          { tier: { kind: "sword", gain: 6 }, stats: { sword: 1 } },
        ],
        [
          ["你练到手臂发僵，姿势反而更糟。", "教头说，明天再来。"],
          { tier: { kind: "sword", gain: 3 }, stats: { health: -2 } },
        ],
      ),
      cmd(
        "td_spar",
        "跟镇上的年轻人过两招",
        "修炼",
        12,
        "木刀上的磕痕比话多",
        [
          ["你和三个人轮流对练，输了两场，第三场赢下来。", "赢的那一下你自己都没料到。"],
          { tier: { kind: "sword", gain: 11 }, stats: { sword: 3, health: -2 }, goal: 2 },
        ],
        [
          ["你被摔了好几回。", "身体记住了点什么，说不清是什么。"],
          { tier: { kind: "sword", gain: 7 }, stats: { sword: 2, health: -3 } },
        ],
        [
          ["你的木刀被人磕飞了三次。", "捡起来的时候，教头在旁边看着，什么也没说。"],
          { tier: { kind: "sword", gain: 4 }, stats: { health: -4, int: 2 } },
        ],
        { minAge: 10 },
      ),
      cmd(
        "td_watch",
        "看教头示范一遍",
        "探索",
        6,
        "他出手不快，但你总晚半步",
        [
          ["他把同一个起手做了三遍，第三遍你才看出他脚下先动。", "那个先后顺序，你记了很久。"],
          { tier: { kind: "sword", gain: 6 }, stats: { int: 3, sword: 2 }, goal: 2 },
        ],
        [
          ["你看了整整一下午。", "看出来的只有一句：他从来不先动手。"],
          { stats: { int: 3, sword: 1 } },
        ],
        [
          ["他让你把手伸出来，说你体内有东西在动。", "那是你第一次听说「斗气」这两个字。"],
          { stats: { mana: 4, sword: 3 }, learnSkill: "tk_sense" },
        ],
      ),
    ],
  },
  {
    id: "royal-yard",
    name: "王都演武场",
    desc: "近卫与贵族子弟共用的一块场地。教习是打过仗的人，出手不留情面，也不看你的家世。",
    match: (s) => s.character.residence === "王都亚尔斯",
    gate: VENUE_GATE.royalYard,
    commands: [
      cmd(
        "ry_drill",
        "在演武场从早练到晚",
        "修炼",
        16,
        "这里的天黑得比别处晚，因为灯一直点着",
        [
          ["你从天亮练到灯灭。收刀时教习看了你一眼，那一眼算认可。", "第二天你爬不起来，但还是去了。"],
          { tier: { kind: "sword", gain: 15 }, stats: { sword: 5, health: -3 }, goal: 2 },
        ],
        [
          ["一个月下来，你的动作小了一圈。", "多余的部分被磨掉了，剩下的都是能用的。"],
          { tier: { kind: "sword", gain: 11 }, stats: { sword: 3, health: -2 } },
        ],
        [
          ["练得太狠，手腕肿了半个月。", "教习只说了句：练剑的人先学怎么伤。"],
          { tier: { kind: "sword", gain: 6 }, stats: { health: -6, int: 3 } },
        ],
      ),
      cmd(
        "ry_veteran",
        "与近卫的老手对练",
        "修炼",
        18,
        "他打过仗，身上有疤，出手不讲道理",
        [
          ["他先让你出招，然后在你以为赢了的那一瞬把你按在地上。", "「战场上没有第三合。」他说。"],
          { tier: { kind: "sword", gain: 17 }, stats: { sword: 5, health: -4 }, goal: 3 },
        ],
        [
          ["你被他压着打了二十合。", "回去才发现，自己以前练的有一半用不上。"],
          { tier: { kind: "sword", gain: 12 }, stats: { sword: 4, int: 3, health: -5 } },
        ],
        [
          ["他收手时把手腕一沉，你的刀就落了。", "「这一手叫腕落。」他说，「学会它，至少能保住自己一条胳膊。」"],
          { tier: { kind: "sword", gain: 8 }, stats: { sword: 3 }, learnSkill: "sg_wrist_drop" },
        ],
        { swordTier: "中级" },
      ),
      cmd(
        "ry_coach",
        "听教习讲战场上的事",
        "探索",
        8,
        "他讲得零碎，但每一段都是拿命换的",
        [
          ["他讲了三场仗，讲了半场就停了，说剩下的不该说。", "你记下的是另外半句：别站在队伍最中间。"],
          { stats: { int: 4, scheme: 4, sword: 2 }, goal: 2 },
        ],
        [
          ["他讲的都是些琐碎的东西：怎么系鞋带、怎么把水壶绑紧。", "琐碎的东西在战场上最要紧。"],
          { stats: { int: 3, scheme: 2 } },
        ],
        [
          ["他让你去搬了一下午的沙袋，什么也没讲。", "搬完他说，这就是战场上需要的那种人。"],
          { stats: { health: 4, sword: 2 } },
        ],
      ),
      cmd(
        "ry_notice",
        "在演武场被人看中",
        "社交",
        12,
        "贵族子弟在场上练，眼睛在下面看着",
        [
          ["你在场上赢了一场不该赢的比试。看台上有人记下了你的名字。", "第二天，有人替你付了一整年的场地钱。"],
          { stats: { charm: 4, fame: 5, sword: 2 }, factions: { 阿斯拉王国: 8 }, goal: 4 },
        ],
        [
          ["有人赛后问了你两句，问得很客气。", "你答得客气，两边都没往深了说。"],
          { stats: { charm: 3, fame: 3 }, factions: { 阿斯拉王国: 4 } },
        ],
        [
          ["你被人当众赢了，赢得很难看。", "看台上笑了一声就散了。"],
          { stats: { fame: -3, charm: -2, sword: 2 }, factions: { 阿斯拉王国: -4 } },
        ],
      ),
    ],
  },
];

/* ------------------------------------------------------------------ *
 * 条件指令
 *
 * 原作设定的具体落点：能不能做一件事，取决于你现在是什么人。
 * 剑神流的奥义要有剑神流的身份与阶级去接，魔导铠要有智力与门路，
 * 奴隶市场的东西要用钱说话，米里斯教徒不会去接见不得光的契约。
 * 条件不满足时按钮显示为不可执行，并写清楚缺什么。
 * ------------------------------------------------------------------ */

/** 判定条件用的等级顺序 */
const RANK_ORDER = ["未注册", "F", "E", "D", "C", "B", "A", "S"];

const STAT_LABEL: Record<string, string> = {
  mana: "魔力",
  sword: "剑术造诣",
  int: "智力",
  charm: "魅力",
  faith: "信仰",
  wealth: "财富",
  fame: "声望",
  scheme: "密谋",
  health: "健康",
};

const tierRank = (t: string) => TIERS.indexOf(t);

/** 指令是否可执行。返回不可执行的原因，供界面直接显示 */
export function checkCommand(s: GameState, c: PresetCommand): { ok: boolean; reason: string } {
  // 剧情门槛先判：门没开，这条指令本来就不该存在于你的处境里
  if (!gateOpen(s, c.gate)) return { ok: false, reason: gateReason(s, c.gate) };

  const req = c.require;
  if (!req) return { ok: true, reason: "" };

  const miss: string[] = [];
  const statOf = (k: string) => s.stats.find((x) => x.key === k)?.value ?? 0;

  if (req.minAge !== undefined && s.character.age < req.minAge) miss.push(`年龄不满 ${req.minAge} 岁`);
  if (req.stats) {
    for (const [k, v] of Object.entries(req.stats)) {
      if (statOf(k) < v) miss.push(`${STAT_LABEL[k] ?? k}需 ${v} 以上（现为 ${statOf(k)}）`);
    }
  }
  if (req.swordTier && tierRank(s.character.swordTier) < tierRank(req.swordTier)) {
    miss.push(`剑术需 ${req.swordTier} 以上`);
  }
  if (req.magicTier && tierRank(s.character.magicTier) < tierRank(req.magicTier)) {
    miss.push(`魔术需 ${req.magicTier} 以上`);
  }
  if (req.adventurerRank && RANK_ORDER.indexOf(s.character.adventurerRank) < RANK_ORDER.indexOf(req.adventurerRank)) {
    miss.push(`冒险者等级需 ${req.adventurerRank} 以上`);
  }
  if (req.origin && !req.origin.some((v) => s.character.origin.includes(v))) {
    miss.push(`需为${req.origin.join("或")}出身`);
  }
  if (req.residence && !req.residence.includes(s.character.residence)) {
    miss.push(`需身处${req.residence.join("或")}`);
  }
  if (req.swordSchool && !req.swordSchool.includes(s.character.swordSchool)) {
    miss.push(`需习${req.swordSchool.join("或")}`);
  }
  if (req.faith && !req.faith.includes(s.character.faith)) {
    miss.push(`需信仰${req.faith.join("或")}`);
  }
  if (req.politics && !req.politics.includes(s.character.politics)) {
    miss.push(`需倾向${req.politics.join("或")}`);
  }
  if (req.anySkill && !req.anySkill.some((id) => s.skills.includes(id))) {
    miss.push("需先掌握对应的招式");
  }
  if (req.allSkills && !req.allSkills.every((id) => s.skills.includes(id))) {
    miss.push("需同时掌握多门招式");
  }
  if (req.relation) {
    const rel = s.relations.find((r) => r.name.includes(req.relation!.name));
    if (!rel || rel.stars < req.relation.minStars) {
      miss.push(`与「${req.relation.name}」的好感需 ${req.relation.minStars} 星以上`);
    }
  }
  if (req.anyoneHere && !anyoneAround(s)) {
    miss.push("身边现在没有能当面说上话的人");
  }
  if (req.forbid) {
    const f = req.forbid;
    if (f.origin && f.origin.some((v) => s.character.origin.includes(v))) miss.push("你的出身做不了这件事");
    if (f.residence && f.residence.includes(s.character.residence)) miss.push("你所在的地方做不了这件事");
    if (f.swordSchool && f.swordSchool.includes(s.character.swordSchool)) miss.push("你的流派做不了这件事");
    if (f.faith && f.faith.includes(s.character.faith)) miss.push("你的信仰不允许你这样做");
    if (f.politics && f.politics.includes(s.character.politics)) miss.push("你的立场不允许你这样做");
  }

  return { ok: miss.length === 0, reason: miss.join("；") };
}

/** 按场景 id 追加的进阶指令 */
const CONDITIONAL_COMMANDS: Record<string, PresetCommand[]> = {
  battle: [
    cmd(
      "bt_light_blade",
      "以剑神流奥义结束这一战",
      "战斗",
      34,
      "光之太刀只有一次机会，练到剑圣才谈得上用它",
      [
        ["你先动了。刀锋从对手的腕上过去，他的剑先落地，人还没反应过来。", "……练了十年，原来赢一次只要这么短的时间。"],
        { tier: { kind: "sword", gain: 14 }, stats: { fame: 6, sword: 4 }, goal: 3 },
      ],
      [
        ["你把斗气全灌进这一斩。对手退了半步，你没追。", "收刀时手在抖，站姿却没散。"],
        { tier: { kind: "sword", gain: 11 }, stats: { sword: 3, fame: 4 } },
      ],
      [
        ["你把一切都押在这一刀上。位置偏了半分，对手的手比你的刀先到。", "你活了。但那一刀，你很久才敢再出。"],
        { tier: { kind: "sword", gain: 5 }, stats: { sword: 3, health: -10 } },
      ],
      { swordSchool: ["剑神流"], swordTier: "圣级" },
    ),
    cmd(
      "bt_deprivation",
      "用水神流接下这一击再还回去",
      "战斗",
      32,
      "水神流取的是「后的先」，先到的是你",
      [
        ["你没有迎上去。只是把剑转了一个很小的角度，对手的架势就空了。", "收剑时，对面的人还在想自己的刀去了哪儿。"],
        { tier: { kind: "sword", gain: 13 }, stats: { sword: 4, int: 3, fame: 4 } },
      ],
      [
        ["那一击你卸开了，反击没打实。", "但你自己清楚，刚才那下不是运气。"],
        { tier: { kind: "sword", gain: 10 }, stats: { sword: 3, int: 3 } },
      ],
      [
        ["你想卸，没卸干净。剑压在肩上，把你钉进了地面。", "从残局里爬起来。那种被压住的感觉，你记住了。"],
        { tier: { kind: "sword", gain: 6 }, stats: { sword: 3, health: -11 } },
      ],
      { swordSchool: ["水神流"], swordTier: "上级" },
    ),
    cmd(
      "bt_kippa",
      "北神流奇拔派：把能用的都用上",
      "战斗",
      28,
      "沙、网、道具、魔术，能赢就行",
      [
        ["你先撒沙，再放魔术，最后才拔剑。对手一直在应付你不讲规矩的那部分。", "北神流被说成是兵法，不是没道理。"],
        { tier: { kind: "sword", gain: 12 }, stats: { sword: 3, scheme: 4, fame: 3 } },
      ],
      [
        ["随身的东西全扔了出去，场面一度很难看。", "但你活着。对面比你更难看。"],
        { tier: { kind: "sword", gain: 9 }, stats: { scheme: 3, sword: 2 } },
      ],
      [
        ["东西扔光了，对手却毫发无伤地站到你面前。", "奇拔派的前提，是你手里还得留着一手能收尾的真东西。"],
        { tier: { kind: "sword", gain: 4 }, stats: { health: -9, scheme: 2 } },
      ],
      { swordSchool: ["北神流"], swordTier: "中级" },
    ),
    cmd(
      "bt_cloak",
      "缠绕斗气正面压上去",
      "战斗",
      26,
      "把魔力贴满全身，硬碰硬",
      [
        ["斗气缠满全身之后，你的重量变了。你没躲，也不必躲。", "这一战靠的不是技巧，是你练出来那层壳。"],
        { tier: { kind: "sword", gain: 12 }, stats: { sword: 4, health: -3 } },
      ],
      [
        ["你顶着对面的攻击往前推，推到他退，推到他怕。", "打完才发现，手臂在渗血。"],
        { tier: { kind: "sword", gain: 9 }, stats: { sword: 3, health: -5 } },
      ],
      [
        ["斗气在最后一刻散了。你冲得太前，收得太晚。", "被人拖回来的时候，你还记得那股气忽然离开身体的感觉。"],
        { tier: { kind: "sword", gain: 5 }, stats: { health: -12 } },
      ],
      { anySkill: ["tk_cloak"] },
    ),
    cmd(
      "bt_barrage",
      "以魔术做远程压制",
      "战斗",
      24,
      "站得远、出手快，前提是你有那个魔力储备",
      [
        ["你在对手够不到的地方接连发动。不需要赢得漂亮，只要不给对方靠近的机会。", "魔术师近身很弱。最好的办法，是别让这一战变成近身战。"],
        { tier: { kind: "magic", gain: 13 }, stats: { mana: 4, int: 3 } },
      ],
      [
        ["压住了对面，也把自己的魔力压到了底。", "最后几发，是靠意志发出去的。"],
        { tier: { kind: "magic", gain: 9 }, stats: { mana: 3, int: 2, health: -3 } },
      ],
      [
        ["对面比你以为的快。三发还没发完，人已经贴到面前。", "「魔术师近身很弱」，这句话你亲身验过一遍。"],
        { tier: { kind: "magic", gain: 5 }, stats: { health: -10, mana: 3 } },
      ],
      { magicTier: "上级" },
    ),
    cmd(
      "bt_combo",
      "泥沼与岩砲弾的组合",
      "战斗",
      28,
      "先用泥沼按住，再用岩砲弾送过去",
      [
        ["你把泥沼铺在对手脚下，等他挣扎，再从空中砸下岩块。", "混成魔术的价值，不在单发多强，而在两发之间没有空隙。"],
        { tier: { kind: "magic", gain: 14 }, stats: { mana: 5, int: 4 }, goal: 3 },
      ],
      [
        ["泥沼起了作用，岩砲弾差了点准头。", "对手带着一身泥跑了。这不影响结果。"],
        { tier: { kind: "magic", gain: 10 }, stats: { mana: 4, int: 3 } },
      ],
      [
        ["两道魔术你连着放了出去，中间那半息被对手抓住。", "混成的前提是魔力够撑两发。你还差一点。"],
        { tier: { kind: "magic", gain: 6 }, stats: { mana: 3, health: -8 } },
      ],
      { allSkills: ["mg_mud_swamp", "mg_stone_cannon"] },
    ),
    cmd(
      "bt_judge",
      "先判断这一仗该不该打",
      "战斗",
      12,
      "冒险者活得久的办法，是知道什么时候不打",
      [
        ["你看了眼对面的站位、武器和地形，决定绕路。", "这一趟没有战绩，也没有损失。同队的人后来说，你判断得对。"],
        { stats: { int: 4, scheme: 4, fame: 2 }, goal: 2 },
      ],
      [
        ["你判断可以打，也确实打赢了。", "赢了以后你没得意。你知道，差一点就输了。"],
        { tier: { kind: "adventure", gain: 8 }, stats: { int: 3, scheme: 3 } },
      ],
      [
        ["你判断可以打。判断错了。", "这一课值一条伤腿。也算便宜。"],
        { stats: { int: 5, health: -7 } },
      ],
      { adventurerRank: "C" },
    ),
  ],

  dojo: [
    cmd(
      "dj_gal",
      "向剑神求一刀",
      "修炼",
      22,
      "他要的不是你赢，是你敢站到他对面",
      [
        ["他随手一挥，你的木刀就飞了。", "「回去。」他把这两个字说得很平。你把刀捡起来，站回原位。"],
        { tier: { kind: "sword", gain: 11 }, stats: { sword: 4 }, goal: 2 },
      ],
      [
        ["第三次，你总算看见了他的手是怎么起的。", "「记住刚才那下。」他说，「记不住就再来。」"],
        { tier: { kind: "sword", gain: 14 }, stats: { sword: 5, int: 3 } },
      ],
      [
        ["这一次，他多停了半瞬。你的刀没伤到他，但确实近了。", "「无音之太刀不是快，是让你听不见。」他把诀窍讲了半句。"],
        { tier: { kind: "sword", gain: 18 }, stats: { sword: 6, int: 4 }, learnSkill: "sg_light_blade", factions: { 剑之圣地: 6 } },
      ],
      { swordSchool: ["剑神流"], swordTier: "上级" },
    ),
    cmd(
      "dj_reida",
      "请水神拆解你的一刀",
      "修炼",
      20,
      "有人愿意讲，是难得的事",
      [
        ["她让你劈，然后一次次把你的剑引到空处。", "一天下来，胳膊抬不起来，心里却清楚多了。"],
        { tier: { kind: "sword", gain: 11 }, stats: { sword: 3, int: 4 } },
      ],
      [
        ["「你先出手，所以我先到。」这句话她说了三遍。", "第三遍，你懂了。"],
        { tier: { kind: "sword", gain: 14 }, stats: { sword: 4, int: 5 } },
      ],
      [
        ["她破例给你演示了一遍「流」——同一个字，入门是它，最高处也是它。", "你手里像多了点什么。你说不清，但剑知道。"],
        { tier: { kind: "sword", gain: 17 }, stats: { sword: 6, int: 5 }, learnSkill: "wg_nagare", factions: { 剑之圣地: 5 } },
      ],
      { swordSchool: ["水神流"], swordTier: "上级" },
    ),
    cmd(
      "dj_alex",
      "向北神流的前辈讨教",
      "修炼",
      20,
      "北神流不讲规矩，所以也不讲情面",
      [
        ["他没拔剑。用的是地形、距离和你自己的重心。", "被摔了一整天。第二天，还是在同一个地方被摔倒。"],
        { tier: { kind: "sword", gain: 11 }, stats: { sword: 3, scheme: 4 } },
      ],
      [
        ["他终于拔剑，只出了三招。", "三招之后你明白了：北神流的底子是在实战里攒的，抄不来。"],
        { tier: { kind: "sword", gain: 14 }, stats: { sword: 4, scheme: 5, int: 3 } },
      ],
      [
        ["他把那一派的思路讲给你：只要能赢，用什么都行。", "这话听着轻。真做起来，要放下不少东西。"],
        { tier: { kind: "sword", gain: 16 }, stats: { sword: 5, scheme: 6 }, learnSkill: "ng_kippa" },
      ],
      { swordSchool: ["北神流"], stats: { sword: 40 } },
    ),
    cmd(
      "dj_gino",
      "陪最年少的剑圣练一场",
      "修炼",
      16,
      "他懒得认真，除非你先让他觉得有意思",
      [
        ["他赢得随意，收剑时还打了半个哈欠。", "「你起手太早了。」他只说了这一句。"],
        { tier: { kind: "sword", gain: 10 }, stats: { sword: 4 } },
      ],
      [
        ["你逼他多用了几分力。代价是被摔了十几次。", "摔完以后，他肯多说几句了。"],
        { tier: { kind: "sword", gain: 13 }, stats: { sword: 5, health: -3 } },
      ],
      [
        ["他教了你「腕落」——拿木刀也能废掉一条胳膊的那一手。", "「学会这个，至少能保住自己的一条。」他说得没有半点起伏。"],
        { tier: { kind: "sword", gain: 15 }, stats: { sword: 5 }, learnSkill: "sg_wrist_drop" },
      ],
      { minAge: 10, swordTier: "中级" },
    ),
    cmd(
      "dj_duel",
      "与同门以真剑对练",
      "修炼",
      18,
      "真剑和木刀之间的差距，只有挨过的人才懂",
      [
        ["你们收了力。真剑不收力。", "练完后两人都坐在地上，谁也没先开口。"],
        { tier: { kind: "sword", gain: 12 }, stats: { sword: 5, health: -4 } },
      ],
      [
        ["一次交手之后，你看见了对方的破绽，也看见了自己的。", "这种对练，最能长东西。"],
        { tier: { kind: "sword", gain: 15 }, stats: { sword: 6, int: 3, health: -4 } },
      ],
      [
        ["你被划开一道很深的口子。同门把你按住，替你处理伤口。", "疼是真疼。但从那以后，你不再怕真剑。"],
        { tier: { kind: "sword", gain: 17 }, stats: { sword: 7, health: -12 } },
      ],
      { minAge: 12, swordTier: "中级" },
    ),
  ],

  academy: [
    cmd(
      "ac_special",
      "申请特殊生名额",
      "学术",
      16,
      "特殊生不必上课，只需把名字借给学校",
      [
        ["你在名册上留了个名字，然后出了校门。", "从此多了个「曾入学者」的身份，也省了不少麻烦。"],
        { stats: { int: 4, fame: 3 }, factions: { 魔法大学: 8 }, goal: 3 },
      ],
      [
        ["教务处问了你三个问题，来回问。最后给了一年的观察期。", "他们看中的不是你答得对不对，是你身上有多少魔力。"],
        { stats: { int: 5, mana: 3 }, factions: { 魔法大学: 6 } },
      ],
      [
        ["一位教授把你单独留下谈话，说你的情况值得记一份。", "你成了禁书区之外，另一种意义上的资料。"],
        { stats: { int: 6, mana: 4, fame: 4 }, factions: { 魔法大学: 12 }, notice: "你以特殊生身份进入了魔法大学的名册。" },
      ],
      { stats: { mana: 55 } },
    ),
    cmd(
      "ac_forbidden",
      "进禁书区翻不该翻的东西",
      "学术",
      18,
      "禁忌知识放在那里，就是为了让人去翻",
      [
        ["你在最里面的书架上抽出一本没有书名的册子。", "翻两页就放了回去。有些东西读过了就忘不掉。"],
        { stats: { int: 5, scheme: 3 } },
      ],
      [
        ["你抄下一段关于魔术阵的旧笔记。", "转身时走廊那头有脚步声。你等到它走远。"],
        { stats: { int: 6, scheme: 4, mana: 3 } },
      ],
      [
        ["抄完一整章，还带走了夹在书里的一页手稿。", "后来教授问起谁来过禁书区。你没说话。"],
        { stats: { int: 8, mana: 5, scheme: 3 }, factions: { 魔法大学: -6 }, notice: "你在禁书区带走了一页不该带走的东西。" },
      ],
      { stats: { int: 45 } },
    ),
    cmd(
      "ac_chantless",
      "练无咏唱施法",
      "学术",
      20,
      "把咏唱压进呼吸里，四万分之一的人才做得到",
      [
        ["练了整整一个月，能不发咏唱放出最小的一发火球。", "小得可笑。但那是你自己做到的。"],
        { stats: { mana: 4, int: 4 }, tier: { kind: "magic", gain: 9 } },
      ],
      [
        ["你把咏唱从嘴里挪到心里，再从心里挪到手上。", "中间几天，你连说话都觉得多余。"],
        { stats: { mana: 6, int: 5 }, tier: { kind: "magic", gain: 12 } },
      ],
      [
        ["那天你什么都没想，火球就出来了。", "你愣了很久。原来这道门槛不在魔力，在你敢不敢不张嘴。"],
        { stats: { mana: 8, int: 6 }, learnSkill: "mg_chantless", notice: "你学会了无咏唱施法。" },
      ],
      { magicTier: "中级" },
    ),
    cmd(
      "ac_barrier",
      "研习结界魔术",
      "学术",
      18,
      "划出一块被隔开的地方，里面的规矩由你定",
      [
        ["在实验室里画了半个月的阵。", "阵能立起来。一碰就散。"],
        { stats: { int: 4, mana: 3 } },
      ],
      [
        ["你开始明白，结界不是墙，是一段被写死的规矩。", "想通了这一点，剩下的只是练。"],
        { stats: { int: 6, mana: 4 }, tier: { kind: "magic", gain: 10 } },
      ],
      [
        ["你终于让一小片空间静了下来——风停了，声音也进不去。", "你在自己的结界里站了很久。出来时，外头天已经黑了。"],
        { stats: { int: 7, mana: 5 }, learnSkill: "mg_binding", notice: "你掌握了结界魔术的基础。" },
      ],
      { magicTier: "上级" },
    ),
    cmd(
      "ac_zanoba",
      "替那位王子跑一趟人偶的事",
      "社交",
      16,
      "他要的东西很具体，付钱也从不含糊",
      [
        ["你替他跑了三个城镇，带回一堆手艺人的名字。", "他把名字一个个抄进本子，抄得极慢。"],
        { stats: { wealth: 45, int: 4 }, goal: 2 },
      ],
      [
        ["你找到的不只是人，还有一个愿意跟着走的手艺人。", "他当场结了钱，还让人记下你的名字。"],
        { stats: { wealth: 70, int: 5 }, starDelta: { match: "扎诺巴", delta: 1, note: "他把你算进自己的计划" } },
      ],
      [
        ["你在一堆废品里翻到一具会动的旧人偶，带回去给他。", "他捧着它看了一整夜。第二天，跟你说话的语气都变了。"],
        { stats: { wealth: 90, int: 6 }, starDelta: { match: "扎诺巴", delta: 2, note: "你给了他一件他没有的东西" } },
      ],
    ),
  ],

  guild: [
    cmd(
      "gd_rank_high",
      "接一件高出自己一级的委托",
      "冒险",
      26,
      "公会的规矩是规矩，但规矩留了缝",
      [
        ["委托比预想的麻烦，报酬也比预想的多。", "你活着回来。柜台在卡片上盖了个章。那个章有用。"],
        { tier: { kind: "adventure", gain: 15 }, stats: { fame: 5, wealth: 60, health: -4 }, goal: 3 },
      ],
      [
        ["回程路上你想，所谓越级，不过是多走一段没人替你走的路。", "但你走完了。"],
        { tier: { kind: "adventure", gain: 12 }, stats: { fame: 4, health: -3 } },
      ],
      [
        ["你差一点没回来。公会没追究，只把你的记录划掉。", "同行的老手说，越级失败不算降级，算长记性。"],
        { tier: { kind: "adventure", gain: 4 }, stats: { health: -9, fame: -2 } },
      ],
      { adventurerRank: "C" },
    ),
    cmd(
      "gd_search",
      "加入菲托亚领搜索团",
      "冒险",
      22,
      "整个领地消失了，能找的人都在找",
      [
        ["你跟着队伍翻遍山谷和河滩。交得回去的是名单，不是人。", "可每多一个名字，就少一户人家白等。"],
        { tier: { kind: "adventure", gain: 12 }, stats: { fame: 6, charm: 3, int: 3 }, goal: 3 },
      ],
      [
        ["你在一个村子里找到幸存者，把人带回营地。", "那人一路没说话，只抓着你的衣角。"],
        { tier: { kind: "adventure", gain: 10 }, stats: { fame: 5, charm: 4 } },
      ],
      [
        ["你在一片废墟里找到一件被丢下的东西，登记后交了上去。", "没人知道它是谁的。你把它记住了。"],
        { tier: { kind: "adventure", gain: 8 }, stats: { int: 4, fame: 3 }, notice: "你在转移事件的废墟里带回了一件无主之物。" },
      ],
      { stats: { fame: 15 } },
    ),
    cmd(
      "gd_kish",
      "和情报屋坐到同一张桌上",
      "社交",
      12,
      "他知道的事比公会的档案多，代价是你要听他讲完",
      [
        ["他讲了一整晚。从价钱讲到人事，从人事讲到谁家的门朝哪开。", "该记的，你记住了。"],
        { stats: { scheme: 4, int: 3 } },
      ],
      [
        ["他随口提了一句：某条商路下个月会断。", "你照这个判断改了行程，省下不少事。"],
        { stats: { scheme: 5, int: 4 }, goal: 2 },
      ],
      [
        ["酒喝到后面，他忽然正经起来：「你这个人，我记住了。」", "这句话让你在整个后半程都在回想，自己说过什么。"],
        { stats: { scheme: 6, int: 4 }, threads: { humanGod: "一个情报屋说你「记住了你」。你还没想明白这句话的意思。" } },
      ],
      { stats: { scheme: 25 } },
    ),
  ],

  church: [
    cmd(
      "ch_pope",
      "求见教皇",
      "信仰",
      14,
      "大圣堂的门比看上去重，但并非关着",
      [
        ["你在大圣堂外等了很多天。最后见到的是一位枢机主教。", "他听完你的话，记了几笔，让你回去等消息。"],
        { stats: { faith: 5, scheme: 3 }, factions: { 米里斯教团: 6 } },
      ],
      [
        ["有人把你引到侧堂。一位老人问了你三个问题。", "他没表明身份。但你知道他是谁。"],
        { stats: { faith: 6, int: 4, fame: 3 }, factions: { 米里斯教团: 10 } },
      ],
      [
        ["教皇亲手把一枚旧徽章放进你手里，说：教团里也有不想打下去的人。", "这句话从他嘴里出来，比任何经文都重。"],
        { stats: { faith: 8, fame: 5, scheme: 4 }, factions: { 米里斯教团: 16 }, notice: "你见过米里斯教皇，并接下了一件事。" },
      ],
      { stats: { faith: 40 } },
    ),
    cmd(
      "ch_heal",
      "在教区替人看伤",
      "信仰",
      16,
      "教团做的是这个，你想做的也是这个",
      [
        ["你每天早起，把送来的伤一个个处理完。", "没人问你信什么。只问，明天还来不来。"],
        { stats: { faith: 4, charm: 4, health: 3 }, factions: { 米里斯教团: 5 } },
      ],
      [
        ["你治好的人，后来带着全家来道谢。", "神父在旁边看着，什么也没说。但看你的眼神松了。"],
        { stats: { faith: 5, charm: 5, fame: 3 }, factions: { 米里斯教团: 8 } },
      ],
      [
        ["你把一个被当成异端赶出来的人留在后门，替他包扎。", "这事传出去以后，教团里有人记住了你。善意和恶意都有。"],
        { stats: { faith: 6, charm: 6, fame: 4, scheme: 3 }, factions: { 米里斯教团: -4 }, notice: "你替一个被指为异端的人处理了伤口。" },
      ],
      { anySkill: ["mg_healing"] },
    ),
  ],

  capital: [
    cmd(
      "cp_ball",
      "出席上级贵族的宴会",
      "社交",
      20,
      "一场宴会能说清的事，比一年书信都多",
      [
        ["你端着杯子站在柱子边，听完两派人各自的说法。", "没人问你的来意。但很多人记住了你的脸。"],
        { stats: { charm: 4, scheme: 4, fame: 3 }, factions: { 阿斯拉王国: 6 } },
      ],
      [
        ["一位家臣主动过来寒暄，问你家在哪。", "这个问题后头还跟着三个问题。你答得很慢。"],
        { stats: { charm: 5, scheme: 5, int: 3 }, factions: { 阿斯拉王国: 8 } },
      ],
      [
        ["第二王女派的人把你单独留下，说了一句：「下次不要站在柱子后面。」", "你被看见了。也被掂量过了。"],
        { stats: { charm: 6, scheme: 6, fame: 6 }, factions: { 阿斯拉王国: 14 }, notice: "你进入了王位派系的视线。" },
      ],
      { minAge: 16, stats: { fame: 30 } },
    ),
    cmd(
      "cp_ariel",
      "投效第二王女一系",
      "社交",
      18,
      "她缺的不是人手，是能用的人",
      [
        ["她先让你做了几件小事，每一件都有人看着。", "做完之后，她身边的护卫记住了你走路的样子。"],
        { stats: { scheme: 5, int: 4, fame: 4 }, factions: { 阿斯拉王国: 10 } },
      ],
      [
        ["你被派去处理一件贵族不便出面的事。", "办完，她只说了一句：「你还算干净。」"],
        { stats: { scheme: 7, int: 5, fame: 5 }, factions: { 阿斯拉王国: 14 } },
      ],
      [
        ["她把你留到最后，直言不讳地讲了王的两个儿子。", "「我要的不是忠诚，」她说，「是知道自己在做什么的人。」"],
        { stats: { scheme: 8, int: 6, fame: 6 }, factions: { 阿斯拉王国: 18 }, starDelta: { match: "爱丽儿", delta: 1, note: "她开始把你当可用之人" } },
      ],
      { politics: ["阿斯拉王室派"] },
    ),
    cmd(
      "cp_commoner",
      "以平民身份求见一位贵族",
      "社交",
      10,
      "门房看的是你的鞋，不是你的话",
      [
        ["你在门外站了半天。最后等来的答复是「大人今日不见客」。", "门房很客气。这种客气，你听得出是练过的。"],
        { stats: { scheme: 2, int: 2 } },
      ],
      [
        ["你换了身衣服，又去了一趟。这次见到了管事。", "管事听完，说会转告。然后就没了下文。"],
        { stats: { scheme: 3, charm: 2, int: 2 } },
      ],
      [
        ["你拦下一位正要出门的贵族，把话说完。", "他听完只说了句「有意思」。然后，他真的记住了你的名字。"],
        { stats: { charm: 5, scheme: 3, fame: 4 }, factions: { 阿斯拉王国: 6 } },
      ],
      { origin: ["平民", "奴隶", "冒险者", "剑之圣地", "拉诺亚魔法大学", "长耳族", "兽族", "魔族"] },
    ),
  ],

  labyrinth: [
    cmd(
      "lz_transfer_maze",
      "深入转移迷宫",
      "冒险",
      32,
      "九头龙守着最下面那一层，去的人多，回来的人少",
      [
        ["你在迷宫里走了十几天，补给见底才退出来。", "带走一件说不清用途的遗物，也带走了几个人的名字。"],
        { tier: { kind: "adventure", gain: 18 }, stats: { fame: 7, wealth: 80, health: -6 }, goal: 4 },
      ],
      [
        ["在中层撞上一场没有胜算的遭遇，靠着地形脱身。", "脱身之后才发现，自己一直在数还剩几个人。"],
        { tier: { kind: "adventure", gain: 13 }, stats: { fame: 5, health: -6, int: 3 } },
      ],
      [
        ["你没能下到最底层。腿上的伤，把你留在了第五层。", "同队的人把你拖了上来。那条往上爬的路，你记住了。"],
        { tier: { kind: "adventure", gain: 5 }, stats: { health: -14, fame: 2 } },
      ],
      { adventurerRank: "C" },
    ),
    cmd(
      "lz_hydra",
      "直面九头龙海德拉",
      "战斗",
      40,
      "九个头颅轮流扑过来，中间没有空隙",
      [
        ["你把所有招式都用了出来，撑到队伍撤完。", "海德拉退回黑暗里。你活下来了。"],
        { tier: { kind: "sword", gain: 20 }, stats: { fame: 12, sword: 6, health: -14 }, lifespan: -1, factions: { 冒险者公会: 12 } },
      ],
      [
        ["你砍下一个头，代价是被另一个头掀飞。", "有人把你从地上拽起来，一路拽到出口。"],
        { tier: { kind: "sword", gain: 16 }, stats: { fame: 8, sword: 4, health: -18 } },
      ],
      [
        ["你见到了它。也就只见到它。", "是别人把你背出来的。醒来时，你已经不记得自己是怎么到的那里。"],
        { stats: { health: -22, fame: 5, sword: 3 }, lifespan: -1, notice: "你直面过九头龙，并且活着被人抬了出来。" },
      ],
      { anySkill: ["sg_light_blade", "wg_five_arts", "wg_deprivation", "mg_cumulonimbus", "mg_lightning", "mg_alpha_strike"] },
    ),
  ],

  underworld: [
    cmd(
      "uw_buy",
      "在奴隶市场买下一个人",
      "隐秘",
      14,
      "这里的价签写在人身上",
      [
        ["你付了钱，把人领出来，给他一笔路费和一句话：别回头。", "他走了。没谢你。这很正常。"],
        { stats: { wealth: -140, charm: 3, scheme: 3 }, notice: "你从奴隶市场带走了一个人。" },
      ],
      [
        ["你买下的人不肯走，说要跟着你。", "这算好事还是麻烦，你说不清。"],
        { stats: { wealth: -150, charm: 4, fame: 2 }, addRelation: { name: "被买下的人", role: "追随者", stars: 3, note: "他坚持要留下，说自己没有别的地方可去。", bond: "同僚" } },
      ],
      [
        ["你买下的是个手上全是老茧的小姑娘。她说自己会做东西，做得很好。", "后来证明，这是你这辈子花得最值的一笔钱。"],
        { stats: { wealth: -160, int: 4, charm: 4 }, addRelation: { name: "手艺人", role: "随行工匠", stars: 3, note: "她的手很巧，而且记着是谁把她带出来的。", bond: "同僚" }, notice: "你从奴隶市场带回了一个有手艺的孩子。" },
      ],
      { stats: { wealth: 260 } },
    ),
    cmd(
      "uw_spear",
      "追查恶魔之枪的下落",
      "隐秘",
      20,
      "斯佩路德族背了几千年的罪名，源头是一支枪",
      [
        ["查了几个月，只查到些互相矛盾的说法。", "但至少你知道，该往魔大陆的方向去问。"],
        { stats: { scheme: 6, int: 4, fame: 2 }, goal: 3 },
      ],
      [
        ["你摸到一条线：枪在某个已死的人手里。那人的后代还活着。", "名字你记下了。谁也没告诉。"],
        { stats: { scheme: 8, int: 5 }, notice: "你摸到了与恶魔之枪有关的一条线。" },
      ],
      [
        ["你在一处废弃据点里找到一段刻着魔大陆古语的记载。", "读完之后你坐了很久。这不是一件武器的事。"],
        { stats: { scheme: 10, int: 7, faith: -3 }, threads: { dragonGod: "你手上有一段关于恶魔之枪的记载。有人会想拿到它。" }, notice: "你接触到了恶魔之枪的来历。" },
      ],
      { stats: { scheme: 45 } },
    ),
    cmd(
      "uw_contract",
      "接一份见不得光的契约",
      "隐秘",
      22,
      "价钱很好，问题在于它不能写下来",
      [
        ["你接了。办得干净，拿了钱。", "没人知道是你做的。这类事的好处就在这里。"],
        { stats: { wealth: 160, scheme: 5, faith: -3 } },
      ],
      [
        ["事情办到一半，你发现对面的人认识你。", "多出来的那部分，你也一并处理了。"],
        { stats: { wealth: 200, scheme: 8, fame: -3 }, notice: "你办成了一件不能写下来的事。" },
      ],
      [
        ["你按契约做到最后一步，然后看到了不该看的名字。", "钱到账了。但从那天起，出门前你总会先看一眼街角。"],
        { stats: { wealth: 240, scheme: 10, fame: -4, int: 4 }, lifespan: -1, notice: "你在暗处的账本上留下了自己的名字。" },
      ],
      { stats: { scheme: 40 }, forbid: { faith: ["米里斯教团"] } },
    ),
  ],

  library: [
    cmd(
      "lb_time",
      "研究时间魔术的残篇",
      "学术",
      24,
      "这门魔术已经失传，剩下的只是碎片",
      [
        ["残篇你抄了三遍，抄到最后连自己写字的手都不认得。", "什么都没发生。这大概是好事。"],
        { stats: { int: 7, mana: 4 }, lifespan: -1 },
      ],
      [
        ["某个夜里你读懂了半句。那半句让窗外的月亮看着不太一样。", "第二天你合上书，决定先不往下读。"],
        { stats: { int: 9, mana: 6 }, lifespan: -2, threads: { dragonGod: "你碰过时间魔术的残篇。" }, notice: "你读懂了时间魔术残篇里的半句。" },
      ],
      [
        ["你写出一小段真能用的东西，只维持了一息。那一息里，你听见了自己以前说过的话。", "你把纸烧了。有些东西不该留着。"],
        { stats: { int: 12, mana: 8 }, learnSkill: "mg_time_fragment", lifespan: -3, notice: "你的人生里出现了时间魔术的痕迹。" },
      ],
      { magicTier: "圣级", stats: { int: 55 } },
    ),
    cmd(
      "lb_archive",
      "通读魔术公会的秘档",
      "学术",
      14,
      "档案里写的不是真相，是谁希望真相是什么",
      [
        ["你把近几十年的公告和记录对了一遍，看出几处被抹掉的痕迹。", "被抹掉的地方，往往比留下的更有意思。"],
        { stats: { int: 5, scheme: 4 }, goal: 2 },
      ],
      [
        ["你在附录里翻到一份被撤回的研究记录。", "撤回的理由写得很含糊。含糊得像有人故意留的一个入口。"],
        { stats: { int: 7, scheme: 5 }, factions: { 魔术公会: 4 } },
      ],
      [
        ["你拼出一件本不该拼出的事：某位教授的研究，被公会有计划地停掉了。", "结论你收进心里。一个字都没写进笔记。"],
        { stats: { int: 9, scheme: 7 }, factions: { 魔术公会: -5 }, notice: "你知道了魔术公会不愿公开的一段旧事。" },
      ],
    ),
  ],

  camp: [
    cmd(
      "cm_armor",
      "参与魔导铠的试验",
      "谋生",
      24,
      "会动的东西，总要有人去试它会不会痛",
      [
        ["你穿上那副东西走了几步。关节很涩，但真撑住了你的重量。", "记录的人一直在写。没人问你难不难受。"],
        { stats: { int: 5, health: -3, wealth: 70 }, goal: 2 },
      ],
      [
        ["试到第三轮，铠甲的手臂抬不起来了。你在里面困了半天。", "出来以后，设计它的人把图纸划掉了一半。"],
        { stats: { int: 7, health: -6, wealth: 90 }, notice: "你替一副魔导铠试出了它的毛病。" },
      ],
      [
        ["你穿着它走完全程，一次没摔。设计它的人看了你很久，说：「你不是普通人。」", "从那天起，你的名字出现在某份图纸的边角。"],
        { stats: { int: 8, fame: 4, wealth: 110 }, factions: { 魔法大学: 8 }, notice: "你参与研制的东西，后来有了名字。" },
      ],
      { stats: { int: 45 } },
    ),
    cmd(
      "cm_badigadi",
      "与不死魔王同行一段",
      "社交",
      18,
      "他说自己死不了，语气像是在抱怨",
      [
        ["他跟你走了半个月，吃掉你半个月的口粮。", "分开时他拍了拍你的肩，力气大得让你站不稳。"],
        { stats: { charm: 4, fame: 3, int: 3 }, goal: 2 },
      ],
      [
        ["他讲了些魔大陆的老事，讲得零零碎碎。", "这些东西，没有写在任何书上。"],
        { stats: { int: 6, charm: 4, scheme: 3 }, goal: 3 },
      ],
      [
        ["他忽然正经起来，问你想不想看一眼「连神都能杀的东西」。", "你摇头。他笑了一声，说聪明人就该这么答。"],
        { stats: { int: 7, charm: 5, faith: 3 }, notice: "你与不死魔王同行过，并且拒绝了一件东西。" },
      ],
      { stats: { fame: 45 } },
    ),
  ],

  home: [
    cmd(
      "hm_tutor",
      "请一位家庭教师",
      "家庭",
      14,
      "好老师很贵，但他们教的不只是本事",
      [
        ["老师教了一个月，把该讲的基础讲完。", "临走时他说你学得慢。但肯练。"],
        { stats: { int: 4, wealth: -40 }, tier: { kind: "magic", gain: 8 } },
      ],
      [
        ["老师看出你身上有点别人没有的东西，多留了半个月。", "多出来的半个月，比前面一个月都值。"],
        { stats: { int: 5, mana: 4, wealth: -80 }, tier: { kind: "magic", gain: 11 } },
      ],
      [
        ["来的人不是普通家庭教师。他教的东西，收费按「你以后会不会惹麻烦」算。", "你付了钱，也答应了他一件事。"],
        { stats: { int: 7, mana: 5, scheme: 3, wealth: -120 }, tier: { kind: "magic", gain: 13 }, notice: "你请来的家庭教师，教的不只是魔术。" },
      ],
      { stats: { wealth: 120 } },
    ),
  ],

  village: [
    cmd(
      "vs_shop",
      "在镇上盘一间铺子",
      "谋生",
      16,
      "把一件小事做上十年，它就不是小事了",
      [
        ["铺子开在镇上的巷口，卖什么你自己也没定下来，最后什么都卖。", "月底把铜币倒在桌上数了两遍。不亏。这两个字你已经很满意了。"],
        { stats: { wealth: 70, charm: 3, int: 3 }, goal: 3 },
      ],
      [
        ["生意比预想的好一截。有人开始专程来买某一样东西。", "你雇了一个伙计。"],
        { stats: { wealth: 130, charm: 4, fame: 3 }, goal: 4 },
      ],
      [
        ["原来的主人给你留了一本旧账本。", "账本最后一页写着一个名字，还有一句话：这间铺子会给你带来麻烦。"],
        { stats: { wealth: 150, int: 5, scheme: 3 }, notice: "你盘下的铺子，前任主人留下了一本没有交代清楚的账本。" },
      ],
      { stats: { wealth: 200 } },
    ),
  ],
};

/* ------------------------------------------------------------------ *
 * 原作模式专属场景
 *
 * 这些场景不写在创建界面上，也不会一开始就出现在面板里。
 * 它们的门槛是剧情本身：经历过转移事件、成为过人神使徒、归顺龙神、打过阿斯拉王位战。
 * 门没开，场景就不存在；门一开，面板上多出一块新的地方。
 * 「你的行动」因此不是一张静态的表，而是跟着这一段人生在长。
 * ------------------------------------------------------------------ */

const STORY_SCENES: SceneDef[] = [
  {
    id: "human-god-voices",
    name: "人神的低语",
    desc: "梦里那个声音从不催促，只说该说的话。它越是体贴，你越清楚自己被谁牵着走。",
    match: () => false,
    gate: { flag: "humanGodApostle" },
    commands: [
      cmd(
        "hg_obey",
        "照它说的做，再做一次",
        "隐秘",
        6,
        "每一句都对，对得让人不安",
        [
          ["你照做了。它说的那件事确实无害，甚至顺手替你解掉一个小麻烦。", "你开始习惯先等它开口，再决定自己怎么走。"],
          { stats: { scheme: 5, fame: 2 }, goal: 3, threads: { humanGod: "它又一次说对了。你已经不问为什么。" } },
        ],
        [
          ["你按它说的走了一趟，什么也没发生。", "你有点失望——原来它也有走空的时候。"],
          { stats: { scheme: 3 } },
        ],
        [
          ["你照做了。代价落在别人身上，你是事后才知道的。", "那个人的名字你记下来了，没敢写在纸上。"],
          { stats: { scheme: 6, faith: -4 }, notice: "你按人神的建议做了一件事，代价由别人付了。" },
        ],
      ),
      cmd(
        "hg_price",
        "当面问它代价",
        "隐秘",
        6,
        "先问价钱的人，才是买家",
        [
          ["你把话问出口了。它笑了一声，把话题岔到别的地方。", "这次沉默你记了很久。"],
          { stats: { scheme: 7, int: 3 }, threads: { humanGod: "你当面问过代价。它一个字都没有回答。" } },
        ],
        [
          ["它说：「代价这种东西，问的人才会付。」", "这句话你抄在本子上，抄完又划掉了。"],
          { stats: { scheme: 5, int: 2 } },
        ],
        [
          ["你问了三遍。第三遍它不笑了。", "你醒过来的时候，整件衣服都是湿的。"],
          { stats: { scheme: 6, faith: -3 }, notice: "你追问过代价，它不高兴了。" },
        ],
      ),
      cmd(
        "hg_gather",
        "打听「使徒」这两个字",
        "探索",
        8,
        "真话通常藏在别人压低的嗓子里",
        [
          ["你从三个不相干的人嘴里听到同一个词，拼出一点轮廓。", "轮廓很难看，但你总算看得见它。"],
          { stats: { scheme: 8, int: 4 }, notice: "你摸到了「人神使徒」这个词的另一半含义。" },
        ],
        [
          ["没人肯细说。有人说那是疯子的话，说完自己先压低了声音。", "这就够了。你知道了该往哪儿再问一句。"],
          { stats: { scheme: 4 } },
        ],
        [
          ["你问到了不该问的人。", "第二天，有个人在你门口站了一会儿才走。"],
          { stats: { scheme: 5, health: -3 } },
        ],
      ),
    ],
  },
  {
    id: "dragon-camp",
    name: "龙神的阵营",
    desc: "一个轮回了不知多少次的人，把耐心当成了武器。他给你的命令都很短。",
    match: () => false,
    gate: { flag: "underDragonGod" },
    commands: [
      cmd(
        "dg_follow",
        "随龙神走一趟",
        "冒险",
        18,
        "他走的路不用地图，也不解释",
        [
          ["你们走了很远，一句话都没说。他偶尔停下来，看一眼别处。", "回来的路上他才开口：「刚才那个地方，你去过。」你没答。"],
          { tier: { kind: "adventure", gain: 16 }, stats: { fame: 5, int: 4, health: -4 }, goal: 3 },
        ],
        [
          ["这一趟什么也没找到。他不在意。", "对他这种人来说，白走一趟大概也算信息。"],
          { tier: { kind: "adventure", gain: 10 }, stats: { int: 3, health: -3 } },
        ],
        [
          ["路上你差点没跟上。他在原地等了你一会儿，什么也没说。", "那种等待比责备更难挨。"],
          { tier: { kind: "adventure", gain: 5 }, stats: { health: -8, int: 2 } },
        ],
      ),
      cmd(
        "dg_kin",
        "与五龙将说话",
        "社交",
        10,
        "他们跟着他太久，话都变得很短",
        [
          ["她把一件事讲得极清楚，没有一句多余。", "你忽然明白，能被这样的人当成同行者，本身就是一种资格。"],
          { stats: { charm: 4, int: 5, fame: 3 }, goal: 3 },
        ],
        [
          ["你们聊了些旧事。那些事发生的时候，你还没出生。", "听完之后，你对「二百年」这三个字有了具体的分量。"],
          { stats: { int: 4, charm: 3 } },
        ],
        [
          ["对方看了你一眼，转身走了。", "你还不够格。这件事不用人说，你自己清楚。"],
          { stats: { int: 2, scheme: 2 }, energy: 8 },
        ],
      ),
      cmd(
        "dg_armor",
        "造一副能用的魔导铠",
        "谋生",
        20,
        "会动的东西，总要有人去试它会不会痛",
        [
          ["你把图纸改了七遍，终于有一副能自己走两步。", "试穿的那天它在院子里走了一圈，所有人的手都在抖。"],
          { stats: { int: 8, mana: 5, fame: 4 }, goal: 5, factions: { 魔法大学: 8 }, notice: "你参与造出的东西，后来有了名字。" },
        ],
        [
          ["关节还是涩。走三步就要停一下。", "但比上一个月那副强。这就是全部的进展。"],
          { stats: { int: 5, mana: 3, health: -3 } },
        ],
        [
          ["试到一半，铠甲的手臂锁死了，你在里面困了半天。", "出来之后你把整张图纸划掉了一半。"],
          { stats: { int: 6, health: -6, mana: 3 } },
        ],
        undefined,
        { stats: { int: 40 } },
      ),
    ],
  },
  {
    id: "asura-court",
    name: "阿斯拉王宫",
    desc: "香氛、丝绸、笑。这里的每一句话都压着第二层，而真的那层从不出口。",
    match: () => false,
    gate: { flag: "asuraWon" },
    commands: [
      cmd(
        "ac2_ariel",
        "面见爱丽儿",
        "社交",
        12,
        "她坐上那个位子之后，说话反而更少了",
        [
          ["她先问你的近况，再谈正事。顺序是刻意的。", "临走她说：「你随时可以来。」这一次不是场面话。"],
          { stats: { charm: 5, fame: 5, scheme: 4 }, factions: { 阿斯拉王国: 12 }, goal: 4 },
        ],
        [
          ["宫里的事讲了一半，剩下的她没说。", "你听得懂哪一半是给你的，哪一半不是。"],
          { stats: { charm: 3, scheme: 4 }, factions: { 阿斯拉王国: 6 } },
        ],
        [
          ["你赶上的时候她正忙。她只点了下头。", "权力的距离感，你第一次这么具体地摸到。"],
          { stats: { scheme: 3, int: 2 } },
        ],
      ),
      cmd(
        "ac2_ghislaine",
        "请基列奴拆一手剑",
        "修炼",
        18,
        "她还是那副样子，出手的时候不吭声",
        [
          ["她只出了三刀，每一刀都停在你以为安全的地方。", "「看脚。」她说。你低头，才发现问题一直在地面上。"],
          { tier: { kind: "sword", gain: 18 }, stats: { sword: 6, int: 3 }, goal: 3 },
        ],
        [
          ["你被摔了很多次。她一次都没解释。", "但你回去自己练的时候，手上的角度变了。"],
          { tier: { kind: "sword", gain: 13 }, stats: { sword: 4, health: -3 } },
        ],
        [
          ["她收刀时说了句「比小时候强」。", "这大概是她能给出的最高评价。"],
          { tier: { kind: "sword", gain: 8 }, stats: { sword: 3, charm: 2 } },
        ],
        { swordTier: "中级" },
      ),
      cmd(
        "ac2_intrigue",
        "打探新王的朝局",
        "隐秘",
        14,
        "换了主人的宫殿，走廊还是一样长",
        [
          ["你把两派人重新排了一遍，发现有人站错了地方。", "这条消息你收着，什么时候用由你定。"],
          { stats: { scheme: 8, int: 4 }, factions: { 阿斯拉王国: 6 }, notice: "你摸清了新朝局里的一条裂缝。" },
        ],
        [
          ["你确认了几件事的真假，一半真一半假。", "这本身就是答案。"],
          { stats: { scheme: 5, int: 3 } },
        ],
        [
          ["你的打听被人察觉。", "有人开始留意你。不是你想要的那种留意。"],
          { stats: { scheme: 3, fame: -3 }, factions: { 阿斯拉王国: -5 } },
        ],
      ),
    ],
  },
  {
    id: "fittoa-after",
    name: "转移之后的菲托亚领",
    desc: "田还在，屋顶塌了一半。走在路上的人比从前少，问起谁都要先想一想。",
    match: (s) => ["布耶纳村", "罗亚町"].includes(s.character.residence),
    // 领地回来了，人没有全回来。原地的两个地点场景让位给这一块
    gate: { flag: "transferSurvived", residence: ["布耶纳村", "罗亚町"] },
    commands: [
      cmd(
        "ft_search",
        "跟着搜索团翻一遍山谷",
        "冒险",
        20,
        "要找的人多半已经不在了，但名单得有人填",
        [
          ["你在河滩上找到一户人家的全部家当，却没有人。", "你把东西登记好，交给营地。做这件事没人会记住你。"],
          { tier: { kind: "adventure", gain: 14 }, stats: { fame: 5, charm: 3 }, goal: 4 },
        ],
        [
          ["这一趟带回来两个还活着的人。", "他们一路上没说话，只抓着你给的那件外衣。"],
          { tier: { kind: "adventure", gain: 11 }, stats: { fame: 4, charm: 4 } },
        ],
        [
          ["翻了一个月，名单上一个也没划掉。", "你开始明白，这件事可能要花掉你很多年。"],
          { tier: { kind: "adventure", gain: 6 }, stats: { int: 3, health: -5 } },
        ],
      ),
      cmd(
        "ft_home",
        "回布耶纳村看一眼",
        "探索",
        10,
        "有些房子你认得，住的人你不认得",
        [
          ["院子里长满了草。你站在门口，忽然想起母亲喊你吃饭的声音。", "你在那儿站到天暗，什么也没带走。"],
          { stats: { int: 4, faith: 3 }, goal: 5, starDelta: { match: "塞妮丝", delta: 1, note: "你回去看过" } },
        ],
        [
          ["屋子还在，东西被人翻过。", "你收拾了半间，把门重新挂上。"],
          { stats: { int: 3, charm: 2 }, goal: 3 },
        ],
        [
          ["你不认识现在的住户。对方也不认识你。", "你说了句打扰，就退出来了。"],
          { stats: { int: 2, scheme: 2 } },
        ],
      ),
      cmd(
        "ft_ask",
        "打听失散者的下落",
        "社交",
        8,
        "每一条消息都要拿另一个名字去换",
        [
          ["你在营地和酒馆之间跑了一个月，凑出三个名字的下落。", "其中两个已经不必再找了。"],
          { stats: { scheme: 6, charm: 3, int: 3 }, goal: 3 },
        ],
        [
          ["你问到些零碎的说法，真假各半。", "你学会了先问时间，再问名字。"],
          { stats: { scheme: 4, charm: 2 } },
        ],
        [
          ["有人拿假消息换了你一顿饭。", "你没揭穿他。他大概也需要那顿饭。"],
          { stats: { charm: 2, wealth: -20, scheme: 2 } },
        ],
      ),
    ],
  },
];

SCENES.push(...STORY_SCENES);

/* ------------------------------------------------------------------ *
 * 原作地点场景
 *
 * 所在地决定你现在站在哪儿，而站在哪儿决定你能做什么。
 * 每个地点一个场景，只在「你人在那里」时出现；要换地方只能用迁居（见 engine/world.ts 的 relocate）。
 * 名字与描述取自 places.ts，这一段只负责每个地方专有的做法。
 * ------------------------------------------------------------------ */

const PLACE_COMMANDS: Record<string, PresetCommand[]> = {
  buena: [
    cmd(
      "pb_field",
      "跟着家里下地",
      "谋生",
      12,
      "麦子不会因为你转生过就长得快些",
      [
        ["整整一个月你都在田里。腰酸得不像七岁的人。", "收工时母亲把水壶递过来，什么也没说。"],
        { stats: { health: 4, wealth: 45 }, goal: 2 },
      ],
      [
        ["你学会了什么时候该停手。", "这本事在别处没什么用，在这儿很有用。"],
        { stats: { health: 3, wealth: 25 } },
      ],
      [
        ["你把一块地锄坏了。父亲骂了你半句就停了。", "他自己去补的那块，比你的大两倍。"],
        { stats: { health: 1, wealth: -15, charm: 2 } },
      ],
    ),
    cmd(
      "pb_sword",
      "在院子里跟父亲练剑",
      "修炼",
      14,
      "他教的是剑神流，教得很不耐烦",
      [
        ["他让你把同一个起手做了三百遍，第三遍就不再说话。", "到第一百遍时，你忽然明白他为什么懒得解释。"],
        { tier: { kind: "sword", gain: 14 }, stats: { sword: 3 }, goal: 2 },
      ],
      [
        ["他陪你拆了半下午的招，最后只丢下一句：「别把剑举那么高。」", "之后再握剑，手上轻了。"],
        { tier: { kind: "sword", gain: 10 }, stats: { sword: 2 } },
      ],
      [
        ["他看了你两下就走了，说去村里有事。", "你自己练到天黑。院子里的地砖还是被他踩出来的那几块最亮。"],
        { tier: { kind: "sword", gain: 5 } },
      ],
    ),
    cmd(
      "pb_sylphie",
      "在村外空地教那个长耳孩子",
      "社交",
      10,
      "她学得比谁都快，快得让人不安",
      [
        ["你把洛琪希教你的东西原样转手教出去。她一遍就懂了。", "教到第三次，你发现自己也在学。"],
        { stats: { charm: 4, int: 3, mana: 3 }, starDelta: { match: "希露菲叶特", delta: 1, note: "她把你当成第一个老师" }, goal: 3 },
      ],
      [
        ["她把手心的风推了出去。很小的一阵，但确实推了出去。", "她抬头看你，等你说话。你说再来一次。"],
        { stats: { charm: 3, mana: 3 }, starDelta: { match: "希露菲叶特", delta: 1 } },
      ],
      [
        ["你教得太急，她被自己的魔力吓了一跳，之后几天没敢再来。", "你去她家门口站了一会儿，也没敲门。"],
        { stats: { int: 2, charm: -2 }, starDelta: { match: "希露菲叶特", delta: -1 } },
      ],
      { relation: { name: "希露菲叶特", minStars: 2 } },
    ),
  ],

  roa: [
    cmd(
      "pr_manor",
      "去伯雷亚斯家当家教",
      "学术",
      16,
      "教那位有「狂犬」之名的千金，先掂量自己够不够结实",
      [
        ["第一次上课她差点用剑把你的书劈了。第三次，她开始问你问题。", "基列奴站在门外，一直在看你的手。"],
        { tier: { kind: "magic", gain: 12 }, stats: { int: 4, charm: 4, fame: 4 }, goal: 4 },
      ],
      [
        ["课照常上，进度不快。", "但那个孩子记东西记得比谁都牢。"],
        { stats: { int: 3, charm: 3, wealth: 60 } },
      ],
      [
        ["她把墨倒在了你的教案上，然后自己生了一下午的气。", "第二天她送了你一本新本子，没说道歉。"],
        { stats: { int: 3, charm: 2 } },
      ],
      { magicTier: "初级" },
    ),
    cmd(
      "pr_market",
      "在罗亚的集市做买卖",
      "谋生",
      12,
      "领首府的价钱比村里硬",
      [
        ["你摸清了三种货的差价，一个月里跑了两趟。", "收摊时钱袋比来时沉得多。"],
        { stats: { wealth: 120, charm: 3, scheme: 2 }, goal: 3 },
      ],
      [
        ["生意不好不坏。你学会了先把话说软。", "在这个镇上，这就够撑到下个月。"],
        { stats: { wealth: 60, charm: 2 } },
      ],
      [
        ["你被本地商人联手压了价，货砸在手里。", "你记住了那几张脸。"],
        { stats: { wealth: -50, scheme: 3 } },
      ],
    ),
    cmd(
      "pr_rumor",
      "打听伯雷亚斯家的事",
      "隐秘",
      12,
      "上级贵族的家务事，酒馆里讲得比宅邸里多",
      [
        ["你凑出了一条本不该知道的线：被逐出家门的那个人，是这一代的嫡子。", "名字你听清了，记下了，没说。"],
        { stats: { scheme: 7, int: 3 }, notice: "你摸到了伯雷亚斯家的一段旧事。" },
      ],
      [
        ["听到的说法互相矛盾，但有一处对得上。", "这就够了。"],
        { stats: { scheme: 4, int: 2 } },
      ],
      [
        ["你问得太急，被宅邸的管事注意上了。", "之后几天，你在镇上觉得背后总有人看。"],
        { stats: { scheme: 2, charm: -3 } },
      ],
    ),
  ],

  ars: [
    cmd(
      "pa_court",
      "在贵族圈里周旋",
      "社交",
      16,
      "场面上要做的，是让别人记住你",
      [
        ["你在宴上说了句恰到好处的话，被一位有分量的人记住了。", "他后来提起你，用的是「那个年轻人」。"],
        { stats: { charm: 6, scheme: 5, fame: 5 }, factions: { 阿斯拉王国: 10 }, goal: 4 },
      ],
      [
        ["一整晚你都撑过去了。笑很累，但有用。", "你学会了几个场面上的说法。"],
        { stats: { charm: 4, scheme: 3, fame: 3 }, factions: { 阿斯拉王国: 5 } },
      ],
      [
        ["你说错了一句话，被人不动声色地绕开。", "那一晚，再没人过来跟你搭话。"],
        { stats: { charm: -3, fame: -2 }, factions: { 阿斯拉王国: -6 } },
      ],
    ),
    cmd(
      "pa_faction",
      "在某个派系里做事",
      "隐秘",
      18,
      "站队之前，先想清楚自己站的是哪一边",
      [
        ["你替人办成了几件不便出面的事。", "经手的人一个都没见过你的脸，但都知道你的名字。"],
        { stats: { scheme: 8, int: 4, fame: 4 }, factions: { 阿斯拉王国: 12 }, notice: "你在王都的某一派里有了位置。" },
      ],
      [
        ["你办得不漂亮，但办成了。", "对方收下结果，没问过程。"],
        { stats: { scheme: 5, wealth: 80 }, factions: { 阿斯拉王国: 5 } },
      ],
      [
        ["你搞砸了，还多了一个不愿再见到你的人。", "有些门关上的时候，是没有声音的。"],
        { stats: { fame: -4, health: -3 }, factions: { 阿斯拉王国: -8 } },
      ],
    ),
    cmd(
      "pa_capital",
      "在王都做本钱上的事",
      "谋生",
      14,
      "贵族最擅长的从来不是剑",
      [
        ["你押对了一桩买卖，进项比一年的俸禄还多。", "有人开始打听，你这个名字是怎么来的。"],
        { stats: { wealth: 260, fame: 3, scheme: 3 }, goal: 3 },
      ],
      [
        ["本钱回来一半。没赚多少，也没亏。", "在这个圈子里，不亏就算赢。"],
        { stats: { wealth: 120 } },
      ],
      [
        ["你信错了人。钱出去了，人没了。", "这堂课的学费不便宜。"],
        { stats: { wealth: -140, scheme: 3 } },
      ],
    ),
  ],

  sharia: [
    cmd(
      "ps_class",
      "去大学听课",
      "学术",
      12,
      "听不懂的部分，将来会用到",
      [
        ["教授提了个没人答得上来的问题。你答上来了。", "他记住了你的名字。在这里，这不是件小事。"],
        { tier: { kind: "magic", gain: 14 }, stats: { int: 6, mana: 4 }, goal: 3 },
      ],
      [
        ["笔记记了满满一本。其中一页后来救过你。", "魔术的规律，比想的更像一门语法。"],
        { tier: { kind: "magic", gain: 10 }, stats: { int: 4, mana: 3 } },
      ],
      [
        ["你在课上睡着了，被点到名字，答得牛头不对马嘴。", "你决定以后少熬夜。"],
        { tier: { kind: "magic", gain: 4 }, stats: { int: 2 } },
      ],
    ),
    cmd(
      "ps_lab",
      "在实验室过一个月",
      "学术",
      16,
      "知道和做到之间隔着很多次失败",
      [
        ["假设成立，比你预想的还漂亮。", "结果你记了三遍，还有一遍抄给了隔壁桌。"],
        { tier: { kind: "magic", gain: 16 }, stats: { int: 6, mana: 5 }, goal: 4 },
      ],
      [
        ["验证了一半，推翻了一半。", "被推翻的那半，同样有价值。"],
        { tier: { kind: "magic", gain: 11 }, stats: { int: 4, mana: 3 } },
      ],
      [
        ["实验出了事故，桌上烧了个洞，器具的钱你赔了。", "但爆掉之前的那个形状，你记住了。"],
        { tier: { kind: "magic", gain: 5 }, stats: { int: 2, wealth: -60 } },
      ],
    ),
    cmd(
      "ps_tower",
      "上魔术公会的塔办事",
      "社交",
      12,
      "公会的走廊里，脚步声比话多",
      [
        ["你替公会跑了一趟档案，回来时手里多了一份抄件的编号。", "编号将来有用。"],
        { stats: { int: 4, scheme: 5 }, factions: { 魔术公会: 10 }, goal: 3 },
      ],
      [
        ["你把该问的问完了，该回答的没回答。", "出来时衣服上还带着纸的味道。"],
        { stats: { int: 3, scheme: 3 }, factions: { 魔术公会: 5 } },
      ],
      [
        ["你多问了一句不该问的。", "柜台后面那个人抬起眼睛看了你三秒。"],
        { stats: { int: 2, scheme: 2 }, factions: { 魔术公会: -5 } },
      ],
    ),
  ],

  mirees: [
    cmd(
      "pm_mass",
      "在大圣堂做弥撒",
      "信仰",
      10,
      "米里斯看着每一个人，也看着不说实话的人",
      [
        ["你跪在冰冷的石板上，忽然想通了一件压了很久的事。", "出来时脸色不一样了，自己都知道。"],
        { stats: { faith: 8, health: 3 }, goal: 3 },
      ],
      [
        ["跪了很久。心里想的其实是别的事。", "但你没起来。"],
        { stats: { faith: 6 } },
      ],
      [
        ["祈祷到一半睡着了。醒来时神殿已经空了。", "有点羞愧，也有点松快。"],
        { stats: { faith: 3 }, energy: 6 },
      ],
    ),
    cmd(
      "pm_knight",
      "随神殿骑士团巡行",
      "信仰",
      16,
      "他们握剑的手很稳，眼神很冷",
      [
        ["这一趟你跟着走完了全程，也看清了他们在边境防的是什么人。", "那不是魔物。"],
        { stats: { sword: 3, faith: 6, fame: 4 }, factions: { 米里斯教团: 12 }, goal: 3 },
      ],
      [
        ["巡行的路比想的枯燥，多半时间在等。", "骑士们不怎么说话，你也没说。"],
        { stats: { sword: 2, faith: 5, health: 2 }, factions: { 米里斯教团: 6 } },
      ],
      [
        ["你在一处村落多问了两句，带队的人回头看了你一眼。", "那一眼里没有敌意，但有记录的意思。"],
        { stats: { faith: 3, scheme: 3 }, factions: { 米里斯教团: -4 } },
      ],
    ),
    cmd(
      "pm_archive",
      "翻查教会的旧档案",
      "隐秘",
      12,
      "教会记了很多事，也包括不该记的",
      [
        ["你在旧册子里找到一个被划掉的名字，旁边的日期和你身上的某件事对得上。", "你把那一页原样合上了。"],
        { stats: { scheme: 7, int: 4 }, notice: "教会的档案里有与你相关的记录。" },
      ],
      [
        ["翻到些地方志和人事记录。大多无聊。有两条值得记。", "你抄了下来，抄得很快。"],
        { stats: { int: 4, scheme: 2 } },
      ],
      [
        ["你被告知档案不外借。", "看守的口气客气得像一堵墙。"],
        { stats: { faith: 1, charm: -2 } },
      ],
    ),
  ],

  migurd: [
    cmd(
      "pg_life",
      "和不会长大的族人过一个月",
      "休养",
      6,
      "在这里，时间过得很慢，也没人催",
      [
        ["村里的夜很长。你数过之外的天数，后来就不数了。", "那点一直绷着的力气，慢慢松了。"],
        { stats: { health: 8, faith: 4 }, energy: 20, goal: 2 },
      ],
      [
        ["日子一天接一天，没留下什么。", "但你比来时安静。"],
        { stats: { health: 5, charm: 2 }, energy: 12 },
      ],
      [
        ["你始终是个外人。他们客气，但不问你从哪儿来。", "待久了反而有点闷。"],
        { stats: { health: 2 } },
      ],
    ),
    cmd(
      "pg_water",
      "跟米格路德族的术士学水术",
      "修炼",
      14,
      "缩短咏唱是这一族的老本行",
      [
        ["她让你先听水，再咏唱。你练了一个月才听懂第一次。", "那一次之后，咒文短了一截。"],
        { tier: { kind: "magic", gain: 16 }, stats: { mana: 6, int: 4 }, goal: 4 },
      ],
      [
        ["你把手势改了三处，念起来顺多了。", "改动不大，长期有用。"],
        { tier: { kind: "magic", gain: 11 }, stats: { mana: 4, int: 3 } },
      ],
      [
        ["你练到手腕发僵，什么也没缩短。", "术士说，急的人学不会这一门。"],
        { tier: { kind: "magic", gain: 5 }, stats: { mana: 2 } },
      ],
    ),
    cmd(
      "pg_desert",
      "穿过大沙海去一趟邻村",
      "探索",
      18,
      "沙里没有路，只有走过的人留下的说法",
      [
        ["你按星星的方向走了六天，找到了那口井。", "回来时带了一袋盐和一句话：往东三十里有东西在动。"],
        { tier: { kind: "adventure", gain: 14 }, stats: { int: 4, health: -3 }, goal: 4, notice: "你在魔大陆的沙海里找到了一条没被记下来的路。" },
      ],
      [
        ["你走错了一段，绕了两天。", "但那条错路比正路短。"],
        { tier: { kind: "adventure", gain: 9 }, stats: { int: 3, health: -4 } },
      ],
      [
        ["沙暴把你困在一处岩缝里，两天没吃没喝。", "出来时你已经不记得自己是怎么走的。"],
        { tier: { kind: "adventure", gain: 5 }, stats: { health: -10, int: 2 } },
      ],
    ),
  ],

  lapan: [
    cmd(
      "pl_lost",
      "打听转移迷宫的下落",
      "探索",
      14,
      "找的人多半已经不在，但总得有人问",
      [
        ["你在公会和营帐之间跑了一个月，问出三层地下的走法。", "那张图你没卖给任何人。"],
        { stats: { scheme: 7, int: 4, fame: 3 }, goal: 5, notice: "你摸清了拉潘地下那几层的走法。" },
      ],
      [
        ["问到些零碎的说法，真假各半。", "至少你知道该从哪个入口下去。"],
        { stats: { scheme: 4, int: 3 }, goal: 3 },
      ],
      [
        ["有人拿假消息换了你一顿饭。", "你没揭穿他。他大概也需要那顿饭。"],
        { stats: { scheme: 2, wealth: -20, charm: 2 } },
      ],
    ),
    cmd(
      "pl_hydra",
      "接一件与九头龙有关的委托",
      "冒险",
      26,
      "敢挂出来的这种委托，多半是想让别人去死",
      [
        ["你领着队伍下到了第九层，把能带的人都带回来了。", "报酬是市价的三倍，因为出得起这个价的雇主只剩一个。"],
        { tier: { kind: "adventure", gain: 24 }, stats: { fame: 10, sword: 4, wealth: 200, health: -12 }, lifespan: -1, factions: { 冒险者公会: 12 }, goal: 6 },
      ],
      [
        ["没碰到那东西，只把前半段清完了。", "这也算交付。"],
        { tier: { kind: "adventure", gain: 14 }, stats: { fame: 5, wealth: 110, health: -8 }, goal: 3 },
      ],
      [
        ["队伍在第六层就崩了。有人没能上来。", "公会没有追究，也没有再提这件事。"],
        { tier: { kind: "adventure", gain: 6 }, stats: { fame: -2, health: -16, scheme: 3 } },
      ],
      { adventurerRank: "C" },
    ),
    cmd(
      "pl_care",
      "照顾从迷宫里带出来的人",
      "社交",
      10,
      "带出来的人不一定还想活着",
      [
        ["你守着一个不吃不喝的人守了一个月。第六周，他开口要了水。", "他说了句谢谢，然后再没说话。"],
        { stats: { charm: 5, faith: 4 }, starDelta: { match: "", delta: 1, note: "你把他从最难的那一段带了出来" }, goal: 4 },
      ],
      [
        ["你替他们换药、喂饭、记名字。", "能做的只有这些。"],
        { stats: { charm: 3, faith: 3, health: -2 } },
      ],
      [
        ["有一个人趁夜里走了，什么都没带。", "你没去追。"],
        { stats: { faith: 3, int: 2 } },
      ],
    ),
  ],

  shillon: [
    cmd(
      "pi_puppet",
      "陪第三王子找人偶匠",
      "社交",
      14,
      "他要的东西很具体，付钱也从不含糊",
      [
        ["你跑遍了三个城镇，带回一叠手艺人的名字。", "他一个个抄进本子，抄得极慢，抄完抬头看了你一眼。"],
        { stats: { wealth: 90, int: 5, charm: 3 }, starDelta: { match: "扎诺巴", delta: 1, note: "他把你算进自己的计划" }, goal: 3 },
      ],
      [
        ["找到的人手艺还行，脾气不行。", "他收下了，说下次再来。"],
        { stats: { wealth: 50, int: 4 }, starDelta: { match: "扎诺巴", delta: 1 } },
      ],
      [
        ["你在旧货堆里翻到一具会动的旧人偶。", "他捧着看了一整夜，第二天说话的语气都变了。"],
        { stats: { wealth: 110, int: 6 }, starDelta: { match: "扎诺巴", delta: 2, note: "你给了他一件他没有的东西" } },
      ],
    ),
    cmd(
      "pi_court",
      "在帕克斯的宫里走动",
      "隐秘",
      16,
      "这座宫殿里最响的声音，是没人说话",
      [
        ["你拼出了两条线：一条通向国库，一条通向某个不在宫里的人。", "两条线在同一个日子上交汇。"],
        { stats: { scheme: 8, int: 4, fame: 3 }, factions: { 阿斯拉王国: 4 }, notice: "你摸到了西隆王宫内部的一条暗线。" },
      ],
      [
        ["你确认了几件传闻的真假，一半真一半假。", "这本身就是答案。"],
        { stats: { scheme: 5, int: 3 } },
      ],
      [
        ["你被一个内侍客气地请出了走廊。", "他的客气里带着编号的意思。"],
        { stats: { scheme: 3, fame: -3 } },
      ],
    ),
    cmd(
      "pi_forge",
      "在西隆的工房里做东西",
      "谋生",
      14,
      "这里的手艺人不问你要做什么，只问你要多少",
      [
        ["你跟着工房做了整整一个月，带走一箱能卖的东西，还有一套自己的工具。", "工头说，你算是入行了。"],
        { stats: { wealth: 150, int: 5, health: 2 }, goal: 3 },
      ],
      [
        ["货做出来了，粗糙但能用。", "够本。"],
        { stats: { wealth: 80, int: 3 } },
      ],
      [
        ["你把一炉料做废了，赔了钱，还被扣了一个月工。", "但那炉废料里的纹路，你看了很久。"],
        { stats: { wealth: -70, int: 4 } },
      ],
    ),
  ],

  ranoah: [
    cmd(
      "pn_envoy",
      "在使节的宴会里周旋",
      "社交",
      16,
      "三大国的使节在同一张桌上，谈的是各自的价钱",
      [
        ["你听完整场，只说了三句话。三句都在点子上。", "散席时有人记住了你的名字，两次。"],
        { stats: { charm: 5, scheme: 5, int: 3, fame: 4 }, goal: 4 },
      ],
      [
        ["你陪了一整晚的笑。", "有用的东西不多，但有一句话你记住了。"],
        { stats: { charm: 4, scheme: 3, fame: 2 } },
      ],
      [
        ["你插了一句不该插的话，两边同时安静了一瞬。", "那一瞬之后，你被架到了桌子最外圈。"],
        { stats: { charm: -3, fame: -3, scheme: 2 } },
      ],
    ),
    cmd(
      "pn_politics",
      "打探王宫与公会的分歧",
      "隐秘",
      14,
      "国王要的是一处遗物，公会说那是公会的",
      [
        ["你把两边的底牌各摸了一半，合起来正好是一副。", "这副牌你收着。"],
        { stats: { scheme: 8, int: 5 }, factions: { 魔术公会: 6 }, notice: "你知道了一件王宫与公会都不愿公开的争执。" },
      ],
      [
        ["你确认这次争执是真的，理由则各有各的说法。", "你记下了两边用的词。"],
        { stats: { scheme: 5, int: 3 } },
      ],
      [
        ["你的打听传到了不该传的地方。", "有人开始用另一种眼神看你。"],
        { stats: { scheme: 3, fame: -3 }, factions: { 魔术公会: -4 } },
      ],
    ),
    cmd(
      "pn_commission",
      "接一份王国挂出的委托",
      "冒险",
      20,
      "王国出的委托，报酬从不含糊，麻烦也从不含糊",
      [
        ["委托做完的那天，你在回执上按了印。", "经办的人说，以后这类事还会找你。"],
        { tier: { kind: "adventure", gain: 18 }, stats: { fame: 6, wealth: 130, int: 3 }, goal: 5 },
      ],
      [
        ["办得不算漂亮，但交得出去。", "回执上有你的名字了。"],
        { tier: { kind: "adventure", gain: 12 }, stats: { fame: 4, wealth: 80 } },
      ],
      [
        ["你办砸了一半，还赔进去一件装备。", "经办的人没说什么，只是把回执收走了。"],
        { tier: { kind: "adventure", gain: 5 }, stats: { fame: -3, health: -6, wealth: -60 } },
      ],
    ),
  ],

  sanctuary: [
    cmd(
      "pc_morning",
      "从晨练开始",
      "修炼",
      16,
      "这里不看天赋，只看你还能不能站起来",
      [
        ["同一个动作重复了上千次。收刀时，师范点了下头。", "他从不夸人。所以这一下头，你记了很久。"],
        { tier: { kind: "sword", gain: 16 }, stats: { sword: 5 }, goal: 3 },
      ],
      [
        ["这一次，你的刀多一个动作都没有。", "镜子里的人，比上个月干净。"],
        { tier: { kind: "sword", gain: 12 }, stats: { sword: 4 } },
      ],
      [
        ["动作越练越僵，师兄纠正了你三次。", "第三次他攥住你的手腕，把角度硬掰过来。那一下你懂了。"],
        { tier: { kind: "sword", gain: 6 }, stats: { sword: 2, health: -2 }, learnSkill: "sg_wrist_drop" },
      ],
    ),
    cmd(
      "pc_trueblade",
      "与同门以真剑对练",
      "修炼",
      20,
      "真剑和木刀之间的差距，只有挨过的人才懂",
      [
        ["你被划开一道很深的口子，同门把你按住替你处理。", "疼是真疼。但从那以后，你不再怕真剑。"],
        { tier: { kind: "sword", gain: 18 }, stats: { sword: 6, int: 3, health: -10 } },
      ],
      [
        ["你们收了力。真剑不收力。", "练完后两人都坐在地上，谁也没先开口。"],
        { tier: { kind: "sword", gain: 12 }, stats: { sword: 4, health: -5 } },
      ],
      [
        ["一次交手之后，你看见了对方的破绽，也看见了自己的。", "这种对练，最能长东西。"],
        { tier: { kind: "sword", gain: 15 }, stats: { sword: 5, health: -5 } },
      ],
      { swordTier: "中级" },
    ),
    cmd(
      "pc_mountain",
      "在道场外的山路上练脚",
      "修炼",
      14,
      "剑术的一半在脚上，这一半没人教",
      [
        ["你在碎石路上跑了一个月，落脚的位置自己变了。", "回道场那天，师范看了你的脚一眼。"],
        { tier: { kind: "sword", gain: 13 }, stats: { sword: 4, health: 3 }, goal: 2 },
      ],
      [
        ["你摔了很多次。", "但每次摔的地方都不一样了。"],
        { tier: { kind: "sword", gain: 9 }, stats: { sword: 3, health: 2 } },
      ],
      [
        ["你崴了脚，在山道上坐了半宿。", "看了一夜的星。第二天扶着树走回来。"],
        { tier: { kind: "sword", gain: 4 }, stats: { health: -4, int: 3 } },
      ],
    ),
  ],

  sky: [
    cmd(
      "sk_audience",
      "见甲龙王一次",
      "社交",
      16,
      "他要的不是敬意，是你身上有没有可说的事",
      [
        ["他让你讲完这一路。听完只说了一句：「你还算有趣。」", "从五龙将手里接过一件旧东西时，你没敢细看。"],
        { stats: { fame: 8, int: 5, charm: 4 }, goal: 5, notice: "甲龙王听过你的故事，并且记住了。" },
      ],
      [
        ["你等了很久。他只问了三句话。", "三句都在问你到底想要什么。"],
        { stats: { fame: 5, int: 4 }, goal: 3 },
      ],
      [
        ["他听了两句就去处理别的事了。", "你在原地站到风把衣服吹干。"],
        { stats: { int: 3, faith: 2 } },
      ],
    ),
    cmd(
      "sk_dragonkin",
      "与五龙将待一个月",
      "社交",
      12,
      "他们跟着他太久，话都变得很短",
      [
        ["她把一件事讲得极清楚，没有一句多余。", "你忽然明白，能被这样的人当同行者，本身就是一种资格。"],
        { stats: { charm: 4, int: 5, fame: 3 }, goal: 3 },
      ],
      [
        ["你们聊了些旧事。那些事发生的时候，你还没出生。", "「二百年」这三个字从此有了分量。"],
        { stats: { int: 4, charm: 3 } },
      ],
      [
        ["对方看了你一眼，转身走了。", "你还不够格。这件事不用人说。"],
        { stats: { int: 2, scheme: 2 }, energy: 8 },
      ],
    ),
    cmd(
      "sk_trial",
      "接受一次试炼",
      "修炼",
      24,
      "他给的东西从不附带解释",
      [
        ["试炼的内容是让你在一间没有出口的屋子里待三天。", "第三天你走出来的时候，手上多了一层看不见的壳。"],
        { tier: { kind: "sword", gain: 18 }, stats: { sword: 5, mana: 5, int: 4, health: -6 }, goal: 5 },
      ],
      [
        ["你没能完成，也没有被嘲笑。", "他们只是把你从屋里放了出来。"],
        { tier: { kind: "sword", gain: 11 }, stats: { int: 4, health: -4 } },
      ],
      [
        ["你在屋里待了三天，什么也没想明白。", "但出来之后，你不再怕黑。"],
        { tier: { kind: "sword", gain: 7 }, stats: { int: 5, faith: 3 } },
      ],
    ),
  ],

  ryumei: [
    cmd(
      "ry_climb",
      "往龙神孔的方向走",
      "探索",
      22,
      "越往上，风里的低音越清楚",
      [
        ["你走到了云雾线以上，看见的第一个东西不是迷宫，是一片从没被人画过的湖。", "你在湖边把水壶灌满，掉头下山。"],
        { tier: { kind: "adventure", gain: 20 }, stats: { int: 6, fame: 6, health: -8 }, goal: 6, notice: "你上到了龙鸣山的高处，并且活着回来。" },
      ],
      [
        ["你只走到半山，雾就把路收了。", "但你在雾里辨认方向的那一段，比什么都长本事。"],
        { tier: { kind: "adventure", gain: 12 }, stats: { int: 4, health: -6 }, goal: 3 },
      ],
      [
        ["你在山上迷了两天，是靠着一处泉水活下来的。", "往下走的时候，你听见了那个低音，很近。"],
        { tier: { kind: "adventure", gain: 6 }, stats: { int: 3, health: -12 } },
      ],
    ),
    cmd(
      "ry_listen",
      "在山上听那个低音",
      "学术",
      14,
      "有人听了一辈子，只写了一页纸",
      [
        ["你把低音的间隔记了一个月，画出一条不像规律的规律。", "这条曲线你留着，因为它指向的不是这座山。"],
        { stats: { int: 8, mana: 5, faith: 3 }, threads: { dragonGod: "你在龙鸣山上记下了一条曲线。它指向别处。" }, notice: "你听见了龙鸣山的低音，并记下了它的间隔。" },
      ],
      [
        ["你听了整整一个月，什么也没听出来。", "但你学会了怎么安静地待着。"],
        { stats: { int: 5, faith: 3 } },
      ],
      [
        ["低音在你睡着的时候响了一次。", "醒来时耳朵里有几天一直在响。"],
        { stats: { int: 4, mana: 3, health: -4 } },
      ],
    ),
    cmd(
      "ry_survive",
      "在赤龙的地盘上活一个月",
      "冒险",
      26,
      "S 级强度的东西栖息在山顶，它不介意你路过，只要你看起来不像食物",
      [
        ["你学会了怎么在山里生火不被看见，怎么走不被听见。", "一个月之后，你活着走下赤龙山脉。"],
        { tier: { kind: "adventure", gain: 22 }, stats: { sword: 4, health: -8, fame: 8, int: 4 }, lifespan: -1, goal: 6, factions: { 冒险者公会: 10 } },
      ],
      [
        ["你守着一处岩缝过了一个月，几乎没动。", "活着下来了。"],
        { tier: { kind: "adventure", gain: 12 }, stats: { health: -6, int: 4 }, goal: 3 },
      ],
      [
        ["你被远远看了一眼。那一眼之后，你在石头后面躲了两天。", "有些东西不必交手，也知道差多少。"],
        { tier: { kind: "adventure", gain: 7 }, stats: { health: -10, int: 5 } },
      ],
    ),
  ],
};

/** 每个地点一个场景，只在人在那里时出现 */
const PLACE_SCENES: SceneDef[] = PLACES.map((place) => ({
  id: place.sceneId,
  name: place.name,
  desc: place.desc,
  match: (s) => s.character.residence === place.residence,
  gate: place.sceneGate ?? { residence: [place.residence] },
  commands: PLACE_COMMANDS[place.id] ?? [],
}));

SCENES.push(...PLACE_SCENES);

/**
 * 带剧情分岔的指令。
 *
 * 与 cmd 写出来的指令不同的只有两处：任意一档结果可以挂 when（只在某个剧情状态下成立）
 * 与 triggerEvent（结算完翻开一个特殊事件）。判定顺序是「先按剧情筛档，再按三档概率抽」，
 * 所以同一条指令在不同处境下会开出不同的戏。这些写成完整对象而不是 cmd 的位置参数，
 * 是因为一档一档地看 when 才看得清分岔在哪儿。
 */
const BRANCH_COMMANDS: Record<string, PresetCommand[]> = {
  home: [
    {
      id: "hm_family_talk",
      label: "和家里坐下来谈一次",
      category: "家庭",
      cost: 10,
      hint: "把那些一直绕着走的话摆到桌面上。谈成什么样，看你走到哪一步了",
      require: { anyoneHere: true },
      outcomes: [
        {
          tier: "大概率",
          lines: [
            "你们坐了一晚上，说的都是这些年的琐事。",
            "没有谁提要紧的。但能这样坐着，本身就不容易。",
          ],
          effects: { stats: { charm: 3 }, goal: 3, starDelta: { match: "", delta: 1, note: "你们坐在一起说了一晚的话" } },
        },
        {
          tier: "中概率",
          lines: [
            "话题绕到了那一年：天空裂开的那个下午，各自落在了哪儿。",
            "有人说到一半就停了。剩下的话，你们替他说完。",
          ],
          effects: { stats: { charm: 3, faith: 3 }, goal: 5 },
          when: { flag: "transferSurvived" },
        },
        {
          tier: "中概率",
          lines: [
            "有人提起了父亲。没有人接话，可谁都没有把话头掐掉。",
            "你们就那样坐着，把这件事在桌上放了一会儿。",
          ],
          effects: { stats: { charm: 2, faith: 4, int: 2 }, goal: 4 },
          when: { flag: "paulDead" },
        },
        {
          tier: "中概率",
          lines: [
            "谈过那一次之后，家里说话的方式变了一点：绕的弯少了。",
            "有些话还是不好说，但至少不必先想三遍。",
          ],
          effects: { stats: { charm: 3, int: 2 }, goal: 3 },
          when: { flag: "familyTalked" },
        },
        {
          tier: "小概率",
          lines: [
            "今天不一样。你把一直压着的那件事，直接摆了出来。",
            "桌上的碗筷都停了。",
          ],
          effects: { stats: { int: 2 }, energy: -6 },
          triggerEvent: "home-reckoning",
        },
      ],
    },
  ],
  dojo: [
    {
      id: "dj_fair_bout",
      label: "求师父给你安排一场较量",
      category: "修炼",
      cost: 20,
      hint: "跟同门真刀真枪打一场。师父肯不肯点头，看你怎么开口",
      require: { swordTier: "中级" },
      outcomes: [
        {
          tier: "大概率",
          lines: [
            "师父挑了个人上来。三个回合，你没占到便宜，也没丢人。",
            "散场时他只说了一句：脚下再稳一点。",
          ],
          effects: { tier: { kind: "sword", gain: 14 }, stats: { sword: 4, health: -3 }, goal: 2 },
        },
        {
          tier: "中概率",
          lines: ["你输得很难看。第二天你自己加练到天黑。", "输得清楚，比赢得糊涂有用。"],
          effects: { tier: { kind: "sword", gain: 20 }, stats: { sword: 3, int: 3, health: -4 } },
        },
        {
          tier: "小概率",
          lines: [
            "师父把木刀往地上一顿，说：让我看看你到底学到了什么。",
            "整座道场的人都围了过来。",
          ],
          effects: { stats: { sword: 2 }, energy: -10 },
          triggerEvent: "sword",
        },
      ],
    },
  ],
  library: [
    {
      id: "lb_bottom_shelf",
      label: "翻到书架最里面那一层",
      category: "学术",
      cost: 14,
      hint: "最里层的那排书没人动过，灰也是新的。看不看，你自己定",
      outcomes: [
        {
          tier: "大概率",
          lines: ["你在最里层翻到几本没人借过的旧书。有一页被折了角，折得很有目的性。", "你把它抄了下来。"],
          effects: { stats: { int: 4 }, goal: 2 },
        },
        {
          tier: "中概率",
          lines: ["灰尘下面是一排编年史，缺了中间好几年。", "缺口的位置，比内容本身更说明问题。"],
          effects: { stats: { int: 3, scheme: 4 }, goal: 3 },
        },
        {
          tier: "小概率",
          lines: [
            "你抽出一本装订不对的厚书，里面掉出一页纸，不属于这本书。",
            "字迹很潦草，像是有人匆忙记下的东西。",
          ],
          effects: { stats: { int: 2 } },
          triggerEvent: "forbidden",
        },
      ],
    },
  ],
  guild: [
    {
      id: "gd_sealed_entry",
      label: "打听那扇被封的门",
      category: "探索",
      cost: 16,
      hint: "公会把一个入口封了，理由写着「危险」，却没写危险什么",
      require: { adventurerRank: "F" },
      outcomes: [
        {
          tier: "大概率",
          lines: ["柜台后面的人只说照着通知办，别的不知道。", "你不知道他是真不知道，还是不想说。"],
          effects: { stats: { scheme: 3, int: 2 } },
        },
        {
          tier: "中概率",
          lines: ["一个老资格的冒险者跟你说了几句：封条是上面下的，不是公会自己添的。", "这条消息值一顿酒钱。"],
          effects: { stats: { scheme: 5, int: 3, wealth: -30 }, goal: 2 },
        },
        {
          tier: "小概率",
          lines: [
            "你顺着这条线往下问，问到了封条底下的那扇门前。",
            "站在那儿的时候，你听见下面有很轻的水声。",
          ],
          effects: { stats: { scheme: 2 } },
          triggerEvent: "maze",
        },
      ],
    },
  ],
};

/** 挂在已有场景上的剧情指令：门开了才会出现 */
const STORY_COMMANDS: Record<string, PresetCommand[]> = {
  home: [
    cmd(
      "hm_zenith",
      "陪母亲坐一会儿",
      "家庭",
      8,
      "她还在，只是不再认得你",
      [
        ["你把她扶到院子里晒太阳。她的手一直在动，像在找什么。", "你没有叫她的名字。叫了也没有用。"],
        { stats: { charm: 4, faith: 4 }, energy: 10, starDelta: { match: "塞妮丝", delta: 1, note: "你陪了她一整天" }, goal: 3 },
      ],
      [
        ["你替她梳了头发，换了干净衣服。", "做完这些，你在门槛上坐了很久。"],
        { stats: { charm: 3, health: 2 }, goal: 2 },
      ],
      [
        ["你想跟她说话，坐了一个下午。", "她一次都没有转过头来。"],
        { stats: { faith: 3, int: 2 } },
      ],
      undefined,
      { flag: "paulDead" },
    ),
  ],
  guild: [
    cmd(
      "gd_hidden_job",
      "接一件别人不肯接的委托",
      "冒险",
      24,
      "有人把委托挂在这里，就是等着某个特定的人接下来",
      [
        ["委托的内容很干净，报酬却高得没道理。", "你接下来了。世界照常运转，你多了一笔钱和一个不知道名字的雇主。"],
        { tier: { kind: "adventure", gain: 12 }, stats: { wealth: 180, fame: 3, scheme: 5 }, goal: 3, notice: "你接了一件来路过分干净的委托。" },
      ],
      [
        ["你把它查了一遍，没查出问题。", "没有问题，本身就是问题。"],
        { stats: { scheme: 6, int: 3 } },
      ],
      [
        ["你查得太深，雇主把委托撤了。", "撤得很快，像是不想让人记住它存在过。"],
        { stats: { scheme: 4, int: 2 }, energy: -6 },
      ],
      undefined,
      { flag: "humanGodApostle" },
    ),
  ],
};

/**
 * 把进阶指令、分岔指令与剧情指令挂到对应场景上。
 * 三张表都可能往同一个场景里加东西，所以按场景把名单拼起来，
 * 而不是用对象展开——那样后面那张表会把前面同名的整块顶掉。
 * （必须在建立 id 索引之前完成）
 */
const SCENE_COMMAND_SOURCES: Record<string, PresetCommand[]>[] = [
  CONDITIONAL_COMMANDS,
  BRANCH_COMMANDS,
  STORY_COMMANDS,
];
const EXTRA_COMMANDS_BY_SCENE = new Map<string, PresetCommand[]>();
for (const source of SCENE_COMMAND_SOURCES) {
  for (const [sceneId, list] of Object.entries(source)) {
    EXTRA_COMMANDS_BY_SCENE.set(sceneId, [...(EXTRA_COMMANDS_BY_SCENE.get(sceneId) ?? []), ...list]);
  }
}
for (const [sceneId, list] of EXTRA_COMMANDS_BY_SCENE) {
  const scene = SCENES.find((s) => s.id === sceneId);
  if (scene) scene.commands.push(...list);
}

/** 场景 id → 场景 */
const SCENE_BY_ID = new Map(SCENES.map((s) => [s.id, s]));

/** 哪些场景是「地点」——它们由所在地决定，只有迁居能换 */
const PLACE_SCENE_IDS = new Set(PLACES.map((p) => p.sceneId));

/** 内置场景本身，不含存档增量。合并展示请用 resolveScene */
export function sceneById(id: string): SceneDef | undefined {
  return SCENE_BY_ID.get(id);
}

/* ------------------------------------------------------------------ *
 * 剧情门槛与存档增量
 *
 * 「你的行动」面板展示的不是 SCENES 这张静态表，而是
 * 「过了门槛的内置场景 + 这一份存档自己长出来的场景与指令」的合并结果。
 * ------------------------------------------------------------------ */

const statOf = (s: GameState, key: string) => s.stats.find((x) => x.key === key)?.value ?? 0;

/** 剧情门槛是否已开 */
export function gateOpen(s: GameState, gate?: SceneGate): boolean {
  if (!gate) return true;
  if (gate.any && !gate.any.some((sub) => gateOpen(s, sub))) return false;
  if (gate.minYear !== undefined && s.year < gate.minYear) return false;
  if (gate.maxYear !== undefined && s.year > gate.maxYear) return false;
  if (gate.flag && !(s.flags ?? []).includes(gate.flag)) return false;
  if (gate.notFlag && (s.flags ?? []).includes(gate.notFlag)) return false;
  if (gate.seenEvent && !s.seenEvents.includes(gate.seenEvent)) return false;
  if (gate.notSeenEvent && s.seenEvents.includes(gate.notSeenEvent)) return false;
  if (gate.anySkill && !gate.anySkill.some((id) => s.skills.includes(id))) return false;
  if (gate.stats && Object.entries(gate.stats).some(([k, v]) => statOf(s, k) < v)) return false;
  if (gate.anyStats && !Object.entries(gate.anyStats).some(([k, v]) => statOf(s, k) >= v)) return false;
  if (gate.origin && !gate.origin.some((v) => s.character.origin.includes(v))) return false;
  if (gate.swordSchool && !gate.swordSchool.includes(s.character.swordSchool)) return false;
  if (gate.faith && !gate.faith.includes(s.character.faith)) return false;
  if (gate.adventurerRank && RANK_ORDER.indexOf(s.character.adventurerRank) < RANK_ORDER.indexOf(gate.adventurerRank)) {
    return false;
  }
  if (gate.relation) {
    const rel = s.relations.find((r) => r.name.includes(gate.relation!.name));
    if (!rel || rel.stars < gate.relation.minStars) return false;
  }
  if (gate.residence && !gate.residence.includes(s.character.residence)) return false;
  return true;
}

/**
 * 门槛「要什么」的短写法，正向陈述。
 * 用在「任一条件成立即可」这种或关系上——那种情况下逐条讲失败的原因反而看不懂。
 */
function gateNeed(gate: SceneGate): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(gate.anyStats ?? {})) out.push(`${STAT_LABEL[k] ?? k} ${v}`);
  for (const [k, v] of Object.entries(gate.stats ?? {})) out.push(`${STAT_LABEL[k] ?? k} ${v}`);
  if (gate.origin) out.push(`${gate.origin.join("／")}出身`);
  if (gate.swordSchool) out.push(`习${gate.swordSchool.join("／")}`);
  if (gate.faith) out.push(`信仰${gate.faith.join("／")}`);
  if (gate.residence) out.push(`人在${gate.residence.join("／")}`);
  if (gate.adventurerRank) out.push(`冒险者等级 ${gate.adventurerRank} 以上`);
  if (gate.minYear !== undefined) out.push(`甲龙历 ${gate.minYear} 年后`);
  // 标记与经历没法在这里说出名字，只能说「一段特定的经历」
  if (gate.flag || gate.seenEvent) out.push("一段特定的经历");
  for (const sub of gate.any ?? []) out.push(...gateNeed(sub));
  return out;
}

/** 门槛没开的原因，写给人看 */
export function gateReason(s: GameState, gate?: SceneGate): string {
  if (!gate) return "";
  if (gate.any && !gate.any.some((sub) => gateOpen(s, sub))) {
    const needs = [...new Set(gateNeed(gate))];
    return needs.length > 0 ? `还差一样：${needs.join("，或")}` : "你现在的处境还到不了那儿";
  }
  if (gate.minYear !== undefined && s.year < gate.minYear) return `这件事要等到甲龙历 ${gate.minYear} 年以后`;
  if (gate.maxYear !== undefined && s.year > gate.maxYear) return "这件事的时机已经过去了";
  if (gate.flag && !(s.flags ?? []).includes(gate.flag)) return "这段经历你还没有走过";
  if (gate.notFlag && (s.flags ?? []).includes(gate.notFlag)) return "这条路你已经走过去了";
  if (gate.seenEvent && !s.seenEvents.includes(gate.seenEvent)) return "这件事你还没有经历过";
  if (gate.notSeenEvent && s.seenEvents.includes(gate.notSeenEvent)) return "这件事的时机已经过去了";
  if (gate.anySkill && !gate.anySkill.some((id) => s.skills.includes(id))) return "你还没有掌握对应的招式";
  if (gate.stats) {
    for (const [k, v] of Object.entries(gate.stats)) if (statOf(s, k) < v) return "你的本事还不到";
  }
  if (gate.anyStats && !Object.entries(gate.anyStats).some(([k, v]) => statOf(s, k) >= v)) {
    const need = Object.entries(gate.anyStats)
      .map(([k, v]) => `${STAT_LABEL[k] ?? k} ${v}`)
      .join(" 或 ");
    return `你的本事还不到（${need} 中至少一项）`;
  }
  if (gate.origin && !gate.origin.some((v) => s.character.origin.includes(v))) return "你的出身进不去那个圈子";
  if (gate.swordSchool && !gate.swordSchool.includes(s.character.swordSchool)) return `需习${gate.swordSchool.join("或")}`;
  if (gate.faith && !gate.faith.includes(s.character.faith)) return `需信仰${gate.faith.join("或")}`;
  if (gate.adventurerRank && RANK_ORDER.indexOf(s.character.adventurerRank) < RANK_ORDER.indexOf(gate.adventurerRank)) {
    return `冒险者等级需 ${gate.adventurerRank} 以上`;
  }
  if (gate.relation) {
    const rel = s.relations.find((r) => r.name.includes(gate.relation!.name));
    if (!rel || rel.stars < gate.relation.minStars) return `与「${gate.relation.name}」的交情还不够`;
  }
  if (gate.residence && !gate.residence.includes(s.character.residence)) return "你现在不在那个地方";
  return "";
}

/** 存档里的场景增量。旧存档没有这个字段时视作空 */
export function sceneStashOf(s: GameState): SceneStash {
  const stash = s.customScenes;
  if (!stash || !Array.isArray(stash.scenes)) return { scenes: [], byScene: {} };
  return { scenes: stash.scenes, byScene: stash.byScene ?? {} };
}

/** 存档级指令 → 引擎认得的预设指令。它只有一档结果，因此每次结算都一样 */
export function customToPreset(c: CustomCommand): PresetCommand {
  return {
    id: c.id,
    label: c.label,
    category: c.category,
    cost: c.cost,
    hint: c.hint,
    outcomes: [{ tier: "大概率", lines: c.lines, effects: c.effects }],
  };
}

/** 某个场景现在实际展示的指令：内置（过门槛）＋ 存档追加的 */
export function sceneCommands(s: GameState, sceneId: string): PresetCommand[] {
  const stash = sceneStashOf(s);
  const base = SCENE_BY_ID.get(sceneId);
  const list = base ? base.commands.filter((c) => gateOpen(s, c.gate)) : [];
  const extra = stash.byScene[sceneId] ?? [];
  return extra.length > 0 ? [...list, ...extra.map(customToPreset)] : list;
}

/** 面板上现在该出现的场景。地点场景排在最前，因为它就是你此刻站的地方 */
export function visibleScenes(s: GameState): SceneDef[] {
  const stash = sceneStashOf(s);
  const base = SCENES.filter((sc) => gateOpen(s, sc.gate)).map((sc) => ({ ...sc, commands: sceneCommands(s, sc.id) }));
  const extra: SceneDef[] = stash.scenes.map((cs) => ({
    id: cs.id,
    name: cs.name,
    desc: cs.desc,
    match: () => false,
    commands: sceneCommands(s, cs.id),
  }));
  const all = [...base, ...extra];
  return [
    ...all.filter((sc) => PLACE_SCENE_IDS.has(sc.id)),
    ...all.filter((sc) => !PLACE_SCENE_IDS.has(sc.id)),
  ];
}

/** 按 id 取一个「可以直接渲染」的场景（已合并存档增量与剧情门槛） */
export function resolveScene(s: GameState, id: string): SceneDef | undefined {
  return visibleScenes(s).find((sc) => sc.id === id);
}

/** 角色现在身处的地点场景。找不到说明所在地不在原作地点表里 */
export function placeSceneId(s: GameState): string | undefined {
  return PLACES.find((p) => p.residence === s.character.residence)?.sceneId;
}

/** 角色当前最可能身处的场景。先按所在地定位，再退到场合场景 */
export function defaultSceneId(s: GameState): string {
  const list = visibleScenes(s);
  const place = list.find((scene) => scene.match(s) && PLACE_SCENE_IDS.has(scene.id));
  if (place) return place.id;
  const hit = list.find((scene) => scene.id !== "home" && scene.match(s));
  return hit?.id ?? (list.some((scene) => scene.id === "home") ? "home" : (list[0]?.id ?? "home"));
}

/* ---------- 存档增量的合并 ---------- */

/** 一个存档里最多留几个剧情场景、几条剧情指令 */
const SCENE_LIMIT = 8;
const CUSTOM_COMMAND_LIMIT = 24;

export function emptySceneStash(): SceneStash {
  return { scenes: [], byScene: {} };
}

function hashText(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * 把模型提交的场景改动并进存档。
 * 名字对上已有场景就追加指令，对不上就新建一个场景；
 * 指令按标签去重，超量时只留最近的若干条——与 canon 一样，存档不能被无限撑大。
 */
export function mergeSceneStash(prev: SceneStash | undefined, patches: ScenePatch[] | undefined): SceneStash {
  const base: SceneStash = prev
    ? {
        scenes: Array.isArray(prev.scenes) ? prev.scenes.map((x) => ({ ...x })) : [],
        byScene: Object.fromEntries(Object.entries(prev.byScene ?? {}).map(([k, v]) => [k, [...v]])),
      }
    : emptySceneStash();
  if (!patches?.length) return base;

  const usedLabels = new Set<string>();
  for (const scene of SCENES) for (const c of scene.commands) usedLabels.add(c.label);
  for (const list of Object.values(base.byScene)) for (const c of list) usedLabels.add(c.label);

  for (const patch of patches) {
    const name = patch.name.trim();
    if (!name || !patch.commands.length) continue;
    const builtin = SCENES.find((sc) => sc.name === name);
    const custom = base.scenes.find((sc) => sc.name === name);
    const sceneId = builtin?.id ?? custom?.id ?? `cs-${hashText(name) % 1000000}`;
    if (!builtin && !custom) {
      base.scenes.push({ id: sceneId, name, desc: patch.desc?.trim() || "这一段人生里新出现的地方。" });
    }
    const list = base.byScene[sceneId] ?? [];
    for (const c of patch.commands) {
      if (usedLabels.has(c.label)) continue;
      usedLabels.add(c.label);
      list.push({ ...c, id: `cx-${hashText(`${sceneId}:${c.label}`) % 1000000}` });
    }
    base.byScene[sceneId] = list;
  }

  // 封顶：场景与指令各留最近的若干条，避免存档与面板无限膨胀
  base.scenes = base.scenes.slice(-SCENE_LIMIT);
  const aliveScenes = new Set([...SCENES.map((sc) => sc.id), ...base.scenes.map((sc) => sc.id)]);
  const flat: { sceneId: string; command: CustomCommand }[] = [];
  for (const [sceneId, list] of Object.entries(base.byScene)) {
    if (!aliveScenes.has(sceneId)) continue;
    for (const command of list) flat.push({ sceneId, command });
  }
  const byScene: Record<string, CustomCommand[]> = {};
  for (const { sceneId, command } of flat.slice(-CUSTOM_COMMAND_LIMIT)) {
    (byScene[sceneId] ??= []).push(command);
  }
  base.byScene = byScene;
  return base;
}

/** 全部命令，用于按 id 反查 */
const COMMAND_BY_ID = new Map<string, PresetCommand>();
for (const scene of SCENES) {
  for (const c of scene.commands) {
    if (COMMAND_BY_ID.has(c.id)) throw new Error(`预设命令 id 重复：${c.id}`);
    COMMAND_BY_ID.set(c.id, c);
  }
}

/** 按 id 反查指令。传了状态就一并查这一份存档里长出来的指令 */
export function commandById(id: string, s?: GameState): PresetCommand | undefined {
  const base = COMMAND_BY_ID.get(id);
  if (base) return base;
  if (!s) return undefined;
  const stash = sceneStashOf(s);
  for (const list of Object.values(stash.byScene)) {
    const hit = list.find((c) => c.id === id);
    if (hit) return customToPreset(hit);
  }
  return undefined;
}

/** 这条指令现在是否允许出现（剧情门槛）。引擎在结算时也会再拦一次 */
export function commandVisible(s: GameState, c: PresetCommand): boolean {
  return gateOpen(s, c.gate);
}

/**
 * 这条指令此刻是否真的摆在面板上。
 * 除了指令自己的门槛，还要看它所属的场景在不在——人不在那个地方，那一格不在面板上，
 * 这条指令也就无从执行。引擎结算时用它做二次拦截，避免绕过界面直接调用。
 */
export function commandAvailable(s: GameState, c: PresetCommand): boolean {
  return visibleScenes(s).some((scene) => scene.commands.some((x) => x.id === c.id));
}

/**
 * 按权重抽一档结果。传入的是 [0,1) 的随机数，便于用固定种子复现。
 *
 * 先按剧情筛一遍：只留下 when 条件成立的档，以及那些没写 when 的通用档。
 * 一条指令的所有档都挂了条件而一条都不成立时，退回全部档，
 * 免得指令点了没反应——那比走一条通用叙述更让人困惑。
 *
 * favor 是「把多少权重从小概率挪到大概率」，战斗结算用已学技能的威力来喂它：
 * 招式练得越多，日常表现越稳，翻车的机会越少。
 */
export function pickOutcome(command: PresetCommand, s: GameState, roll: number, favor = 0): PresetOutcome {
  const branchable = command.outcomes.filter((o) => gateOpen(s, o.when));
  const pool = branchable.length > 0 ? branchable : command.outcomes;
  const bonus = Math.max(0, Math.min(TIER_WEIGHT.小概率 - 1, Math.round(favor)));
  const weightOf = (tier: OutcomeTier) => {
    if (tier === "大概率") return TIER_WEIGHT[tier] + bonus;
    if (tier === "小概率") return Math.max(1, TIER_WEIGHT[tier] - bonus);
    return TIER_WEIGHT[tier];
  };
  const total = pool.reduce((sum, o) => sum + weightOf(o.tier), 0);
  let cursor = roll * total;
  for (const o of pool) {
    cursor -= weightOf(o.tier);
    if (cursor < 0) return o;
  }
  return pool[0] ?? command.outcomes[0];
}

/** 场景面板按类别归纳后的顺序 */
export function groupByCategory(commandList: PresetCommand[]): { category: CommandCategory; items: PresetCommand[] }[] {
  return CATEGORY_ORDER.map((category) => ({
    category,
    items: commandList.filter((c) => c.category === category),
  })).filter((g) => g.items.length > 0);
}
