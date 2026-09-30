import type { EventEffects } from "../../types";
import type { MainlineDef, MainlineEventDef, MainlineGate, MainlineStage } from "./types";
import { SKILLS } from "../skills";
import { ERAS, FAITHS, ORIGINS, RESIDENCES, SIM_STYLES, STATUSES, TALENTS } from "../creation";
import { CATEGORY_ORDER, SCENES } from "../scenes";

/**
 * 主线数据的结构校验。
 *
 * 二十条主线是手写的内容，靠类型只能挡住字段名写错，挡不住「设了一面没人读的旗」
 * 「引用了不存在的事件」「ScenePatch 写了一个不存在的地点」这类问题。
 * 这里把几条硬规矩写成代码，随构建一起跑（scripts/check-mainlines.mjs），
 * 也随时可以在开发时调用。
 *
 * 它检查的是「跑不跑得动」，不检查「写得好不好看」——那是人的事。
 */

const STAT_KEYS = ["mana", "sword", "int", "charm", "faith", "wealth", "fame", "scheme", "health"];
const FACTION_KEYS = ["阿斯拉王国", "魔术公会", "米里斯教团", "冒险者公会", "魔法大学", "剑之圣地"];
const SKILL_IDS = new Set(SKILLS.map((s) => s.id));
const SCENE_NAMES = new Set(SCENES.map((s) => s.name));
const CATEGORIES = new Set<string>(CATEGORY_ORDER);

/** 常规额度与抉择额度（与 engine/effects.ts 的 LIMITS / EVENT_LIMITS 对齐） */
const LIMITS = { stat: 15, tier: 20, goal: 8, lifespan: 2 };
const EVENT_LIMITS = { stat: 45, tier: 60, goal: 24, lifespan: 6 };

/**
 * 金币不按属性那一档算。
 * 引擎对 wealth 一样夹取（一次最多 ±45），但钱在数据里是按「多少枚」写的，
 * 一处遗产、一趟押送本来就该写成三位数——scenes.ts 里的内置指令也是这么写的。
 * 所以这里只查它是不是个像样的数，不按属性上限卡。
 */
const WEALTH_ABS_MAX = 2000;

export interface MainlineIssue {
  mainline: string;
  where: string;
  problem: string;
}

/** 递归收集一个门槛里所有被判定为「需要」的 flag */
function gatesOf(gate: MainlineGate | undefined, out: MainlineGate[] = []): MainlineGate[] {
  if (!gate) return out;
  out.push(gate);
  for (const sub of gate.any ?? []) gatesOf(sub, out);
  return out;
}

/** 一个节拍里设置的所有 flag。指令的 effects 也算——它会并进存档，玩家点它就落账 */
function flagsSetBy(effects: EventEffects | undefined, out: Set<string> = new Set()): Set<string> {
  if (effects?.flag) out.add(effects.flag);
  return out;
}

function flagsSetByBeat(
  beat: { effects?: EventEffects; commands?: { commands: { effects: EventEffects }[] }[] },
  out: Set<string> = new Set(),
): Set<string> {
  flagsSetBy(beat.effects, out);
  for (const patch of beat.commands ?? []) {
    for (const command of patch.commands) flagsSetBy(command.effects, out);
  }
  return out;
}

function checkEffects(
  effects: EventEffects | undefined,
  limits: { stat: number; tier: number; goal: number; lifespan: number },
  where: string,
  push: (where: string, problem: string) => void,
): void {
  if (!effects) return;
  for (const [key, value] of Object.entries(effects.stats ?? {})) {
    if (!STAT_KEYS.includes(key)) push(where, `stats 里有引擎不认识的键「${key}」`);
    // 财富按「枚」写，不按属性上限卡；其余属性一律守 ±limit
    if (key === "wealth") {
      if (Math.abs(value) > WEALTH_ABS_MAX) push(where, `stats.wealth 是 ${value}，离了谱`);
      continue;
    }
    if (Math.abs(value) > limits.stat) push(where, `stats.${key} 是 ${value}，超过上限 ±${limits.stat}`);
  }
  if (effects.tier) {
    if (effects.tier.gain > limits.tier) push(where, `tier.gain 是 ${effects.tier.gain}，超过上限 ${limits.tier}`);
    if (effects.tier.gain < 0) push(where, "tier.gain 不能为负");
  }
  if (effects.goal !== undefined && Math.abs(effects.goal) > limits.goal) {
    push(where, `goal 是 ${effects.goal}，超过上限 ±${limits.goal}`);
  }
  if (effects.lifespan !== undefined && Math.abs(effects.lifespan) > limits.lifespan) {
    push(where, `lifespan 是 ${effects.lifespan}，超过上限 ±${limits.lifespan}`);
  }
  for (const key of Object.keys(effects.factions ?? {})) {
    if (!FACTION_KEYS.includes(key)) push(where, `factions 里有引擎不认识的键「${key}」（只认六大势力）`);
  }
  if (effects.learnSkill && !SKILL_IDS.has(effects.learnSkill)) {
    push(where, `learnSkill「${effects.learnSkill}」不在技能表里`);
  }
  if (effects.residence && !RESIDENCES.some((r) => r.value === effects.residence)) {
    push(where, `residence「${effects.residence}」不是 creation.ts 里的居住地取值`);
  }
}

