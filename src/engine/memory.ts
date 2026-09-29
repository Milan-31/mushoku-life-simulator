import type { GameState, Relation, RelationMemory } from "../types";

/**
 * 角色长期记忆。
 *
 * 存档里每个角色都带一份「他记得的关于你的事」。它有三个作用：
 * - 让再次见面接得上上次：模型每次都会读到这份记忆，而不是从零开始。
 * - 让记忆有上限：summary 只留最近一次，facts 只留最近若干条，
 *   存档不会因为聊得多而无限膨胀。
 * - 让数值变化也留下痕迹：好感升降的原因会作为一条事实存进去，
 *   而不是覆盖掉这个人本来是什么样的人。
 *
 * 只有真的面对面谈过、或发生过值得记住的事，记忆才会被创建。
 * 泛泛之交不会有空壳记忆。
 */

/** facts 最多留这么多条，超出时丢掉最早的 */
export const MEMORY_FACT_LIMIT = 8;

/** summary 的字符上限 */
export const MEMORY_SUMMARY_LIMIT = 160;

/** 单条 fact 的字符上限 */
export const MEMORY_FACT_CHAR_LIMIT = 60;

function clampText(text: string, limit: number): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  return trimmed.length > limit ? `${trimmed.slice(0, limit - 1)}…` : trimmed;
}

export function emptyMemory(): RelationMemory {
  return { talks: 0, summary: "", facts: [] };
}

/** 取记忆；没有就现造一份空的（不写回关系） */
export function memoryOf(rel: Relation): RelationMemory {
  return rel.memory ?? emptyMemory();
}

/** 追加若干条事实，去重并只保留最近的若干条 */
export function appendFacts(memory: RelationMemory, facts: string[]): string[] {
  const cleaned = facts.map((f) => clampText(f, MEMORY_FACT_CHAR_LIMIT)).filter(Boolean);
  if (cleaned.length === 0) return memory.facts;
  const merged = [...memory.facts];
  for (const fact of cleaned) {
    if (merged.includes(fact)) continue;
    merged.push(fact);
  }
  return merged.slice(-MEMORY_FACT_LIMIT);
}

/**
 * 一次交谈结束后更新记忆。
 * 即使模型没给 summary（AI 不可用、或只说了两句废话），
 * 次数与时间也照记——「你们见过几次」本身就是记忆的一部分。
 */
export function rememberTalk(
  memory: RelationMemory,
  turn: number,
  summary?: string,
  facts: string[] = [],
): RelationMemory {
  const text = summary?.trim() ? clampText(summary, MEMORY_SUMMARY_LIMIT) : memory.summary;
  return {
    talks: memory.talks + 1,
    lastTurn: turn,
    summary: text,
    facts: appendFacts(memory, facts),
  };
}

/** 记一条不是出自对话的事：好感变化的原因、约定、被托付的东西 */
export function rememberEvent(memory: RelationMemory, fact: string): RelationMemory {
  return { ...memory, facts: appendFacts(memory, [fact]) };
}

/** 把记忆挂回关系条目上，返回新的关系数组 */
export function withMemory(relations: Relation[], name: string, memory: RelationMemory): Relation[] {
  return relations.map((r) => (r.name === name ? { ...r, memory } : r));
}

/** 两个回合之间隔了多久，写成「三个月前」这种说法 */
export function elapsedText(state: GameState, turn?: number): string {
  if (turn === undefined) return "还没有单独说过话";
  const months = Math.max(0, state.turn - turn);
  if (months === 0) return "就是这个月的事";
  if (months < 12) return `${months} 个月前`;
  return `${Math.floor(months / 12)} 年前`;
}

/** 记忆的摘要行，给关系面板显示用 */
export function memoryLine(state: GameState, rel: Relation): string | null {
  const m = rel.memory;
  if (!m || (m.talks === 0 && m.facts.length === 0 && !m.summary)) return null;
  const parts: string[] = [];
  if (m.talks > 0) parts.push(`谈过 ${m.talks} 次`);
  if (m.lastTurn !== undefined) parts.push(`上次是${elapsedText(state, m.lastTurn)}`);
  return parts.join(" · ");
}

/**
 * 记忆可能来自存档或模型，形状不可信。
 * 这里补齐字段、夹到上限，空记忆直接丢掉，避免留下没有内容的壳。
 */
export function sanitizeMemory(raw: unknown): RelationMemory | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const m = raw as Partial<RelationMemory>;
  const summary = typeof m.summary === "string" ? clampText(m.summary, MEMORY_SUMMARY_LIMIT) : "";
  const facts = Array.isArray(m.facts)
    ? appendFacts(emptyMemory(), m.facts.filter((f): f is string => typeof f === "string"))
    : [];
  const talks =
    typeof m.talks === "number" && Number.isFinite(m.talks) ? Math.max(0, Math.round(m.talks)) : 0;
  const lastTurn =
    typeof m.lastTurn === "number" && Number.isFinite(m.lastTurn) ? Math.max(0, Math.round(m.lastTurn)) : undefined;
  if (talks === 0 && !summary && facts.length === 0 && lastTurn === undefined) return undefined;
  return { talks, lastTurn, summary, facts };
}
