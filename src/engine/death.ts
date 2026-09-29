import type { Character } from "../types";

/**
 * 死亡判定。
 *
 * 这套规则管两件事：谁能死、以及凭什么。所有死亡都要先过这里——
 * 引擎自己判的寿终与病殁，和 AI 用 fatal 字段提出的死，走的是同一套门槛。
 *
 * 分四类，各有各的门槛与最低年龄：
 * - **寿终**：年龄要到寿命上限附近。寿命 35 到 96，由出身、天赋与难度共同决定。
 * - **病殁**：健康已经见底，或本回合大幅下滑。**不到 12 岁不因病而死。**
 * - **横死**：本回合确实发生过致死的处境——战斗中落败、重创、灾祸。**不到 6 岁不会横死。**
 * - **超自然**：角色自己带着诅咒、侵蚀或咒术底子，否则驳回。
 *
 * 另有一道 6 岁的绝对下限：再小不会有独立行动，也就没有致死的由头。
 * 这是为了不让少年人莫名其妙地夭折。
 *
 * AI 提出的死如果过不了门槛，**不判死**：它给的数值照旧落账，只把这件事降级成重伤，
 * 并把驳回理由写进纪事——回看时能看清这一次为什么没死成，而不是觉得引擎随手赖账。
 */

export type DeathKind = "寿终" | "病殁" | "横死" | "超自然";

/** 任何死因的最低年龄。不到这个年纪，什么都不会带走他 */
export const ABSOLUTE_MIN_AGE = 6;
/** 因病而死的年龄下限。不到这个年纪，病只会留下病根 */
export const ILLNESS_MIN_AGE = 12;
/** 健康见底时，未到年龄下限的人被托到这条线上 */
export const SPARED_HEALTH = 5;

/**
 * 死因归类。顺序有意为之：先认超自然，再认寿终，然后横死，最后才是病殁——
 * 「被魔物咬伤后不治」该算横死，不该因为句子里有个「不治」就被归成病殁。
 */
const KIND_PATTERNS: { kind: DeathKind; test: RegExp }[] = [
  { kind: "超自然", test: /诅咒|咒术|咒|魔力失控|魔术失控|魔法反噬|魔术反噬|仪式|契约|侵蚀|神罚|封印|恶魔附身/ },
  { kind: "寿终", test: /寿终|寿数|寿限|天年|老死|衰老|年老|自然死亡|无疾而终|安详/ },
  {
    kind: "横死",
    test: /战死|阵亡|战殁|被杀|遇袭|暗杀|刺杀|处决|处死|绞|斩首|坠|溺|烧死|火焚|塌|事故|灾害|雪崩|魔物|怪物|野兽|盗|抢|斗殴|饿死|冻死|落石|车马|马车|车辆|撞死|碾压|船难/,
  },
  { kind: "病殁", test: /病|疾|疫|瘟|伤重|不治|衰竭|热病|伤寒|肺|痨|虚弱|不愈|药石无灵|失血/ },
];

/** 把一句死因归到四类之一。认不出来时返回 null，由判定函数驳回 */
export function classifyCause(text: string): DeathKind | null {
  for (const p of KIND_PATTERNS) {
    if (p.test.test(text)) return p.kind;
  }
  return null;
}

/** 角色自带的超自然底子：血脉被封印、魔力侵蚀、或身上带着咒术一类的东西 */
export function hasSupernaturalBasis(c: Character): boolean {
  if (c.blood === "被封印") return true;
  if (c.corruption && c.corruption !== "无") return true;
  return c.talents.some((t) => /咒|不死|神子|人神|恶魔|魔王|魔眼/.test(t));
}

/** 判定时用得到的当下处境 */
export interface DeathBasis {
  age: number;
  /** 这一世的寿命上限 */
  lifespan: number;
  /** 结算后的健康 */
  health: number;
  /** 本回合或本次行动的健康变化。负数代表下滑 */
  healthDelta: number;
  /** 这一次是战斗，或玩家正身处战斗之中 */
  inBattle: boolean;
  /** 角色自带超自然底子 */
  supernatural: boolean;
}

export interface DeathVerdict {
  ok: boolean;
  /** 通过时的分类 */
  kind: DeathKind;
  /** 通过时的依据，写进终章 */
  basis: string;
  /** 驳回时的理由，写进纪事 */
  reason: string;
}

const ok = (kind: DeathKind, basis: string): DeathVerdict => ({ ok: true, kind, basis, reason: "" });
const no = (kind: DeathKind, reason: string): DeathVerdict => ({ ok: false, kind, basis: "", reason });

