import type {
  Character,
  ChronicleEntry,
  EventEffects,
  GameState,
  MainlineChapterView,
  MainlineQuestView,
  MainlineStageFit,
  MainlineState,
  MainlineView,
  PendingEvent,
  ScenePatch,
  Threads,
} from "../types";
import { mainlineById, pickMainline } from "../data/mainlines";
import type { MainlineDef, MainlineGate, MainlineStage } from "../data/mainlines/types";
import { gateOpen, gateReason, mergeSceneStash } from "../data/scenes";
import { skillById } from "../data/skills";
import { eventById, toPending } from "./events";
import { applyEffects, EVENT_LIMITS, TIER_ORDER, type EffectContext } from "./effects";

/**
 * 主线剧情的推进器。
 *
 * 分工：
 * - 主线本身（章、任务、指引、节拍）是静态数据，见 src/data/mainlines。
 * - 这里只负责「走到哪儿了」：判定任务完成、收束一章、开下一章、超期收场，
 *   以及把 AI 改写过的文本叠上去。所有数值都走 applyEffects，边界只有一个。
 * - 这里不产生随机性，也不调用网络：推进是确定性的，同样的存档推进出同样的结果。
 */

/** 主线节拍用的额度与抉择事件同档（见 effects.ts 的说明） */
const LIMIT = EVENT_LIMITS;

/** 主线往存档设定集里加东西时，与 AI 自撰设定共用同一个上限 */
const CANON_LIMIT = 24;
/** 导演注记保留的条数 */
const NOTES_LIMIT = 12;

const MAINLINE_ENTRY = "mainline" as const;

function clean(text: unknown, max: number): string | undefined {
  if (typeof text !== "string") return undefined;
  const t = text.trim().replace(/\s*\n\s*/g, " ");
  return t ? (t.length > max ? `${t.slice(0, max)}…` : t) : undefined;
}

function cleanList(value: unknown, max: number, maxLen: number): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value
    .map((v) => clean(v, maxLen))
    .filter((v): v is string => Boolean(v))
    .slice(0, max);
  return out.length > 0 ? out : undefined;
}

function pushNote(notes: string[], line: string): string[] {
  const t = line.trim();
  if (!t) return notes;
  return [...notes, t].slice(-NOTES_LIMIT);
}

function pushCanon(prev: string[], incoming: string[] | undefined): string[] {
  if (!incoming?.length) return prev;
  const merged = [...prev];
  for (const item of incoming) {
    const line = item.trim();
    if (line && !merged.includes(line)) merged.push(line);
  }
  return merged.slice(-CANON_LIMIT);
}

function mergeThreads(threads: Threads, effects?: EventEffects | null): Threads {
  if (!effects?.threads) return threads;
  return { ...threads, ...effects.threads };
}

/* ---------- 节拍落账 ---------- */

/** 把一组效果落到状态上。主线节拍与事件选项走的是同一条通道 */
function withEffects(prev: GameState, effects: EventEffects | undefined): GameState {
  if (!effects) return prev;
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
  applyEffects(ctx, effects, LIMIT);
  return {
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
    threads: mergeThreads(prev.threads, effects),
  };
}

function makeEntry(
  id: string,
  s: GameState,
  title: string,
  lines: string[],
  rumor?: string,
): ChronicleEntry {
  return { id, year: s.year, month: s.month, kind: MAINLINE_ENTRY, title, lines, rumor };
}

/** 引擎自己写的两个标记：进入某章、走完某章。场景与指令的门槛可以据此判定 */
function stageFlag(def: MainlineDef, stage: MainlineStage): string {
  return `ml:${def.id}:${stage.id}`;
}
function stageDoneFlag(def: MainlineDef, stage: MainlineStage): string {
  return `ml:${def.id}:${stage.id}:done`;
}

/* ---------- 门槛判定 ---------- */

/** 进入某一章之后过了多少个月 */
function monthsInStage(s: GameState): number {
  const ms = s.mainline;
  if (!ms) return 0;
  return Math.max(0, s.turn - ms.stageTurn);
}

/**
 * 主线门槛是否成立。
 * 共用字段交给 data/scenes 的 gateOpen 判（口径与场景、指令完全一致），
 * 这里只补它没有的几项：技能全集、阶级、年龄、进入本章后的月数。
 */
