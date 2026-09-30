import { useCallback, useEffect, useRef, useState } from "react";
import Starfield from "./components/Starfield";
import Topbar from "./components/Topbar";
import Toast from "./components/Toast";
import AchievementPanel from "./components/AchievementPanel";
import SaveManager from "./components/SaveManager";
import DifficultyPanel from "./components/DifficultyPanel";
import ApiPanel from "./components/ApiPanel";
import AiPanel from "./components/AiPanel";
import TalkPanel from "./components/TalkPanel";
import type { TalkLine } from "./components/TalkPanel";
import CreationScreen from "./screens/CreationScreen";
import DetailScreen from "./screens/DetailScreen";
import EndingScreen from "./screens/EndingScreen";
import GameScreen from "./screens/GameScreen";
import RudeusScreen from "./screens/RudeusScreen";
import RulebookScreen from "./screens/RulebookScreen";
import TitleScreen from "./screens/TitleScreen";
import { createEmptyDraft } from "./data/creation";
import { RUDEUS_DRAFT, RUDEUS_NAME, RUDEUS_OPENING, RUDEUS_RELATIONS, RUDEUS_START_YEAR } from "./data/rudeus";
import { RUDEUS_MAINLINE_ID } from "./data/mainlines";
import { applyMainlineFit, applyMainlineTune, mainlineView, needsInitialFit, needsYearlyTune } from "./engine/mainline";
import { achievementById } from "./data/achievements";
import { difficultyOf } from "./data/difficulty";
import { commandById, checkCommand } from "./data/scenes";
import {
  advanceMonth,
  changeDifficulty,
  clearPendingTalk,
  createGameState,
  exportSaveText,
  formatDate,
  interactWithRelation,
  isAiMonth,
  noteTalkMet,
  parseSaveText,
  relocate,
  resolveAction,
  resolveEvent,
  setCompanion,
  settleTalk,
} from "./engine/world";
import { hasAnySlot, resumeSlot, writeSlot } from "./engine/saves";
import { verdictLine } from "./engine/death";
import { installApi, readUrlImport } from "./engine/api";
import {
  accountExhausted,
  isAiReady,
  loadAiConfig,
  loadBalanceCache,
  loadBudget,
  remainingBudget,
  requestActionOutcome,
  requestEpilogue,
  requestMainlineFit,
  requestMainlineTune,
  requestTalk,
  requestTalkSettlement,
  requestWorldTurn,
  refreshBalanceIfStale,
  saveAiConfig,
} from "./engine/ai";
import type { AiBalance, AiBudget, AiConfig } from "./engine/ai";
import type { CreationDraft, DetailKind, Difficulty, GameState, View } from "./types";

/** 页面加载时读取 URL 里的导入参数，作为初始状态（一次性） */
const URL_SAVE_RAW = readUrlImport(window.location.search);
const INITIAL_IMPORT: GameState | null = URL_SAVE_RAW ? parseSaveText(URL_SAVE_RAW) : null;
const IMPORT_FAILED = Boolean(URL_SAVE_RAW) && !INITIAL_IMPORT;

