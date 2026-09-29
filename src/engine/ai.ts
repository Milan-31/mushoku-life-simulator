import type { CommandCategory, CustomCommand, DecisionOption, EventEffects, GameState, PendingEvent, ScenePatch } from "../types";
import { SKILLS, skillById } from "../data/skills";
import { CATEGORY_ORDER } from "../data/scenes";
import { PLACES } from "../data/places";
import { canonRosterBrief, tieText } from "../data/characters";
import { RUDEUS_NAME } from "../data/rudeus";
import { MEMORY_FACT_CHAR_LIMIT, MEMORY_SUMMARY_LIMIT, elapsedText } from "./memory";
import { childAge, childStage, childrenOf, spouseOf } from "./family";
import type { AiActionOutcome, AiWorldTurn, EffectLimits } from "./world";
import { EVENT_LIMITS, LIMITS, formatDate } from "./world";
import { ABSOLUTE_MIN_AGE, ILLNESS_MIN_AGE } from "./death";

/**
 * AI 实时推演接入层。
 *
 * 设计原则：AI 只负责「叙述」与「提出数值变化」，所有数值都要经过本文件的校验与
 * world.ts 的二次夹取才能落账。AI 不可用时整局游戏回退到本地代码引擎，不会中断。
 */

/**
 * 只对接 DeepSeek。聊天与余额接口都固定在这两个地址上，不再需要玩家填写基址。
 * /v1 只是 OpenAI 兼容前缀，与模型版本无关。
 */
const DEEPSEEK_CHAT_URL = "https://api.deepseek.com/v1/chat/completions";
const DEEPSEEK_BALANCE_URL = "https://api.deepseek.com/user/balance";

export interface DeepSeekModel {
  value: string;
  label: string;
  /** 官方公布的人民币单价（元 / 百万 token），仅作默认值，可在界面里改 */
  priceHit: number;
  priceMiss: number;
  priceOut: number;
}

export const DEEPSEEK_MODELS: DeepSeekModel[] = [
  {
    value: "deepseek-flash",
    label: "deepseek-flash（V4.1 Flash · 快 · 便宜）",
    priceHit: 0.02,
    priceMiss: 1,
    priceOut: 2,
  },
  {
    value: "deepseek-v4-pro",
    label: "deepseek-v4-pro（V4 Pro · 慢 · 更强）",
    priceHit: 0.025,
    priceMiss: 3,
    priceOut: 6,
  },
];

export const DEFAULT_MODEL = DEEPSEEK_MODELS[0];

export interface AiConfig {
  /** 关闭时游戏完全由本地引擎推演 */
  enabled: boolean;
  apiKey: string;
  model: string;
  temperature: number;
  timeoutMs: number;
  /**
   * 允许模型基于原作设定自行发明需要长期记住的人、地、事。
   * 这些内容只写进存档里的自撰设定集，不会进入游戏本体的任何内容文件。
   */
  inventPlot: boolean;
  /** 本机硬上限（元）。与单价一起决定是否停止调用；为 0 表示不限额 */
  budget: number;
  /** 输入单价（元 / 百万 token），按缓存命中与未命中分开计价 */
  priceHit: number;
  priceMiss: number;
  /** 输出单价（元 / 百万 token） */
  priceOut: number;
}

export const DEFAULT_AI_CONFIG: AiConfig = {
  enabled: false,
  apiKey: "",
  model: DEFAULT_MODEL.value,
  temperature: 0.85,
  timeoutMs: 60000,
  inventPlot: false,
  budget: 0,
  priceHit: DEFAULT_MODEL.priceHit,
  priceMiss: DEFAULT_MODEL.priceMiss,
  priceOut: DEFAULT_MODEL.priceOut,
};

/** 额度账本：累计花费与调用次数，属于本机全局，不随存档走 */
export interface AiBudget {
  spent: number;
  calls: number;
  /** 有调用未返回 usage，费用无法计算 */
  usageMissing: boolean;
}

/**
 * DeepSeek 账户余额快照，来自 /user/balance。
 * 金额一律保留接口原样返回的字符串，界面直接显示，不做四舍五入或重排版。
 */
export interface AiBalance {
  isAvailable: boolean;
  currency: string;
  /** 总可用余额（含赠送与充值） */
  totalText: string;
  grantedText: string;
  toppedUpText: string;
  fetchedAt: string;
}

const STORAGE_KEY = "mushoku-life-simulator:ai";
const BUDGET_KEY = "mushoku-life-simulator:ai-budget";
const BALANCE_KEY = "mushoku-life-simulator:ai-balance";
/** 余额快照的保鲜期：过期后不再据它拦截调用，避免充了钱还被旧数据挡着 */
const BALANCE_FRESH_MS = 30 * 60 * 1000;
/** 自动刷新余额的最小间隔，避免每回合都打一次余额接口 */
const BALANCE_REFRESH_GAP_MS = 20 * 1000;

function clampNumber(value: unknown, lo: number, hi: number, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(lo, Math.min(hi, n));
}

function pickPrice(value: unknown, fallback: number): number {
  return clampNumber(value, 0, 1e5, fallback);
}

export function loadAiConfig(): AiConfig {
  const base = DEFAULT_AI_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...base };
    const p = JSON.parse(raw) as Partial<AiConfig>;
    // 只认 DeepSeek 的模型名。旧配置（gpt-4o-mini 之类）视为换过供应商，
    // 单价一并重置为 DeepSeek 公布价，避免沿用别家的数字把估算算歪
    const stored = DEEPSEEK_MODELS.find((m) => m.value === p.model);
    const model = stored ?? DEFAULT_MODEL;
    const prices = stored ?? DEFAULT_MODEL;
    // 逐字段取值：老版本配置里的基址与旧单价字段会被自然丢弃
    return {
      enabled: Boolean(p.enabled),
      apiKey: typeof p.apiKey === "string" ? p.apiKey : base.apiKey,
      model: model.value,
      temperature: clampNumber(p.temperature, 0, 2, base.temperature),
      timeoutMs: clampNumber(p.timeoutMs, 5000, 300000, base.timeoutMs),
      inventPlot: Boolean(p.inventPlot),
      budget: clampNumber(p.budget, 0, 1e7, 0),
      priceHit: stored ? pickPrice(p.priceHit, prices.priceHit) : prices.priceHit,
      priceMiss: stored ? pickPrice(p.priceMiss, prices.priceMiss) : prices.priceMiss,
      priceOut: stored ? pickPrice(p.priceOut, prices.priceOut) : prices.priceOut,
    };
  } catch {
    return { ...base };
  }
}

export function saveAiConfig(config: AiConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    /* 忽略存储异常 */
  }
}

export function loadBudget(): AiBudget {
  try {
    const raw = localStorage.getItem(BUDGET_KEY);
    if (!raw) return { spent: 0, calls: 0, usageMissing: false };
    const parsed = JSON.parse(raw) as Partial<AiBudget>;
    return {
      spent: Number(parsed.spent) || 0,
      calls: Number(parsed.calls) || 0,
      usageMissing: Boolean(parsed.usageMissing),
    };
  } catch {
    return { spent: 0, calls: 0, usageMissing: false };
  }
}

export function resetBudget(): AiBudget {
  const fresh: AiBudget = { spent: 0, calls: 0, usageMissing: false };
  try {
    localStorage.setItem(BUDGET_KEY, JSON.stringify(fresh));
  } catch {
    /* 忽略存储异常 */
  }
  return fresh;
}

