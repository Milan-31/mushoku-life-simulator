import type { GameState, SaveSlot } from "../types";
import { formatDate, normalizeState } from "./world";

/** 固定槽位：一个自动存档 + 三个手动槽位 */
export const SLOT_IDS = ["auto", "1", "2", "3"] as const;
export type SlotId = (typeof SLOT_IDS)[number];

export const SLOT_LABELS: Record<string, string> = {
  auto: "自动存档",
  "1": "存档一",
  "2": "存档二",
  "3": "存档三",
};

const PREFIX = "mushoku-life-simulator:slot:";

function slotKey(id: string): string {
  return `${PREFIX}${id}`;
}

function summarize(id: string, savedAt: string, state: GameState): SaveSlot {
  return {
    id,
    savedAt,
    name: state.character.name,
    era: state.character.era,
    dateText: formatDate(state.year, state.month),
    turn: state.turn,
    age: state.character.age,
    achievementCount: state.achievements.length,
    deceased: state.deceased,
    state,
  };
}

export function writeSlot(id: string, state: GameState): SaveSlot {
  const savedAt = new Date().toISOString();
  try {
    localStorage.setItem(slotKey(id), JSON.stringify({ version: 1, savedAt, state }));
  } catch {
    /* 忽略存储异常 */
  }
  return summarize(id, savedAt, state);
}

export function readSlot(id: string): SaveSlot | null {
  try {
    const raw = localStorage.getItem(slotKey(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt?: string; state?: GameState };
    if (!parsed?.state?.character?.name) return null;
    return summarize(id, parsed.savedAt ?? new Date().toISOString(), normalizeState(parsed.state));
  } catch {
    return null;
  }
}

export function listSlots(): (SaveSlot | null)[] {
  return SLOT_IDS.map((id) => readSlot(id));
}

export function deleteSlot(id: string): void {
  try {
    localStorage.removeItem(slotKey(id));
  } catch {
    /* 忽略存储异常 */
  }
}

/** 最近写入的存档（含自动存档） */
export function latestSlot(): SaveSlot | null {
  const slots = listSlots().filter((s): s is SaveSlot => Boolean(s));
  if (slots.length === 0) return null;
  return slots.sort((a, b) => b.savedAt.localeCompare(a.savedAt))[0];
}

/** 最近写入的手动存档（不含自动存档）。用于「继续」优先恢复玩家主动留档的人生 */
export function latestManualSlot(): SaveSlot | null {
  const slots = listSlots()
    .filter((s): s is SaveSlot => Boolean(s))
    .filter((s) => s.id !== "auto");
  if (slots.length === 0) return null;
  return slots.sort((a, b) => b.savedAt.localeCompare(a.savedAt))[0];
}

/** 续玩时使用的存档：优先最近的手动存档，没有则回退到自动存档 */
export function resumeSlot(): SaveSlot | null {
  return latestManualSlot() ?? latestSlot();
}

export function hasManualSlot(): boolean {
  return latestManualSlot() !== null;
}

export function hasAnySlot(): boolean {
  return latestSlot() !== null;
}