export function mainlineGateOpen(s: GameState, gate?: MainlineGate): boolean {
  if (!gate) return true;
  const { any: subs, ...rest } = gate;
  if (!gateOpen(s, rest)) return false;
  if (subs && subs.length > 0 && !subs.some((sub) => mainlineGateOpen(s, sub))) return false;
  return extrasOpen(s, rest);
}

function extrasOpen(s: GameState, gate: MainlineGate): boolean {
  if (gate.allSkills && !gate.allSkills.every((id) => s.skills.includes(id))) return false;
  if (gate.magicTier && TIER_ORDER.indexOf(s.character.magicTier) < TIER_ORDER.indexOf(gate.magicTier)) return false;
  if (gate.swordTier && TIER_ORDER.indexOf(s.character.swordTier) < TIER_ORDER.indexOf(gate.swordTier)) return false;
  if (gate.minAge !== undefined && s.character.age < gate.minAge) return false;
  if (gate.monthsIn !== undefined && monthsInStage(s) < gate.monthsIn) return false;
  return true;
}

/** 门槛没过时说给人听的原因。空字符串表示已经成立 */
export function mainlineGateReason(s: GameState, gate?: MainlineGate): string {
  if (!gate) return "";
  const { any: subs, ...rest } = gate;
  const shared = gateReason(s, rest);
  if (shared) return shared;
  if (subs && subs.length > 0 && !subs.some((sub) => mainlineGateOpen(s, sub))) {
    const reasons = subs.map((sub) => mainlineGateReason(s, sub)).filter(Boolean);
    return reasons.length > 0 ? `还差一样：${[...new Set(reasons)].join("，或")}` : "";
  }
  if (gate.allSkills) {
    const missing = gate.allSkills.filter((id) => !s.skills.includes(id));
    if (missing.length > 0) {
      const names = missing.map((id) => skillById(id)?.name ?? id).join("、");
      return `还没学会「${names}」`;
    }
  }
  if (gate.magicTier && TIER_ORDER.indexOf(s.character.magicTier) < TIER_ORDER.indexOf(gate.magicTier)) {
    return `魔术要到${gate.magicTier}`;
  }
  if (gate.swordTier && TIER_ORDER.indexOf(s.character.swordTier) < TIER_ORDER.indexOf(gate.swordTier)) {
    return `剑术要到${gate.swordTier}`;
  }
  if (gate.minAge !== undefined && s.character.age < gate.minAge) return `年龄还不满 ${gate.minAge} 岁`;
  if (gate.monthsIn !== undefined && monthsInStage(s) < gate.monthsIn) {
    return `还得在这一章里待满 ${gate.monthsIn} 个月（已经 ${monthsInStage(s)} 个月）`;
  }
  return "";
}

/* ---------- 抽取与开场 ---------- */

/** 按主角信息加权抽一条主线。权重的算法在 data/mainlines/index.ts */
export function drawMainline(character: Character): MainlineDef {
  return pickMainline(character, Math.random());
}

/**
 * 开一场主线：先写下开场钩子，再把第一章摊开。
 * 第一章的 enter 一律留空（数据层保证），所以人生一开始就有事可做。
 */
export function enterMainline(prev: GameState, def: MainlineDef): GameState {
  const opening: ChronicleEntry = makeEntry(
    "ml-open",
    prev,
    `主线 · ${def.name}`,
    [...def.prologue, `【${def.theme}】${def.tagline}`],
  );
  const ms: MainlineState = {
    id: def.id,
    stage: -1,
    stageTurn: prev.turn,
    cleared: [],
    doneQuests: [],
    startYear: prev.year,
    openingId: opening.id,
    notes: [],
  };
  const seeded: GameState = {
    ...prev,
    mainline: ms,
    log: [opening, ...prev.log].slice(0, 160),
    notices: [...prev.notices, `这一局的主线是「${def.name}」。${def.tagline}`],
  };
  return openStage(seeded, def, 0);
}

