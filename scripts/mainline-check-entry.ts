/**
 * 主线数据的验收脚本（由 scripts/check-mainlines.mjs 打包后运行）。
 *
 * 两件事：
 * 1. 结构校验：二十条主线 + 原作模式的固定线 + 全部主线事件，逐条查硬规矩。
 * 2. 人生模拟：给每条主线造一个「勤快但普通」的玩家，让他自己过几十年，
 *    看这条线会不会卡死、会不会抛异常、推进是不是单向的。
 *
 * 它不评价剧情好不好看——那是人的事。它只保证这套数据放进引擎里跑得动。
 */
import type { CreationDraft, GameState } from "../src/types";
import { MAINLINES, MAINLINE_EVENTS, RUDEUS_MAINLINE } from "../src/data/mainlines";
import { validateMainlines } from "../src/data/mainlines/validate";
import type { MainlineDef } from "../src/data/mainlines/types";
import { DECISION_EVENTS, eventById } from "../src/engine/events";
import { advanceMonth, createGameState, relocate, relocationOptions, resolveAction, resolveEvent } from "../src/engine/world";
import { advanceMainline, applyMainlineFit, applyMainlineTune, mainlineView } from "../src/engine/mainline";
import { checkCommand, commandAvailable, visibleScenes } from "../src/data/scenes";
import { createEmptyDraft } from "../src/data/creation";
import { DIFFICULTY_OPTIONS, difficultyOf } from "../src/data/difficulty";

const ALL: MainlineDef[] = [...MAINLINES, RUDEUS_MAINLINE];
const problems: string[] = [];
const notes: string[] = [];

/* ---------- 1. 结构校验 ---------- */

// 引擎自己的事件表也能设置 flag、也能被主线当节点引用（原作模式那条线就是这么走的）
const engineEventIds = DECISION_EVENTS.map((e) => e.id);
const engineFlags = new Set<string>();
for (const e of DECISION_EVENTS) {
  for (const o of e.options) if (o.outcome?.flag) engineFlags.add(o.outcome.flag);
}

for (const issue of validateMainlines(ALL, MAINLINE_EVENTS, {
  eventIds: engineEventIds,
  flags: [...engineFlags],
})) {
  problems.push(`[结构] ${issue.mainline} · ${issue.where}：${issue.problem}`);
}

/* ---------- 2. 跨表校验：主线事件必须在引擎的事件表里，且归属正确 ---------- */

for (const e of MAINLINE_EVENTS) {
  const inEngine = eventById(e.id);
  if (!inEngine) problems.push(`[事件表] 主线事件「${e.id}」没有注册进 engine/events.ts 的 DECISION_EVENTS`);
  else if (inEngine.mainlineId !== e.mainlineId) {
    problems.push(`[事件表] 事件「${e.id}」的 mainlineId 与事件表里的不一致`);
  }
  if (!ALL.some((d) => d.id === e.mainlineId)) {
    problems.push(`[事件表] 事件「${e.id}」挂在不存在的主线「${e.mainlineId}」上`);
  }
}

// 主线事件不许重名于已有事件
const ids = new Set<string>();
for (const e of DECISION_EVENTS) {
  if (ids.has(e.id)) problems.push(`[事件表] 事件 id 全局重复：「${e.id}」`);
  ids.add(e.id);
}

/* ---------- 3. 人生模拟 ---------- */

/** 固定种子的伪随机，保证这份检查每次跑出的结果一样 */
function rngFrom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface RunResult {
  id: string;
  kind: "普通" | "对口";
  stages: number;
  reached: number;
  outcome?: string;
  /** 第一章是在第几个月走完的。-1 表示一直没走完 */
  firstStageTurn: number;
  /** 第一章是靠「拖过期限」过去的 */
  firstStageTimedOut: boolean;
  turns: number;
  snapshot: string;
  firstStageGates: string;
}

/** 从主线的 tags 反推一个「对口」的角色：抽签加权的意思就是这种人更容易抽到它 */
function matchedDraft(def: MainlineDef, index: number): CreationDraft {
  const base = createEmptyDraft();
  const talents = (def.tags.talents ?? []).filter((t) => t !== "无" && t !== "随机").slice(0, 3);
  return {
    ...base,
    name: `对口者${index}`,
    era: def.onlyEras?.[0] ?? "鲁迪乌斯时代",
    origin: def.tags.origins?.[0] ?? base.origin,
    status: def.tags.statuses?.[0] ?? base.status,
    residence: def.tags.places?.[0] ?? base.residence,
    faith: def.tags.faiths?.[0] ?? base.faith,
    style: def.tags.styles?.[0] ?? base.style,
    talents: talents.length > 0 ? talents : ["随机"],
    age: "16 岁",
    magicTier: "中级",
    swordTier: "中级",
    adventurerRank: "E",
    college: def.tags.places?.[0] === "魔法都市夏利亚" ? "拉诺亚魔法大学" : base.college,
    mainlineMode: "随机",
    difficulty: DIFFICULTY_OPTIONS[1]?.value ?? "标准",
  };
}