function checkCommands(beats: { lines: string[]; effects?: EventEffects; commands?: MainlineStage["onEnter"]["commands"] }[], where: string, push: (w: string, p: string) => void): void {
  for (const beat of beats) {
    for (const patch of beat.commands ?? []) {
      if (!SCENE_NAMES.has(patch.name)) {
        push(where, `ScenePatch.name「${patch.name}」对不上任何已有场景（地点场景或场合场景），会被当成新场景而到处出现`);
      }
      for (const c of patch.commands) {
        if (!CATEGORIES.has(c.category)) push(where, `指令「${c.label}」的 category「${c.category}」不在类别表里`);
        // 引擎把存档级指令的 cost 收在 -30 到 30（见 data/scenes.ts 的 sanitizeSceneStash），
        // 内置指令最高到 40，所以这里按 30 卡
        if (c.cost < -30 || c.cost > 30) push(where, `指令「${c.label}」的 cost 是 ${c.cost}，应在 -30 到 30 之间`);
        if (c.lines.length === 0) push(where, `指令「${c.label}」没有结算叙述`);
        checkEffects(c.effects, LIMITS, `${where}／指令「${c.label}」`, push);
      }
    }
  }
}

function tagProblem(kind: string, values: string[] | undefined, allowed: string[]): string | null {
  if (!values) return null;
  for (const v of values) {
    if (!allowed.includes(v)) return `tags.${kind} 里的「${v}」不是 creation.ts 里的取值`;
  }
  return null;
}

/**
 * 校验一条主线。返回它自己的问题清单（不含跨主线、跨事件表的检查，那些在 scripts 里做）。
 */