/** 终章与纪事里那一行判定说明：「死亡判定 · 寿终 —— 依据」 */
export function verdictLine(kind: string | undefined, basis: string | undefined): string {
  if (!kind) return "";
  return `死亡判定 · ${kind} —— ${basis ?? "依据已随存档丢失。"}`;
}

const health = (v: number) => (v >= 0 ? `+${v}` : `${v}`);

/**
 * AI 提出的死。先归类，再按那一类自己的门槛判。
 * 门槛都不是凭空的：它要的是「这件事在本回合确实发生过」的证据。
 */
export function judgeFatal(text: string, at: DeathBasis): DeathVerdict {
  const kind = classifyCause(text);
  if (!kind) {
    return no("病殁", "这条死因说不清是什么带走了他，引擎没有采纳。");
  }
  if (at.age < ABSOLUTE_MIN_AGE) {
    return no(kind, `他今年才 ${at.age} 岁，这个年纪不会有致死的由头，引擎没有采纳。`);
  }

  switch (kind) {
    case "寿终": {
      // 只有真的走到寿命尽头，才算老死。差得远就是「年纪轻轻写老死」
      if (at.age >= at.lifespan - 3 || at.age >= 55) {
        return ok(kind, `享年 ${at.age} 岁，已接近这一世的寿命上限（${at.lifespan} 岁），算寿终。`);
      }
      return no(
        kind,
        `${at.age} 岁按老死来写，离这一世的寿命上限（${at.lifespan} 岁）还差得远，引擎没有采纳。`,
      );
    }
    case "病殁": {
      if (at.age < ILLNESS_MIN_AGE) {
        return no(kind, `${at.age} 岁因病而死属于夭折，引擎没有采纳——病只会留下病根。`);
      }
      if (at.health <= 25 || at.healthDelta <= -12) {
        return ok(
          kind,
          `健康已落到 ${at.health}${at.healthDelta <= -12 ? `，本回合又下滑了 ${Math.abs(at.healthDelta)}` : ""}，算病殁。`,
        );
      }
      return no(kind, `健康还有 ${at.health}，本回合也只变化了 ${health(at.healthDelta)}，撑不起病殁，引擎没有采纳。`);
    }
    case "横死": {
      if (at.inBattle || at.healthDelta <= -10 || at.health <= 15) {
        return ok(
          kind,
          at.inBattle
            ? "这一次是正面交手，横死站得住。"
            : `本回合健康下滑了 ${Math.abs(Math.min(0, at.healthDelta))}，只剩 ${at.health}，够得上横死。`,
        );
      }
      return no(kind, `本回合没有交手，也没有重伤，横死的由头不足，引擎没有采纳。`);
    }
    default: {
      if (at.age < ILLNESS_MIN_AGE) {
        return no(kind, `${at.age} 岁就死于超自然之物属于夭折，引擎没有采纳。`);
      }
      if (at.supernatural) {
        return ok(kind, "他的血脉与身上带着的东西，本身就容得下这种死法。");
      }
      return no(kind, "他身上没有诅咒、侵蚀或咒术一类的东西，这种死法落不下来，引擎没有采纳。");
    }
  }
}

/** 引擎自己判的寿终：年龄到了寿命上限 */
export function judgeOldAge(at: DeathBasis): DeathVerdict {
  return ok("寿终", `享年 ${at.age} 岁，到了这一世的寿命上限（${at.lifespan} 岁）。`);
}

/**
 * 引擎自己判的健康归零。
 * 本回合下滑得越狠，越可能是外伤而不是久病，分类据此而定。
 */
export function judgeIllness(at: DeathBasis): DeathVerdict {
  if (at.age < ILLNESS_MIN_AGE) {
    return no("病殁", `${at.age} 岁因病而死属于夭折，引擎没有采纳。`);
  }
  if (at.healthDelta <= -18) {
    return ok("横死", `本回合健康一次性下滑了 ${Math.abs(at.healthDelta)}，是外伤而不是久病。`);
  }
  return ok("病殁", `健康耗尽，且不是一次重创造成的，算久病不愈。`);
}

/**
 * 健康见底时给孩子的托底：不到年龄下限，不判死，改成把健康托到一线。
 * 返回 spared 为 true 时调用方应当把健康改写为 health。
 */
export function spareChild(age: number, healthValue: number): { health: number; spared: boolean } {
  if (age < ILLNESS_MIN_AGE && healthValue <= 0) {
    return { health: SPARED_HEALTH, spared: true };
  }
  return { health: healthValue, spared: false };
}