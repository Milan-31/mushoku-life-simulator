import type { CreationDraft, GameState, StatBar } from "../types";
import { SCENES, gateOpen } from "../data/scenes";
import { PLACES } from "../data/places";
import { difficultyOf } from "../data/difficulty";
import { hasSupernaturalBasis } from "./death";
import { createGameState, eraYear, formatYear, relocationOptions } from "./world";

/**
 * 创建角色时的「选了会怎样」预览。
 *
 * 不做一张手写的效果表——那种表迟早和引擎对不上。这里的做法是：把草稿原样丢进
 * createGameState（不抽主线），读它算出来的真实结果；再把「把鼠标底下这个选项选上」
 * 的那一份也算一遍，两份对着减，差在哪儿就显示哪儿。
 *
 * 所以预览里出现的每一个数字，都是这个人真的会拿到的数字。
 */

/** 场合场景（地点场景不在这一项里，那些算「去处」） */
const PLACE_SCENE_IDS = new Set(PLACES.map((p) => p.sceneId));

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

/** 寿命只给区间。确切数字是开局后也不显示的东西，这里同样不显示 */
function lifespanBand(years: number): string {
  if (years < 55) return "偏短";
  if (years < 70) return "中等";
  if (years < 82) return "偏长";
  return "很长";
}

/** 每月进项：与 engine/world.ts 的 advanceMonth 用的是同一套规则 */
function monthlyIncome(state: GameState): number {
  const base = state.character.status === "贵族子弟" || state.character.status === "王子" ? 12 : 3;
  return Math.max(1, Math.round(base * difficultyOf(state.difficulty).incomeMul));
}

interface Snapshot {
  year: string;
  birthYear: string;
  lifespan: string;
  income: string;
  supernatural: string;
  /** 开局那批关系都在哪儿（他们跟着你出生地走） */
  relHome: string;
  stats: StatBar[];
  factions: { name: string; value: number }[];
  relations: string[];
  places: string[];
  scenes: string[];
  talents: string[];
}

/** 一份草稿真实会变成的样子 */
function snapshot(draft: CreationDraft): Snapshot {
  const state = createGameState({ ...draft, mainlineMode: "不介入" }, { noMainline: true });
  return {
    year: formatYear(state.year),
    birthYear: formatYear(state.birthYear),
    lifespan: lifespanBand(state.lifespan),
    income: `${monthlyIncome(state)} 枚 / 月`,
    supernatural: hasSupernaturalBasis(state.character) ? "身上带着说不清的东西（诅咒、侵蚀一类）" : "无",
    relHome: state.relations[0]?.place ?? state.character.residence,
    stats: state.stats.map((s) => ({ ...s })),
    factions: state.factions.map((f) => ({ ...f })),
    relations: state.relations.map((r) => `${r.name}（${r.role}）`),
    places: relocationOptions(state)
      .filter((o) => o.ok)
      .map((o) => o.place.name),
    scenes: SCENES.filter((sc) => !PLACE_SCENE_IDS.has(sc.id) && gateOpen(state, sc.gate)).map((sc) => sc.name),
    talents: state.character.talents.filter((t) => t !== "无"),
  };
}

/** 这个选项本身的一句话说明（来自 creation.ts 的 desc） */
export interface OptionPreview {
  /** 选项自己的一句话说明 */
  desc: string;
  /** 选上之后，确实会变的东西。每一条都是一句人话 */
  changes: string[];
  /** 不影响数值，但会写进提示词、纪事与终章的 */
  narrative: string[];
  /** 选上之后这个人长什么样（给预览面板右侧的小快照用） */
  stats: StatBar[];
  summary: string;
  /** 这个选项管的是哪一格，界面上显示成人话（例如 era → 时代） */
  fieldLabel: string;
}

