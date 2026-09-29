import type { AchievementDef, GameState } from "../types";

const TIER_ORDER = ["未觉醒", "初级", "中级", "上级", "圣级", "王级", "帝级", "神级"];
const RANK_ORDER = ["未注册", "F", "E", "D", "C", "B", "A", "S"];

const tierAtLeast = (t: string, min: string) => TIER_ORDER.indexOf(t) >= TIER_ORDER.indexOf(min);
const rankAtLeast = (r: string, min: string) => RANK_ORDER.indexOf(r) >= RANK_ORDER.indexOf(min);
const stat = (s: GameState, key: string) => s.stats.find((x) => x.key === key)?.value ?? 0;

/** 玩家主动行动与抉择产生的文本（不含月度世界动态） */
const playerText = (s: GameState) =>
  s.log
    .filter((e) => e.kind === "action" || e.kind === "choice")
    .map((e) => `${e.title} ${e.lines.join(" ")}`)
    .join(" ");

const seen = (s: GameState, prefix: string) => s.seenEvents.some((x) => x.startsWith(prefix));

export const ACHIEVEMENTS: AchievementDef[] = [
  /* ---------- 出身 ---------- */
  { id: "origin_noble", name: "生而显贵", desc: "以贵族身份睁开双眼。", category: "出身", check: (s) => s.character.originGroup === "noble" },
  { id: "origin_commoner", name: "麦田之子", desc: "以平民身份出生。世界绝大多数人如此。", category: "出身", check: (s) => s.character.originGroup === "commoner" },
  { id: "origin_demon", name: "魔大陆后裔", desc: "在魔大陆的沙尘中出生。", category: "出身", check: (s) => s.character.originGroup === "demon" },
  { id: "origin_beast", name: "森林之民", desc: "出生于南部大森林的兽族。", category: "出身", check: (s) => s.character.originGroup === "beast" },
  { id: "origin_mirees", name: "圣国信者", desc: "出生于米里斯神圣国。", category: "出身", check: (s) => s.character.originGroup === "mirees" },
  { id: "origin_mystic", name: "异数", desc: "带着不属于这个世界的痕迹出生。", category: "出身", check: (s) => s.character.originGroup === "mystic" },
  { id: "origin_reincarnated", name: "转生者", desc: "前世记忆与你一同降临。", category: "出身", check: (s) => s.character.status === "转生者" || s.character.origin === "转生者" },
  { id: "origin_summoned", name: "被召唤者", desc: "身体被人从另一个世界拽了过来。", category: "出身", check: (s) => s.character.status === "被召唤者" || s.character.origin === "被召唤者" },

  /* ---------- 成长 ---------- */
  { id: "mage_journey", name: "咏唱之初", desc: "魔术阶级达到中级。", category: "成长", check: (s) => tierAtLeast(s.character.magicTier, "中级") },
  { id: "mage_saint", name: "魔术天才", desc: "魔术阶级达到圣级。世人称之为天才。", category: "成长", check: (s) => tierAtLeast(s.character.magicTier, "圣级") },
  { id: "mage_king", name: "王级魔术师", desc: "魔术阶级达到王级。秘匿级别。", category: "成长", check: (s) => tierAtLeast(s.character.magicTier, "王级") },
  { id: "mage_god", name: "神级魔术师", desc: "魔术阶级达到神级。世界有数。", category: "成长", check: (s) => tierAtLeast(s.character.magicTier, "神级") },
  { id: "sword_saint", name: "剑术圣级", desc: "剑术阶级达到圣级。", category: "成长", check: (s) => tierAtLeast(s.character.swordTier, "圣级") },
  { id: "sword_god", name: "剑术神级", desc: "剑术阶级达到神级。", category: "成长", check: (s) => tierAtLeast(s.character.swordTier, "神级") },
  { id: "adventurer_a", name: "A 级冒险者", desc: "冒险者等级达到 A。", category: "成长", check: (s) => rankAtLeast(s.character.adventurerRank, "A") },
  { id: "adventurer_s", name: "S 级冒险者", desc: "冒险者等级达到 S。少数人的名字会被写进传说。", category: "成长", check: (s) => rankAtLeast(s.character.adventurerRank, "S") },

  /* ---------- 情感 ---------- */
  { id: "bonds_three", name: "羁绊", desc: "至少三段关系的羁绊达到四星。", category: "情感", check: (s) => s.relations.filter((r) => r.stars >= 4).length >= 3 },
  { id: "soulmate", name: "同路人", desc: "至少一段关系的羁绊达到五星。", category: "情感", check: (s) => s.relations.some((r) => r.stars >= 5) },
  { id: "love_spoken", name: "说出口", desc: "你曾向某个人表达过心意。", category: "情感", check: (s) => /告白|求婚|喜欢|思念|结婚|成婚|爱/.test(playerText(s)) },
  { id: "loss", name: "失去", desc: "你经历过一次无法挽回的离别。", category: "情感", check: (s) => seen(s, "loss") },

  /* ---------- 世界 ---------- */
  { id: "human_god", name: "低语入梦", desc: "人神向你递出了一条「建议」。", category: "世界", check: (s) => seen(s, "human-god") || /人神|低语/.test(playerText(s)) },
  { id: "dragon_god", name: "被注意到", desc: "龙神的视线曾落在你身上。", category: "世界", check: (s) => seen(s, "dragon-god") || /龙神|奥尔斯帝德|轮回/.test(playerText(s)) },
  { id: "transfer_witness", name: "见证转移", desc: "你活过了菲托亚领转移事件。", category: "世界", check: (s) => seen(s, "transfer") },
  { id: "self_check", name: "系统自检", desc: "世界对你执行了一次强制自检。", category: "世界", check: (s) => s.log.some((e) => e.title.includes("自检")) },
  { id: "seven_powers", name: "列强的传闻", desc: "你听闻过七大列强的名号。", category: "世界", check: (s) => s.log.some((e) => e.lines.join(" ").includes("【七大列强】")) },

  /* ---------- 生存 ---------- */
  { id: "month_one", name: "第一步", desc: "让你的时间往前走了一个月。", category: "生存", check: (s) => s.turn >= 1 },
  { id: "year_one", name: "一年光阴", desc: "你度过了整整一年。", category: "生存", check: (s) => s.turn >= 12 },
  { id: "year_five", name: "五年转瞬", desc: "五年过去了。", category: "生存", check: (s) => s.turn >= 60 },
  { id: "wealth_100", name: "小有积蓄", desc: "财富达到 100 枚金币。", category: "生存", check: (s) => stat(s, "wealth") >= 100 },
  { id: "wealth_1000", name: "富甲一方", desc: "财富达到 1000 枚金币。", category: "生存", check: (s) => stat(s, "wealth") >= 1000 },
  { id: "fame_50", name: "声名鹊起", desc: "声望达到 50。", category: "生存", check: (s) => stat(s, "fame") >= 50 },
  { id: "goal_done", name: "得偿所愿", desc: "把最初的人生目标推进到了终点。", category: "生存", check: (s) => s.goalProgress >= 100 },
  { id: "age_50", name: "半百", desc: "活到五十岁。", category: "生存", check: (s) => s.character.age >= 50 },
  { id: "age_80", name: "耄耋", desc: "活到八十岁。很少有人做到。", category: "生存", check: (s) => s.character.age >= 80 },

  /* ---------- 抉择 ---------- */
  { id: "first_action", name: "第一次行动", desc: "你主动做了某件事。", category: "抉择", check: (s) => s.log.some((e) => e.kind === "action") },
  { id: "first_choice", name: "做出抉择", desc: "在岔路口做出了一次选择。", category: "抉择", check: (s) => s.log.some((e) => e.kind === "choice") },
  { id: "crossroads_three", name: "三岔路口", desc: "经历至少三次重大抉择。", category: "抉择", check: (s) => s.seenEvents.length >= 3 },
  { id: "death", name: "终有一死", desc: "这一段人生走到了尽头。", category: "抉择", check: (s) => s.deceased },
];

export const ACHIEVEMENT_TOTAL = ACHIEVEMENTS.length;

export function achievementById(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

/** 检查并解锁满足条件的成就，返回新状态与本次解锁的成就 */
export function evaluateAchievements(s: GameState): { state: GameState; unlocked: AchievementDef[] } {
  const have = new Set(s.achievements);
  const unlocked: AchievementDef[] = [];
  for (const def of ACHIEVEMENTS) {
    if (have.has(def.id)) continue;
    if (def.check(s)) unlocked.push(def);
  }
  if (unlocked.length === 0) return { state: s, unlocked };

  const entries = unlocked.map((d, i) => ({
    id: `ach-${d.id}-${s.turn}-${i}`,
    year: s.year,
    month: s.month,
    kind: "achievement" as const,
    title: `成就解锁 · ${d.name}`,
    lines: [d.desc],
  }));

  // 成就只是附带通知：插在「本回合自身那条纪事」之后，让当前行为的结果始终留在最前
  const head = s.log.slice(0, 1);
  const tail = s.log.slice(1);

  return {
    state: {
      ...s,
      achievements: [...s.achievements, ...unlocked.map((d) => d.id)],
      log: [...head, ...entries, ...tail].slice(0, 160),
    },
    unlocked,
  };
}