/** 摊开某一章：落账它的节拍、长出新指令、把它自己的抉择摆出来 */
function openStage(prev: GameState, def: MainlineDef, index: number): GameState {
  const stage = def.stages[index];
  if (!stage) return prev;
  const view = stageText(prev, stage);
  let next: GameState = {
    ...prev,
    mainline: { ...(prev.mainline as MainlineState), stage: index, stageTurn: prev.turn },
  };
  next = withEffects(next, stage.onEnter.effects);
  next = withEffects(next, { flag: stageFlag(def, stage) });
  next = { ...next, customScenes: mergeSceneStash(next.customScenes, stage.onEnter.commands) };

  const lines = [
    view.premise,
    `本章目标：${view.objective}`,
    ...view.guidance.slice(0, 3).map((g) => `· ${g}`),
  ].filter(Boolean);
  const entry = makeEntry(`ml-${def.id}-${stage.id}`, next, `主线 · ${view.title}`, lines, stage.onEnter.rumor);

  // 这一章自己的抉择：只在还没经历过时摆出来。已经响过一次的不会再来
  let pendingEvent = next.pendingEvent;
  if (stage.event && !next.seenEvents.includes(stage.event)) {
    const def2 = eventById(stage.event);
    if (def2) pendingEvent = toPending(def2);
  }
  return { ...next, log: [entry, ...next.log].slice(0, 160), pendingEvent };
}

/** 走完某一章：落账收束节拍，记下标记 */
function completeStage(prev: GameState, def: MainlineDef, stage: MainlineStage): GameState {
  let next = withEffects(prev, stage.onComplete.effects);
  next = withEffects(next, { flag: stageDoneFlag(def, stage) });
  next = { ...next, customScenes: mergeSceneStash(next.customScenes, stage.onComplete.commands) };
  const entry = makeEntry(
    `ml-${def.id}-${stage.id}-done`,
    next,
    `主线 · ${stageText(next, stage).title} · 走完`,
    stage.onComplete.lines,
    stage.onComplete.rumor,
  );
  const ms = next.mainline as MainlineState;
  return {
    ...next,
    log: [entry, ...next.log].slice(0, 160),
    mainline: {
      ...ms,
      cleared: ms.cleared.includes(stage.id) ? ms.cleared : [...ms.cleared, stage.id],
      notes: pushNote(ms.notes, stage.onComplete.lines[0] ?? `走完「${stageText(next, stage).title}」`),
    },
  };
}

/**
 * 拖过了期限的那一章。
 *
 * 期限到了还没做完，这件事不会把整条线掐断——世界不等你，它自己往下走：
 * 这一章算过去了，但收束时该给的东西一样没有（不给 onComplete 的数值、不给它的新指令），
 * 只留下一条纪事和一笔账。走过的章里只要有一章是这么过去的，
 * 这条线最后就只能算「未竟」，不算走完。
 *
 * 这么定是为了两件事：一是玩家在第一章选错一步不会把整条线弄死，
 * 二是期限真的有代价——它拿走的不是命，是这一章的收成。
 */
function overdueStage(prev: GameState, def: MainlineDef, stage: MainlineStage): GameState {
  const view = stageText(prev, stage);
  const entry = makeEntry(
    `ml-${def.id}-${stage.id}-overdue`,
    prev,
    `主线 · ${view.title} · 期限过了`,
    [
      `这一章该做的事你没有做完。日子还是照常往前走。`,
      `「${stage.deadlineMonths} 个月」到了，这件事只能这么算了——不是没有代价，代价是它本可以给你的东西，一样都没有。`,
    ],
  );
  const ms = prev.mainline as MainlineState;
  return {
    ...prev,
    log: [entry, ...prev.log].slice(0, 160),
    mainline: {
      ...ms,
      cleared: ms.cleared.includes(stage.id) ? ms.cleared : [...ms.cleared, stage.id],
      overdue: [...(ms.overdue ?? []), stage.id],
      notes: pushNote(ms.notes, `${view.title}：期限过了，没能做完。`),
    },
    notices: [...prev.notices, `主线「${stageText(prev, stage).title}」的期限过了。这一章你没能做完。`],
  };
}

/** 收场：走完了，或者到此为止 */
function closeMainline(prev: GameState, def: MainlineDef, outcome: "达成" | "未竟"): GameState {
  const ms = prev.mainline as MainlineState;
  if (ms.outcome) return prev;
  // 有一章是拖过去的，就不能算走完——半途而废才是真正的失败
  const final: "达成" | "未竟" = outcome === "达成" && (ms.overdue?.length ?? 0) > 0 ? "未竟" : outcome;
  const fallback = ms.cleared.length > 0 ? def.endings.partial : def.endings.failed;
  const line = final === "达成" ? def.endings.done : fallback;
  const entry = makeEntry(`ml-${def.id}-${final}`, prev, `主线 · ${def.name} · ${final}`, [line]);
  return {
    ...prev,
    log: [entry, ...prev.log].slice(0, 160),
    mainline: {
      ...ms,
      outcome: final,
      endedYear: prev.year,
      notes: pushNote(ms.notes, `${final}：${line}`),
    },
    notices: [
      ...prev.notices,
      final === "达成" ? `主线「${def.name}」走到了尽头。` : `主线「${def.name}」到此为止，没能走完。`,
    ],
  };
}

