import type { Character, EventEffects, Faction, Relation, RelationBond, StatBar } from "../types";
import { canonById, homeOf } from "../data/characters";
import { skillById } from "../data/skills";
import { memoryOf, rememberEvent } from "./memory";
import { withBirthYear } from "./age";

/**
 * 数值落账的唯一控制点。
 *
 * 这一份原来长在 engine/world.ts 里。拆出来只为一件事：主线剧情也要往存档里落账
 * （一章走完该给的阶级成长、该学到的招式、该记下的剧情标记），而 world.ts 又要调用主线推进，
 * 两边互相 import 会成环。挪到这里之后，普通行动、世界动态、抉择事件、主线节拍
 * 全部走同一个 applyEffects，边界仍然只有一处。
 */

/**
 * 效果数值的上下限。AI 结果校验（ai.ts）与落账共用这一份定义，避免两处数字漂移。
 */
export interface EffectLimits {
  /** 单项属性增减 */
  stat: number;
  /** 阶级进度成长 */
  tier: number;
  /** 关系好感变动（星级本身仍限制在 0-5） */
  star: number;
  /** 人生目标进度增减 */
  goal: number;
  /** 寿命增减（岁） */
  lifespan: number;
  /** 精力增减 */
  energy: number;
  /** 单次行动的精力消耗 */
  actionCost: number;
}

/** 常规上限：一次普通行动、一个月的世界动态，都按这个幅度结算 */
export const LIMITS: EffectLimits = {
  stat: 15,
  tier: 20,
  star: 3,
  goal: 8,
  lifespan: 2,
  energy: 40,
  actionCost: 25,
};

/**
 * 抉择事件的上限：常规的三倍，留给真正罕见的特殊事件。
 * 继承遗产、被判重刑、失去至亲、被诅咒缠身、捡到圣物、身份暴露、与列强正面交手，才用得上这个额度。
 * 主线的一章收束属于这一档——那是人生里数得出的大节点。
 */
export const EVENT_LIMITS: EffectLimits = {
  stat: 45,
  tier: 60,
  star: 9,
  goal: 24,
  lifespan: 6,
  energy: 120,
  actionCost: LIMITS.actionCost,
};

/** 可被效果改动的状态切片，供行动结算、抉择结算与主线推进共用 */
export interface EffectContext {
  stats: StatBar[];
  relations: Relation[];
  factions: Faction[];
  character: Character;
  tierProgress: { magic: number; sword: number; adventure: number };
  goalProgress: number;
  lifespan: number;
  energy: number;
  notices: string[];
  /** 已学技能 id。学会新技能时在这里累加 */
  skills: string[];
  /** 剧情标记。事件写入后，后续事件、场景与指令的门槛才打得开 */
  flags: string[];
  /** 当前年份。新认识的人要靠它定下出生年，年龄才会随年份长 */
  year: number;
}

/** 允许出现在效果里的属性键，其余一律忽略 */
const STAT_KEYS = new Set(["mana", "sword", "int", "charm", "faith", "wealth", "fame", "scheme", "health"]);

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function bumpStat(stats: StatBar[], key: string, delta: number): StatBar[] {
  return stats.map((s) => (s.key === key ? { ...s, value: clamp(s.value + delta, 0, s.max) } : s));
}

export const TIER_ORDER = ["未觉醒", "初级", "中级", "上级", "圣级", "王级", "帝级", "神级"];
export const RANK_ORDER = ["未注册", "F", "E", "D", "C", "B", "A", "S"];

export function advanceTier(cur: string, gain: number, progress: number): { tier: string; progress: number } {
  let idx = Math.max(0, TIER_ORDER.indexOf(cur));
  let p = progress + gain;
  while (p >= 100 && idx < TIER_ORDER.length - 1) {
    p -= 100;
    idx += 1;
  }
  if (idx === TIER_ORDER.length - 1) p = Math.min(p, 99);
  return { tier: TIER_ORDER[idx], progress: p };
}

export function advanceRank(cur: string, gain: number, progress: number): { rank: string; progress: number } {
  let idx = Math.max(0, RANK_ORDER.indexOf(cur));
  let p = progress + gain;
  while (p >= 100 && idx < RANK_ORDER.length - 1) {
    p -= 100;
    idx += 1;
  }
  if (idx === RANK_ORDER.length - 1) p = Math.min(p, 99);
  return { rank: RANK_ORDER[idx], progress: p };
}

/**
 * 关系性质由角色身份推定，用于关系网分组与 NPC 对话时的扮演依据。
 * 显式写了 bond 的以显式为准。
 */
export function inferBond(name: string, role: string): RelationBond {
  const text = `${name}${role}`;
  if (/母亲|父亲|妹|姐|兄|弟|养父|养母|族长|家主|家人|血亲/.test(text)) return "血亲";
  if (/师父|师范|师兄|师姐|弟子|同门|道场|剑圣/.test(text)) return "师门";
  if (/恋人|未婚|妻|夫|爱慕|情人/.test(text)) return "恋情";
  if (/宿敌|仇|政敌|敌手/.test(text)) return "宿敌";
  if (/同窗|同学|同僚|战友|同袍|同行|同伴|旅伴/.test(text)) return "同僚";
  if (/友|玩伴|挚交|知己/.test(text)) return "挚友";
  return "熟人";
}

/**
 * 把一组效果落到状态切片上。所有数值都在这里夹取，
 * 因此无论效果来自内置事件表、AI 推演还是主线剧情，边界的控制点只有一个。
 * limits 缺省为常规上限；只有抉择事件与主线节拍会传入放宽的 EVENT_LIMITS。
 */
