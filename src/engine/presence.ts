import type { GameState, Relation } from "../types";

/**
 * 人和你在不在一处。
 *
 * 关系网里大部分人是有固定落脚地的：你在布耶纳村认识的人，人就在布耶纳村。
 * 你搬到王都之后，他们还留在原地——想当面说上话，得回到那儿去。
 * 只有跟你一起走的人（配偶、子女、旅伴这类）不受这条限制，走到哪儿都能开口。
 *
 * 判断依据三条，从硬到软：
 * - `relation.place`：你在哪儿遇见他，他就在哪儿。关系建立时就写进存档，不随迁居改动。
 * - 配偶与子女属于你的家，一定跟着你，这条没有开关。
 * - `relation.follows`：玩家在关系网里手动设过的，以此为准；没设过时才按身份推定——
 *   身份里带「旅伴／同行／随行／追随／同袍／战友」一类的，本来就是路上结的伴。
 *
 * `place` 为空的（旧存档、以及说不清在哪儿的存在）一律视为不受地点限制，
 * 免得旧档载入后一夜之间谁都说不上话。
 */

/** 随行的身份。名字里带这些词的，默认就是跟你一起走的人 */
const COMPANION_TEXT = /旅伴|同行|随行|追随|同袍|战友|同伴|伴侣|恋人|婚约|手下/;

/** 家庭关系里跟着你走的：配偶与子女属于你的家。这条不给开关 */
function followsByFamily(rel: Relation): boolean {
  return rel.family?.kind === "配偶" || rel.family?.kind === "子女";
}

/** 这个人是不是跟你一起走的人 */
export function isCompanion(rel: Relation): boolean {
  if (followsByFamily(rel)) return true;
  if (rel.follows !== undefined) return rel.follows;
  return COMPANION_TEXT.test(`${rel.name}${rel.role}`);
}

/**
 * 这个人的随行能不能由玩家改。
 * 配偶与子女是家里人，用不着另外交代——他们本来就在你身边。
 */
export function canToggleCompanion(rel: Relation): boolean {
  return !followsByFamily(rel);
}

export type Presence = "here" | "away" | "unknown";

export interface Whereabouts {
  presence: Presence;
  /** 他现在在哪儿，写在界面上；随行的人就是你此刻所在的地方 */
  place?: string;
  /** 此刻说不上话的原因。说得上话时为空 */
  reason: string;
}

/** 这个人此刻在哪儿、能不能当面说上话 */
export function whereabouts(s: GameState, rel: Relation): Whereabouts {
  const here = s.character.residence;
  if (isCompanion(rel)) return { presence: "here", place: here, reason: "" };
  if (!rel.place) return { presence: "unknown", reason: "" };
  if (rel.place === here) return { presence: "here", place: rel.place, reason: "" };
  return {
    presence: "away",
    place: rel.place,
    reason: `他现在在${rel.place}，你人在${here}。要当面说上话，得回到那边去。`,
  };
}

/** 此刻能不能跟这个人当面沟通 */
export function reachable(s: GameState, rel: Relation): boolean {
  return whereabouts(s, rel).presence !== "away";
}

/** 此刻身边有没有能当面说上话的人。用来判断「陪家人」这类指令还成不成立 */
export function anyoneAround(s: GameState): boolean {
  return s.relations.some((r) => reachable(s, r));
}

/**
 * 一组名字里，第一个人的所在地。用来给新生儿安家：
 * 孩子跟着母亲所在的地方，母亲查不到才退到玩家所在地。
 */
export function placeOfNames(s: GameState, names: string[]): string {
  for (const name of names) {
    const rel = s.relations.find((r) => r.name === name);
    if (rel?.place) return rel.place;
  }
  return s.character.residence;
}