export type View = "title" | "creation" | "rudeus" | "game" | "rulebook" | "achievements" | "ending" | "detail";

/**
 * 主页上每一块纲要都能进一个自己的详情页。
 * 主页只放「一眼看得完」的纲要，完整信息都在这些页里。
 */
export type DetailKind =
  | "profile"
  | "stats"
  | "skills"
  | "relations"
  | "mainline"
  | "factions"
  | "threads"
  | "achievements";

/** 难度：影响寿命、收入、健康衰减、事件频率、行动收益与抉择代价 */
export type Difficulty = "安逸" | "标准" | "残酷" | "地狱";

export interface Option {
  value: string;
  label: string;
  desc?: string;
}

export interface CreationDraft {
  era: string;
  origin: string;
  birthIdentity: string;
  name: string;
  age: string;
  gender: string;
  residence: string;
  family: string;
  faith: string;
  status: string;
  talents: string[];
  magicTier: string;
  swordTier: string;
  swordSchool: string;
  adventurerRank: string;
  blood: string;
  contract: string;
  corruption: string;
  college: string;
  politics: string;
  trait1: string;
  trait2: string;
  trait3: string;
  goal: string;
  emotion: string;
  precious: string;
  painful: string;
  style: string;
  difficulty: Difficulty;
  /**
   * 主线引导。创建存档时随机抽一条主线，用「随机」；
   * 抽完之后由接入的 AI 按主角信息做二次修改，之后每年按实际行为再微调。
   * 「不介入」意味着这一局不要主线，只留自由行动与原作事件。
   */
  mainlineMode: MainlineMode;
}

/** 主线引导的开关。原作模式不走这里，它有自己的那一条 */
export type MainlineMode = "随机" | "不介入";

export interface Character {
  name: string;
  age: number;
  gender: string;
  era: string;
  origin: string;
  originGroup: OriginGroup;
  birthIdentity: string;
  residence: string;
  family: string;
  faith: string;
  status: string;
  /** 特殊天赋，可多选（上限见 TALENT_LIMIT） */
  talents: string[];
  magicTier: string;
  swordTier: string;
  swordSchool: string;
  adventurerRank: string;
  blood: string;
  contract: string;
  corruption: string;
  college: string;
  politics: string;
  traits: string[];
  goal: string;
  emotion: string;
  precious: string;
  painful: string;
  style: string;
}

/** 出身分组，用于归类初始关系、属性与寿命。 */
export type OriginGroup =
  | "noble"
  | "commoner"
  | "demon"
  | "beast"
  | "mirees"
  | "mystic";

export type EntryKind = "world" | "action" | "rumor" | "choice" | "achievement" | "ending" | "mainline";

export interface ChronicleEntry {
  id: string;
  year: number;
  month: number;
  kind: EntryKind;
  title: string;
  lines: string[];
  rumor?: string;
}

/** 年鉴里的一条事件。只留标题与第一句，够年度视图回看 */
export interface YearEvent {
  month: number;
  kind: EntryKind;
  title: string;
  text: string;
}

/**
 * 一年的年鉴。
 *
 * 纪事本身只保留最近 160 条，回看不到十几年以前；
 * 所以每到年末，把这一年的纪事压成一条年鉴长期留着。
 * 一条年鉴几百字，六十年的存档也不会因此变重。
 */
export interface YearbookEntry {
  year: number;
  age: number;
  /** 这一年留下的事，按月排好 */
  events: YearEvent[];
  /** 世界这一年的动向，每月一句 */
  world: string[];
}

/** 年度视图读出来的一年。当前这一年还没有年鉴，直接从纪事里现取 */
export interface YearView extends YearbookEntry {
  /** 来自年鉴（true）还是本年仍在进行中（false） */
  archived: boolean;
}

export interface StatBar {
  key: string;
  label: string;
  unit: string;
  value: number;
  max: number;
  tone?: "gold" | "teal" | "crimson";
}