export function applyEffects(ctx: EffectContext, effects: EventEffects, limits: EffectLimits = LIMITS): void {
  if (effects.stats) {
    for (const [key, value] of Object.entries(effects.stats)) {
      if (!STAT_KEYS.has(key)) continue;
      const delta = clamp(Math.round(Number(value) || 0), -limits.stat, limits.stat);
      if (delta !== 0) ctx.stats = bumpStat(ctx.stats, key, delta);
    }
  }
  if (effects.tier) {
    const gain = clamp(Math.round(effects.tier.gain) || 0, 0, limits.tier);
    if (effects.tier.kind === "magic") {
      const r = advanceTier(ctx.character.magicTier, gain, ctx.tierProgress.magic);
      ctx.character = { ...ctx.character, magicTier: r.tier };
      ctx.tierProgress.magic = r.progress;
    } else if (effects.tier.kind === "sword") {
      const r = advanceTier(ctx.character.swordTier, gain, ctx.tierProgress.sword);
      ctx.character = { ...ctx.character, swordTier: r.tier };
      ctx.tierProgress.sword = r.progress;
    } else if (effects.tier.kind === "adventure") {
      const r = advanceRank(ctx.character.adventurerRank, gain, ctx.tierProgress.adventure);
      ctx.character = { ...ctx.character, adventurerRank: r.rank };
      ctx.tierProgress.adventure = r.progress;
    }
  }
  if (effects.starDelta) {
    const { match, delta, note } = effects.starDelta;
    let idx = -1;
    if (match) idx = ctx.relations.findIndex((r) => r.name.includes(match));
    if (idx < 0 && ctx.relations.length > 0) {
      idx = 0;
      for (let i = 1; i < ctx.relations.length; i += 1) {
        if (ctx.relations[i].stars > ctx.relations[idx].stars) idx = i;
      }
    }
    if (idx >= 0) {
      const step = clamp(Math.round(delta) || 0, -limits.star, limits.star);
      ctx.relations = ctx.relations.map((r, i) => {
        if (i !== idx) return r;
        // 好感变化的原因写进这个人的长期记忆，而不是覆盖掉「他是谁」那句话
        const memory = note ? rememberEvent(memoryOf(r), note) : r.memory;
        return { ...r, stars: clamp(r.stars + step, 0, 5), memory };
      });
    }
  }
  if (effects.addRelation && !ctx.relations.some((r) => r.name === effects.addRelation!.name)) {
    const { role, stars, bond, canonId } = effects.addRelation;
    // 是原作人物时，按考据里的驻地安家（龙王之笛唤来的五龙将就该在天空之城），
    // 不是的话才落到玩家此刻所在的地方
    const canon = canonId ? canonById(canonId) : undefined;
    ctx.relations = [
      ...ctx.relations,
      // 新认识的人在这里就定下出生年与所在地，之后年龄随年份长、人留在原地
      withBirthYear(
        {
          ...effects.addRelation,
          role,
          stars: clamp(Math.round(stars) || 1, 1, 5),
          bond: bond ?? inferBond(effects.addRelation.name, role),
          place:
            effects.addRelation.place ?? (canon ? homeOf(canon, ctx.character.residence) : ctx.character.residence),
        },
        ctx.year,
      ),
    ];
  }
  if (effects.goal) {
    ctx.goalProgress = clamp(ctx.goalProgress + clamp(Math.round(effects.goal) || 0, -limits.goal, limits.goal), 0, 100);
  }
  if (effects.lifespan) {
    const years = clamp(Math.round(effects.lifespan) || 0, -limits.lifespan, limits.lifespan);
    if (years !== 0) ctx.lifespan = Math.max(30, ctx.lifespan + years);
  }
  if (effects.energy) {
    ctx.energy = clamp(ctx.energy + clamp(Math.round(effects.energy) || 0, -limits.energy, limits.energy), 0, 100);
  }
  if (effects.factions) {
    for (const [key, value] of Object.entries(effects.factions)) {
      if (!ctx.factions.some((f) => f.name === key)) continue;
      const delta = clamp(Math.round(Number(value) || 0), -limits.stat, limits.stat);
      if (delta === 0) continue;
      ctx.factions = ctx.factions.map((f) =>
        f.name === key ? { ...f, value: clamp(f.value + delta, -100, 100) } : f,
      );
    }
  }
  if (effects.notice) ctx.notices.push(effects.notice);
  // 剧情标记：只累加，不去重也不清除——「发生过」这件事本身不该被抹掉
  if (effects.flag) {
    const flag = effects.flag.trim();
    if (flag && !ctx.flags.includes(flag)) ctx.flags = [...ctx.flags, flag];
  }
  // 所在地：转移事件与迁居都从这里改。改了地方，能做的事情也就跟着变
  if (effects.residence && effects.residence.trim() && ctx.character.residence !== effects.residence.trim()) {
    ctx.character = { ...ctx.character, residence: effects.residence.trim() };
    ctx.notices.push(`你的所在地变成了「${effects.residence.trim()}」。`);
  }
  // 学会技能：把 id 记下来，并把该技能的一次性成长立刻落账
  if (effects.learnSkill) {
    const skill = skillById(effects.learnSkill);
    if (skill && !ctx.skills.includes(skill.id)) {
      ctx.skills = [...ctx.skills, skill.id];
      ctx.notices.push(`学会了「${skill.name}」（${skill.school}·${skill.grade}）`);
      applyEffects(ctx, skill.effects, limits);
    }
  }
}