export default function App() {
  const [view, setView] = useState<View>(
    INITIAL_IMPORT ? (INITIAL_IMPORT.deceased ? "ending" : "game") : "title",
  );
  const [returnView, setReturnView] = useState<View>("title");
  /** 正在看的详情页。为 null 表示没在详情页里 */
  const [detail, setDetail] = useState<DetailKind | null>(null);
  const [draft, setDraft] = useState<CreationDraft>(() => createEmptyDraft());
  const [game, setGame] = useState<GameState | null>(INITIAL_IMPORT);
  const [toast, setToastState] = useState<{ id: number; text: string } | null>(() =>
    INITIAL_IMPORT
      ? { id: 1, text: "已通过链接导入一份人生存档。" }
      : IMPORT_FAILED
        ? { id: 1, text: "链接里的存档无法解析。" }
        : null,
  );
  const [hasSave, setHasSave] = useState<boolean>(() => (INITIAL_IMPORT ? true : hasAnySlot()));
  const [panel, setPanel] = useState<null | "achievements" | "saves" | "difficulty" | "api" | "ai" | "relations">(null);
  const [aiConfig, setAiConfig] = useState<AiConfig>(() => loadAiConfig());
  const [aiBudget, setAiBudget] = useState<AiBudget>(() => loadBudget());
  const [aiBalance, setAiBalance] = useState<AiBalance | null>(() => loadBalanceCache());
  const [busy, setBusy] = useState(false);
  /** 正在进行的角色对话。对话记录只存在于界面上，不写进存档 */
  const [talk, setTalk] = useState<{ name: string; lines: TalkLine[] } | null>(null);
  const [talkBusy, setTalkBusy] = useState(false);

  /** 本机硬上限用完，或 DeepSeek 明确告知账户不可用 */
  const aiExhausted = aiConfig.enabled && (remainingBudget(aiConfig, aiBudget) <= 0 || accountExhausted());
  const aiUsable = isAiReady(aiConfig, aiBudget);

  /**
   * 顶栏的余额胶囊。只要配了密钥就占位——它是账户的监控，与推演开不开无关。
   * 金额一律取接口原样返回的字符串，不四舍五入、不补零。
   */
  const aiBalanceWarn = accountExhausted() || aiExhausted;
  const aiBalanceText = !aiConfig.apiKey.trim()
    ? null
    : aiBalanceWarn
      ? "已停止调用"
      : aiBalance
        ? `${aiBalance.currency} ${aiBalance.totalText}`
        : "尚未查询";

  // 配了密钥就在启动时查一次余额；之后每次真实调用接口也会顺带刷新
  useEffect(() => {
    if (!aiConfig.apiKey.trim()) return;
    let alive = true;
    void refreshBalanceIfStale(aiConfig).then(() => {
      if (alive) setAiBalance(loadBalanceCache());
    });
    return () => {
      alive = false;
    };
  }, [aiConfig]);

  const gameRef = useRef<GameState | null>(null);
  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  /** 写入游戏状态：同步刷新 ref，让外部 API 调用后立刻能读到最新值（React 状态更新是异步的） */
  const applyGame = useCallback((next: GameState | null) => {
    gameRef.current = next;
    setGame(next);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [view]);

  const notify = useCallback((text: string) => {
    setToastState((t) => ({ id: (t?.id ?? 0) + 1, text }));
  }, []);

  /** 角色草稿的局部更新。传函数时可读到最新的草稿，避免连续点击时互相覆盖 */
  const patchDraft = useCallback(
    (patch: Partial<CreationDraft> | ((d: CreationDraft) => Partial<CreationDraft>)) => {
      setDraft((d) => ({ ...d, ...(typeof patch === "function" ? patch(d) : patch) }));
    },
    [],
  );

  /** 载入外来存档（链接导入 / API 导入 / 槽位读取），统一处理落盘与视图跳转 */
  const loadExternalState = useCallback((state: GameState) => {
    applyGame(state);
    writeSlot("auto", state);
    setHasSave(true);
    setPanel(null);
    setDetail(null);
    setView(state.deceased ? "ending" : "game");
  }, [applyGame]);

  // 暴露浏览器导入/导出接口
  useEffect(() => {
    installApi({
      getState: () => gameRef.current,
      applyState: loadExternalState,
    });
  }, [loadExternalState]);

  // 链接导入落地：写入自动存档并清理地址栏参数
  useEffect(() => {
    if (!INITIAL_IMPORT) return;
    writeSlot("auto", INITIAL_IMPORT);
    const url = new URL(window.location.href);
    for (const key of ["save", "load", "import"]) url.searchParams.delete(key);
    window.history.replaceState({}, "", url.toString());
  }, []);

  /** 比较前后状态，播报新解锁的成就 */
  const announceGains = useCallback(
    (prev: GameState, next: GameState) => {
      const gained = next.achievements.filter((a) => !prev.achievements.includes(a));
      if (gained.length === 0) return false;
      const names = gained.map((id) => achievementById(id)?.name ?? id);
      notify(`成就解锁 · ${names.join("、")}`);
      return true;
    },
    [notify],
  );

  /** 统一落盘：更新内存、写入自动存档、刷新标题页「继续」状态 */
  const commit = useCallback(
    (prev: GameState, next: GameState) => {
      applyGame(next);
      writeSlot("auto", next);
      setHasSave(true);
      return announceGains(prev, next);
    },
    [announceGains, applyGame],
  );

  /**
   * 原作模式扮演：用写好的那份角色档案开局。
   * 起点年份、初始关系网、开场纪事与这一局的主线都由种子指定，
   * 不走创建流程——那些值不是玩家选的，是他本来就有的。
   */
  const beginRudeusLife = useCallback(() => {
    const state = createGameState(RUDEUS_DRAFT, {
      year: RUDEUS_START_YEAR,
      relations: RUDEUS_RELATIONS,
      openingLines: RUDEUS_OPENING,
      mainlineId: RUDEUS_MAINLINE_ID,
    });
    applyGame(state);
    writeSlot("auto", state);
    setHasSave(true);
    setView("game");
    notify(`${RUDEUS_NAME}的一生开始了。起点：甲龙历 ${RUDEUS_START_YEAR} 年。`);
  }, [applyGame, notify]);

  const continueLife = useCallback(() => {
    const slot = resumeSlot();
    if (!slot) {
      notify("没有找到可用的存档。");
      return;
    }
    loadExternalState(slot.state);
    const from = slot.id === "auto" ? "自动存档" : `手动存档 ${slot.id}`;
    notify(`已从${from}恢复「${slot.name}」的人生。`);
  }, [loadExternalState, notify]);

  /** 死亡时让 AI 重写终章：这是唯一一次由模型评价整个人生。失败就保留引擎写的版本 */
  const rewriteEnding = useCallback(
    async (state: GameState): Promise<GameState> => {
      if (!state.deceased || !state.ending || !isAiReady(aiConfig, loadBudget())) return state;
      const res = await requestEpilogue(aiConfig, state);
      if (!res.data || res.data.length === 0) return state;
      const cause = state.ending.cause;
      const verdict = verdictLine(state.ending.kind, state.ending.basis);
      return {
        ...state,
        ending: { ...state.ending, epilogue: res.data },
        log: state.log.map((e) =>
          e.kind === "ending" ? { ...e, lines: [cause, verdict, ...res.data!].filter(Boolean) } : e,
        ),
      };
    },
    [aiConfig],
  );

  /** 每次推演结束后同步账本与余额：界面上读到的数字与真实记录一致 */
  const syncBudget = useCallback(() => {
    setAiBudget(loadBudget());
    setAiBalance(loadBalanceCache());
  }, []);

  const reportAi = useCallback(
    (result: { error: string | null; exhausted?: boolean }, scope: string) => {
      if (result.exhausted) notify("AI 已停止调用（DeepSeek 余额不足，或本机硬上限用尽），本次改由本地引擎推演。");
      else if (result.error) notify(`AI 推演失败，${scope}已由本地引擎接管：${result.error}`);
    },
    [notify],
  );

  /**
   * 主线的两次 AI 介入，都从这里走：
   * - 还没按主角改写过的（刚开局，或者开局时 AI 没开），补一次二次修改；
   * - 又是一年、这一年还没微调过的，按这一年实际发生的事重新导一下方向。
   * AI 不可用时整段跳过，主线照旧由本地引擎推进，不会卡住。
   */
  const ensureMainlineAi = useCallback(
    async (state: GameState): Promise<GameState> => {
      if (state.deceased || !isAiReady(aiConfig, loadBudget())) return state;
      if (needsInitialFit(state)) {
        const res = await requestMainlineFit(aiConfig, state);
        syncBudget();
        if (res.data) {
          notify(`主线已经按${state.character.name}这个人重写了一遍。`);
          return applyMainlineFit(state, res.data);
        }
        reportAi(res, "主线的二次修改");
        return state;
      }
      if (needsYearlyTune(state)) {
        const res = await requestMainlineTune(aiConfig, state);
        syncBudget();
        if (res.data) {
          notify(`主线微调 · ${res.data.note}`);
          return applyMainlineTune(state, res.data);
        }
        reportAi(res, "主线的年度微调");
      }
      return state;
    },
    [aiConfig, notify, reportAi, syncBudget],
  );

  /**
   * 开始一段普通的人生。
   *
   * 创建存档的那一刻抽主线：引擎按主角的出身、时代、所在地、天赋加权，
   * 从二十条里抽一条（选了「不介入」就不抽）。开场钩子与第一章会立刻写进纪事。
   * 抽完立刻把这条线交给 AI 按这个人改写一遍——那条线是按一个通用的人写的，
   * 这一步之后它才属于他。AI 没开（或没配好）时整段跳过，主线照旧由本地引擎推进。
   */
  const beginLife = useCallback(() => {
    const state = createGameState(draft);
    applyGame(state);
    writeSlot("auto", state);
    setHasSave(true);
    setView("game");
    const drawn = mainlineView(state);
    notify(
      drawn
        ? `这一局的主线是「${drawn.name}」。${drawn.stage ? `第一章：${drawn.stage.title}` : ""}`
        : state.achievements.length > 0
          ? "人生已经开始，第一项成就已经落袋。"
          : "人生已经开始。世界不会等你。",
    );
    if (!needsInitialFit(state) || !isAiReady(aiConfig, loadBudget())) return;
    void (async () => {
      setBusy(true);
      try {
        const res = await requestMainlineFit(aiConfig, state);
        if (!res.data) {
          reportAi(res, "主线的二次修改");
          return;
        }
        const current = gameRef.current;
        // 这段时间里玩家可能已经重开或推进过：只在同一条主线上叠改动
        if (!current || current.deceased || current.mainline?.id !== state.mainline?.id) return;
        notify("主线已经按这个人重写了一遍。");
        commit(current, applyMainlineFit(current, res.data));
      } finally {
        syncBudget();
        setBusy(false);
      }
    })();
  }, [draft, notify, applyGame, aiConfig, commit, reportAi, syncBudget]);

  /**
   * 推进一个月。只有「AI 剧情月」（本月玩家自由输入过）才交给模型推演世界动态；
   * 全程只用预设指令的月份不产生任何调用。
   */
  const handleAdvance = useCallback(async () => {
    if (!game || game.deceased || game.pendingEvent || busy) return;
    setBusy(true);
    try {
      const engaged = isAiMonth(game);
      const turn = engaged ? await requestWorldTurn(aiConfig, game) : { data: null, error: null };
      const advanced = advanceMonth(game, turn.data);
      const next = await ensureMainlineAi(advanced);
      const final = await rewriteEnding(next);
      const hadAchievement = commit(game, final);
      if (!hadAchievement) {
        notify(final.pendingEvent ? "发生了一件需要你抉择的事。" : `${formatDate(final.year, final.month)} · 时间继续往前走。`);
      }
      if (final.deceased) setView("ending");
      if (engaged) reportAi(turn, "本月");
    } finally {
      syncBudget();
      setBusy(false);
    }
  }, [game, aiConfig, busy, commit, notify, rewriteEnding, reportAi, syncBudget, ensureMainlineAi]);

  /** 预设指令：由本地引擎即时结算，不消耗 AI 额度，也不标记 AI 剧情月 */
  const handlePreset = useCallback(
    (commandId: string) => {
      if (!game || game.deceased || busy) return;
      const command = commandById(commandId, game);
      if (!command) return;
      const gate = checkCommand(game, command);
      if (!gate.ok) {
        notify(`这件事你现在还做不了：${gate.reason}。`);
        return;
      }
      const { state, matched, blocked } = resolveAction(game, command.label, null, command);
      const hadAchievement = commit(game, state);
      if (blocked === "limit") notify(`本月行动次数已用完（上限 ${difficultyOf(game.difficulty).actionsPerMonth} 次）。推进一个月再继续。`);
      else if (blocked === "energy") notify("精力不足以支撑这次行动。休息或推进一个月再试。");
      else if (blocked === "requirement") notify("这件事的条件没有满足，世界没有回应。");
      else if (!hadAchievement) {
        const learned = state.skills.length > game.skills.length;
        notify(learned ? "你在这一手上面忽然懂了点什么。" : matched ? "系统已结算这次行动的后果。" : "世界记下了，但没有特别回应。");
      }
    },
    [game, busy, commit, notify],
  );

  /**
   * 与某个角色对话。能不能说上话不再有硬门槛：
   * 交情浅的人照样开得了口，只是对方未必愿意多说，这交给模型按关系判断。
   */
  const openTalk = useCallback(
    (name: string, opening?: string) => {
      if (!game) return;
      if (game.deceased) {
        notify("这一段人生已经结束了。");
        return;
      }
      const rel = game.relations.find((r) => r.name === name);
      if (!rel) return;
      setPanel(null);
      setTalk({ name, lines: opening ? [{ who: "npc", text: opening }] : [] });
    },
    [game, notify],
  );

  /** 应下羁绊角色的主动沟通：把对方那句开场白带进对话 */
  const acceptPendingTalk = useCallback(() => {
    const pending = game?.pendingTalk;
    if (!game || !pending) return;
    commit(game, clearPendingTalk(game));
    openTalk(pending.name, pending.line);
  }, [game, commit, openTalk]);

  /**
   * 改日再说。这一次不回应，但也不算失礼：
   * 真正会伤到关系的是「连人来了都没理会」，那由推进时的引擎处理。
   */
  const dismissPendingTalk = useCallback(() => {
    const pending = game?.pendingTalk;
    if (!game || !pending) return;
    commit(game, clearPendingTalk(game));
    notify(`你没有接${pending.name}的话。他说改日再来。`);
  }, [game, commit, notify]);

  /** 关系互动：和预设指令一样走本地引擎，不消耗 AI 额度，但占一次行动 */
  const handleInteract = useCallback(
    (name: string, actionId: string) => {
      if (!game || busy) return;
      const { state, ok, reason } = interactWithRelation(game, name, actionId);
      if (!ok) {
        notify(reason ?? "这件事现在做不了。");
        return;
      }
      const hadAchievement = commit(game, state);
      if (!hadAchievement) notify(`和${name}的这一趟来往，已经写进这一年的纪事。`);
    },
    [game, busy, commit, notify],
  );

  const handleSetCompanion = useCallback(
    (name: string, on: boolean) => {
      if (!game || busy) return;
      const { state, ok, reason } = setCompanion(game, name, on);
      if (!ok) {
        notify(reason ?? "这件事现在做不了。");
        return;
      }
      commit(game, state);
      notify(on ? `你交代过了：往后${name}跟你一起走。` : `${name}留在原地。你搬走之后就见不到他了。`);
    },
    [game, busy, commit, notify],
  );

  const sendTalk = useCallback(
    async (line: string) => {
      if (!talk || !game || talkBusy) return;
      const history = talk.lines.map((l) => ({ who: l.who, text: l.text }));
      setTalk({ name: talk.name, lines: [...talk.lines, { who: "player", text: line }] });
      setTalkBusy(true);
      try {
        const res = await requestTalk(aiConfig, game, talk.name, history, line);
        if (res.data) {
          const reply = res.data;
          setTalk((t) => (t ? { ...t, lines: [...t.lines, { who: "npc", text: reply.reply, mood: reply.mood }] } : t));
        } else {
          notify(res.exhausted ? "AI 已停止调用，暂时无法对话。" : `对方没有回应：${res.error ?? "未知原因"}`);
        }
      } finally {
        syncBudget();
        setTalkBusy(false);
      }
    },
    [talk, game, talkBusy, aiConfig, notify, syncBudget],
  );

  const endTalk = useCallback(async () => {
    if (!talk || !game) return;
    const spoken = talk.lines;
    setTalk(null);
    // 一句话都没说出口就不结算，避免白占一次行动
    if (!spoken.some((l) => l.who === "player")) return;
    if (!isAiReady(aiConfig, loadBudget())) {
      // 影响可以不结算，但「你们见过面」要留在他的记忆里
      commit(game, noteTalkMet(game, talk.name));
      notify("对话已结束。AI 不可用，这次交谈不结算影响，但对方记住了你来过。");
      return;
    }
    setBusy(true);
    try {
      const res = await requestTalkSettlement(
        aiConfig,
        game,
        talk.name,
        spoken.map((l) => ({ who: l.who, text: l.text })),
      );
      if (!res.data) {
        notify(res.exhausted ? "AI 已停止调用，本次交谈不结算。" : `交谈结算失败：${res.error ?? "未知原因"}`);
        return;
      }
      const settled = res.data;
      const { state } = settleTalk(game, {
        name: talk.name,
        title: settled.title,
        lines: settled.lines,
        effects: settled.effects,
        rumor: settled.rumor,
        memory: settled.memory,
        facts: settled.facts,
      });
      const hadAchievement = commit(game, state);
      if (!hadAchievement) notify(`对话已结算 · ${settled.title}`);
    } finally {
      syncBudget();
      setBusy(false);
    }
  }, [talk, game, aiConfig, commit, notify, syncBudget]);

  const closeTalk = useCallback(() => setTalk(null), []);

  const handleAction = useCallback(
    async (text: string) => {
      if (!game || game.deceased || busy) return;
      setBusy(true);
      try {
        const outcome = await requestActionOutcome(aiConfig, game, text);
        const { state, matched, blocked } = resolveAction(game, text, outcome.data);
        const final = await rewriteEnding(state);
        const hadAchievement = commit(game, final);
        if (blocked === "limit") notify(`本月行动次数已用完（上限 ${difficultyOf(state.difficulty).actionsPerMonth} 次）。推进一个月再继续。`);
        else if (blocked === "energy") notify("精力不足以支撑这次行动。休息或推进一个月再试。");
        else if (final.deceased) setView("ending");
        else if (!hadAchievement) {
          const learned = final.skills.length > game.skills.length;
          notify(learned ? "这次之后，你多了一手能用的东西。" : matched ? "系统已结算这次行动的后果。" : "世界记下了，但没有特别回应。");
        }
        reportAi(outcome, "这次行动");
      } finally {
        syncBudget();
        setBusy(false);
      }
    },
    [game, aiConfig, busy, commit, notify, rewriteEnding, reportAi, syncBudget],
  );

  const handleResolveEvent = useCallback(
    async (optionId: string) => {
      if (!game || busy) return;
      setBusy(true);
      try {
        const { state } = resolveEvent(game, optionId);
        const final = await rewriteEnding(state);
        const hadAchievement = commit(game, final);
        if (final.deceased) {
          setView("ending");
          return;
        }
        if (!hadAchievement) notify("你的选择已经被这个世界记住。");
      } finally {
        syncBudget();
        setBusy(false);
      }
    },
    [game, busy, commit, notify, rewriteEnding, syncBudget],
  );

  /** 迁居：换一个地方生活。路上要花掉这一整个月，因此会一次用尽本月的行动次数 */
  const handleRelocate = useCallback(
    (placeId: string) => {
      if (!game || busy) return;
      const { state, ok, reason } = relocate(game, placeId);
      if (!ok) {
        notify(reason ?? "现在走不了。");
        return;
      }
      const hadAchievement = commit(game, state);
      if (!hadAchievement) notify(`你搬到了${state.character.residence}。这个月都花在路上了。`);
    },
    [game, busy, commit, notify],
  );

  const handleSetDifficulty = useCallback(
    (difficulty: Difficulty) => {
      if (!game) return;
      if (game.difficulty === difficulty) {
        notify(`当前已经是「${difficulty}」难度。`);
        return;
      }
      const next = changeDifficulty(game, difficulty);
      const hadAchievement = commit(game, next);
      if (!hadAchievement) notify(`难度已调整为「${difficulty}」。往后的规则会随之改变。`);
    },
    [game, commit, notify],
  );

  const handleSaveAiConfig = useCallback((config: AiConfig) => {
    saveAiConfig(config);
    setAiConfig(config);
  }, []);

  const handleApiImport = useCallback(
    (text: string) => {
      const state = parseSaveText(text);
      if (!state) {
        notify("内容无法解析，请确认是完整的存档或导入链接。");
        return;
      }
      loadExternalState(state);
      notify("已通过接口导入一份人生存档。");
    },
    [loadExternalState, notify],
  );

  const handleRestore = useCallback(
    (text: string) => {
      const state = parseSaveText(text);
      if (!state) {
        notify("存档文本无法解析，请检查内容是否完整。");
        return;
      }
      applyGame(state);
      writeSlot("auto", state);
      setHasSave(true);
      setView(state.deceased ? "ending" : "game");
      notify("世界状态、玩家状态与情感状态均已恢复。");
    },
    [notify, applyGame],
  );

  const handleRestart = useCallback(() => {
    applyGame(null);
    setDraft(createEmptyDraft());
    setDetail(null);
    setView("creation");
    notify("上一段人生已终止。");
  }, [notify, applyGame]);

  const openRulebook = useCallback((from: View) => {
    setReturnView(from);
    setView("rulebook");
  }, []);

  /** 进某一块的详情页。回到「入世」时把详情状态清掉 */
  const openDetail = useCallback((kind: DetailKind) => {
    setDetail(kind);
    setView("detail");
  }, []);

  const backToGame = useCallback(() => {
    setDetail(null);
    setView("game");
  }, []);

  return (
    <>
      <Starfield />
      {/* 游戏界面固定成一屏高的仪表盘，其余界面仍是正常文档流 */}
      <div className={`app${view === "game" ? " app--fixed" : ""}`}>
        {view !== "title" && (
          <Topbar
            view={view}
            hasCharacter={Boolean(game)}
            date={game ? formatDate(game.year, game.month) : undefined}
            onNavigate={(v) => {
              if (v === "rulebook") openRulebook(view);
              else {
                // 从详情页回「入世」，顺便把详情状态清掉
                if (v === "game") setDetail(null);
                setView(v);
              }
            }}
            onAchievements={game && view !== "game" ? () => openDetail("achievements") : undefined}
            onSaves={game ? () => setPanel("saves") : undefined}
            onAi={() => setPanel("ai")}
            aiBalanceText={aiBalanceText}
            aiBalanceWarn={aiBalanceWarn}
            onOpenAiBalance={() => setPanel("ai")}
          />
        )}

        {view === "title" && (
          <TitleScreen
            hasSave={hasSave || Boolean(game)}
            onStart={() => setView("creation")}
            onContinue={continueLife}
            onRulebook={() => openRulebook("title")}
            onImport={() => setPanel("api")}
            onAi={() => setPanel("ai")}
            onPlayRudeus={() => setView("rudeus")}
          />
        )}

        {view === "rudeus" && <RudeusScreen onBegin={beginRudeusLife} onExit={() => setView("title")} />}

        {view === "creation" && (
          <CreationScreen draft={draft} onChange={patchDraft} onBegin={beginLife} onExit={() => setView("title")} />
        )}

        {view === "game" && game && (
          <GameScreen
            state={game}
            busy={busy}
            aiEnabled={aiUsable}
            aiExhausted={aiExhausted}
            aiMonthActive={isAiMonth(game)}
            onAdvance={handleAdvance}
            onPreset={handlePreset}
            onAction={handleAction}
            onRelocate={handleRelocate}
            onResolveEvent={handleResolveEvent}
            onOpenRelations={() => openDetail("relations")}
            onOpenDetail={openDetail}
            onAcceptTalk={acceptPendingTalk}
            onDismissTalk={dismissPendingTalk}
            onRestore={handleRestore}
            onExport={() => exportSaveText(game)}
            onRestart={handleRestart}
            onOpenSaves={() => setPanel("saves")}
            onOpenDifficulty={() => setPanel("difficulty")}
            onOpenApi={() => setPanel("api")}
            onOpenAi={() => setPanel("ai")}
            onViewEnding={() => setView("ending")}
          />
        )}

        {view === "detail" && game && detail && (
          <DetailScreen
            kind={detail}
            state={game}
            busy={busy}
            aiReady={aiUsable}
            onBack={backToGame}
            onInteract={handleInteract}
            onCompanion={handleSetCompanion}
            onTalk={openTalk}
          />
        )}

        {view === "ending" && game && (
          <EndingScreen
            state={game}
            onReplay={() => setView("game")}
            onAchievements={() => setPanel("achievements")}
            onRestart={handleRestart}
            onTitle={() => setView("title")}
          />
        )}

        {view === "game" && !game && (
          <section className="creation">
            <div className="creation__top">
              <h1 className="creation__title">尚无可继续的人生</h1>
              <p className="creation__hint">请先创造一个角色，或恢复一份存档。</p>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button type="button" className="btn btn--primary" onClick={() => setView("creation")}>
                选择你的起点
              </button>
            </div>
          </section>
        )}

        {view === "rulebook" && <RulebookScreen onBack={() => setView(returnView)} />}
      </div>

      {panel === "achievements" && (
        <AchievementPanel unlocked={game?.achievements ?? []} onClose={() => setPanel(null)} />
      )}

      {panel === "saves" && (
        <SaveManager
          current={game}
          onLoad={loadExternalState}
          onNotify={notify}
          onClose={() => setPanel(null)}
        />
      )}

      {panel === "difficulty" && game && (
        <DifficultyPanel
          value={game.difficulty}
          onChange={handleSetDifficulty}
          onClose={() => setPanel(null)}
        />
      )}

      {panel === "api" && (
        <ApiPanel
          state={game}
          onImport={handleApiImport}
          onNotify={notify}
          onClose={() => setPanel(null)}
        />
      )}

      {talk && game && (
        <TalkPanel
          relation={game.relations.find((r) => r.name === talk.name) ?? { name: talk.name, role: "熟人", stars: 1, note: "" }}
          aiReady={aiUsable}
          busy={talkBusy}
          lines={talk.lines}
          onSend={sendTalk}
          onEnd={endTalk}
          onClose={closeTalk}
        />
      )}

      {panel === "ai" && (
        <AiPanel
          config={aiConfig}
          budget={aiBudget}
          onSave={handleSaveAiConfig}
          onLedgerChange={(nextBudget, nextBalance) => {
            setAiBudget(nextBudget);
            setAiBalance(nextBalance);
          }}
          onNotify={notify}
          onClose={() => setPanel(null)}
        />
      )}

      <Toast message={toast?.text ?? null} token={toast?.id ?? 0} />
    </>
  );
}