export function validateMainline(def: MainlineDef): MainlineIssue[] {
  const issues: MainlineIssue[] = [];
  const push = (where: string, problem: string) => issues.push({ mainline: def.id, where, problem });

  if (!/^[a-z0-9-]+$/.test(def.id)) push("主表", `id「${def.id}」只允许小写字母、数字与连字符`);
  if (!def.name.trim()) push("主表", "name 是空的");
  if (!def.theme.trim()) push("主表", "theme 是空的");
  if (!def.tagline.trim()) push("主表", "tagline 是空的");
  if (!def.fit.trim()) push("主表", "fit 是空的");
  if (def.prologue.length < 3) push("prologue", "开场少于 3 行，立不住这条线");
  if (def.stages.length < 4 || def.stages.length > 6) push("主表", `章节数是 ${def.stages.length}，应当是 4-6 章`);
  for (const key of ["done", "partial", "failed"] as const) {
    if (!def.endings[key]?.trim()) push("endings", `endings.${key} 是空的`);
  }
  if (def.onlyEras) {
    for (const era of def.onlyEras) {
      if (!ERAS.some((e) => e.value === era)) push("onlyEras", `时代「${era}」不是 creation.ts 里的取值`);
    }
  }
  for (const [kind, allowed] of [
    ["origins", ORIGINS.map((o) => o.value)],
    ["statuses", STATUSES.map((o) => o.value)],
    ["faiths", FAITHS.map((o) => o.value)],
    ["places", RESIDENCES.map((o) => o.value)],
    ["talents", TALENTS.map((o) => o.value)],
    ["styles", SIM_STYLES.map((o) => o.value)],
    ["eras", ERAS.map((o) => o.value)],
  ] as [string, string[]][]) {
    const problem = tagProblem(kind, def.tags?.[kind as keyof typeof def.tags] as string[] | undefined, allowed);
    if (problem) push("tags", problem);
  }
  // 「无」与「随机」是独占项（见 creation.ts 的 toggleTalent），并列写没有意义
  const talents = def.tags?.talents ?? [];
  if (talents.length > 1 && talents.some((t) => t === "无" || t === "随机")) {
    push("tags", "tags.talents 里「无」「随机」是独占项，不能与别的天赋并列");
  }

  const stageIds = new Set<string>();
  /** 这条主线自己能设置的 flag（节拍 + 事件选项） */
  const settable = new Set<string>();
  const needed = new Set<string>();
  const eventIds = new Set<string>();

  for (const stage of def.stages) {
    if (stageIds.has(stage.id)) push(stage.id, "章 id 重复");
    stageIds.add(stage.id);
    const where = `第 ${def.stages.indexOf(stage) + 1} 章（${stage.id}）`;

    if (!stage.title.trim()) push(where, "缺 title");
    if (!stage.premise.trim()) push(where, "缺 premise");
    if (!stage.objective.trim()) push(where, "缺 objective");
    if (stage.guidance.length < 4) push(where, `指引只有 ${stage.guidance.length} 条，至少写 4 条`);
    if (stage.guidance.some((g) => g.trim().length < 6)) push(where, "有指引短得看不出要做什么");
    if (stage.quests.length < 2) push(where, `任务只有 ${stage.quests.length} 条，至少 2 条`);
    if (stage.quests.length > 4) push(where, `任务有 ${stage.quests.length} 条，最多 4 条`);
    if (stage.onEnter.lines.length < 2) push(where, "onEnter 少于 2 行");
    if (stage.onComplete.lines.length < 2) push(where, "onComplete 少于 2 行");
    if (!stage.event) push(where, "这一章没有关键抉择（stage.event）");
    else if (eventIds.has(stage.event)) push(where, `事件 id「${stage.event}」在这条主线里重复使用`);
    else eventIds.add(stage.event);
    if (stage.deadlineMonths !== undefined && (stage.deadlineMonths < 6 || stage.deadlineMonths > 60)) {
      push(where, `deadlineMonths 是 ${stage.deadlineMonths}，应在 6-60 之间`);
    }

    const questIds = new Set<string>();
    for (const quest of stage.quests) {
      if (questIds.has(quest.id)) push(where, `任务 id「${quest.id}」在这一章里重复`);
      questIds.add(quest.id);
      if (!quest.label.trim()) push(where, "有任务没有 label");
      if (!quest.hint.trim()) push(where, `任务「${quest.label}」没有 hint`);
      for (const gate of gatesOf(quest.done)) {
        if (gate.flag && !gate.flag.startsWith("mlq-")) needed.add(gate.flag);
        if (gate.anySkill) for (const id of gate.anySkill) if (!SKILL_IDS.has(id)) push(where, `任务「${quest.label}」引用了不存在的技能「${id}」`);
        if (gate.allSkills) for (const id of gate.allSkills) if (!SKILL_IDS.has(id)) push(where, `任务「${quest.label}」引用了不存在的技能「${id}」`);
        if (gate.residence) for (const r of gate.residence) {
          if (!RESIDENCES.some((x) => x.value === r)) push(where, `任务「${quest.label}」的所在地「${r}」不是有效取值`);
        }
      }
    }

    for (const gate of gatesOf(stage.enter)) {
      if (gate.flag && !gate.flag.startsWith("mlq-")) needed.add(gate.flag);
      if (gate.minYear !== undefined || gate.maxYear !== undefined) {
        if (!def.onlyEras?.length) {
          push(where, "enter 用了绝对年份，但这条主线没有 onlyEras 锁死时代——换个时代开局就永远开不了场");
        }
      }
    }

    flagsSetByBeat(stage.onEnter, settable);
    flagsSetByBeat(stage.onComplete, settable);
    checkEffects(stage.onEnter.effects, EVENT_LIMITS, `${where}／onEnter`, push);
    checkEffects(stage.onComplete.effects, EVENT_LIMITS, `${where}／onComplete`, push);
    checkCommands([stage.onEnter, stage.onComplete], where, push);
  }

  // 第一章必须无条件开得了场，否则这一局抽到它就等于没主线
  const first = def.stages[0];
  if (first) {
    const keys = Object.keys(first.enter ?? {}).filter((k) => (first.enter as Record<string, unknown>)[k] !== undefined);
    if (keys.length > 0) push("第一章", `enter 必须留空（现在是 ${keys.join("、")}），否则抽到也可能永远开不了场`);
  }

  // 期限：至少三章要有，不然这条线永远不会「未竟」
  const withDeadline = def.stages.filter((s) => s.deadlineMonths !== undefined).length;
  if (withDeadline < 3) push("主表", `只有 ${withDeadline} 章设了 deadlineMonths，至少给 3 章`);

  return issues;
}