/* ---------- 每月推进 ---------- */

/** 一条任务是否算做到了。条件成立，而且进入这一章之后至少过了一个月 */
function questDone(s: GameState, quest: { done: MainlineGate }): boolean {
  const ms = s.mainline;
  if (!ms) return false;
  // 一章至少要走一个月：进来的那个月不算完成，玩家总得看见这一章要干什么
  if (s.turn <= ms.stageTurn) return false;
  return mainlineGateOpen(s, quest.done);
}

function questId(stage: MainlineStage, questIdRaw: string): string {
  return `${stage.id}/${questIdRaw}`;
}

/**
 * 推进主线：判定任务、收束章节、开下一章、超期收场。
 *
 * 幂等：同一个月里被调用多少次，结果都一样。所以行动结算、抉择结算、月度推进
 * 都可以各调一次，不需要谁去记「这一步有没有跑过」。
 */
export function advanceMainline(prev: GameState): GameState {
  const ms = prev.mainline;
  if (!ms || ms.outcome) return prev;
  const def = mainlineById(ms.id);
  if (!def || def.stages.length === 0) return prev;

  let state = prev;
  // 一次推进最多穿过「全部章节 + 一次收场」，正常情况下一两轮就离开
  for (let guard = 0; guard < def.stages.length + 2; guard += 1) {
    const cur = state.mainline as MainlineState;
    const stage = def.stages[cur.stage];
    if (!stage) return state;

    if (cur.cleared.includes(stage.id)) {
      const nextIndex = cur.stage + 1;
      const nextStage = def.stages[nextIndex];
      if (!nextStage) return closeMainline(state, def, "达成");
      // 下一章的门槛还没到就停在这里等。面板上会写明缺什么
      if (!mainlineGateOpen(state, nextStage.enter)) return state;
      state = openStage(state, def, nextIndex);
      continue;
    }

    const newly = stage.quests.filter(
      (q) => !cur.doneQuests.includes(questId(stage, q.id)) && questDone(state, q),
    );
    if (newly.length > 0) {
      state = {
        ...state,
        mainline: {
          ...cur,
          doneQuests: [...cur.doneQuests, ...newly.map((q) => questId(stage, q.id))],
        },
        notices: [...state.notices, ...newly.map((q) => `主线任务完成 · ${q.label}`)],
      };
      continue;
    }

    const allDone = stage.quests.every((q) => cur.doneQuests.includes(questId(stage, q.id)));
    if (allDone) {
      state = completeStage(state, def, stage);
      continue;
    }

    // 超期：这一章没做完。世界不等你——这一章算拖过去了，代价是它的收成
    if (stage.deadlineMonths && state.turn - cur.stageTurn >= stage.deadlineMonths) {
      state = overdueStage(state, def, stage);
      continue;
    }
    return state;
  }
  return state;
}

/* ---------- 文本覆盖层（AI 二次修改） ---------- */

/** 一章现在的文本：优先取 AI 为本局改写过的，否则用数据里的原文 */
function stageText(s: GameState, stage: MainlineStage): {
  title: string;
  premise: string;
  objective: string;
  guidance: string[];
} {
  const fit = s.mainline?.fit?.stages?.[stage.id];
  return {
    title: fit?.title ?? stage.title,
    premise: fit?.premise ?? stage.premise,
    objective: fit?.objective ?? stage.objective,
    guidance: fit?.guidance ?? stage.guidance,
  };
}

/** 一条主线现在的名字与钩子 */
function mainlineText(s: GameState, def: MainlineDef): { name: string; tagline: string } {
  return {
    name: s.mainline?.fit?.name ?? def.name,
    tagline: s.mainline?.fit?.tagline ?? def.tagline,
  };
}

/** AI 为某一章追加的任务，判定条件是它自己那面 flag */
function extraQuestsOf(s: GameState, stage: MainlineStage): { id: string; label: string; hint: string; flag: string }[] {
  return s.mainline?.fit?.stages?.[stage.id]?.extraQuests ?? [];
}