/**
 * 一个角色对这段关系的长期记忆。
 *
 * 每次交谈结束时由模型写下一条 summary，并追加若干条 facts；
 * 两者都随存档保存，下次再见面时会原样回到提示词里。
 * 这是「他记得你」的唯一来源——没有它，每次对话都是初次见面。
 */
export interface RelationMemory {
  /** 面对面谈过几次 */
  talks: number;
  /** 最后一次交谈发生在第几回合 */
  lastTurn?: number;
  /** 模型写下的一段记忆，长期保留 */
  summary: string;
  /** 逐条累积的关键事实：约定、承诺、把柄、心结 */
  facts: string[];
}

/**
 * 一个人跟玩家的家庭关系。
 *
 * 生育出来的角色不写进游戏本体的任何数据文件，只作为关系条目留在存档里，
 * 因此需要在这里说清他是谁的配偶、谁的孩子、哪一年生的。
 */
export interface FamilyTie {
  kind: "配偶" | "子女" | "父母" | "手足";
  /** 子女：父母的名字（玩家自己会以角色名出现） */
  parents?: string[];
  /** 子女：出生年份，界面用它算年龄 */
  birthYear?: number;
}

/** 玩家这一家的状态。生育要控制人数，这些计数跟着存档走 */
export interface FamilyState {
  /** 玩家已经生下的孩子总数（含没进关系网的） */
  children: number;
  /** NPC 生育的累计次数，用来封顶 */
  npcBirths: number;
  /** 玩家上一次生育的年份，避免连着几年不停生 */
  lastBirthYear?: number;
  /** 别人家上一次添丁的年份。两条线各有各的节奏 */
  npcLastBirthYear?: number;
  /**
   * 别人家的每一对夫妻各生了几个，键是夫妻两人的名字排好序拼起来的。
   * 原作时间线之外的夫妻靠它限制产量，免得一对夫妇几十年里添出一屋子孩子。
   */
  npcCoupleBirths?: Record<string, number>;
}

export interface Relation {
  name: string;
  role: string;
  stars: number;
  note: string;
  /**
   * 出生年份。年龄是「当前年份 - 出生年份」，所以有了它，岁数才会随年份一年年长。
   * 在关系建立的那一刻定下来并写进存档，之后不再改动；旧存档载入时按现状回填。
   */
  birthYear?: number;
  /**
   * 这个人常驻的地方（取值与 character.residence 一致）。
   * 你在哪儿遇见他，他就在哪儿；之后你搬走了，他还留在原地。
   * 它决定「离开家之后还能不能和父母说上话」——详见 engine/presence.ts。
   * 留空表示说不清他在哪儿，那时不受地点限制。
   */
  place?: string;
  /**
   * 是不是带着他一起走。玩家可以在关系网里手动开关。
   * 显式设了就以此为准；没设过时按身份推定（配偶与子女一定随行，
   * 身份里带「旅伴／同行／随行」一类的算路上结的伴）——见 engine/presence.ts。
   */
  follows?: boolean;
  secret?: string;
  /** 与玩家的关系性质，用于关系网分组与对话时的扮演依据 */
  bond?: RelationBond;
  /** 对应原作人物名录里的 id（见 src/data/characters.ts），自撰人物留空 */
  canonId?: string;
  /** 原作考据备注，只在人物确实来自原作时出现 */
  lore?: string;
  /** 此人与其他原作人物的关系，用于关系网中的人物间连线与 AI 提示词 */
  ties?: CanonTie[];
  /** 在哪儿认识的。原作人物写身份，普通熟人写场合 */
  metAt?: string;
  /** 上一次由对方主动开口的回合号，用于避免同一个人反复来敲门 */
  lastContactTurn?: number;
  /** 这个人记得的关于你们之间的事。没谈过话就是空的 */
  memory?: RelationMemory;
  /** 跟玩家的家庭关系。生育与成婚会产生它 */
  family?: FamilyTie;
}

