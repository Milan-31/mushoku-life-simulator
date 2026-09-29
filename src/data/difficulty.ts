import type { Difficulty, Option } from "../types";

export interface DifficultyDef {
  id: Difficulty;
  label: string;
  desc: string;
  /** 标签化的效果说明，用于界面展示 */
  hints: string[];
  /** 寿命调整（岁） */
  lifespanMod: number;
  /** 每月自然收入倍率 */
  incomeMul: number;
  /** 中年后健康衰减倍率 */
  healthDecayMul: number;
  /** 每月触发抉择事件的概率 */
  eventRate: number;
  /** 玩家行动的收益倍率（阶级、属性、目标进度） */
  gainMul: number;
  /** 行动精力消耗倍率 */
  actionCostMul: number;
  /** 每月可用行动次数上限。精力再多也无法在一个月里做完所有事 */
  actionsPerMonth: number;
  /** AI 推演模式下，两次抉择事件之间至少间隔的回合数 */
  eventGapTurns: number;
  /** 高风险抉择的代价倍率 */
  riskMul: number;
}

export const DIFFICULTIES: DifficultyDef[] = [
  {
    id: "安逸",
    label: "安逸",
    desc: "世界对你温和一些。适合想安静看完一段人生的人。",
    hints: ["寿命 +8 岁", "收入 ×1.4", "健康衰减减半", "行动收益 ×1.25", "每月 5 次行动", "抉择代价降低"],
    lifespanMod: 8,
    incomeMul: 1.4,
    healthDecayMul: 0.5,
    eventRate: 0.22,
    gainMul: 1.25,
    actionCostMul: 0.8,
    actionsPerMonth: 5,
    eventGapTurns: 4,
    riskMul: 0.6,
  },
  {
    id: "标准",
    label: "标准",
    desc: "世界照常运转。不多给，也不少给。",
    hints: ["默认参数", "每月 4 次行动", "推荐首次游玩"],
    lifespanMod: 0,
    incomeMul: 1,
    healthDecayMul: 1,
    eventRate: 0.32,
    gainMul: 1,
    actionCostMul: 1,
    actionsPerMonth: 4,
    eventGapTurns: 3,
    riskMul: 1,
  },
  {
    id: "残酷",
    label: "残酷",
    desc: "疾病、贫穷与意外更常见。每一个选择都要付代价。",
    hints: ["寿命 −6 岁", "收入 ×0.7", "健康衰减 ×1.5", "事件更频繁", "每月 3 次行动", "抉择代价提高"],
    lifespanMod: -6,
    incomeMul: 0.7,
    healthDecayMul: 1.5,
    eventRate: 0.45,
    gainMul: 0.85,
    actionCostMul: 1.15,
    actionsPerMonth: 3,
    eventGapTurns: 2,
    riskMul: 1.35,
  },
  {
    id: "地狱",
    label: "地狱",
    desc: "这个世界不会为任何人让路。活下来本身就是成就。",
    hints: ["寿命 −14 岁", "收入 ×0.5", "健康衰减 ×2", "事件频繁", "每月 2 次行动", "行动收益下降，代价升高"],
    lifespanMod: -14,
    incomeMul: 0.5,
    healthDecayMul: 2,
    eventRate: 0.55,
    gainMul: 0.7,
    actionCostMul: 1.3,
    actionsPerMonth: 2,
    eventGapTurns: 2,
    riskMul: 1.7,
  },
];

export const DIFFICULTY_OPTIONS: Option[] = DIFFICULTIES.map((d) => ({
  value: d.id,
  label: d.label,
  desc: d.desc,
}));

const FALLBACK = DIFFICULTIES[1];

/** 按 id 取难度配置，未知取值回退到「标准」 */
export function difficultyOf(id: string | undefined): DifficultyDef {
  return DIFFICULTIES.find((d) => d.id === id) ?? FALLBACK;
}