/** 字段名 → 界面上的说法 */
export const FIELD_LABEL: Record<string, string> = {
  era: "时代",
  origin: "出身",
  birthIdentity: "出生身份",
  name: "姓名",
  age: "年龄",
  gender: "性别",
  residence: "居住地",
  family: "家庭",
  faith: "信仰",
  status: "初始地位",
  talents: "特殊天赋",
  magicTier: "魔术阶级",
  swordTier: "剑术阶级",
  swordSchool: "剑术流派",
  adventurerRank: "冒险者等级",
  blood: "血脉状态",
  contract: "契约状态",
  corruption: "腐化状态",
  college: "学院倾向",
  politics: "政治倾向",
  trait1: "性格关键词",
  trait2: "性格关键词",
  trait3: "性格关键词",
  goal: "人生目标",
  emotion: "情感倾向",
  precious: "最珍贵记忆",
  painful: "最痛苦记忆",
  style: "模拟风格",
  difficulty: "难度",
  mainlineMode: "主线引导",
};

const NARRATIVE: Record<string, string> = {
  trait1: "性格关键词不进数值。它写进提示词，AI 推演与终章都会照着它来写这个人。",
  trait2: "性格关键词不进数值。它写进提示词，AI 推演与终章都会照着它来写这个人。",
  trait3: "性格关键词不进数值。它写进提示词，AI 推演与终章都会照着它来写这个人。",
  goal: "人生目标不进数值，只有进度条跟着你的行动走；终章会交代它做成没有。",
  precious: "最珍贵的记忆写进「情感记忆」面板，也写进提示词——它是这个人身上最软的那一块。",
  painful: "最痛苦的记忆写进「情感记忆」面板，同样写进提示词——人神与龙神的线索会绕着它展开。",
  emotion: "情感倾向不进数值。它决定 AI 怎么处理这个人与别人的关系，以及恋爱线往哪偏。",
  family: "家庭状况由你自由填写：它写进开场纪事与提示词，亲属关系由系统按出身补齐。",
  name: "名字会被系统读一遍（出身与天赋一起决定初始属性的细微差别），其余时候它只是你的名字。",
  gender: "性别不进数值，写进提示词与终章；这个世界对男女的态度并不一样。",
  style: "模拟风格决定每月世界动态从哪一类题材里取材，不进数值。",
  mainlineMode: "主线引导决定创建存档时要不要随机抽一条主线。抽中的那一条会在开场写进纪事，之后每章给目标、任务与指引；抽完之后 AI 会按主角改写它，每年再微调一次方向。",
  birthIdentity: "出生身份写进开场纪事，也决定 NPC 怎么看你；不进数值。",
  adventurerRank: "冒险者等级本身不进初始属性，但它决定公会的哪些委托与事件找得上你。",
  contract: "契约状态写进提示词与终章，也参与「超自然死因」的门槛判定。",
};

/** 逐字段的对照：哪一项变了、从什么变成什么 */
function diffLines(before: Snapshot, after: Snapshot): string[] {
  const out: string[] = [];

  const scalar: [string, string, string][] = [
    ["开局年份", before.year, after.year],
    ["出生年份", before.birthYear, after.birthYear],
    ["寿命倾向", before.lifespan, after.lifespan],
    ["每月进项", before.income, after.income],
    ["身上的东西", before.supernatural, after.supernatural],
    ["开局那批关系所在", before.relHome, after.relHome],
  ];
  for (const [label, a, b] of scalar) {
    if (a !== b) out.push(`${label}：${a} → ${b}`);
  }

  for (const s of after.stats) {
    const was = before.stats.find((x) => x.key === s.key);
    if (!was || was.value === s.value) continue;
    out.push(`${STAT_LABEL[s.key] ?? s.label}：${was.value} → ${s.value}`);
  }

  for (const f of after.factions) {
    const was = before.factions.find((x) => x.name === f.name);
    if (!was || was.value === f.value) continue;
    const fmt = (v: number) => (v >= 0 ? `+${v}` : `${v}`);
    out.push(`${f.name} 的态度：${fmt(was.value)} → ${fmt(f.value)}`);
  }

  const added = (label: string, a: string[], b: string[]) => {
    const plus = b.filter((x) => !a.includes(x));
    const minus = a.filter((x) => !b.includes(x));
    if (plus.length > 0) out.push(`${label} +${plus.join("、")}`);
    if (minus.length > 0) out.push(`${label} −${minus.join("、")}`);
  };
  added("开局关系网", before.relations, after.relations);
  added("可去的去处", before.places, after.places);
  added("开局可用场合", before.scenes, after.scenes);

  return out;
}