/** 关系性质：决定关系网中的分组与连线样式 */
export type RelationBond = "血亲" | "师门" | "挚友" | "同僚" | "恋情" | "宿敌" | "熟人";

/** 两个原作人物之间的关系。with 写对方在名录里的名字 */
export interface CanonTie {
  with: string;
  kind: string;
}

/** 原作人物在剧本里登场的方式，决定钩子事件的模板 */
export type HookKind = "授艺" | "求助" | "挑衅" | "同行" | "托付" | "重逢";

/** 原作人物的剧本参与：一条只触发一次的抉择事件 */
export interface CanonHook {
  kind: HookKind;
  text: string;
}

/** 预设指令的类别，场景面板按它归纳。定义放在这里，存档级的自定义指令也要用它 */
export type CommandCategory =
  | "战斗"
  | "修炼"
  | "谋生"
  | "社交"
  | "探索"
  | "信仰"
  | "家庭"
  | "隐秘"
  | "学术"
  | "冒险"
  | "休养";

/**
 * 存档级的自定义指令。
 *
 * 由模型在剧情推进中生成，只写进这一份存档，不进入游戏本体的任何内容文件。
 * 它比内置指令简单：只有一档结果，结算仍走 applyEffects，因此同样受数值边界约束。
 */
export interface CustomCommand {
  id: string;
  label: string;
  category: CommandCategory;
  /** 精力消耗，可为负（休养类）。结算时与内置指令走同一条通道 */
  cost: number;
  /** 一句话说明，作为按钮悬停提示 */
  hint: string;
  lines: string[];
  effects: EventEffects;
}

/** 存档级的新场景。名字与描述都是模型按当前剧情生成的，指令统一放在 SceneStash.byScene 里 */
export interface CustomScene {
  id: string;
  name: string;
  desc: string;
}

/**
 * 一段剧情里长出来的场景与指令。
 * 与 canon 同一性质：随存档保存、随存档导出，不进游戏本体的数据文件。
 */
export interface SceneStash {
  /** 面板上新增的场景 */
  scenes: CustomScene[];
  /** 各场景的指令，键为场景 id（内置场景或上面新场景的 id） */
  byScene: Record<string, CustomCommand[]>;
}

/**
 * 写数据时用的指令写法。
 *
 * id 由 mergeSceneStash 按「场景 + 指令名」统一分配，所以写数据的人（人也好，模型也好）
 * 不必自己编一个；存档里存下来的仍然是完整的 CustomCommand。
 */
export type CustomCommandDraft = Omit<CustomCommand, "id"> & { id?: string };

/** 模型提交的一份场景改动：名字对上已有场景就追加指令，对不上就新建一个场景 */
export interface ScenePatch {
  name: string;
  desc?: string;
  commands: CustomCommandDraft[];
}

export interface Faction {
  name: string;
  value: number;
}

export interface Threads {
  humanGod: string;
  dragonGod: string;
  innerStruggle: string;
  treasureMemory: string;
  painMemory: string;
}

/** 抉择带来的数值影响。AI 推演的事件同样用这套结构表达后果 */
export interface EventEffects {
  stats?: Record<string, number>;
  tier?: { kind: "magic" | "sword" | "adventure"; gain: number };
  starDelta?: { match: string; delta: number; note?: string };
  goal?: number;
  lifespan?: number;
  energy?: number;
  addRelation?: Relation;
  notice?: string;
  rumor?: string;
  /** 直接改写线索面板的两条主线。玩家的情感记忆不允许被改写 */
  threads?: { humanGod?: string; dragonGod?: string };
  /**
   * 记下一个剧情标记，供后续事件、场景与指令的判断使用。
   * 例如「参与过转移迷宫决战」「做过人神使徒」——这些不是数值，是这段人生里发生过的事。
   */
  flag?: string;
  /**
   * 把角色的所在地改成这个值（见 data/places.ts 与 creation.ts 的所在地选项）。
   * 转移事件会把幸存者抛到别的大陆，迁居也走同一套落账逻辑。
   */
  residence?: string;
  /** 势力好感增减，键为势力名（阿斯拉王国 / 魔术公会 / 米里斯教团 / 冒险者公会 / 魔法大学 / 剑之圣地） */
  factions?: Record<string, number>;
  /**
   * 学会一个技能，取其 id（见 src/data/skills.ts）。
   * 「普通」技能通常由练习的小概率结果给出；「高级」技能只由特殊事件或强大角色授予。
   */
  learnSkill?: string;
}