/* ---------- AI 载荷 ---------- */

export interface MainlineFitPayload {
  /** 按主角改写后的主线名与一句话钩子 */
  name?: string;
  tagline?: string;
  /** 按主角改写后的开场纪事 */
  opening?: string[];
  stages?: {
    id: string;
    title?: string;
    premise?: string;
    objective?: string;
    guidance?: string[];
    quests?: { label: string; hint?: string }[];
  }[];
  flags?: string[];
  canon?: string[];
  scenes?: ScenePatch[];
  threads?: { humanGod?: string; dragonGod?: string };
  notice?: string;
}

export interface MainlineTunePayload {
  note: string;
  focus?: string;
  /** 只改写当前章的一些文本 */
  stage?: {
    id: string;
    title?: string;
    premise?: string;
    objective?: string;
    guidance?: string[];
    quests?: { label: string; hint?: string }[];
  };
  /** 由它判定这一章已经达成，直接推下去 */
  advance?: boolean;
  /** 由它判定这条线该收了 */
  ending?: "达成" | "未竟";
  event?: PendingEvent | null;
  flags?: string[];
  canon?: string[];
  scenes?: ScenePatch[];
  threads?: { humanGod?: string; dragonGod?: string };
  notice?: string;
}

/** 把 AI 给的一章文本收进覆盖层。只认真的存在的章 id */
function fitStages(
  prev: GameState,
  def: MainlineDef | undefined,
  incoming: MainlineFitPayload["stages"],
): Record<string, MainlineStageFit> {
  const stages: Record<string, MainlineStageFit> = { ...(prev.mainline?.fit?.stages ?? {}) };
  if (!incoming?.length || !def) return stages;
  for (const s of incoming) {
    if (!s || typeof s.id !== "string") continue;
    if (!def.stages.some((x) => x.id === s.id)) continue;
    const extraQuests: MainlineStageFit["extraQuests"] = [];
    let n = 0;
    for (const q of (s.quests ?? []).slice(0, 3)) {
      const label = clean(q?.label, 24);
      if (!label) continue;
      n += 1;
      extraQuests.push({
        id: `x${n}`,
        label,
        hint: clean(q?.hint, 60) ?? "这一章要你亲手做完的事。",
        // 判定用的标记由引擎定名，模型改不动它，后面每回合都会连带告诉模型
        flag: `mlq-${s.id}-${n}`,
      });
    }
    stages[s.id] = {
      title: clean(s.title, 20),
      premise: clean(s.premise, 90),
      objective: clean(s.objective, 60),
      guidance: cleanList(s.guidance, 6, 90),
      extraQuests: extraQuests.length > 0 ? extraQuests : undefined,
    };
  }
  return stages;
}

/**
 * 开局之后由 AI 按主角信息做的二次修改。
 * 它改的是「这段剧情长什么样」——名字、开场、各章的说法与指引，以及它想加的任务；
 * 章的门槛、任务的硬条件这些机器读的东西一概不动，所以改不出一个跑不动的世界。
 */
export function applyMainlineFit(prev: GameState, payload: MainlineFitPayload | null | undefined): GameState {
  const ms = prev.mainline;
  if (!ms || !payload) return prev;
  const def = mainlineById(ms.id);
  const stages = fitStages(prev, def, payload.stages);
  const opening = cleanList(payload.opening, 5, 160);
  const name = clean(payload.name, 20);
  const tagline = clean(payload.tagline, 60);
  const flags = (payload.flags ?? [])
    .map((f) => clean(f, 48))
    .filter((f): f is string => Boolean(f))
    .slice(0, 4);
  const canon = cleanList(payload.canon, 4, 80);
  const threads = payload.threads;
  // 什么都没给就不要动存档：一次调用失败不该留下「已经改写过」的痕迹
  const rewrote = Boolean(name || tagline || opening || payload.stages?.length);
  if (!rewrote && flags.length === 0 && !canon && !payload.scenes?.length && !threads && !payload.notice) {
    return prev;
  }

  let next: GameState = {
    ...prev,
    flags: [...(prev.flags ?? [])],
    mainline: {
      ...ms,
      fit: {
        name: name ?? ms.fit?.name,
        tagline: tagline ?? ms.fit?.tagline,
        opening: opening ?? ms.fit?.opening,
        stages,
      },
    },
  };
  // 开场纪事换成按这个人写的那一版
  if (opening) {
    next = {
      ...next,
      log: next.log.map((e) => (e.id === ms.openingId ? { ...e, lines: opening } : e)),
    };
  }
  for (const flag of flags) next = withEffects(next, { flag });
  next = {
    ...next,
    canon: pushCanon(next.canon, canon),
    customScenes: mergeSceneStash(next.customScenes, payload.scenes),
    threads: mergeThreads(next.threads, threads ? { threads } : undefined),
    notices: [
      ...next.notices,
      clean(payload.notice, 80) ?? `主线「${mainlineText(next, def!).name}」已经按你这个人重写了一遍。`,
    ],
  };
  return next;
}