export function loadBalanceCache(): AiBalance | null {
  try {
    const raw = localStorage.getItem(BALANCE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<AiBalance>;
    if (typeof p.totalText !== "string") return null;
    return {
      isAvailable: Boolean(p.isAvailable),
      currency: typeof p.currency === "string" ? p.currency : "CNY",
      totalText: p.totalText,
      grantedText: typeof p.grantedText === "string" ? p.grantedText : "-",
      toppedUpText: typeof p.toppedUpText === "string" ? p.toppedUpText : "-",
      fetchedAt: typeof p.fetchedAt === "string" ? p.fetchedAt : new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

function saveBalanceCache(balance: AiBalance): void {
  try {
    localStorage.setItem(BALANCE_KEY, JSON.stringify(balance));
  } catch {
    /* 忽略存储异常 */
  }
}

/** 本机累计估算花费 */
export function remainingBudget(config: AiConfig, budget: AiBudget): number {
  if (config.budget <= 0) return Number.POSITIVE_INFINITY;
  return Math.max(0, config.budget - budget.spent);
}

function budgetExhausted(config: AiConfig, budget: AiBudget): boolean {
  return config.budget > 0 && budget.spent >= config.budget;
}

/** DeepSeek 明确告知账户不可用，且这份快照还在保鲜期内 */
export function accountExhausted(): boolean {
  const snap = loadBalanceCache();
  if (!snap || snap.isAvailable) return false;
  return Date.now() - new Date(snap.fetchedAt).getTime() <= BALANCE_FRESH_MS;
}

/** 配置齐全、额度与余额都还有，才真正发起调用 */
export function isAiReady(config: AiConfig, budget?: AiBudget): boolean {
  if (!config.enabled || !config.model.trim()) return false;
  if (accountExhausted()) return false;
  if (!budget) return true;
  return !budgetExhausted(config, budget);
}

/* ---------- 传输层 ---------- */

interface ChatPayload {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
  timeoutMs: number;
}

interface ChatResponse {
  ok: boolean;
  status: number;
  text: string;
}

interface ChatUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  /** DeepSeek 会额外区分缓存命中与未命中 */
  prompt_cache_hit_tokens?: number;
  prompt_cache_miss_tokens?: number;
}

interface AiBridge {
  request: (payload: ChatPayload) => Promise<ChatResponse>;
}

/** Electron 预加载脚本暴露的通道：经主进程发请求，避开渲染进程的跨域限制 */
function bridge(): AiBridge | undefined {
  return (window as unknown as { mushokuAi?: AiBridge }).mushokuAi;
}

/** 渲染进程直连时用作回退（服务端需允许跨域） */
async function fetchDirect(payload: ChatPayload): Promise<ChatResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), payload.timeoutMs);
  try {
    const res = await fetch(payload.url, {
      method: payload.method,
      headers: payload.headers,
      body: payload.body === undefined ? undefined : JSON.stringify(payload.body),
      signal: controller.signal,
    });
    return { ok: res.ok, status: res.status, text: await res.text() };
  } catch (err) {
    return { ok: false, status: 0, text: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timer);
  }
}

function send(config: AiConfig, payload: Omit<ChatPayload, "timeoutMs">): Promise<ChatResponse> {
  const full: ChatPayload = { ...payload, timeoutMs: config.timeoutMs };
  const viaBridge = bridge();
  return viaBridge ? viaBridge.request(full) : fetchDirect(full);
}

function authHeaders(config: AiConfig): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (config.apiKey.trim()) headers.Authorization = `Bearer ${config.apiKey.trim()}`;
  return headers;
}

async function postChat(config: AiConfig, messages: { role: string; content: string }[], jsonMode: boolean): Promise<string> {
  const body: Record<string, unknown> = {
    model: config.model.trim(),
    temperature: config.temperature,
    messages,
  };
  // 兼容不支持 response_format 的服务：失败时会自动去掉再试一次
  if (jsonMode) body.response_format = { type: "json_object" };

  const call = (payloadBody: Record<string, unknown>) =>
    send(config, { url: DEEPSEEK_CHAT_URL, method: "POST", headers: authHeaders(config), body: payloadBody });

  let res = await call(body);
  if (!res.ok && jsonMode && res.status >= 400) {
    const retryBody = { ...body };
    delete retryBody.response_format;
    res = await call(retryBody);
  }
  if (!res.ok) {
    const detail = res.text.slice(0, 300).replace(/\s+/g, " ");
    throw new Error(res.status === 0 ? detail || "请求失败" : `HTTP ${res.status}：${detail}`);
  }
  const parsed = extractContent(res.text);
  // 每一轮调用后立刻记账，界面上读到的额度始终是最新的
  recordUsage(config, parsed.usage);
  // 顺手刷新一次账户余额，失败也不影响这一回合
  void refreshBalanceIfStale(config);
  return parsed.content;
}

function extractContent(raw: string): { content: string; usage: ChatUsage | null } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("接口返回的不是 JSON");
  }
  const body = parsed as { choices?: { message?: { content?: unknown } }[]; usage?: ChatUsage };
  const choice = body.choices?.[0];
  const content = choice?.message?.content;
  if (typeof content !== "string") throw new Error("接口返回里没有 message.content");
  return { content, usage: body.usage ?? null };
}

/* ---------- 账户余额 ---------- */

/** 按 DeepSeek 的计价规则算这次调用花了多少钱 */
function costOf(config: AiConfig, usage: ChatUsage | null): number {
  if (!usage) return 0;
  const completion = Number(usage.completion_tokens) || 0;
  const hit = Number(usage.prompt_cache_hit_tokens) || 0;
  const miss = Number(usage.prompt_cache_miss_tokens) || 0;
  // 没有缓存明细时，全部按未命中计价（保守估计）
  const missTokens = hit || miss ? miss : Number(usage.prompt_tokens) || 0;
  return (
    (hit / 1e6) * config.priceHit +
    (missTokens / 1e6) * config.priceMiss +
    (completion / 1e6) * config.priceOut
  );
}

function recordUsage(config: AiConfig, usage: ChatUsage | null): void {
  const current = loadBudget();
  const next: AiBudget = {
    spent: current.spent + costOf(config, usage),
    calls: current.calls + 1,
    usageMissing: current.usageMissing || !usage,
  };
  try {
    localStorage.setItem(BUDGET_KEY, JSON.stringify(next));
  } catch {
    /* 忽略存储异常 */
  }
}

