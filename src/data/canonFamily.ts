/**
 * 原作婚配与生育的时间线。
 *
 * 原作里写明了年份的夫妻与孩子放在这里：到哪一年成婚、哪一年添丁，由这张表说了算，
 * 而不是交给每月一次的掷骰。这样一来，几十年跑下来，格雷拉特家的下一代还是那几个人、
 * 那几年出生，不会多出一屋子姓格雷拉特的陌生人。
 *
 * 两条边界：
 * - 只写考据里已经存在的年份（rudeus.ts 的年表、characters.ts / canonRoster.ts 的 lore），
 *   没有年份的一律不写。
 * - 表中出现的夫妻不再走随机生育那条路（见 engine/family.ts 的 tryNpcBirth），
 *   以免同一个孩子生两次，或者生出时间线以外的兄弟姐妹。
 *
 * 玩家自己就是其中一方时（原作模式扮演鲁迪乌斯），涉及玩家的条目会被跳过——
 * 他自己的婚姻与孩子归玩家那条线管。
 */

export interface CanonChild {
  /** 名字与名录里的一致时，孩子会带着原作考据进入关系网 */
  name: string;
  /** 出生年份，甲龙历 */
  year: number;
  sex: "男" | "女";
  /** 生母。写明了就用来交代是谁生的，留空则按夫妻二人一并处理 */
  mother?: string;
}

export interface CanonCouple {
  /** 夫妻二人，名字与名录一致 */
  couple: [string, string];
  /** 成婚年份。考据里没写就留空，只走生育那一条 */
  marriedYear?: number;
  children: CanonChild[];
}

export const CANON_FAMILY: CanonCouple[] = [
  {
    // 成婚年份考据里没写，就不编一个；孩子那两条是写死的
    couple: ["保罗·格雷拉特", "塞妮丝·格雷拉特"],
    children: [
      { name: "鲁迪乌斯·格雷拉特", year: 407, sex: "男", mother: "塞妮丝·格雷拉特" },
      { name: "诺伦·格雷拉特", year: 413, sex: "女", mother: "塞妮丝·格雷拉特" },
    ],
  },
  {
    couple: ["保罗·格雷拉特", "莉莉娅"],
    children: [{ name: "爱夏·格雷拉特", year: 413, sex: "女", mother: "莉莉娅" }],
  },
  {
    // rudeus.ts 年表：422 年入魔法大学，同年与希露菲叶特成婚
    couple: ["鲁迪乌斯·格雷拉特", "希露菲叶特"],
    marriedYear: 422,
    children: [
      { name: "露西·格雷拉特", year: 423, sex: "女", mother: "希露菲叶特" },
      { name: "齐格哈鲁特·萨拉丁·格雷拉特", year: 429, sex: "男", mother: "希露菲叶特" },
    ],
  },
  {
    couple: ["鲁迪乌斯·格雷拉特", "洛琪希·米格路迪亚"],
    children: [
      { name: "菈菈·格雷拉特", year: 427, sex: "女", mother: "洛琪希·米格路迪亚" },
      { name: "莉莉·格雷拉特", year: 431, sex: "女", mother: "洛琪希·米格路迪亚" },
    ],
  },
  {
    // rudeus.ts 年表：428 年艾莉丝从剑之圣地回来，成为他的第三位妻子
    couple: ["鲁迪乌斯·格雷拉特", "艾莉丝·伯雷亚斯·格雷拉特"],
    marriedYear: 428,
    children: [
      { name: "亚尔斯·格雷拉特", year: 428, sex: "男", mother: "艾莉丝·伯雷亚斯·格雷拉特" },
      { name: "克莉丝汀娜·格雷拉特", year: 431, sex: "女", mother: "艾莉丝·伯雷亚斯·格雷拉特" },
    ],
  },
];

/** 一对夫妻的标识：两个人的名字排好序拼起来。统计与去重都用它 */
export function coupleKey(names: string[]): string {
  return [...names].sort().join("|");
}

/** 表中出现过的夫妻，随机生育要绕开 */
const TIMELINE_COUPLES = new Set(CANON_FAMILY.map((f) => coupleKey(f.couple)));

export function onTimeline(names: string[]): boolean {
  return TIMELINE_COUPLES.has(coupleKey(names));
}