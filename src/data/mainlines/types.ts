import type { EventEffects, GameState, ScenePatch } from "../../types";
import type { SceneGate } from "../scenes";

/**
 * 主线剧情的数据结构。
 *
 * 一条主线是一串「章」，每一章有目标、指引、任务与进入/收束时发生的事。
 * 全部写成数据，没有闭包（事件除外，见 MainlineEventDef）：这样引擎能自己判定
 * 任务达没达成、能把它整段交给 AI 做二次修改，也能一眼看出某一条线卡在哪里。
 *
 * 时间一律优先用「相对时间」（monthsIn、deadlineMonths），绝对年份只在
 * onlyEras 已经把时代锁死时才用——否则玩家选了别的时代，这条线永远开不了场。
 */

/** 任务的达成条件。比场景门槛多几项：技能全集、阶级、进入本章后的月数 */
export interface MainlineGate extends SceneGate {
  /** 需要同时掌握全部这些招式 */
  allSkills?: string[];
  /** 魔术阶级下限 */
  magicTier?: string;
  /** 剑术阶级下限 */
  swordTier?: string;
  /** 年龄下限 */
  minAge?: number;
  /** 进入本章之后至少过了多少个月（相对时间，不受绝对年份限制） */
  monthsIn?: number;
  /** 任一子条件成立即可。子条件同样可以带上面这些额外项 */
  any?: MainlineGate[];
}

/** 一条任务。「怎么做到」写 hint，判定条件写 done */
export interface MainlineQuest {
  id: string;
  label: string;
  hint: string;
  done: MainlineGate;
}

/**
 * 一个剧情节拍：进入一章、收束一章、或者失败收场时发生的事。
 * effects 走引擎的 applyEffects（抉择事件档的额度），commands 会并进这一份存档的
 * 场景增量里——玩家在「你的行动」面板上真的能点到主线专属的做法。
 */
export interface MainlineBeat {
  lines: string[];
  effects?: EventEffects;
  rumor?: string;
  commands?: ScenePatch[];
}

export interface MainlineStage {
  id: string;
  /** 章名。例如「第二章 · 白刃之下」 */
  title: string;
  /** 这一章的处境与冲突，一到两句 */
  premise: string;
  /** 本章要达成什么。一句话，面板上显示在最显眼处 */
  objective: string;
  /** 指引：去哪儿、找谁、做什么。4-6 条，每条一句具体的话 */
  guidance: string[];
  /** 本章的任务清单，2-4 条。全部完成才算走完这一章 */
  quests: MainlineQuest[];
  /** 进入本章的门槛。不满足就一直停在上一章 */
  enter: MainlineGate;
  /** 进入本章后多少个月还没做完就算「未竟」。缺省表示不设期限 */
  deadlineMonths?: number;
  onEnter: MainlineBeat;
  onComplete: MainlineBeat;
  /** 这一章的关键抉择事件 id，写在同一份文件的 events 里 */
  event?: string;
}

/** 抽取时的适配标签。用 creation.ts 里的原字符串，不要自己造新词 */
export interface MainlineTags {
  origins?: string[];
  statuses?: string[];
  faiths?: string[];
  places?: string[];
  talents?: string[];
  styles?: string[];
  eras?: string[];
}

export interface MainlineDef {
  /** 全局唯一，只用小写字母与连字符 */
  id: string;
  name: string;
  /** 题材标签，两到四个字，例如「剑之修行」「宫廷阴谋」 */
  theme: string;
  /** 一句话钩子，会显示在主线卷宗的封面上 */
  tagline: string;
  /** 什么样的主角会被卷进来。写给玩家看，也写给 AI 做二次修改时参考 */
  fit: string;
  /** 只在这些时代里抽取。缺省表示任何时代都可能抽到 */
  onlyEras?: string[];
  tags: MainlineTags;
  /** 开局钩子：写进纪事的 3-5 行，把这一局的主线立起来 */
  prologue: string[];
  /** 四到六章，按顺序排好 */
  stages: MainlineStage[];
  /** 走到尽头时的三种收束：走完、半途而废、中途断掉 */
  endings: { done: string; partial: string; failed: string };
}

/* ---------- 主线专属的抉择事件 ---------- */

export interface MainlineEventOption {
  id: string;
  label: string;
  detail?: string;
  risk?: "低" | "中" | "高";
  lines: string[];
  outcome: EventEffects;
}

/**
 * 主线专属抉择。
 * 与 engine/events.ts 的 DecisionEventDef 字段一致，另外挂上 mainlineId：
 * 引擎按它把事件锁在这条主线上——别的主线、别的人生不会随机撞到它。
 */
export interface MainlineEventDef {
  id: string;
  mainlineId: string;
  title: string;
  body: string[];
  when: (s: GameState) => boolean;
  weight?: number;
  options: MainlineEventOption[];
}