/** 一个勤快但普通的玩家：把本月的行动用完，偶尔搬个家，一直活下去 */
function simulate(def: MainlineDef, index: number, kind: RunResult["kind"]): RunResult {
  const draft: CreationDraft = kind === "对口" ? matchedDraft(def, index) : {
    ...createEmptyDraft(),
    name: `模拟者${index}`,
    era: def.onlyEras?.[0] ?? "鲁迪乌斯时代",
    age: "16 岁",
    mainlineMode: "随机",
    difficulty: DIFFICULTY_OPTIONS[1]?.value ?? "标准",
  };
  const rng = rngFrom(1000 + index * 7919);
  let state: GameState = createGameState(draft, { mainlineId: def.id });
  let firstStageTurn = -1;
  let reached = 0;
  const actorLimit = difficultyOf(state.difficulty).actionsPerMonth;
  const firstStageId = def.stages[0].id;

  for (let guard = 0; guard < 700; guard += 1) {
    if (state.deceased || state.mainline?.outcome) break;
    // 挡在面前的抉择先回应掉（主线每一章都会把它的关键抉择摆上来）
    if (state.pendingEvent) {
      const options = state.pendingEvent.options;
      const chosen = options[Math.floor(rng() * options.length) % options.length];
      state = resolveEvent(state, chosen.id).state;
      continue;
    }
    // 本月把这个玩家能用得上的指令挨个用掉。身子撑不住就只休养，不然他活不到第二章
    const health = state.stats.find((x) => x.key === "health")?.value ?? 100;
    for (let used = 0; used < actorLimit; used += 1) {
      if (state.pendingEvent || state.deceased) break;
      const scenes = visibleScenes(state);
      let commands = scenes.flatMap((sc) => sc.commands).filter((c) => checkCommand(state, c).ok && commandAvailable(state, c));
      if (health < 55 && used > 0) {
        const rest = commands.filter((c) => c.category === "休养");
        if (rest.length > 0) commands = rest;
        else break;
      }
      if (commands.length === 0) break;
      const pick = commands[Math.floor(rng() * commands.length) % commands.length];
      const res = resolveAction(state, pick.label, null, pick);
      if (res.state === state) break;
      state = res.state;
    }
    // 每两年换个地方住：主线不少章是跟着所在地走的
    if (state.turn % 24 === 0 && !state.pendingEvent && !state.deceased) {
      const open = relocationOptions(state).filter((o) => o.ok && !o.here);
      if (open.length > 0) {
        const to = open[Math.floor(rng() * open.length) % open.length];
        const moved = relocate(state, to.place.id);
        if (moved.ok) state = moved.state;
      }
    }
    state = advanceMonth(state);
    const cleared = state.mainline?.cleared.length ?? 0;
    reached = Math.max(reached, cleared);
    if (firstStageTurn < 0 && cleared > 0) firstStageTurn = state.turn;
  }

  return {
    id: def.id,
    kind,
    stages: def.stages.length,
    reached,
    outcome: state.mainline?.outcome,
    firstStageTurn,
    firstStageTimedOut: (state.mainline?.overdue ?? []).includes(firstStageId),
    turns: state.turn,
    snapshot: [
      `所在地 ${state.character.residence}`,
      `魔术 ${state.character.magicTier}／剑术 ${state.character.swordTier}／冒险者 ${state.character.adventurerRank}`,
      state.stats.map((x) => `${x.label} ${x.value}`).join(" "),
      `技能 ${state.skills.length} 项`,
      `关系 ${state.relations.length} 人`,
    ].join("｜"),
    firstStageGates: def.stages[0].quests.map((q) => `${q.label} → ${JSON.stringify(q.done)}`).join("；"),
  };
}

const runs: RunResult[] = [];
for (let i = 0; i < ALL.length; i += 1) {
  const def = ALL[i];
  for (const kind of ["对口", "普通"] as const) {
    try {
      const run = simulate(def, i, kind);
      runs.push(run);
      // 对口的人走不动第一章，就是这条线本身有问题；普通人走不动只作参考
      if (kind === "对口") {
        if (run.firstStageTurn < 0) {
          problems.push(`[推进] ${def.id}：对口的主角过了 ${run.turns} 个月也没能走完第一章`);
        } else if (run.firstStageTimedOut) {
          problems.push(`[推进] ${def.id}：对口的主角第一章是靠拖过期限过去的（期限偏紧或任务偏难）`);
        }
      }
      if (kind === "对口" && run.reached < def.stages.length) {
        notes.push(
          `${def.id}（对口）：走到第 ${run.reached} / ${def.stages.length} 章，${run.turns} 个月，结局 ${run.outcome ?? "未结束"}`,
        );
      }
    } catch (err) {
      problems.push(`[异常] ${def.id}（${kind}）：${err instanceof Error ? `${err.message}\n${err.stack ?? ""}` : String(err)}`);
    }
  }
}