/**
 * 年度微调：每过一年，由 AI 看这一年实际发生了什么，再决定这条线往哪偏。
 * 它能改文风、能加任务、能翻开一个只属于这一章的抉择、也能判定这一章已经达成。
 */
export function applyMainlineTune(prev: GameState, payload: MainlineTunePayload | null | undefined): GameState {
  const ms = prev.mainline;
  if (!ms || !payload) return prev;
  const def = mainlineById(ms.id);
  const note = clean(payload.note, 120);
  if (!note) return prev;

  let next = applyMainlineFit(prev, {
    stages: payload.stage ? [payload.stage] : undefined,
    flags: payload.flags,
    canon: payload.canon,
    scenes: payload.scenes,
    threads: payload.threads,
    notice: payload.notice,
  });

  const focus = clean(payload.focus, 40);
  const entry = makeEntry(
    `ml-tune-${prev.year}-${prev.turn}`,
    next,
    `主线 · ${mainlineText(next, def!).name} · 年度微调`,
    [note, focus ? `这一年这条线的重心：${focus}` : ""].filter(Boolean),
  );
  next = {
    ...next,
    log: [entry, ...next.log].slice(0, 160),
    mainline: {
      ...(next.mainline as MainlineState),
      tune: { year: prev.year, note, focus },
      notes: pushNote((next.mainline as MainlineState).notes, `${prev.year} 年：${note}`),
    },
  };

  if (payload.ending) return closeMainline(next, def!, payload.ending);

  // 先推章、再摆事件：一章走完时它会自己翻开下一章的关键抉择，
  // 那个位置不能同时摆两件事——所以模型这一年给的事件只在位置还空着时才落下来。
  if (payload.advance) {
    const cur = next.mainline as MainlineState;
    const stage = def?.stages[cur.stage];
    if (def && stage && !cur.cleared.includes(stage.id)) {
      next = completeStage(next, def, stage);
    }
    next = advanceMainline(next);
  }

  if (payload.event && !next.pendingEvent) next = { ...next, pendingEvent: payload.event };
  return next;
}

/* ---------- 面板读数 ---------- */

/** 一条任务现在的样子：做到没有、没做到还缺什么 */
function questViews(s: GameState, stage: MainlineStage): MainlineQuestView[] {
  const ms = s.mainline as MainlineState;
  const builtin: MainlineQuestView[] = stage.quests.map((q) => {
    const id = questId(stage, q.id);
    const done = ms.doneQuests.includes(id);
    return { id, label: q.label, hint: q.hint, done, reason: done ? "" : mainlineGateReason(s, q.done) };
  });
  const extra: MainlineQuestView[] = extraQuestsOf(s, stage).map((q) => {
    const id = questId(stage, q.id);
    const done = ms.doneQuests.includes(id) || (s.flags ?? []).includes(q.flag);
    return {
      id,
      label: q.label,
      hint: q.hint,
      done,
      reason: done ? "" : "这件事由推演判定：做到了就会记上",
    };
  });
  return [...builtin, ...extra];
}

