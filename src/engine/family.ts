import type { GameState, FamilyState, Relation, RelationBond } from "../types";
import { NAME_POOLS } from "../data/acquaintances";
import { CANON_TIES } from "../data/canonTies";
import { CANON_FAMILY, coupleKey, onTimeline, type CanonChild } from "../data/canonFamily";
import { canonByName, toRelation } from "../data/characters";
import { withBirthYear } from "./age";
import { placeOfNames } from "./presence";

/**
 * 生育。
 *
 * 这段人生里会有孩子出生：玩家自己的，以及别人家的。三条线各走各的：
 * - 玩家自己：要有配偶、在育龄、隔够年数，见 tryPlayerBirth。
 * - 原作写明年份的夫妻：到哪一年添丁由时间线说了算，见 tryCanonBirth 与 data/canonFamily.ts。
 * - 其余夫妻：保留一点随机，但放得很慢，还有每对夫妻的上限，见 tryNpcBirth。
 *
 * 两条硬规则贯穿全部三条线：
 * - 孩子不写进游戏本体的任何数据文件，只作为关系条目留在存档里，
 *   所以同样一个名字，在不同存档里是不同的人。
 * - 人数封顶。玩家的孩子最多 CHILD_LIMIT 个，NPC 生育累计不超过 NPC_BIRTH_LIMIT 次。
 *   否则跑满六十年，关系网会被婴儿塞满。
 */

/** 玩家的孩子最多几个 */
export const CHILD_LIMIT = 6;
/** NPC 生育的累计上限 */
export const NPC_BIRTH_LIMIT = 24;
/** 玩家的育龄 */
const FERTILE_MIN_AGE = 16;
const FERTILE_MAX_AGE = 48;
/** 玩家两次生育之间至少隔几年。原作里格雷拉特家的孩子也是隔年出生的 */
export const BIRTH_INTERVAL = 2;
/** 时间线之外的夫妻：两次添丁之间隔几年。比玩家慢，免得别人家孩子比你家还多 */
const NPC_BIRTH_INTERVAL = 3;
/** 时间线之外的夫妻：每对的上限。多了就不像个家了 */
const NPC_COUPLE_LIMIT = 2;
/** 时间线之外的夫妻：每月添丁的概率。压得很低，几十年也不会添出一屋子人 */
const NPC_BIRTH_CHANCE = 0.02;

/** 各年龄段的存活概率：越往后越不容易怀上 */
function fertilityAt(age: number): number {
  if (age < FERTILE_MIN_AGE || age > FERTILE_MAX_AGE) return 0;
  if (age < 25) return 0.09;
  if (age < 35) return 0.07;
  if (age < 42) return 0.04;
  return 0.015;
}

const HUMAN_MALE = NAME_POOLS.human.slice(0, 12);
const HUMAN_FEMALE = NAME_POOLS.human.slice(12);

export type ChildSex = "男" | "女";

function pickName(s: GameState, sex: ChildSex, rng: () => number): string | null {
  const taken = new Set(s.relations.map((r) => r.name));
  const pool = (sex === "男" ? HUMAN_MALE : HUMAN_FEMALE).filter((n) => !taken.has(n));
  if (pool.length === 0) return null;
  return pool[Math.floor(rng() * pool.length) % pool.length];
}

/** 孩子的小传。按性别分开写，落在他身上而不是抽象地夸 */
const NOTES_BOY = [
  "他抓东西抓得很紧，像怕掉下去。",
  "他哭起来声音不大，先憋一会儿才出声。",
  "他看人的时候先看手，再看脸。",
  "他睡得很沉，搬家一样吵都吵不醒。",
];
const NOTES_GIRL = [
  "她醒了就睁着眼睛看天花板，很少哭。",
  "她认人认得早，见生人就往怀里缩。",
  "她抓你手指的时候，力气比看上去大。",
  "她喜欢听人说话，听着听着就睡着了。",
];

function childNote(sex: ChildSex, rng: () => number): string {
  const pool = sex === "男" ? NOTES_BOY : NOTES_GIRL;
  return pool[Math.floor(rng() * pool.length) % pool.length];
}

/**
 * 造一个孩子。
 * playerChild 决定他是你的孩子还是别人家的：
 * 只有你的孩子才带 family 标记，别人家的孩子只是关系网里的一个熟人，
 * 父母写在 note 里——否则 childrenOf 会把全世界的婴儿都算成你的。
 */
function newChild(
  s: GameState,
  parents: string[],
  sex: ChildSex,
  year: number,
  rng: () => number,
  playerChild: boolean,
): Relation | null {
  const name = pickName(s, sex, rng);
  if (!name) return null;
  if (playerChild) {
    return withBirthYear(
      {
        name,
        role: sex === "男" ? "儿子" : "女儿",
        // 自己的孩子起步好感就高：他一生下来就认得你
        stars: 5,
        note: childNote(sex, rng),
        bond: "血亲",
        metAt: "出生",
        family: { kind: "子女", parents, birthYear: year },
      },
      year,
    );
  }
  return withBirthYear(
    {
      name,
      role: sex === "男" ? "儿子" : "女儿",
      stars: 2,
      note: `${parents.join("和")}的孩子。${childNote(sex, rng)}`,
      bond: "熟人",
      metAt: "听说",
      // 孩子跟着母亲所在的地方；母亲查不到，就退到玩家所在地
      place: placeOfNames(s, parents),
    },
    year,
  );
}