/**
 * 预览「把某个选项选上」会发生什么。
 *
 * field 是 CreationDraft 的字段名；value 是候选取值（天赋多选传整份新列表）。
 * 返回的 changes 是两份真实状态对着减的结果，narrative 是这个字段不体现在数值上的部分。
 */
export function previewOption(
  draft: CreationDraft,
  field: keyof CreationDraft,
  value: string | string[],
  desc?: string,
): OptionPreview {
  const variant = { ...draft, [field]: value } as CreationDraft;
  const before = snapshot(draft);
  const after = snapshot(variant);

  const narrative: string[] = [];
  const note = NARRATIVE[field as string];
  const isList = Array.isArray(value);
  // 多选天赋单独说一句：它和别的天赋叠加
  if (field === "talents" && isList) {
    const gained = (value as string[]).filter((t) => !draft.talents.includes(t));
    if (gained.length > 0) narrative.push(`天赋可以叠加。这一项与已选的其它天赋同时生效：${gained.join("、")}。`);
  }
  if (note) narrative.push(note);
  if (field === "era") {
    narrative.push("时代决定历史的起点：哪些事还没发生、哪些人还没出生、哪些事件找不上你。");
  }
  if (field === "origin") {
    narrative.push("出身决定开局的关系网、家底与别人看你的眼神；它不等于命运。");
  }
  if (field === "status") {
    narrative.push("初始地位决定家底与每月进项，也决定某些场合让不让你进门。");
  }
  if (field === "difficulty") {
    const cfg = difficultyOf(String(value));
    const others = difficultyOf(draft.difficulty);
    narrative.push(`这一档的说明：${cfg.hints.join(" · ")}`);
    narrative.push(
      `难度改变这个世界对你有多宽容：每月行动 ${others.actionsPerMonth} → ${cfg.actionsPerMonth} 次、` +
        `寿命修正 ${others.lifespanMod >= 0 ? "+" : ""}${others.lifespanMod} → ${cfg.lifespanMod >= 0 ? "+" : ""}${cfg.lifespanMod}、` +
        `收益 ×${cfg.gainMul}、行动代价 ×${cfg.actionCostMul}、风险 ×${cfg.riskMul}。已发生的事不会被改写。`,
    );
  }
  if (field === "talents" && isList && (value as string[]).includes("随机")) {
    narrative.push("「随机」交给系统按出身与时代裁定，抽到什么就是什么。");
  }

  const changes = diffLines(before, after);
  const summary = [
    `属性与处境上有 ${changes.filter((c) => !c.startsWith("开局关系网") && !c.startsWith("可去的") && !c.startsWith("开局可用")).length} 处变化`,
    changes.some((c) => c.startsWith("开局关系网")) ? "开局关系网会变" : "",
  ]
    .filter(Boolean)
    .join("， ");

  return {
    desc: desc ?? "",
    changes,
    narrative,
    stats: after.stats,
    summary: changes.length > 0 ? `${summary}。` : "这一项不改变任何数字，它改的是别人怎么看你、以及你能走进哪些门。",
    fieldLabel: FIELD_LABEL[field as string] ?? String(field),
  };
}

/** 不选任何东西时看的：这个人现在的样子 */
export function currentSnapshot(draft: CreationDraft): { stats: StatBar[]; lifespan: string; year: string; income: string } {
  const snap = snapshot(draft);
  return { stats: snap.stats, lifespan: snap.lifespan, year: snap.year, income: snap.income };
}

/** 时代起始年，界面上用来说明「这个世界从哪一年开始」 */
export function eraStart(era: string): string {
  return formatYear(eraYear(era));
}