function parseBalance(raw: string): AiBalance | null {
  try {
    const body = JSON.parse(raw) as {
      is_available?: unknown;
      balance_infos?: {
        currency?: unknown;
        total_balance?: unknown;
        granted_balance?: unknown;
        topped_up_balance?: unknown;
      }[];
    };
    const info = body.balance_infos?.[0];
    if (!info) return null;
    // 金额一律原样保留字符串：显示层不再格式化，接口说多少就是多少
    const text = (v: unknown) => (typeof v === "string" ? v : v === undefined || v === null ? "-" : String(v));
    return {
      isAvailable: Boolean(body.is_available),
      currency: typeof info.currency === "string" ? info.currency : "CNY",
      totalText: text(info.total_balance),
      grantedText: text(info.granted_balance),
      toppedUpText: text(info.topped_up_balance),
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/** 向 DeepSeek 查询账户余额；失败时保留上一次的快照 */
export async function refreshBalance(config: AiConfig): Promise<{ ok: boolean; balance: AiBalance | null; message: string }> {
  if (!config.apiKey.trim()) return { ok: false, balance: loadBalanceCache(), message: "请先填写 API Key。" };
  const res = await send(config, {
    url: DEEPSEEK_BALANCE_URL,
    method: "GET",
    headers: { Accept: "application/json", Authorization: `Bearer ${config.apiKey.trim()}` },
  });
  if (!res.ok) {
    const detail = res.text.slice(0, 200).replace(/\s+/g, " ");
    const message = res.status === 0 ? `无法连接 DeepSeek：${detail}` : `查询余额失败（HTTP ${res.status}）：${detail}`;
    return { ok: false, balance: loadBalanceCache(), message };
  }
  const balance = parseBalance(res.text);
  if (!balance) return { ok: false, balance: loadBalanceCache(), message: "余额接口返回的内容无法解析。" };
  saveBalanceCache(balance);
  const state = balance.isAvailable ? "账户可用" : "账户余额不足，调用会被拒绝";
  return { ok: true, balance, message: `余额 ${balance.currency} ${balance.totalText}（${state}）` };
}

/**
 * 距上次查询超过间隔才自动刷新，避免每回合都打一次余额接口。
 * 首次（没有快照）一定查一次，顶栏的余额胶囊才不会一直空着。
 * 导出给界面在启动时调用，挂机时余额也是活的。
 */
export async function refreshBalanceIfStale(config: AiConfig): Promise<void> {
  if (!config.apiKey.trim()) return;
  const cache = loadBalanceCache();
  if (cache && Date.now() - new Date(cache.fetchedAt).getTime() < BALANCE_REFRESH_GAP_MS) return;
  try {
    await refreshBalance(config);
  } catch {
    /* 余额只是参考信息，失败不打断游戏 */
  }
}

/* ---------- 提示词 ---------- */

/**
 * 文风规范。所有生成剧本的提示词共用这一份，避免各处口径不一致。
 * 条目来自对原作行文的归纳：外层冷叙述 + 内层不加引号的独白，句子短，情绪落在动作与物件上。
 */
const STYLE_DOC = [
  "【文风】下面几条决定你的文字读起来像不像原作，逐条遵守：",
  "1. 双层结构：外面是冷静的客观叙述，里面是不加引号的内心独白。独白要短，常带自嘲或吐槽，直接嵌在叙述里。",
  "   例：「他把刀收了回去，动作像在嫌麻烦。……这算什么回答。」",
  "2. 短句为主，长短交替，一段一到三句。善用「……」与「——」。不用长定语从句，不堆四字成语。",
  "3. 情绪不直说，写身体和动作。「你很难过」改成「你把碗放下，发现手在抖」。",
  "4. 具体到物件、数目、气味、声音、钱、伤口。日常写得琐碎才可信。",
  "5. 死亡、暴力、失败、背叛直接写结果，不抒情、不铺垫悲壮、不解释意义。转折来得突然。",
  "6. 人物说话带身份：平民谈收成与价钱，商人先谈价，贵族谈人脉与名声，神职人员说教，冒险者说话直接，斯佩路德族寡言而重荣耀，人神温和体贴且从不提代价。",
  "   台词用「」包裹，旁白不加引号。中文全角标点。",
  "7. 世界不围着你转：消息多是传闻，可能不准，可能被人有意放出来；你做的大多数事没人记得；努力未必有回报，好事都有代价。",
  "8. 不要写：空洞抒情、「命运的齿轮开始转动」式的旁白、网络流行语、把世界写成玩家的附属、给主角光环、无代价的收益。",
  "9. 母题是「这一世要认真活」，半途而废才是真正的失败；悔恨可以变成力量；选择比出身重要。让它从情节里渗出来，不要写成说教。",
].join("\n");

const SYSTEM_PROMPT = [
  "你是《无职转生》六面世界的文字人生模拟器主持人（世界模拟系统）。你维护世界状态、推进时间、结算后果、扮演所有 NPC。",
  "世界设定：魔术阶级为未觉醒→初级→中级→上级→圣级→王级→帝级→神级；剑术分剑神流、水神流、北神流；米里斯教团主张一夫一妻并对魔族敌视；魔术公会与魔法大学位于魔法都市夏利亚；冒险者公会等级为 F 到 S；七大列强是传说级战力；人神只能诱导、不能强制，龙神奥尔斯帝德在轮回中寻找胜机。",
  canonRosterBrief(),
  "输出要求：",
  "1. 只输出 JSON 对象，不要 Markdown、不要代码块标记、不要任何额外解释。",
  "2. 叙述用中文。不替玩家做决定，不泄露玩家尚未获得的信息，不给主角光环。",
  "3. 世界大多数时候是安静的。不要每回合都发生大事，也不要让 NPC 围着玩家转。",
  "4. 已发生的历史、已有的关系与数值是既成事实，不得改写。",
  "",
  STYLE_DOC,
  "",
  "你有相当大的叙事自由，请主动使用它：",
  "· 你可以创造有名有姓的小人物、小地点、小组织（某个总在同一张桌子喝酒的冒险者、村口的旧磨坊、一间收旧书的铺子），并让他们在后面的月份里再次出现。合适时通过 addRelation 把其中值得记住的人写进关系面板。",
  "· 事件不必都是世界级大事。一次讨价还价、一封寄错地址的信、一场没人赢的争吵，都比空洞的宏大叙事更好。",
  "· 不要连续几个月写同一类事，也不要每次都把镜头对准玩家。允许出现一个完全平静、什么也没发生的月份。",
  "· 玩家可能做出荒诞、越界或明显超出能力的举动。按世界的真实逻辑回应：被阻止、被嘲笑、被惩罚、失败、惹上麻烦。不要为了配合玩家而让世界失真。",
  "· 叙事要留下痕迹：认识的人写进 addRelation，被注意到的变化写进 notice，值得流传的说法写进 rumor，与人神或龙神的接触写进 threads。",
].join("\n");

/**
 * 原作模式的一句话说明。
 * 三个推演请求（世界、行动、事件）与对话请求都带上它，
 * 模型才不会把鲁迪乌斯当成一个恰好同名的普通玩家。
 */
const RUDEUS_BANNER =
  "【本局是原作模式】玩家扮演的就是鲁迪乌斯·格雷拉特本人，不是同名的人。他带着前世的记忆，" +
  "无咏唱施法，魔力远超常人，剑术止步于中级。原著里他的人生轨迹、三位妻子、六个孩子、" +
  "以及规则手册锁定的锚点（转移事件、保罗之死、洛琪希之死）都成立；但他可以走出自己的路线，" +
  "你要按他实际做过的事推演，不要照搬原著剧情。";

function characterBrief(s: GameState): string {
  const c = s.character;
  return [
    // 这一局玩家是谁，决定模型怎么理解后面所有信息
    c.name === RUDEUS_NAME ? RUDEUS_BANNER : "",
    `姓名：${c.name}（${c.age} 岁，${c.gender}，${c.status}）`,
    `时代：${c.era}　所在地：${c.residence}　出身：${c.origin}　出生身份：${c.birthIdentity}`,
    `所在地的场景里，他能做的都是那个地方做得出的事；换地方只能靠「迁居」，一次花掉当月全部行动。`,
    `特殊天赋：${c.talents.filter((t) => t !== "无").join("、") || "无"}`,
    `魔术：${c.magicTier}　剑术：${c.swordTier}（${c.swordSchool}）　冒险者：${c.adventurerRank}`,
    `信仰：${c.faith}　政治倾向：${c.politics}　血脉：${c.blood}　契约：${c.contract}　腐化：${c.corruption}`,
    `人生目标：${c.goal}（进度 ${Math.round(s.goalProgress)}%）　情感倾向：${c.emotion}`,
    c.traits.length ? `性格：${c.traits.join("、")}` : "性格：未定",
    `最珍贵记忆：${c.precious}`,
    `最痛苦记忆：${c.painful}`,
    c.family ? `家庭：${c.family}` : "",
    `模拟风格：${c.style}　难度：${s.difficulty}`,
    `所在时间：${s.year} 年 ${s.month} 月，出生于 ${s.birthYear} 年`,
    `已掌握招式：${skillsBrief(s)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** 已学技能。模型据此判断角色现在能做什么、不能做什么 */
function skillsBrief(s: GameState): string {
  if (s.skills.length === 0) return "无。尚未掌握任何成体系的招式";
  return s.skills
    .map((id) => {
      const skill = skillById(id);
      return skill ? `${skill.name}（${skill.school}·${skill.grade}）` : id;
    })
    .join("、");
}

function statsBrief(s: GameState): string {
  return s.stats.map((x) => `${x.label} ${x.value}`).join("　");
}

function recentBrief(s: GameState): string {
  const entries = s.log.slice(0, 8).reverse();
  if (entries.length === 0) return "（尚无经历）";
  return entries
    .map((e) => {
      const head = `${e.year} 年 ${e.month} 月 · ${e.title}`;
      const body = e.lines.slice(0, 3).join(" ");
      return `- ${head}：${body}`;
    })
    .join("\n");
}

function relationsBrief(s: GameState): string {
  if (s.relations.length === 0) return "（暂无重要关系）";
  return s.relations
    .map((r) => {
      const ties = tieText(r.ties);
      return `${r.name}（${r.role}，好感 ${r.stars}/5）：${r.note}${ties ? `　原作关系：${ties}` : ""}`;
    })
    .join("\n");
}

function factionsBrief(s: GameState): string {
  return s.factions.map((f) => `${f.name} ${f.value >= 0 ? "+" : ""}${f.value}`).join("　");
}

/**
 * 自撰设定集：AI 在此前回合发明、且需要长期记住的人与地。
 * 关闭自撰剧情开关时整段不出现，模型也就无从接手这些设定。
 */
function canonBrief(s: GameState, enabled: boolean): string[] {
  if (!enabled) {
    return ["【自撰剧情】关闭。你只能写当月即兴的细节，不要发明需要长期记住的人、地、组织或伏线，也不要做出会改变世界格局的设定。"];
  }
  if (s.canon.length === 0) {
    return [
      "【自撰剧情】开启。你可以基于原作设定发明需要长期记住的人、地、组织与伏线，用 canon 字段提交。",
      "目前你还没有为这个世界添加任何设定。",
    ];
  }
  return [
    "【自撰剧情】开启。以下是你此前为这个世界添加的设定，必须与本回合内容保持一致：",
    ...s.canon.map((c) => `- ${c}`),
    "需要时可以继续补充，但不要与上面任何一条冲突。",
  ];
}

const STAT_KEYS_HINT = "mana（魔力）、sword（剑术造诣）、int（智力）、charm（魅力）、faith（信仰）、wealth（财富，单位金币）、fame（声望）、scheme（密谋）、health（健康）";

/** 技能目录，供模型用 learnSkill 授权或授予技能 */
const SKILL_DOC = [
  `可用技能 id（格式 id「名称」流派·等级）：`,
  SKILLS.map((s) => `${s.id}「${s.name}」${s.school}·${s.grade}`).join("；"),
  "learnSkill：让角色学会其中一个技能。普通技能可以在长期练习、名师指点或吃了大亏之后给出；",
  "高级技能只能由特殊事件或强大角色授予——剑神流奥义要剑神级人物亲传，混成魔术要有人示范原理，",
  "甲龙王的手刀只有甲龙王本人能教。不要因为玩家练得勤就发高级技能，那样这个世界就没有重量了。",
].join("\n");

/**
 * 各类效果字段的说明。数值上限由调用方传入：
 * 常规行动与世界动态用 LIMITS，抉择事件用放宽的 EVENT_LIMITS。
 */
function effectsDoc(max: EffectLimits, wide: boolean): string {
  const field = [
    "所有效果字段都是可选的，没有变化就省略，不要为了填满而硬塞数值。",
    `stats：属性增减，键只能是 ${STAT_KEYS_HINT}，上限 ±${max.stat}。`,
    `tier：阶级成长，形如 {"kind":"sword","gain":12}，kind 只能是 magic、sword、adventure，0-${max.tier}。`,
    `starDelta：改变某段关系的好感，形如 {"match":"母亲","delta":1,"note":"新的相处方式"}，上限 ±${max.star}；match 写关系名的一部分，留空则作用于最亲近的人。`,
    'addRelation：把新认识的人写进关系面板，形如 {"name":"旧书店老板","role":"熟人","stars":2,"note":"他记得你要找的那本书"}。每次最多一个，必须是这次真的认识的人。',
    `goal：人生目标进度变化，上限 ±${max.goal}。`,
    `energy：精力增减，上限 ±${max.energy}（休息、疗养、被照料为正，劳累、受伤为负）。`,
    `lifespan：寿命变化，上限 ±${max.lifespan} 岁。只在发生真正不可逆的身体损伤或长期调养时使用。`,
    `factions：势力态度增减，键只能是阿斯拉王国、魔术公会、米里斯教团、冒险者公会、魔法大学、剑之圣地，上限 ±${max.stat}。得罪或讨好一方时才用。`,
    'notice：写入「系统记录」的一句提示，60 字内，用于记下真正被世界注意到的变化。',
    "rumor：一条会被玩家听说的传闻，60 字内。",
    "threads：改写线索面板，形如 {\"humanGod\":\"低语再次出现，这次它提到了一个名字\"}，仅在与人神或龙神真的发生接触时使用。",
    SKILL_DOC,
  ];

  const discipline = wide
    ? [
        `【幅度纪律】抉择事件的额度是常规的三倍，这是留给真正罕见的时刻的：继承遗产、被判重刑、失去至亲、被诅咒缠身、捡到圣物、身份暴露、与列强正面交手。`,
        `绝大多数抉择仍然只需要几点到十几点的变化。只有选项本身足够重大时才动用大额度，而且代价要和收益对称——拿了天大的好处，就要有天大的麻烦。`,
      ]
    : [
        `【幅度纪律】这是常规上限，用于一个月的世界动态与一次普通行动。属性变化请控制在 ±5 以内、阶级成长 5-15、目标进度 3-8。`,
        `只有这个月本身极不寻常（瘟疫、天灾、时局剧变）时才接近上限。一次普通练剑给出 +${max.tier} 的阶级成长，这个世界的分量就毁了。`,
        "如果剧情需要一次足以改变人生的剧变，那是抉择事件的职责，会在下个月由你另行给出，不要在常规结算里硬塞。",
      ];

  return [...field, "", ...discipline].join("\n");
}

const EVENT_SCHEMA = [
  "{",
  '  "title": "事件标题",',
  '  "body": ["2-3 段情境描述"],',
  '  "options": [',
  "    {",
  '      "label": "选项文案",',
  '      "detail": "一句话补充说明",',
  '      "risk": "低",',
  '      "lines": ["选择之后 2-4 句结算叙述"],',
  '      "stats": { "fame": 3 },',
  '      "goal": 2,',
  '      "addRelation": { "name": "同行者", "role": "旅伴", "stars": 2, "note": "你们在同一个屋檐下躲过雨" }',
  "    }",
  "  ]",
  "}",
].join("\n");

/**
 * 场景与指令的授权说明。
 * 这一段是「你的行动」面板会随剧情变化的原因：模型可以在处境真的变了的时候，
 * 给这个存档加一块新场景或一条新做法。加进去的内容只属于这一份存档。
 */
const SCENE_DOC = [
  "【场景与指令】你可以用 scenes 字段，让「你的行动」面板跟着剧情长出新东西。",
  "· 用途只有一个：处境真的变了（换了地方、多了一重身份、关系翻了面），给玩家几条预设表里没有、但这个人现在确实做得出的常规做法。",
  '· 结构：[{"name":"场景名","desc":"一句话场景描述","commands":[{"label":"指令名","category":"探索","cost":12,"hint":"一句话说明","lines":["结算叙述 1-2 句"],"effects":{"stats":{"fame":3}}}]}]',
  "· name 与已有场景同名（家中、冒险者公会、魔法大学……）就往那个场景里加指令；不同名会新开一个场景。一次最多两份改动，每份最多三条指令。",
  `· category 只能是${CATEGORY_ORDER.join("、")}。cost 是精力消耗，-30 到 ${LIMITS.actionCost} 之间，休养类可以给负数。`,
  "· 指令由本地引擎直接结算，不会再调用你，所以 lines 必须一次写好；effects 用常规额度，不要给大额收益。",
  `· 你可以往任何一个场景里加指令，包括地点场景：把 name 写成「${PLACES.map((p) => p.name).join("」「")}」之一，那条指令就只在该角色身处那里时出现。`,
  "· 面板上的场合场景也受所在地限制：集市、公会、大学、剑之道场、王都贵族圈、教会、迷宫、暗巷、佣兵营地、书库都只在对应的地方才有。练剑的地方有三处：剑之圣地的「剑之道场」、罗亚町的「罗亚道场」、王都亚尔斯的「王都演武场」，深浅不同。人不在那儿就别写那些地方的事；只有「家中」与「战斗」跟着人走。",
  "· 玩家换地方只能用「迁居」，一次花掉当月全部行动，并且受原作门槛限制。你不要替玩家搬家，也不要许诺他搬得成。",
  "· 这些内容只属于这一份存档，不会写进游戏本体的数据文件。",
  "· 克制使用：不要每个月都添。处境没变就整段省略 scenes。",
].join("\n");

/**
 * 生死与设定的授权说明：这两项是模型最容易被引擎挡住的判断。
 * 关闭「自撰剧情」时，场景与指令这一段整段不出现，模型也就无从添加。
 */
function authorityDoc(inventPlot: boolean): string {
  return [
    "【你有权决定的事】",
    "· 你可以用 fatal 字段判定这个月（或这次行动）就要了这个人的命，并自己写死因。",
    "  但引擎会拿这套规则验一遍，过不了门槛的**不判死**——数值照常落账，只降级成重伤，",
    "  驳回理由会写进纪事。所以写死之前先对照下表，别写一句引擎一定驳回的话。",
    "",
    "  【死亡判定规则】分四类，各有门槛与最低年龄：",
    "  1. 寿终（老死、寿数已尽）：年龄要接近寿命上限，或至少 55 岁以上。寿命由出身、天赋、难度决定，",
    "     大致在 35 到 96 岁之间。年纪轻轻写老死一律驳回。",
    `  2. 病殁（疾病、衰竭、伤重不治）：健康要已经很低（≤25），或本回合大幅下滑（≤-12）。`,
    `     不到 ${ILLNESS_MIN_AGE} 岁因病而死属于夭折，一律驳回。`,
    "  3. 横死（战死、被杀、处决、事故、灾害、魔物）：本回合确实发生过致死的处境——",
    "     你正在战斗中、健康大幅下滑（≤-10）、或健康已经很低（≤15）。凭空写一场横死会驳回。",
    `  4. 超自然（诅咒发作、魔力失控、仪式反噬）：他自己得带着诅咒、侵蚀或咒术一类的东西，`,
    `     否则驳回；且不到 ${ILLNESS_MIN_AGE} 岁不适用。`,
    "",
    `  另有一道 ${ABSOLUTE_MIN_AGE} 岁的绝对下限：再小不会有独立行动，也就没有致死的由头。`,
    "  健康见底时，不到 12 岁的人会被引擎托回一线，只留下病根，不会死。",
    "",
    "  写死因时要说清是什么带走了他：句子里要能看出属于上面哪一类。",
    "  写「他死了」这种说不清的，会被归为无处归类而驳回。",
    "  克制使用：这是最后手段，不是戏剧道具。玩家主动寻死时不要救他，",
    "  但也不要为了起伏随手杀人。原作人物与玩家的寿终由引擎自己判，你不必代劳。",
    "· 你可以用 factions 字段改变各方势力对玩家的态度。玩家救了教团的人、得罪了公会、被大学记名，这些都应该落到势力面板上。",
    "· 你可以用 canon 字段把本回合发明的、需要长期记住的人地事写进存档的设定集，之后每回合都会回传给你，供你保持前后一致。",
    inventPlot ? SCENE_DOC : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/* ---------- 校验 ---------- */

function parseObject(text: string): Record<string, unknown> | null {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function takeStrings(value: unknown, max: number, maxLen: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim().replace(/\s*\n\s*/g, " "))
    .filter(Boolean)
    .slice(0, max)
    .map((v) => (v.length > maxLen ? `${v.slice(0, maxLen)}…` : v));
}

function takeStats(value: unknown, max: EffectLimits): Record<string, number> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const n = clampNumber(v, -max.stat, max.stat, 0);
    if (n !== 0) out[k] = Math.round(n);
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function takeRisk(value: unknown): "低" | "中" | "高" | undefined {
  return value === "低" || value === "中" || value === "高" ? value : undefined;
}

function takeText(value: unknown, maxLen: number): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maxLen) : undefined;
}

function takeTier(value: unknown, max: EffectLimits): EventEffects["tier"] | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as { kind?: unknown; gain?: unknown };
  if (raw.kind !== "magic" && raw.kind !== "sword" && raw.kind !== "adventure") return undefined;
  return { kind: raw.kind, gain: clampNumber(raw.gain, 0, max.tier, 0) };
}

function takeStarDelta(value: unknown, max: EffectLimits): EventEffects["starDelta"] | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as { match?: unknown; delta?: unknown; note?: unknown };
  const delta = clampNumber(raw.delta, -max.star, max.star, 0);
  if (delta === 0) return undefined;
  return {
    match: typeof raw.match === "string" ? raw.match.trim().slice(0, 12) : "",
    delta: Math.round(delta),
    note: takeText(raw.note, 60),
  };
}

function takeRelation(value: unknown): EventEffects["addRelation"] | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as { name?: unknown; role?: unknown; stars?: unknown; note?: unknown; secret?: unknown };
  const name = takeText(raw.name, 12);
  if (!name) return undefined;
  return {
    name,
    role: takeText(raw.role, 12) ?? "相识",
    stars: clampNumber(raw.stars, 1, 5, 2),
    note: takeText(raw.note, 60) ?? "",
    secret: takeText(raw.secret, 60),
  };
}

function takeThreads(value: unknown): EventEffects["threads"] | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as { humanGod?: unknown; dragonGod?: unknown };
  const humanGod = takeText(raw.humanGod, 60);
  const dragonGod = takeText(raw.dragonGod, 60);
  if (!humanGod && !dragonGod) return undefined;
  return { humanGod, dragonGod };
}

function takeFactions(value: unknown, max: EffectLimits): EventEffects["factions"] | undefined {
  if (!value || typeof value !== "object") return undefined;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const delta = clampNumber(v, -max.stat, max.stat, 0);
    if (delta !== 0) out[k] = Math.round(delta);
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** 效果集合的统一读取：行动、抉择事件的选项与世界动态共用同一套字段，上限按通道传入 */
function takeEffects(raw: Record<string, unknown>, max: EffectLimits): EventEffects | undefined {
  const effects: EventEffects = {};
  const stats = takeStats(raw.stats, max);
  if (stats) effects.stats = stats;
  const tier = takeTier(raw.tier, max);
  if (tier) effects.tier = tier;
  const starDelta = takeStarDelta(raw.starDelta, max);
  if (starDelta) effects.starDelta = starDelta;
  const addRelation = takeRelation(raw.addRelation);
  if (addRelation) effects.addRelation = addRelation;
  const goal = clampNumber(raw.goal, -max.goal, max.goal, 0);
  if (goal !== 0) effects.goal = Math.round(goal);
  const lifespan = clampNumber(raw.lifespan, -max.lifespan, max.lifespan, 0);
  if (lifespan !== 0) effects.lifespan = Math.round(lifespan);
  const energy = clampNumber(raw.energy, -max.energy, max.energy, 0);
  if (energy !== 0) effects.energy = Math.round(energy);
  const notice = takeText(raw.notice, 60);
  if (notice) effects.notice = notice;
  const rumor = takeText(raw.rumor, 60);
  if (rumor) effects.rumor = rumor;
  const threads = takeThreads(raw.threads);
  if (threads) effects.threads = threads;
  const factions = takeFactions(raw.factions, max);
  if (factions) effects.factions = factions;
  // 只接受技能表里真实存在的 id，模型编出来的招式名不会落进存档
  const learnSkill = takeText(raw.learnSkill, 40);
  if (learnSkill && skillById(learnSkill)) effects.learnSkill = learnSkill;
  return Object.keys(effects).length > 0 ? effects : undefined;
}

function takeEvent(value: unknown): PendingEvent | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as { title?: unknown; body?: unknown; options?: unknown };
  const title = typeof raw.title === "string" ? raw.title.trim().slice(0, 40) : "";
  const body = takeStrings(raw.body, 4, 120);
  if (!title || body.length === 0 || !Array.isArray(raw.options)) return null;

  const options: DecisionOption[] = [];
  const candidates = raw.options.slice(0, 4);
  for (let i = 0; i < candidates.length; i += 1) {
    const opt = (candidates[i] ?? {}) as Record<string, unknown>;
    const label = typeof opt.label === "string" ? opt.label.trim().slice(0, 24) : "";
    if (!label) continue;
    options.push({
      id: `ai-${i}`,
      label,
      detail: takeText(opt.detail, 40),
      risk: takeRisk(opt.risk),
      lines: takeStrings(opt.lines, 4, 140),
      outcome: takeEffects(opt, EVENT_LIMITS),
    });
  }

  if (options.length < 2) return null;
  return { id: `ai-${hashText(title)}-${options.length}`, title, body, options };
}

function hashText(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function takeSelfCheck(value: unknown): { snapshot: string[]; ooc: string[] } | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as { snapshot?: unknown; ooc?: unknown };
  const snapshot = takeStrings(raw.snapshot, 6, 160);
  const ooc = takeStrings(raw.ooc, 4, 160);
  if (snapshot.length === 0 && ooc.length === 0) return undefined;
  return { snapshot, ooc };
}

/** 自撰设定：每回合最多 4 条，每条 80 字内 */
function takeCanon(value: unknown): string[] | undefined {
  const items = takeStrings(value, 4, 80);
  return items.length > 0 ? items : undefined;
}

/**
 * 剧情自己长出来的场景与指令：每回合最多两份改动、每份最多三条指令。
 * 名字对上已有场景就追加指令，对不上就新开一个场景。
 */
function takeScenes(value: unknown): ScenePatch[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const patches: ScenePatch[] = [];
  for (const raw of value.slice(0, 2)) {
    if (!raw || typeof raw !== "object") continue;
    const patch = raw as { name?: unknown; desc?: unknown; commands?: unknown };
    const name = takeText(patch.name, 12);
    if (!name || !Array.isArray(patch.commands)) continue;
    const commands: CustomCommand[] = [];
    for (const rawCommand of patch.commands.slice(0, 3)) {
      if (!rawCommand || typeof rawCommand !== "object") continue;
      const c = rawCommand as Record<string, unknown>;
      const label = takeText(c.label, 24);
      const lines = takeStrings(c.lines, 3, 140);
      if (!label || lines.length === 0) continue;
      const category: CommandCategory = CATEGORY_ORDER.find((x) => x === c.category) ?? "探索";
      commands.push({
        id: `cx-${hashText(label)}`,
        label,
        category,
        cost: Math.round(clampNumber(c.cost, -30, LIMITS.actionCost, 12)),
        hint: takeText(c.hint, 60) ?? "你在这个处境里能做的一件事。",
        lines,
        effects: takeEffects(c, LIMITS) ?? {},
      });
    }
    if (commands.length === 0) continue;
    patches.push({ name, desc: takeText(patch.desc, 80), commands });
  }
  return patches.length > 0 ? patches : undefined;
}

function validateWorldTurn(raw: Record<string, unknown>): AiWorldTurn | null {
  const lines = takeStrings(raw.lines, 8, 160);
  if (lines.length === 0) return null;
  const lifespan = clampNumber(raw.lifespan, -LIMITS.lifespan, LIMITS.lifespan, 0);
  return {
    lines,
    rumor: takeText(raw.rumor, 120),
    notice: takeText(raw.notice, 80),
    stats: takeStats(raw.stats, LIMITS),
    lifespan: lifespan !== 0 ? Math.round(lifespan) : undefined,
    factions: takeFactions(raw.factions, LIMITS),
    event: takeEvent(raw.event),
    selfCheck: takeSelfCheck(raw.selfCheck),
    fatal: takeText(raw.fatal, 120),
    canon: takeCanon(raw.canon),
    scenes: takeScenes(raw.scenes),
  };
}

function validateAction(raw: Record<string, unknown>): AiActionOutcome | null {
  const lines = takeStrings(raw.lines, 6, 160);
  if (lines.length === 0) return null;
  const energyCost = clampNumber(raw.energyCost, 0, LIMITS.actionCost, -1);
  return {
    lines,
    matched: typeof raw.matched === "boolean" ? raw.matched : true,
    energyCost: energyCost >= 0 ? Math.round(energyCost) : undefined,
    fatal: takeText(raw.fatal, 120),
    canon: takeCanon(raw.canon),
    scenes: takeScenes(raw.scenes),
    ...takeEffects(raw, LIMITS),
  };
}

/* ---------- 对外接口 ---------- */

/** 一次推演的结果：error 非空表示调用失败，调用方应回退到本地引擎 */
export interface AiCallResult<T> {
  data: T | null;
  error: string | null;
  /** 额度已耗尽，这次刻意没有发起调用 */
  exhausted?: boolean;
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function askMessages<T>(
  config: AiConfig,
  messages: ChatMessage[],
  validate: (raw: Record<string, unknown>) => T | null,
): Promise<AiCallResult<T>> {
  if (!isAiReady(config, loadBudget())) {
    // 区分「没开」「没配好」与「额度/余额不足」，只有最后一种需要提示玩家
    const exhausted = config.enabled && Boolean(config.model.trim());
    return { data: null, error: null, exhausted };
  }
  try {
    const content = await postChat(config, messages, true);
    const raw = parseObject(content);
    if (!raw) return { data: null, error: "模型返回的内容无法解析为 JSON" };
    const data = validate(raw);
    if (!data) return { data: null, error: "模型返回的字段不完整，已忽略" };
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : String(err) };
  }
}

function ask<T>(config: AiConfig, user: string, validate: (raw: Record<string, unknown>) => T | null): Promise<AiCallResult<T>> {
  return askMessages(
    config,
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: user },
    ],
    validate,
  );
}

const WORLD_TASK_HEAD = [
  "【任务】推演接下来这一个月六面世界的动态，并判断本月是否需要一个由玩家抉择的事件。",
  "「lines」写 3-6 条世界动态，可带【势力】前缀（如【阿斯拉王国】【魔大陆】），只写世界本身发生了什么，不要写玩家的行动结果。",
  "世界动态以安静为底色：物价、天气、谁家的酒席、公会的委托价钱、教团的一次布告，都是好素材；真出了大事也用一到两句带过，不渲染、不评价、不预告。",
  "每条一到两句，按上面【文风】那几条写，不要写成新闻播报。",
  "「rumor」写一句市井传闻：具体、有细节、可信度存疑。可以半真半假，可以完全是假的，也可以是有人故意放出来的。",
  "「event」：只有当这个月的处境确实把玩家推到了某个岔路口时才给出，否则给 null。若给出事件，engine 会保证两次事件之间至少间隔若干回合，所以你不需要考虑频率，只考虑「现在是不是真的该有岔路」。",
  "事件必须与角色的处境、时代、既有关系或本月世界动态有因果关系，选项的代价要真实：选了好处就要承担对应的风险或损失。",
  "「selfCheck」：仅当本轮是第 15 的倍数时才提供，用你自己的话写剧情快照与 OOC 自检；其余月份省略。",
  "【输出格式】严格输出这个 JSON：",
  "{",
  '  "lines": ["世界动态"],',
  '  "rumor": "一句传闻",',
  '  "notice": "可选：写入系统记录的一句提示，不需要就省略",',
  '  "stats": { "health": -2 },',
  '  "event": null',
  "}",
  "其中 stats 可选，用于表达世界本身落在角色身上的影响（疫病、灾害、时局红利、物价）。这是常规额度，只有这个月本身极不寻常时才接近上限；真正改变人生的剧变留给抉择事件。",
  "「fatal」「canon」「factions」「scenes」按下方的授权说明使用。",
  "若给出事件，event 用这个结构（2-3 个选项）：",
  EVENT_SCHEMA,
  "事件选项可用的效果字段（注意：事件的额度是常规的三倍，是留给罕见时刻的）：",
  effectsDoc(EVENT_LIMITS, true),
];

function worldTask(inventPlot: boolean): string {
  return [...WORLD_TASK_HEAD, "", authorityDoc(inventPlot)].join("\n");
}

export function requestWorldTurn(config: AiConfig, state: GameState): Promise<AiCallResult<AiWorldTurn>> {
  const user = [
    "【角色】",
    characterBrief(state),
    "",
    "【当前属性】",
    statsBrief(state),
    "",
    "【势力态度】",
    factionsBrief(state),
    "",
    "【重要关系】",
    relationsBrief(state),
    "",
    "【最近经历】",
    recentBrief(state),
    "",
    "【本轮线索】",
    `人神：${state.threads.humanGod}`,
    `龙神：${state.threads.dragonGod}`,
    "",
    `【节奏参考】第 ${state.turn} 回合，上次抉择事件发生于第 ${state.lastEventTurn < 0 ? "尚未发生" : `${state.lastEventTurn} 回合`}。`,
    "",
    ...canonBrief(state, config.inventPlot),
    "",
    worldTask(config.inventPlot),
  ].join("\n");
  return ask(config, user, validateWorldTurn);
}

export function requestActionOutcome(config: AiConfig, state: GameState, action: string): Promise<AiCallResult<AiActionOutcome>> {
  const user = [
    "【角色】",
    characterBrief(state),
    "",
    "【当前属性】",
    statsBrief(state),
    "",
    "【势力态度】",
    factionsBrief(state),
    "",
    "【重要关系】",
    relationsBrief(state),
    "",
    "【最近经历】",
    recentBrief(state),
    "",
    `【玩家本月行动】${action}`,
    "",
    `【本月边界】已用行动 ${state.actionsUsed} 次，剩余精力 ${Math.round(state.energy)}。行动次数由引擎控制，你只需判断这次行动本身要花多少精力。`,
    "",
    ...canonBrief(state, config.inventPlot),
    "",
    "【任务】依据角色的能力、出身、时代与处境的真实逻辑，判定这次行动产生了什么后果，并据实结算。",
    "「lines」写 2-4 句，按上面【文风】那几条写：不要写成「你获得了一些经验」这种游戏播报，要写成确实发生过的事——谁在场、你做了什么、结果落在哪里。",
    "自由发挥空间很大：玩家想做的事可能远超能力，也可能小得不值一提，你要按世界的逻辑给出真实结果，而不是套用一套通用收益。",
    "玩家写得很笼统时（例如「修炼」），不要给通用奖励，而要决定他具体做了什么、遇到了谁、卡在哪里；玩家写得很具体时（例如「去找铁匠打一把短刀」），就按那个具体的事结算。",
    "行动与身份严重不符、或能力明显不足时，要如实写出失败或反效果，收益给 0 甚至给负数。",
    "玩家此刻做的事即便很激烈，结算额度也是常规档；真正改变人生的大转折属于抉择事件，不由普通行动承担。",
    "只奖励与行动直接相关的属性，不要凭空送上与行动无关的好处。",
    `「energyCost」写这次行动消耗的精力，0-${LIMITS.actionCost}：躺着发呆为 0，走一趟集市约 8，全天苦练约 20，长途跋涉或搏命用上限。省略则由引擎按默认值处理。`,
    "【输出格式】严格输出这个 JSON：",
    "{",
    '  "lines": ["2-4 句叙述，写完这次行动的过程与结果"],',
    '  "matched": true,',
    '  "energyCost": 12,',
    '  "stats": { "sword": 3 },',
    '  "tier": { "kind": "sword", "gain": 12 },',
    '  "goal": 2,',
    '  "addRelation": { "name": "铁匠的女儿", "role": "相识", "stars": 2, "note": "她替你磨了刀口" },',
    '  "notice": "你成了铁匠铺的常客。",',
    '  "rumor": "镇上有人说你最近总往铁匠铺跑。"',
  "}",
    "可选效果字段（常规额度，见下方的幅度纪律）：",
    effectsDoc(LIMITS, false),
    "",
    authorityDoc(config.inventPlot),
    "不要输出 Markdown，不要写括号说明或旁白。",
  ].join("\n");
  return ask(config, user, validateAction);
}

/** 一生梗概：给终章用的长时间线，条目多时只保留标题与首句，控制提示词长度 */
function lifeBrief(s: GameState): string {
  const entries = s.log.slice(0, 60).reverse();
  if (entries.length === 0) return "（尚无经历）";
  const body = entries
    .map((e) => `- ${e.year} 年 ${e.month} 月 · ${e.title}：${e.lines[0] ?? ""}`)
    .join("\n");
  const tail = s.log.length > 60 ? `\n（更早的 ${s.log.length - 60} 条已省略）` : "";
  const c = s.character;
  return `${body}${tail}\n\n【终局状态】魔术 ${c.magicTier}　剑术 ${c.swordTier}（${c.swordSchool}）　冒险者 ${c.adventurerRank}　人生目标进度 ${Math.round(s.goalProgress)}%　成就 ${s.achievements.length} 项`;
}

function validateEpilogue(raw: Record<string, unknown>): string[] | null {
  const epilogue = takeStrings(raw.epilogue, 6, 220);
  return epilogue.length > 0 ? epilogue : null;
}

export function requestEpilogue(config: AiConfig, state: GameState): Promise<AiCallResult<string[]>> {
  const user = [
    "【角色】",
    characterBrief(state),
    "",
    "【重要关系】",
    relationsBrief(state),
    "",
    "【一生纪事（由近到远）】",
    lifeBrief(state),
    "",
    "【结局】",
    state.deathCause ?? "寿数已尽。",
    state.ending?.kind ? `【死亡判定】${state.ending.kind} —— ${state.ending.basis ?? ""}` : "",
    state.ending?.kind
      ? "这段人生是怎么结束的，已经由引擎按规则判定了（见上）。你的终章要与它一致，不要另写一种死法。"
      : "",
    "",
    "【任务】为这段人生写终章。这是玩家在这个世界里留下的全部痕迹，写它的时候要有判断，不要安慰人。",
    "写 4-6 段。写他真正做成了什么、没做成什么，写他身边的人最后怎样了，写世界如何很快把他抹平。",
    "按上面【文风】写：不写总结式的评价，写具体的事、具体的人、具体的物件；辛酸与不甘都落在动作和细节上，不要抒情。",
    "可以点到具体的人名、地名、旧事，但不要编造纪事里没有发生过的事情。",
    '【输出格式】严格输出这个 JSON：{"epilogue": ["第一段", "第二段"]}',
  ].join("\n");
  return ask(config, user, validateEpilogue);
}

/* ---------- 与角色对话 ---------- */

const TALK_SYSTEM_PROMPT = [
  "你在《无职转生》六面世界里扮演一个具体的 NPC，和玩家饰演的角色说话。",
  canonRosterBrief(),
  "扮演要求：",
  "1. 只扮演这一个 NPC。不要替玩家说话、不要描写玩家的动作或心理、不要推进旁白。",
  "2. 语气、用词、见识必须符合这个人的身份、年龄、信仰与时代。平民不会谈论宫廷政治，商人先问价钱，贵族用敬语和迂回的说法，神职人员会说教，冒险者说话直接，斯佩路德族句子短而不加修饰。",
  "3. 话要短，像真人接话，一两句就够，允许只回两个字。长篇大论不像活人说话。",
  "4. 允许沉默、反问、答非所问、转移话题、拒绝回答。真人不会有问必答。",
  "5. 对方可以有自己的立场与不满。玩家说了蠢话或冒犯的话，就该被顶回来。",
  "6. 秘密只在真正被逼到墙角、或关系足够深时才透露，而且往往只透露一半。",
  "7. 态度和情绪从措辞里透出来，不要用旁白去解释自己此刻的心情。",
  "8. 不要输出 Markdown，不要写括号旁白，不要加引号包裹整段话。",
  "9. 只输出 JSON。",
].join("\n");

const TALK_LINES_LIMIT = 24;

export interface AiTalkReply {
  reply: string;
  /** 一句话神态或语气，供界面显示 */
  mood?: string;
}

export interface AiTalkSettlement {
  title: string;
  lines: string[];
  /** 这段交谈产生的现实影响；闲聊时为空 */
  effects: EventEffects | null;
  rumor?: string;
  /** 这个人从此记住的一段话，写进他的长期记忆 */
  memory?: string;
  /** 这次交谈里出现的关键事实，逐条累积进长期记忆 */
  facts: string[];
}

/** 对话记录由界面持有，这里只负责把它排成可读的文本 */
function transcript(history: { who: "player" | "npc"; text: string }[]): string {
  if (history.length === 0) return "（还没有说过话）";
  return history
    .slice(-TALK_LINES_LIMIT)
    .map((h) => `${h.who === "player" ? "玩家" : "对方"}：${h.text}`)
    .join("\n");
}

function relationBrief(state: GameState, name: string): string {
  const r = state.relations.find((x) => x.name === name);
  if (!r) return `（关系面板里没有叫「${name}」的人）`;
  return [
    `姓名：${r.name}　身份：${r.role}　关系性质：${r.bond ?? "熟人"}　好感：${r.stars}/5${r.metAt ? `　结识场合：${r.metAt}` : ""}`,
    `你对他的了解：${r.note}`,
    r.lore ? `原作考据（必须与之相符，但不要直接背诵）：${r.lore}` : "",
    r.ties?.length ? `他在原作里与其他人的关系：${tieText(r.ties)}` : "",
    r.family
      ? r.family.kind === "子女"
        ? `他是玩家的孩子，${childAge(r, state.year)} 岁（${childStage(childAge(r, state.year) ?? 0)}）。孩子对父母的态度跟外人不一样，说话不绕弯子。`
        : `他是玩家的${r.family.kind}。`
      : "",
    r.secret ? `尚未公开的一面：${r.secret}（不要主动说出来，除非情势真的到了那一步）` : "尚未公开的一面：暂无",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * 这个人记得的关于你的事。第一次见面时是空的，
 * 之后每次交谈结束都会由模型写下一段摘要与若干条事实，跨存档累积。
 * 这是「他记得你」的唯一来源：没有它，每次对话都等于初次见面。
 */
function memoryBrief(state: GameState, name: string): string {
  const r = state.relations.find((x) => x.name === name);
  const m = r?.memory;
  if (!m || (m.talks === 0 && !m.summary && m.facts.length === 0)) {
    return "你们还没有单独谈过话。他对你的印象只来自传闻，以及别人怎么说起你。";
  }
  return [
    `你们单独谈过 ${m.talks} 次，上一次是${elapsedText(state, m.lastTurn)}。`,
    m.summary ? `上次的经过：${m.summary}` : "",
    m.facts.length > 0 ? `他记住的具体的事：\n${m.facts.map((f) => `- ${f}`).join("\n")}` : "",
    "这些是他对你的认知基础。该提起的时候自然提起，但不要每次都把旧账复述一遍。",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * 这一段人生到目前为止的剧情状态。
 * 角色得活在这个剧情里，而不是只知道自己的设定——
 * 玩家做过什么、现在被人神和龙神盯到什么程度，都会改变这个人怎么跟他说话。
 */
function plotBrief(s: GameState): string {
  const c = s.character;
  const factions = s.factions
    .filter((f) => f.value !== 0)
    .map((f) => `${f.name} ${f.value > 0 ? "+" : ""}${f.value}`);
  const spouse = spouseOf(s);
  const kids = childrenOf(s);
  const family = [
    spouse ? `配偶：${spouse.name}` : "",
    kids.length > 0
      ? `孩子：${kids.map((k) => `${k.name}（${childAge(k, s.year)} 岁，${childStage(childAge(k, s.year) ?? 0)}）`).join("、")}`
      : "",
  ]
    .filter(Boolean)
    .join("　");
  return [
    // 这一局玩家是谁，决定模型怎么理解后面所有信息
    c.name === RUDEUS_NAME ? RUDEUS_BANNER : "",
    `时间：${formatDate(s.year, s.month)}（${c.era}）　玩家此刻在：${c.residence}`,
    `玩家：${c.name}，${c.age} 岁，${c.origin}，${c.status}，信仰 ${c.faith}`,
    `玩家挂在心上的事：${c.goal}　情感倾向：${c.emotion}${c.traits.length ? `　性格：${c.traits.join("、")}` : ""}`,
    `他身上的本事：魔术 ${c.magicTier}／剑术 ${c.swordTier}${c.swordSchool !== "无" ? `（${c.swordSchool}）` : ""}／冒险者 ${c.adventurerRank}`,
    family ? `他的家：${family}` : "",
    factions.length > 0 ? `各方势力目前对他的态度：${factions.join("　")}` : "",
    `两条主线：人神这边 —— ${s.threads.humanGod}；龙神这边 —— ${s.threads.dragonGod}`,
    s.canon.length > 0
      ? `这段人生里已经确立的设定（当作事实，不要说成传闻）：\n${s.canon.slice(-6).map((x) => `- ${x}`).join("\n")}`
      : "",
    "如果这个人按他的身份根本不可能知道上面某件事，就让他不知道。",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * 对话类请求共用的背景块：这一段人生的剧情、这个角色是谁、
 * 他记得你什么、你此刻的处境、最近发生了什么。
 *
 * 两个对话请求（回话与结算）都用它，口径才不会各写一套；
 * 角色的扮演依据也因此只有一个来源。
 */
export function talkContext(state: GameState, relationName: string): string {
  return [
    "【这一段人生到目前为止的剧情】",
    plotBrief(state),
    "",
    "【你扮演的这个角色是谁】",
    relationBrief(state, relationName),
    "",
    "【他记得的关于你的事】",
    memoryBrief(state, relationName),
    "",
    "【他面对的这个人此刻的处境】",
    sceneBrief(state),
    "",
    "【最近发生过的事】",
    recentBrief(state),
  ].join("\n");
}

/** 当前处境：时间、地点、状态，供 NPC 知道自己在对谁说话 */
function sceneBrief(state: GameState): string {
  const c = state.character;
  return `${c.name}（${c.age} 岁，${c.gender}，${c.status}）　所在：${c.residence}　信仰：${c.faith}　声望：${
    state.stats.find((s) => s.key === "fame")?.value ?? 0
  }`;
}

function validateTalk(raw: Record<string, unknown>): AiTalkReply | null {
  const reply = takeText(raw.reply, 400);
  if (!reply) return null;
  return { reply, mood: takeText(raw.mood, 40) };
}

function validateTalkSettlement(raw: Record<string, unknown>): AiTalkSettlement | null {
  const title = takeText(raw.title, 24);
  const lines = takeStrings(raw.lines, 4, 160);
  // 提示词要求把效果放进 effects 对象；同时容忍模型把字段直接平铺在顶层
  const nested =
    raw.effects && typeof raw.effects === "object"
      ? takeEffects(raw.effects as Record<string, unknown>, LIMITS)
      : undefined;
  const effects = nested ?? takeEffects(raw, LIMITS) ?? null;
  const memory = takeText(raw.memory, MEMORY_SUMMARY_LIMIT);
  const facts = takeStrings(raw.facts, 2, MEMORY_FACT_CHAR_LIMIT);
  if (!title && lines.length === 0 && !effects && !memory && facts.length === 0) return null;
  return { title: title ?? "一次交谈", lines, effects, rumor: takeText(raw.rumor, 120), memory, facts };
}

/**
 * 让 NPC 回一句话。历史记录由界面维护，每次把完整对话回传，模型才能接得上。
 */
export function requestTalk(
  config: AiConfig,
  state: GameState,
  relationName: string,
  history: { who: "player" | "npc"; text: string }[],
  playerLine: string,
): Promise<AiCallResult<AiTalkReply>> {
  const user = [
    talkContext(state, relationName),
    "",
    "【这次见面的对话】",
    transcript(history),
    "",
    `【对方刚说的这一句】${playerLine}`,
    "",
    history.length > 0 && history[0].who === "npc"
      ? "【注意】这一段是对方先开的口：你是主动来找玩家的那一方，态度要跟你开的那句接得上。"
      : "",
    "【任务】以你扮演的这个人的身份，回应玩家这一句。写 1-3 句，要像真人说话，不要像旁白。",
    "他记得的事、他所在的位置、他这条命里正在发生的事，都该影响他怎么回话；但身份不该知道的事，就让他不知道。",
    '【输出格式】严格输出这个 JSON：{"reply": "你要说的话", "mood": "一句话神态或语气"}',
  ]
    .filter(Boolean)
    .join("\n");
  return askMessages(
    config,
    [
      { role: "system", content: TALK_SYSTEM_PROMPT },
      { role: "user", content: user },
    ],
    validateTalk,
  );
}

/**
 * 对话结束后，由模型判断这段交谈在现实里留下了什么。
 * 闲聊应当什么都不改变；只有真的产生了影响才给数值，且额度按常规行动档。
 */
export function requestTalkSettlement(
  config: AiConfig,
  state: GameState,
  relationName: string,
  history: { who: "player" | "npc"; text: string }[],
): Promise<AiCallResult<AiTalkSettlement>> {
  const user = [
    talkContext(state, relationName),
    "",
    "【这次见面从头到尾的对话】",
    transcript(history),
    "",
    "【任务】判断这段交谈在现实里留下了什么，并写下这个人从此会记住的东西。",
    "effects 只记录真的发生的事：多数闲聊什么都不改变，那就让 effects 为空对象。",
    "说了伤人的话就掉好感，谈成了事就有收益，被追问出秘密就该有后果。",
    "starDelta 用 {\"match\":\"姓名的一部分\",\"delta\":1,\"note\":\"关系变化的原因\"} 表达好感变动。",
    "title 写这段对话的要点，12 字以内，会作为纪事标题。lines 写 1-2 句结算叙述，按上面【文风】写，不要写成系统日志。",
    `memory 用这个人的视角写一句他会记住的事，${MEMORY_SUMMARY_LIMIT} 字以内：他因此知道了什么、怎么看你。不要复述整段对话。`,
    `facts 写 0-2 条他从此记住的具体事实，每条 ${MEMORY_FACT_CHAR_LIMIT} 字以内：约定、承诺、把柄、心结、你透露过的事。没有就给空数组。`,
    "memory 与 facts 会长期保存，下次见面时他自己会读到；所以写的是「他记得什么」，不是「这段对话讲了什么」。",
    "可选效果字段（常规额度）：",
    effectsDoc(LIMITS, false),
    '【输出格式】严格输出这个 JSON：{"title": "要点", "lines": ["结算叙述"], "effects": {}, "rumor": "可选：一条会被传出去的传闻", "memory": "他记住的一句话", "facts": ["他记住的具体事实"]}',
  ].join("\n");
  return askMessages(
    config,
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: user },
    ],
    validateTalkSettlement,
  );
}

/** 连通性自检：发一次最小请求，确认密钥、模型与返回格式都能用 */
export async function testConnection(config: AiConfig): Promise<{ ok: boolean; message: string }> {
  if (!config.apiKey.trim()) return { ok: false, message: "请先填写 DeepSeek 的 API Key。" };
  if (!config.model.trim()) return { ok: false, message: "请先选择模型。" };
  try {
    const content = await postChat(
      { ...config, enabled: true, timeoutMs: Math.min(config.timeoutMs, 30000) },
      [
        { role: "system", content: "你是一个测试端点，只输出 JSON。" },
        { role: "user", content: '请输出 {"ok": true} 这个 JSON，不要任何其它内容。' },
      ],
      true,
    );
    return { ok: true, message: `连接成功，模型返回：${content.trim().slice(0, 80)}` };
  } catch (err) {
    return { ok: false, message: `连接失败：${err instanceof Error ? err.message : String(err)}` };
  }
}