/* ---------- 玩家这一家 ---------- */

/** 玩家的配偶。没有就返回 undefined */
export function spouseOf(s: GameState): Relation | undefined {
  return s.relations.find((r) => r.family?.kind === "配偶");
}

/** 把某人立为配偶。婚后 bond 归到恋情，关系网里才画得对 */
export function markSpouse(rel: Relation): Relation {
  return { ...rel, bond: "恋情" as RelationBond, stars: Math.max(rel.stars, 4), family: { kind: "配偶" } };
}

/** 玩家的孩子，按出生年份排 */
export function childrenOf(s: GameState): Relation[] {
  return s.relations
    .filter((r) => r.family?.kind === "子女")
    .sort((a, b) => (a.family?.birthYear ?? 0) - (b.family?.birthYear ?? 0));
}

/** 孩子现在是几岁 */
export function childAge(r: Relation, year: number): number | null {
  const born = r.family?.birthYear;
  return born === undefined ? null : Math.max(0, year - born);
}

export interface BirthResult {
  child: Relation;
  /** 写进纪事的一句 */
  line: string;
  /** 另一句，落在父母身上 */
  detail: string;
  /** 添丁的是哪一对夫妻。玩家自己生育时留空 */
  coupleKey?: string;
}

/**
 * 玩家生育：要有配偶、在育龄、没到孩子上限、距上次生育够久。
 * 条件不满足或运气不到就返回 null，由调用方跳过。
 */
export function tryPlayerBirth(s: GameState, rng: () => number): BirthResult | null {
  const spouse = spouseOf(s);
  if (!spouse) return null;
  if (s.family.children >= CHILD_LIMIT) return null;
  const age = s.character.age;
  if (age < FERTILE_MIN_AGE || age > FERTILE_MAX_AGE) return null;
  const last = s.family.lastBirthYear;
  if (last !== undefined && s.year - last < BIRTH_INTERVAL) return null;
  // 孩子越多越不容易再生，避免一年一个
  const chance = fertilityAt(age) * Math.max(0.35, 1 - s.family.children * 0.14);
  if (rng() >= chance) return null;

  const sex: ChildSex = rng() < 0.5 ? "男" : "女";
  const child = newChild(s, [s.character.name, spouse.name], sex, s.year, rng, true);
  if (!child) return null;

  return {
    child,
    line: `${s.character.name}家里添了一个孩子。名字是${child.name}。`,
    detail: `${spouse.name}把他抱过来给你看。你伸手的时候，发现自己不太知道该往哪儿放。`,
  };
}

/* ---------- 别人家 ---------- */

/**
 * 原作里已经写明的夫妻。
 * 别人家生孩子不靠玩家关系网里的「恋情」推断——那样几乎找不到人，
 * 而是直接读原作关系表里 kind 为夫妻的那几对，只要求玩家跟其中一方认识。
 */
function canonCouples(): [string, string][] {
  const seen = new Set<string>();
  const out: [string, string][] = [];
  for (const [name, list] of Object.entries(CANON_TIES)) {
    for (const tie of list) {
      if (tie.kind !== "夫妻") continue;
      const key = coupleKey([name, tie.with]);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push([name, tie.with]);
    }
  }
  return out;
}

const COUPLES = canonCouples();

/**
 * 时间线之外的夫妻，随机添丁。
 *
 * 玩家跟这对夫妻里至少一方说得上话，这件事才会进入你的视野——
 * 世界很大，不认识的人生孩子跟你没关系。节奏压得很慢：
 * 隔 NPC_BIRTH_INTERVAL 年才可能有一回，每对夫妻各有上限，
 * 而且原作时间线覆盖的那几对根本不走这里，免得同一个孩子生两次。
 */
export function tryNpcBirth(s: GameState, rng: () => number): BirthResult | null {
  if (s.family.npcBirths >= NPC_BIRTH_LIMIT) return null;
  const last = s.family.npcLastBirthYear;
  if (last !== undefined && s.year - last < NPC_BIRTH_INTERVAL) return null;

  // 玩家认识的、已成家的原作人物
  const known = new Map(s.relations.filter((r) => r.stars >= 3).map((r) => [r.name, r]));
  const counts = s.family.npcCoupleBirths ?? {};
  const candidates = COUPLES.filter(([a, b]) => {
    if (onTimeline([a, b])) return false;
    if ((counts[coupleKey([a, b])] ?? 0) >= NPC_COUPLE_LIMIT) return false;
    return known.has(a) || known.has(b);
  });
  if (candidates.length === 0) return null;
  // 别人家添丁比你自己慢得多
  if (rng() >= NPC_BIRTH_CHANCE) return null;

  const [a, b] = candidates[Math.floor(rng() * candidates.length) % candidates.length];
  const sex: ChildSex = rng() < 0.5 ? "男" : "女";
  const child = newChild(s, [a, b], sex, s.year, rng, false);
  if (!child) return null;

  return {
    child,
    coupleKey: coupleKey([a, b]),
    line: `${a}和${b}家添了个孩子，取名${child.name}。`,
    detail: "消息是从别人嘴里传过来的，说得不太详细。",
  };
}