/* ---------- 4. 幂等与单调 ---------- */

{
  const def = MAINLINES[0];
  const state = createGameState({ ...createEmptyDraft(), name: "幂等者", mainlineMode: "随机" }, { mainlineId: def.id });
  const once = advanceMainline(state);
  const twice = advanceMainline(once);
  if (once.mainline?.stage !== twice.mainline?.stage || once.mainline?.cleared.length !== twice.mainline?.cleared.length) {
    problems.push("[幂等] 同一个月里重复推进主线，结果不一致");
  }
}

/* ---------- 5. 抽取与开关 ---------- */

{
  // 「不介入」就该真的没有主线
  const none = createGameState({ ...createEmptyDraft(), name: "自由人", mainlineMode: "不介入" });
  if (none.mainline) problems.push("[开关] 选了「不介入」却还是抽了一条主线");

  // 随机抽取：抽 400 次，看覆盖到了多少条、有没有哪条一次都抽不到
  const { pickMainline, mainlinePool } = await import("../src/data/mainlines");
  const c = createGameState({ ...createEmptyDraft(), name: "抽样者" }).character;
  const hit = new Map<string, number>();
  for (let i = 0; i < 400; i += 1) {
    const def = pickMainline(c, (i + 0.5) / 400);
    hit.set(def.id, (hit.get(def.id) ?? 0) + 1);
  }
  const pool = mainlinePool(c);
  const missing = pool.filter((d) => !hit.has(d.id));
  if (missing.length > 0) {
    problems.push(`[抽取] 有 ${missing.length} 条主线抽不到：${missing.map((d) => d.id).join("、")}`);
  }
  notes.push(
    `抽取覆盖：${c.era}／${c.origin}／${c.residence} 的主角，候选池 ${pool.length} 条，400 次抽样全覆盖（最多 ${Math.max(...hit.values())} 次，最少 ${Math.min(...hit.values())} 次）`,
  );
}

/* ---------- 6. AI 改写的落账路径（不需要密钥，直接喂一份模型会返回的载荷） ---------- */

