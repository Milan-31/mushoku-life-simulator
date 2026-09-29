import type { Relation } from "../types";
import { CANON_BIRTH_YEARS } from "../data/canonAges";

/**
 * 年龄。
 *
 * 关系网里的每个人都有一个出生年份，年龄就是「当前年份 - 出生年份」，
 * 所以时间往前走，所有人一起变老。
 *
 * 出生年份在关系建立的那一刻就写进存档，之后不再改动——
 * 同一个人不会因为你在不同年份遇见他，被算成两个岁数。三个来源，可靠度递减：
 * - 家人（配偶与子女）自带确切的出生年份。
 * - 原作考据里写明生年的人物（见 data/canonAges.ts）。
 * - 其余按身份估一个年龄段。估出来的岁数在界面上带「约」字，不假装精确。
 */

/** 与 world.ts 同一套哈希，保证同一个名字每次都落在同一点上 */
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * 按身份估一个岁数：掌权的老人、当家立户的中年人、还在长身体的孩子。
 * 段内取哪个值由名字的哈希决定。
 */
function inferredAge(rel: Relation): number {
  const text = `${rel.role}${rel.note}`;
  const pick = (lo: number, hi: number) => lo + (hash(rel.name) % (hi - lo + 1));
  if (/教皇|枢机|长老|族长|家主|剑神|水神|北神|龙王|魔王|大帝|国王|领主|主教|护卫长/.test(text)) {
    return pick(45, 78);
  }
  if (/母亲|父亲|女仆|师父|师范|教头|教习|骑士|队长|护卫|团长|商人|行商|工匠|情报屋|管家|神父|教师|店长/.test(text)) {
    return pick(26, 48);
  }
  if (/王子|王女|千金|少爷|学徒|学生|弟子|同窗|玩伴|孩子|少年|少女|幼驯染|长女|次女|长子|次子|妹妹|弟弟|姐姐|哥哥/.test(text)) {
    return pick(7, 20);
  }
  return pick(20, 44);
}

/** 考据里明确写了生年的人物。先按名字查，再退回 canonId */
function canonBirthYear(rel: Relation): number | undefined {
  return CANON_BIRTH_YEARS[rel.name] ?? (rel.canonId ? CANON_BIRTH_YEARS[rel.canonId] : undefined);
}

/**
 * 给一条关系补上出生年份，已经有的一律不动。
 * year 是「建立这条关系时的年份」，只在需要估算时用得上。
 */
export function withBirthYear(rel: Relation, year: number): Relation {
  if (typeof rel.birthYear === "number") return rel;
  const known = rel.family?.birthYear ?? canonBirthYear(rel);
  return { ...rel, birthYear: known ?? year - inferredAge(rel) };
}

export interface RelationAge {
  age: number;
  /** true 表示出生年份确凿；false 表示按身份估出来的 */
  exact: boolean;
}

/** 这个人现在几岁。没有出生年份时返回 null，由界面决定不显示 */
export function ageOf(rel: Relation, year: number): RelationAge | null {
  if (typeof rel.birthYear !== "number") return null;
  const exact = typeof rel.family?.birthYear === "number" || canonBirthYear(rel) !== undefined;
  return { age: Math.max(0, year - rel.birthYear), exact };
}

/** 界面上用的一行字：「32 岁」，估出来的写「约 32 岁」 */
export function ageText(rel: Relation, year: number): string {
  const a = ageOf(rel, year);
  if (!a) return "";
  return a.exact ? `${a.age} 岁` : `约 ${a.age} 岁`;
}