/** 抉择事件：等待玩家做出选择的岔路 */
export interface DecisionOption {
  id: string;
  label: string;
  detail?: string;
  risk?: "低" | "中" | "高";
  /** 以下两项由 AI 推演生成的事件自带；内置事件走事件表，留空即可 */
  lines?: string[];
  outcome?: EventEffects;
}

export interface PendingEvent {
  id: string;
  title: string;
  body: string[];
  options: DecisionOption[];
}

/**
 * 羁绊角色的主动沟通。对方先开的口，等玩家回应。
 * 与 pendingEvent 不同：它不挡着时间往前走，但拖久了这段关系会淡下去。
 */
export interface PendingTalk {
  name: string;
  /** 对方开口的这句，由本地引擎写，后续对话才交给模型 */
  line: string;
  /** 触发时的回合号 */
  turn: number;
}

export interface Ending {
  year: number;
  month: number;
  age: number;
  cause: string;
  /**
   * 死因归类：寿终 / 病殁 / 横死 / 超自然。见 engine/death.ts 的判定规则。
   * 留空只出现在旧存档里。
   */
  kind?: string;
  /** 这次死亡凭什么站得住的依据，在终章里单独列出来 */
  basis?: string;
  epilogue: string[];
}

/* ---------- 主线剧情 ---------- */

/**
 * AI 按主角特点对某一章的二次改写。
 * 只覆盖叙述与指引：章的门槛、任务的判定条件这些「机器读的东西」保持原样，
 * 所以模型改不动这个世界怎么运转，只能改变这段剧情长什么样。
 */
export interface MainlineStageFit {
  title?: string;
  premise?: string;
  objective?: string;
  guidance?: string[];
  /** 模型为本局追加的任务。判定条件由它自己给的 flag 承担 */
  extraQuests?: { id: string; label: string; hint: string; flag: string }[];
}

/** 一条主线的存档状态。主线本身是静态数据（src/data/mainlines），这里只记走到哪儿了 */
export interface MainlineState {
  /** src/data/mainlines 里的主线 id */
  id: string;
  /** 当前章序号（0 起）。开篇失败时为 -1 */
  stage: number;
  /** 进入当前章的回合号，用来判「在这一章里过了多少个月」 */
  stageTurn: number;
  /** 已经走完的章 id */
  cleared: string[];
  /** 已完成的任务 id（带章前缀，全局唯一） */
  doneQuests: string[];
  /** 开场那一年 */
  startYear: number;
  /** 达成（走完全部章）或未竟（超期、中途断掉）。留空表示还在走 */
  outcome?: "达成" | "未竟";
  endedYear?: number;
  /** 开篇那段纪事的 id，AI 改写开场时按它替换正文 */
  openingId: string;
  /** AI 按主角信息做的那一层改写 */
  fit?: {
    name?: string;
    tagline?: string;
    opening?: string[];
    stages: Record<string, MainlineStageFit>;
  };
  /** 最近一次年度微调 */
  tune?: { year: number; note: string; focus?: string };
  /** 历次导演注记，长期保留。面板与终章都用它回看这条线是怎么走的 */
  notes: string[];
  /** 已经判过超期的章 id，避免反复算 */
  overdue?: string[];
}

/** 主线面板读出来的一份快照，全部由 engine/mainline.ts 现算 */
export interface MainlineQuestView {
  id: string;
  label: string;
  hint: string;
  done: boolean;
  /** 还没做到的原因，直接显示在面板上 */
  reason: string;
}