/** 主线面板要显示的全部内容。没有主线的人生返回 null */
export function mainlineView(s: GameState): MainlineView | null {
  const ms = s.mainline;
  if (!ms) return null;
  const def = mainlineById(ms.id);
  if (!def) return null;
  const text = mainlineText(s, def);
  const stage = def.stages[ms.stage];
  const currentStageView = stage
    ? {
        id: stage.id,
        ...stageText(s, stage),
        quests: questViews(s, stage),
      }
    : null;

  const nextStage = def.stages[ms.stage + 1];
  const next = nextStage
    ? {
        title: stageText(s, nextStage).title,
        reason: stage && !ms.cleared.includes(stage.id)
          ? "先把这一章做完"
          : mainlineGateReason(s, nextStage.enter) || "随时可以开始",
      }
    : null;

  const chapters: MainlineChapterView[] = def.stages.map((st, i) => {
    const done = ms.cleared.includes(st.id);
    const overdue = (ms.overdue ?? []).includes(st.id);
    const current = i === ms.stage && !done;
    return {
      id: st.id,
      title: stageText(s, st).title,
      status: done ? (overdue ? "拖过" : "已完成") : current ? "进行中" : "未到",
      note: done
        ? overdue
          ? "期限过了，这一章没能做完"
          : ""
        : current
          ? stageText(s, st).objective
          : mainlineGateReason(s, st.enter) || "等你走到那儿",
    };
  });

  const deadlineLeft =
    stage && stage.deadlineMonths !== undefined
      ? Math.max(0, stage.deadlineMonths - (s.turn - ms.stageTurn))
      : null;

  const quests = currentStageView?.quests ?? [];
  const doneCount = quests.filter((q) => q.done).length;
  const chapterPart = Math.min(ms.cleared.length, def.stages.length);
  const questPart = quests.length > 0 ? doneCount / quests.length : 0;
  const progress = Math.min(100, Math.round(((chapterPart + questPart) / def.stages.length) * 100));

  return {
    id: def.id,
    name: text.name,
    theme: def.theme,
    tagline: text.tagline,
    fit: def.fit,
    outcome: ms.outcome,
    endedYear: ms.endedYear,
    stageIndex: ms.stage,
    stageCount: def.stages.length,
    stage: currentStageView,
    next,
    chapters,
    deadlineLeft,
    notes: ms.notes,
    tune: ms.tune,
    progress,
  };
}

/** 终章里交代这条线最后怎么了 */
export function mainlineOutcomeLine(s: GameState): string | null {
  const ms = s.mainline;
  if (!ms) return null;
  const def = mainlineById(ms.id);
  if (!def) return null;
  const name = mainlineText(s, def).name;
  const total = def.stages.length;
  const walked = Math.min(ms.cleared.length, total);
  if (ms.outcome === "达成") {
    return `主线「${name}」：${total} 章走完了。${def.endings.done}`;
  }
  if (ms.outcome === "未竟") {
    return `主线「${name}」：走到第 ${walked} / ${total} 章，没能走完。${walked > 0 ? def.endings.partial : def.endings.failed}`;
  }
  return `主线「${name}」：这一段人生结束时还停在「${def.stages[ms.stage]?.title ?? "开篇"}」，共 ${walked} / ${total} 章。`;
}

/* ---------- 该不该叫 AI ---------- */

/**
 * 原作模式那一条不走 AI 改写：它的起点、锚点与结局都是写好的，
 * 模型只负责按他实际做的事推演，不该去动那条线本身的说法。
 */
export function isFixedMainline(s: GameState): boolean {
  return s.mainline?.id === "canon-rudeus";
}

/** 刚开局、还没按主角改写过：该叫一次 AI 做二次修改 */
export function needsInitialFit(s: GameState): boolean {
  return Boolean(s.mainline) && !s.mainline?.fit && !isFixedMainline(s);
}

/** 又过了一年、这一年还没微调过：该叫一次 AI 重新导一下方向 */
export function needsYearlyTune(s: GameState): boolean {
  const ms = s.mainline;
  if (!ms || ms.outcome || isFixedMainline(s)) return false;
  if (s.year <= ms.startYear) return false;
  return ms.tune?.year !== s.year;
}

/* ---------- 给 AI 的上下文 ---------- */

/**
 * 主线现状，塞进推演与对话的提示词。
 * 里面写明了每个任务靠什么标记判定，模型才知道该在什么时候用 flag 把一件事记上。
 */
