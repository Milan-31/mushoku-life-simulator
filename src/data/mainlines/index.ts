import type { Character } from "../../types";
import type { MainlineDef, MainlineEventDef } from "./types";
import { EVENTS_PACK1, MAINLINES_PACK1 } from "./pack1";
import { EVENTS_PACK2, MAINLINES_PACK2 } from "./pack2";
import { EVENTS_PACK3, MAINLINES_PACK3 } from "./pack3";
import { EVENTS_PACK4, MAINLINES_PACK4 } from "./pack4";
import { RUDEUS_MAINLINE } from "./rudeus";

/**
 * 主线总表。
 *
 * 20 条普通主线放在四个包里，另有一条固定给原作模式的（RUDEUS_MAINLINE）。
 * 普通主线的抽取是随机的：创建存档时由 engine/mainline.ts 的 drawMainline 抽一条，
 * 抽的时候按主角的出身、地位、信仰、所在地、天赋、风格、时代加权——
 * 贴得上的那几条更容易抽到，但任何一条都抽得到。
 * 抽完之后由 AI 按主角把这条线重写一遍，之后每年再按实际行为微调。
 */

export const MAINLINES: MainlineDef[] = [
  ...MAINLINES_PACK1,
  ...MAINLINES_PACK2,
  ...MAINLINES_PACK3,
  ...MAINLINES_PACK4,
];

/** 全部主线专属抉择，注册进 engine/events.ts 的事件表 */
export const MAINLINE_EVENTS: MainlineEventDef[] = [
  ...EVENTS_PACK1,
  ...EVENTS_PACK2,
  ...EVENTS_PACK3,
  ...EVENTS_PACK4,
];

const BY_ID = new Map<string, MainlineDef>();
for (const def of [...MAINLINES, RUDEUS_MAINLINE]) {
  if (BY_ID.has(def.id)) throw new Error(`主线 id 重复：${def.id}`);
  BY_ID.set(def.id, def);
}

/** 按 id 取一条主线。原作模式那一条也在里面 */
export function mainlineById(id: string): MainlineDef | undefined {
  return BY_ID.get(id);
}

export const RUDEUS_MAINLINE_ID = RUDEUS_MAINLINE.id;

// 原作模式那一条也导出：校验脚本与面板要能按它取原文，但它不进抽取池
export { RUDEUS_MAINLINE };
export type { MainlineDef, MainlineEventDef };

/** 能抽的那些线：onlyEras 是硬门槛，时代不对的抽不到 */
export function mainlinePool(character: Character): MainlineDef[] {
  const pool = MAINLINES.filter((def) => !def.onlyEras || def.onlyEras.includes(character.era));
  return pool.length > 0 ? pool : MAINLINES;
}

/**
 * 与主角的贴合度。每命中一个标签算一分，仅用作抽签权重，不作硬性筛选。
 * 命中得多的线更容易抽到，但「一个平民抽到宫廷线」这种事必须留得下来——
 * 人生本来就是被自己没选过的事找上门的。
 */
export function mainlineAffinity(def: MainlineDef, c: Character): number {
  const t = def.tags;
  let score = 0;
  if (t.origins?.some((v) => c.origin.includes(v) || v.includes(c.origin))) score += 2;
  if (t.statuses?.includes(c.status)) score += 2;
  if (t.places?.includes(c.residence)) score += 2;
  if (t.faiths?.includes(c.faith)) score += 1;
  if (t.talents?.some((v) => c.talents.includes(v))) score += 1;
  if (t.styles?.includes(c.style)) score += 1;
  if (t.eras?.includes(c.era)) score += 1;
  return score;
}

/**
 * 按权重抽一条主线。roll 传 [0,1) 的随机数（引擎传 Math.random()），
 * 因此这个函数是纯的：同一个 roll 与同一个主角永远抽出同一条。
 *
 * 权重刻意压得平：每条线保底两票，贴合的按贴合度加成、最多加到八票。
 * 也就是「最贴合的那条」大约是好机会的三到四倍，而不是压倒性的优势——
 * 抽到一条和自己不搭的线，本来就是这个世界会干的事。
 */
export function pickMainline(c: Character, roll: number): MainlineDef {
  const pool = mainlinePool(c);
  const weights = pool.map((def) => 2 + Math.min(6, mainlineAffinity(def, c)));
  const total = weights.reduce((sum, w) => sum + w, 0);
  let cursor = Math.max(0, Math.min(0.999999, roll)) * total;
  for (let i = 0; i < pool.length; i += 1) {
    cursor -= weights[i];
    if (cursor < 0) return pool[i];
  }
  return pool[pool.length - 1];
}