export interface MainlineChapterView {
  id: string;
  title: string;
  /** 「拖过」：期限到了还没做完，世界自己往前走了。这一章的收成一概没有 */
  status: "已完成" | "进行中" | "未到" | "拖过";
  note: string;
}

export interface MainlineView {
  id: string;
  name: string;
  theme: string;
  tagline: string;
  fit: string;
  outcome?: "达成" | "未竟";
  endedYear?: number;
  stageIndex: number;
  stageCount: number;
  stage: {
    id: string;
    title: string;
    premise: string;
    objective: string;
    guidance: string[];
    quests: MainlineQuestView[];
  } | null;
  /** 下一章是什么、为什么还没开 */
  next: { title: string; reason: string } | null;
  chapters: MainlineChapterView[];
  /** 本章还剩几个月就超期。null 表示不设期限 */
  deadlineLeft: number | null;
  notes: string[];
  tune?: { year: number; note: string; focus?: string };
  progress: number;
}

export interface GameState {
  character: Character;
  turn: number;
  year: number;
  month: number;
  birthYear: number;
  lifespan: number;
  /** 当前难度，可随时调节，影响后续演化 */
  difficulty: Difficulty;
  deceased: boolean;
  deathCause?: string;
  ending?: Ending;
  energy: number;
  /** 本月已用完的行动次数，推进一个月后归零 */
  actionsUsed: number;
  goalProgress: number;
  tierProgress: { magic: number; sword: number; adventure: number };
  stats: StatBar[];
  relations: Relation[];
  factions: Faction[];
  threads: Threads;
  log: ChronicleEntry[];
  /** 往年留下的年鉴。每到年末写入一条，长期保留 */
  yearbooks: YearbookEntry[];
  /** 玩家这一家的状态：子女数、NPC 生育计数 */
  family: FamilyState;
  notices: string[];
  achievements: string[];
  pendingEvent: PendingEvent | null;
  /** 羁绊角色主动来找你，等你回应。不挡推进，但拖久了会淡 */
  pendingTalk: PendingTalk | null;
  /** 经历过的抉择事件 id，避免重复触发 */
  seenEvents: string[];
  /** 上一次产生抉择事件的回合，用于控制事件间隔；从未发生为负数 */
  lastEventTurn: number;
  /**
   * 最近一个「AI 剧情月」的回合号。玩家在该回合自由输入过，因此这个月的
   * 世界动态也交给模型推演；只用预设命令的月份不会产生 AI 调用。为 -1 表示没有。
   */
  aiEngagedTurn: number;
  /** 已学会的技能 id，见 src/data/skills.ts */
  skills: string[];
  /**
   * 剧情标记：这段人生里确实发生过的事（参与过转移迷宫决战、做过人神使徒……）。
   * 事件、场景与指令的解锁都以它为依据，与数值无关。
   */
  flags: string[];
  /**
   * 剧情自己长出来的场景与指令。由模型按当前处境生成，只写进这一份存档。
   * 与 canon 同一性质：不进入游戏本体的任何内容文件。
   */
  customScenes: SceneStash;
  /**
   * AI 自撰设定集：模型基于原作设定自行发明并需要长期记住的人、地、事。
   * 只随存档保存，不写进游戏本体的任何内容文件。
   */
  canon: string[];
  /**
   * 这一局抽到的主线（见 src/data/mainlines）。
   * 为 undefined 表示这一局没有主线：旧存档、以及创建时选了「不介入」的人生都是这样。
   */
  mainline?: MainlineState;
}

export type AchievementCategory = "出身" | "成长" | "情感" | "世界" | "生存" | "抉择";

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  category: AchievementCategory;
  check: (s: GameState) => boolean;
}

export interface SaveFile {
  version: 1;
  savedAt: string;
  state: GameState;
}

export interface SaveSlot {
  id: string;
  savedAt: string;
  name: string;
  era: string;
  dateText: string;
  turn: number;
  age: number;
  achievementCount: number;
  deceased: boolean;
  state: GameState;
}