export function mainlineBrief(s: GameState): string {
  const ms = s.mainline;
  if (!ms) return "";
  const def = mainlineById(ms.id);
  if (!def) return "";
  const text = mainlineText(s, def);
  const stage = def.stages[ms.stage];
  const lines = [
    `【本局主线】${text.name}（${def.theme}）—— ${text.tagline}`,
    `主线为谁而写：${def.fit}`,
  ];
  if (ms.outcome) {
    lines.push(`这条线已经${ms.outcome === "达成" ? "走完了" : "断在半途"}（${ms.endedYear ?? s.year} 年）。往后你可以自由地活，也可以把它当作没走完的旧账。`);
    return lines.join("\n");
  }
  if (stage) {
    const view = stageText(s, stage);
    lines.push(
      `现在的章：${view.title}（第 ${ms.stage + 1} / ${def.stages.length} 章）`,
      `本章目标：${view.objective}`,
      `指引：\n${view.guidance.map((g) => `- ${g}`).join("\n")}`,
    );
    const quests = questViews(s, stage);
    if (quests.length > 0) {
      lines.push(
        `本章任务（做完了就是在往前推这条线）：\n${quests
          .map((q) => `- [${q.done ? "已做到" : "未做到"}] ${q.label}｜${q.done ? "" : `还差：${q.reason || "等你去做"}`}`)
          .join("\n")}`,
      );
    }
    const extra = extraQuestsOf(s, stage);
    if (extra.length > 0) {
      lines.push(
        `其中由推演判定完成的任务，用 flag 记上：\n${extra
          .map((q) => `- 「${q.label}」→ 在效果里写 "flag": "${q.flag}"`)
          .join("\n")}`,
      );
    }
    if (stage.deadlineMonths !== undefined) {
      const left = Math.max(0, stage.deadlineMonths - (s.turn - ms.stageTurn));
      lines.push(`这一章还有 ${left} 个月的余地。到期限还没做完，这条线就断在这里。`);
    }
  }
  if (ms.cleared.length > 0) {
    lines.push(`已经走完的章：${ms.cleared.map((id) => def.stages.find((x) => x.id === id)?.title ?? id).join("、")}`);
  }
  const nextStage = def.stages[ms.stage + 1];
  if (nextStage && stage && ms.cleared.includes(stage.id)) {
    lines.push(`下一章等在门口：${stageText(s, nextStage).title}。条件：${mainlineGateReason(s, nextStage.enter) || "随时可以开始"}`);
  }
  const notes = ms.notes.slice(-3);
  if (notes.length > 0) lines.push(`这条线最近走过的路：\n${notes.map((n) => `- ${n}`).join("\n")}`);
  return lines.join("\n");
}

/** 供存档校验：一条主线状态是否还认得出来。认不出来就整条丢掉，不拖累存档 */
export function sanitizeMainline(raw: unknown): MainlineState | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const src = raw as Partial<MainlineState>;
  if (typeof src.id !== "string" || !mainlineById(src.id)) return undefined;
  const def = mainlineById(src.id)!;
  const stage = typeof src.stage === "number" ? Math.max(-1, Math.min(def.stages.length - 1, Math.round(src.stage))) : 0;
  const stages = src.fit?.stages && typeof src.fit.stages === "object" ? src.fit.stages : {};
  const fit: MainlineState["fit"] = src.fit
    ? {
        name: clean(src.fit.name, 20),
        tagline: clean(src.fit.tagline, 60),
        opening: cleanList(src.fit.opening, 5, 160),
        stages,
      }
    : undefined;
  const ids = new Set(def.stages.map((x) => x.id));
  const doneQuests = Array.isArray(src.doneQuests)
    ? src.doneQuests.filter((q): q is string => typeof q === "string" && ids.has(q.split("/")[0] ?? ""))
    : [];
  return {
    id: def.id,
    stage,
    stageTurn: typeof src.stageTurn === "number" ? Math.max(0, Math.round(src.stageTurn)) : 0,
    cleared: Array.isArray(src.cleared)
      ? src.cleared.filter((c): c is string => typeof c === "string" && ids.has(c))
      : [],
    doneQuests,
    startYear: typeof src.startYear === "number" ? Math.round(src.startYear) : 0,
    outcome: src.outcome === "达成" || src.outcome === "未竟" ? src.outcome : undefined,
    endedYear: typeof src.endedYear === "number" ? Math.round(src.endedYear) : undefined,
    openingId: clean(src.openingId, 24) ?? "ml-open",
    fit,
    tune: src.tune && typeof src.tune.note === "string"
      ? { year: Math.round(Number(src.tune.year) || 0), note: src.tune.note.slice(0, 120), focus: clean(src.tune.focus, 40) }
      : undefined,
    notes: Array.isArray(src.notes) ? src.notes.filter((n): n is string => typeof n === "string").slice(-NOTES_LIMIT) : [],
    overdue: Array.isArray(src.overdue) ? src.overdue.filter((n): n is string => typeof n === "string") : undefined,
  };
}