/* ---------- 原作时间线 ---------- */

/** 玩家是否认识这对夫妻里的至少一方 */
function knowsOne(s: GameState, names: string[]): boolean {
  return names.some((n) => s.relations.some((r) => r.name === n || r.canonId === n));
}

/** 这对夫妻里有玩家自己？原作模式里，玩家自己的婚姻归他自己那条线管 */
function includesPlayer(s: GameState, names: string[]): boolean {
  return names.includes(s.character.name);
}

export interface CanonWeddingResult {
  /** 记进 seenEvents 的键，保证只发生一次 */
  key: string;
  names: [string, string];
  line: string;
  detail: string;
  notice: string;
}

/**
 * 原作时间线上的成婚：到了年份，且玩家认识这对夫妻里的一方，消息就会传到你耳朵里。
 * 双方的好感一并归到恋情，关系网里才画得对。
 */
export function tryCanonWedding(s: GameState): CanonWeddingResult | null {
  for (const entry of CANON_FAMILY) {
    if (entry.marriedYear === undefined || entry.marriedYear !== s.year) continue;
    const key = `canon-wed-${coupleKey(entry.couple)}`;
    if (s.seenEvents.includes(key)) continue;
    if (includesPlayer(s, entry.couple)) continue;
    if (!knowsOne(s, entry.couple)) continue;
    const [a, b] = entry.couple;
    return {
      key,
      names: [a, b],
      line: `${a}和${b}成了婚。`,
      detail: "消息是从认识的人那里听来的。仪式办得不大，来的都是自己人。",
      notice: `你听说${a}和${b}成婚了。`,
    };
  }
  return null;
}

export interface CanonBirthResult {
  key: string;
  child: Relation;
  line: string;
  detail: string;
  notice: string;
}

/** 时间线上的孩子：名字与考据一致就照着名录来，否则只当一个普通婴儿 */
function timelineChild(c: CanonChild, parents: string[], s: GameState, rng: () => number): Relation {
  const place = placeOfNames(s, parents);
  const canon = canonByName(c.name);
  if (canon) {
    // 孩子跟着母亲所在的地方，不按名录上的驻地去算——刚出生的婴儿不会自己住在夏利亚
    return { ...toRelation(canon, c.year, place), metAt: "出生", place };
  }
  return {
    name: c.name,
    role: c.sex === "男" ? "儿子" : "女儿",
    stars: 2,
    note: `${parents.join("和")}的孩子。${childNote(c.sex, rng)}`,
    bond: "熟人",
    metAt: "听说",
    birthYear: c.year,
    place,
  };
}

/**
 * 原作时间线上的添丁：到年份，且玩家认识父母里的一方，就添上这个孩子。
 * 孩子本来就在原作名录里（露西、菈菈这些人），所以带着考据一起进关系网，
 * 关系网里的原作虚线也连得上。已经出现过的人不再添第二个。
 */
export function tryCanonBirth(s: GameState, rng: () => number): CanonBirthResult | null {
  for (const entry of CANON_FAMILY) {
    for (const c of entry.children) {
      if (c.year !== s.year) continue;
      const key = `canon-born-${c.name}`;
      if (s.seenEvents.includes(key)) continue;
      // 名录里自己出现过的人，就不再当一个新生儿添进来
      if (s.relations.some((r) => r.name === c.name)) continue;
      if (includesPlayer(s, entry.couple)) continue;
      if (!knowsOne(s, entry.couple)) continue;

      const other = entry.couple.find((n) => n !== c.mother) ?? entry.couple[0];
      const parents = c.mother ? [other, c.mother] : entry.couple;
      const child = timelineChild(c, parents, s, rng);
      return {
        key,
        child,
        line: `${parents.join("和")}家添了个孩子，取名${child.name}。`,
        detail: "这件事你知道得比旁人清楚一些。",
        notice: `你听说${parents.join("和")}有了孩子，叫${child.name}。`,
      };
    }
  }
  return null;
}

/** 空白的家庭状态 */
export function emptyFamily(): FamilyState {
  return { children: 0, npcBirths: 0 };
}

/**
 * 孩子长大了要能说话、能出门。这里只算一个阶段词，给界面和 AI 提示词用。
 */
export function childStage(age: number): string {
  if (age < 2) return "襁褓";
  if (age < 7) return "幼年";
  if (age < 13) return "童年";
  if (age < 18) return "少年";
  return "成年";
}