/**
 * 校验全部主线。
 * events 一并传进来，才能检查「设的旗有没有人用、引的事件在不在」。
 *
 * external 是「这条主线之外还能提供什么」：引擎自己的事件表（原作锚点、地点事件、人物钩子）
 * 也会设置 flag、也会提供事件 id。原作模式那条线正是靠这些外部事件走完的，
 * 所以不传它就会误报。
 */
export function validateMainlines(
  defs: MainlineDef[],
  events: MainlineEventDef[],
  external?: { eventIds?: string[]; flags?: string[] },
): MainlineIssue[] {
  const issues = defs.flatMap(validateMainline);
  const push = (mainline: string, where: string, problem: string) => issues.push({ mainline, where, problem });
  const outsideEvents = new Set(external?.eventIds ?? []);
  const outsideFlags = new Set(external?.flags ?? []);

  const eventById = new Map(events.map((e) => [e.id, e]));
  const seenIds = new Set<string>();

  for (const def of defs) {
    const own = events.filter((e) => e.mainlineId === def.id);
    for (const e of own) {
      if (seenIds.has(e.id)) push(def.id, "事件表", `事件 id「${e.id}」重复`);
      seenIds.add(e.id);
      if (e.options.length < 2) push(def.id, `事件「${e.id}」`, "选项少于 2 个");
      if (e.body.length === 0) push(def.id, `事件「${e.id}」`, "没有正文");
      for (const o of e.options) {
        if (o.lines.length === 0) push(def.id, `事件「${e.id}」／${o.label}`, "选项没有结算叙述");
        checkEffects(o.outcome, EVENT_LIMITS, `事件「${e.id}」／${o.label}`, (w, p) => push(def.id, w, p));
      }
    }
    // 只属于这条主线的事件，必须有人用得上：某一章的关键抉择，或者某个门槛判定了「见过它」
    for (const e of own) {
      const used =
        def.stages.some((s) => s.event === e.id) ||
        def.stages.some((s) =>
          [...gatesOf(s.enter), ...s.quests.flatMap((q) => gatesOf(q.done))].some((g) => g.seenEvent === e.id),
        );
      if (!used) push(def.id, `事件「${e.id}」`, "没有任何章引用它、也没有任何门槛判定它，永远不会触发");
    }
  }

  // 跨主线：事件归属与引用
  for (const def of defs) {
    for (const stage of def.stages) {
      if (!stage.event) continue;
      // 引擎自己的事件（原作锚点那一类）可以放在主线里当节点，它们的归属由引擎管
      if (outsideEvents.has(stage.event) && !eventById.has(stage.event)) continue;
      const def2 = eventById.get(stage.event);
      if (!def2) push(def.id, `第 ${def.stages.indexOf(stage) + 1} 章`, `引用了不存在的事件「${stage.event}」`);
      else if (def2.mainlineId !== def.id) {
        push(def.id, `第 ${def.stages.indexOf(stage) + 1} 章`, `引用的事件「${stage.event}」属于 ${def2.mainlineId}，不是这一条`);
      }
    }
  }

  // 旗：判定了就要有人设。引擎自己写的那两个（<章id> 与 <章id>:done）与 AI 追加任务用的 mlq- 不算
  for (const def of defs) {
    const settable = new Set<string>(outsideFlags);
    for (const stage of def.stages) {
      flagsSetByBeat(stage.onEnter, settable);
      flagsSetByBeat(stage.onComplete, settable);
    }
    for (const e of events.filter((x) => x.mainlineId === def.id)) {
      for (const o of e.options) flagsSetBy(o.outcome, settable);
    }
    for (const stage of def.stages) {
      const stageOwn = new Set([stage.id, `${stage.id}:done`]);
      const gates: MainlineGate[] = [
        ...gatesOf(stage.enter),
        ...stage.quests.flatMap((q) => gatesOf(q.done)),
      ];
      for (const gate of gates) {
        const flag = gate.flag;
        if (!flag || flag.startsWith("mlq-")) continue;
        const engineWritten =
          flag === `ml:${def.id}:${stage.id}` || flag === `ml:${def.id}:${stage.id}:done`;
        const otherStage = [...stageOwn].some((s) => flag === `ml:${def.id}:${s}` || flag === `ml:${def.id}:${s}:done`);
        if (engineWritten || otherStage) continue;
        if (!settable.has(flag)) {
          push(def.id, `第 ${def.stages.indexOf(stage) + 1} 章`, `判定了 flag「${flag}」，但这条主线里没有人设置它——这个条件永远不会成立`);
        }
      }
    }
  }

  return issues;
}