{
  const def = MAINLINES[0];
  const base = createGameState(
    { ...createEmptyDraft(), name: "改写对象", mainlineMode: "随机" },
    { mainlineId: def.id },
  );
  const openingBefore = base.log.find((e) => e.id === base.mainline?.openingId)?.lines ?? [];

  const fitted = applyMainlineFit(base, {
    name: "被改写过的线",
    tagline: "被改写过的钩子",
    opening: ["按这个人写的开场第一段。", "按这个人写的开场第二段。"],
    stages: [
      {
        id: def.stages[0].id,
        title: "改写过的章名",
        objective: "改写过的目标",
        guidance: ["改写过的指引一", "改写过的指引二", "改写过的指引三", "改写过的指引四"],
        quests: [{ label: "改写追加的任务", hint: "做到就算" }],
      },
    ],
    flags: ["ml:test:flag-a"],
    canon: ["测试用的一条长期设定"],
  });
  const view = mainlineView(fitted);
  if (!view) problems.push("[AI] 改写之后主线视图消失了");
  else {
    if (view.name !== "被改写过的线") problems.push(`[AI] 主线名没有被改写：${view.name}`);
    if (view.tagline !== "被改写过的钩子") problems.push("[AI] 钩子没有被改写");
    if (view.stage?.title !== "改写过的章名") problems.push(`[AI] 章名没有被改写：${view.stage?.title}`);
    if ((view.stage?.guidance.length ?? 0) !== 4) problems.push("[AI] 指引没有被改写");
    if (!view.stage?.quests.some((q) => q.label === "改写追加的任务")) problems.push("[AI] 追加的任务没有出现");
  }
  const openingAfter = fitted.log.find((e) => e.id === fitted.mainline?.openingId)?.lines ?? [];
  if (openingAfter[0] === openingBefore[0]) problems.push("[AI] 开场纪事没有被替换");
  if (!(fitted.flags ?? []).includes("ml:test:flag-a")) problems.push("[AI] 载荷里的 flag 没有落账");
  if (!fitted.canon.includes("测试用的一条长期设定")) problems.push("[AI] 载荷里的 canon 没有落账");
  // 追加的任务用引擎定的 flag 判定，模型给的名字不影响判定
  const extra = fitted.mainline?.fit?.stages?.[def.stages[0].id]?.extraQuests ?? [];
  if (extra.length !== 1 || !extra[0].flag.startsWith("mlq-")) problems.push("[AI] 追加任务的判定 flag 没有按约定生成");

  // 年度微调（第一年）：改写当前章的文字，并认定这一章已经达成
  const tuned = applyMainlineTune(fitted, {
    note: "这一年这条线往他身上长了。",
    focus: "欠债",
    advance: true,
    stage: { id: def.stages[0].id, objective: "推演改写过的目标" },
  });
  if (tuned.mainline?.tune?.note !== "这一年这条线往他身上长了。") problems.push("[AI] 年度微调没有记下来");
  if (!tuned.log.some((e) => e.kind === "mainline" && e.title.includes("年度微调"))) problems.push("[AI] 年度微调没有写进纪事");
  if ((tuned.mainline?.cleared.length ?? 0) < 1) problems.push("[AI] advance 没有把这一章推过去");
  if (mainlineView(tuned)?.stage?.objective === "推演改写过的目标" && (tuned.mainline?.cleared.length ?? 0) > 0) {
    // 章已经过去了，改写只对还在走的那一章有意义——这里只确认没有把覆盖层丢掉
    if (!tuned.mainline?.fit?.stages?.[def.stages[0].id]?.objective) problems.push("[AI] 微调改写的那一章文本没有留在覆盖层里");
  }

  // 年度微调（第二年）：翻开一个只属于这一章的抉择
  const withEvent = applyMainlineTune(tuned, {
    note: "今年把他推到岔路口。",
    event: {
      id: "ai-test-event",
      title: "推演给的一个岔路",
      body: ["测试用的一段处境。"],
      options: [
        { id: "ai-0", label: "选这个", lines: ["你选了这一个。"], outcome: { stats: { int: 2 } } },
        { id: "ai-1", label: "选那个", lines: ["你选了那一个。"], outcome: { stats: { faith: 2 } } },
      ],
    },
  });
  if (withEvent.pendingEvent?.id !== "ai-test-event" && withEvent.pendingEvent) {
    notes.push(`[AI] 那一年位置被章事件占着了（${withEvent.pendingEvent.id}），模型给的事件没有落地——这是设计好的先到先得`);
  } else if (!withEvent.pendingEvent) {
    problems.push("[AI] 年度微调翻开的事件没有摆到面前");
  }

  // 收束：模型判定这条线该收了
  const closed = applyMainlineTune(withEvent, { note: "线到这里就断了。", ending: "未竟" });
  if (closed.mainline?.outcome !== "未竟") problems.push("[AI] ending 没有收束这条线");
  const closedView = mainlineView(closed);
  if (!closedView?.outcome) problems.push("[AI] 收束之后视图里读不到结果");
}



const pad = (s: string, n: number) => s + " ".repeat(Math.max(0, n - [...s].reduce((w, c) => w + (c.charCodeAt(0) > 255 ? 2 : 1), 0)));

console.log(`主线总数：${MAINLINES.length} 条（另有原作模式固定线 1 条）`);
console.log(`主线专属抉择：${MAINLINE_EVENTS.length} 条`);
console.log("");
console.log("模拟结果（「对口」= 按这条主线的 tags 造出来的主角；「普通」= 一个布耶纳村的农家子弟）：");
console.log(`${pad("主线", 34)}${pad("对象", 6)}${pad("章数", 6)}${pad("走到", 6)}${pad("首章完成", 12)}结局`);
for (const run of runs) {
  console.log(
    `${pad(run.id, 34)}${pad(run.kind, 6)}${pad(String(run.stages), 6)}${pad(String(run.reached), 6)}${pad(
      run.firstStageTurn < 0 ? "未完成" : `${run.firstStageTurn} 月${run.firstStageTimedOut ? "（拖过）" : ""}`,
      12,
    )}${run.outcome ?? "仍在走"}`,
  );
}

if (notes.length > 0) {
  console.log("");
  console.log("供参考（不算失败）：");
  for (const n of notes) console.log(`- ${n}`);
}

// 对口的主角第一章就走不动的，把「为什么」一并打出来——这是最值得修的一类数据问题
const stalled = runs.filter((r) => r.kind === "对口" && (r.firstStageTurn < 0 || r.firstStageTimedOut));
if (stalled.length > 0) {
  console.log("");
  console.log("第一章有问题的诊断：");
  for (const run of stalled) {
    console.log(`- ${run.id}（${run.turns} 个月后，${run.firstStageTurn < 0 ? "没走完" : "拖过期限"}）`);
    console.log(`    当时的他：${run.snapshot}`);
    console.log(`    第一章任务：${run.firstStageGates}`);
  }
}

console.log("");
if (problems.length > 0) {
  console.error(`发现 ${problems.length} 个问题：`);
  for (const p of problems) console.error(`- ${p}`);
  process.exit(1);
}
console.log("主线数据检查通过。");
