import type { EventEffects, GameState, Relation, RelationBond } from "../types";
import { withBirthYear } from "../engine/age";

/**
 * 普通人的遇合与关系互动。
 *
 * 原作人物名录管的是「世界里那些有名有姓的人」，这一份管另外一件事：
 * 你在什么场合、什么身份上，会遇到什么样的人。
 * 出身、驻地、所在场景不同，能碰到的人就不同；这些人不消耗任何 AI 额度，
 * 全部由本地引擎生成，名字、身份与小传都来自下面这几张表。
 *
 * 两条设计取向：
 * - 每个身份都带一点「可追问的东西」（一个秘密、一句没说完的话），
 *   这样关系不是通讯录，而是能继续往下走的线索。
 * - 遇合跟着场合走。你在布耶纳村长大，认识的是同村的猎户；
 *   你进了剑之圣地，认识的是同门师弟。玩家换了地方，人际关系也跟着换。
 */

/** 姓名池：按文化圈分开，免得兽族叫出人族名字 */
export type NamePool = "human" | "beast" | "demon" | "elder";

export const NAME_POOLS: Record<NamePool, string[]> = {
  human: [
    "托马", "吉尔", "莱纳", "欧文", "迪特", "卡尔", "休", "罗伊", "埃德", "维克多", "巴克", "诺曼",
    "米娅", "莉娜", "赛拉", "诺拉", "艾达", "玛尔", "缇娜", "贝拉", "伊冯", "柯莱特", "汉娜", "茜尔",
  ],
  beast: ["裘朗", "加鲁", "托拉", "凯因", "米可", "拉娜", "莉丝", "涅可", "夏乌", "塔妮"],
  demon: ["洛恩", "米拉", "裘卡", "涅莉", "扎尔", "梅娅", "古斯", "艾拉"],
  elder: ["艾尔", "蒂娅", "拉尔", "妮尔", "格温", "缪斯"],
};

interface Slot {
  /** 出现条件：地点、身份或出身 */
  when: (s: GameState) => boolean;
  /** 场合标签，写进关系的 metAt */
  metAt: string;
  role: string;
  bond: RelationBond;
  pool: NamePool;
  /** 小传候选。每一条都留了一个可以继续追问的钩子 */
  notes: string[];
  /** 有的身份自带一个不宜公开的一面 */
  secrets?: string[];
}

const residence = (s: GameState) => s.character.residence;
const at = (s: GameState, ...places: string[]) => places.includes(residence(s));

const SLOTS: Slot[] = [
  /* ---------- 阿斯拉王国 · 菲托亚领 ---------- */
  {
    when: (s) => at(s, "布耶纳村", "罗亚町"),
    metAt: "布耶纳村",
    role: "同村的猎户",
    bond: "熟人",
    pool: "human",
    notes: [
      "他教过你怎么看蹄印。他说山里的东西比人诚实。",
      "他每年秋天都会消失两个月，回来时背包总比去时轻。",
    ],
    secrets: ["他替某个不能露面的人往山里带过东西。"],
  },
  {
    when: (s) => at(s, "布耶纳村", "罗亚町"),
    metAt: "布耶纳村",
    role: "磨坊主的女儿",
    bond: "熟人",
    pool: "human",
    notes: ["她认得村里每一条路，也认得每个人家的事。", "她总说这村子太小，小到藏不住任何东西。"],
  },
  {
    when: (s) => at(s, "布耶纳村", "罗亚町") || s.character.originGroup === "commoner",
    metAt: "村里",
    role: "一起长大的伙伴",
    bond: "挚友",
    pool: "human",
    notes: [
      "你们一起挨过打，也一起分过一个偷来的果子。",
      "他什么都敢说，唯独不提自己家里的事。",
    ],
  },

  /* ---------- 王都亚尔斯 ---------- */
  {
    when: (s) => at(s, "王都亚尔斯") || s.character.originGroup === "noble",
    metAt: "王都亚尔斯",
    role: "同辈的贵族子弟",
    bond: "同僚",
    pool: "human",
    notes: [
      "他跟你握手时先看了你的袖口，然后才看你的脸。",
      "他在宴席上很会说话，散席之后谁也不记得他说了什么。",
    ],
    secrets: ["他家的封地账目经不起细看。"],
  },
  {
    when: (s) => at(s, "王都亚尔斯"),
    metAt: "王都亚尔斯",
    role: "老练的管家",
    bond: "熟人",
    pool: "human",
    notes: ["他服务过三任主人，记得每一任是怎么下台的。", "他教你认人，比教认字用心。"],
  },

  /* ---------- 魔法都市夏利亚 · 魔法大学 ---------- */
  {
    when: (s) => at(s, "魔法都市夏利亚") || s.character.college === "拉诺亚魔法大学",
    metAt: "魔法大学",
    role: "同寝室的同学",
    bond: "挚友",
    pool: "human",
    notes: [
      "他半夜还在抄笔记，字越来越飘。",
      "他试过把两种魔术叠在一起，炸掉半张桌子，从此被禁止进实验室。",
    ],
  },
  {
    when: (s) => at(s, "魔法都市夏利亚") || s.character.college === "拉诺亚魔法大学",
    metAt: "魔法大学",
    role: "图书馆的常客",
    bond: "熟人",
    pool: "elder",
    notes: ["他坐的位置永远是同一个，书也永远是同一本。", "他说过一句：禁书区的问题不在书。"],
    secrets: ["他在替某个不署名的人抄录禁书目录。"],
  },

  /* ---------- 剑之圣地 ---------- */
  {
    when: (s) =>
      at(s, "剑之圣地") || s.character.swordSchool !== "无" || s.character.origin === "剑之圣地学徒",
    metAt: "道场",
    role: "同门的师弟",
    bond: "师门",
    pool: "human",
    notes: ["他每天比别人早到一个时辰，进步却比别人慢。", "他把你当成要追上的那个目标。"],
  },
  {
    when: (s) => at(s, "剑之圣地") || s.character.swordSchool !== "无",
    metAt: "道场",
    role: "巡练的剑士",
    bond: "同僚",
    pool: "human",
    notes: ["她走过很多道场，说这里的木剑换得最勤。", "她只肯跟你比一次，比完就走。"],
  },

  /* ---------- 米里斯神圣国 ---------- */
  {
    when: (s) =>
      at(s, "米里希昂") || s.character.faith === "米里斯教团" || s.character.originGroup === "mirees",
    metAt: "教区",
    role: "教区的神父",
    bond: "熟人",
    pool: "human",
    notes: ["他给你讲教义，讲到一半会停下来叹口气。", "他记得每个教民的名字，也记得谁已经很久没来。"],
  },
  {
    when: (s) =>
      at(s, "米里希昂") || s.character.faith === "米里斯教团" || s.character.originGroup === "mirees",
    metAt: "教区",
    role: "神殿骑士",
    bond: "同僚",
    pool: "human",
    notes: ["他把剑当仪仗用，却练得比谁都认真。", "他说过：教团要他去杀的人，他没见过一个。"],
    secrets: ["他手上有一份不该在他手里的名单。"],
  },

  /* ---------- 冒险者公会与迷宫 ---------- */
  {
    when: (s) => s.character.adventurerRank !== "未注册" || at(s, "迷宫都市拉潘"),
    metAt: "冒险者公会",
    role: "同期的冒险者",
    bond: "同僚",
    pool: "human",
    notes: [
      "你们同时入的行，他接的委托总比你快一步。",
      "他把钱都花在装备上，说装备不会背叛人。",
    ],
  },
  {
    when: (s) => s.character.adventurerRank !== "未注册" || at(s, "迷宫都市拉潘"),
    metAt: "冒险者公会",
    role: "公会的受付",
    bond: "熟人",
    pool: "human",
    notes: ["她记得每个常客的等级，也记得谁上次差点没回来。", "她劝你少接一单的时候，通常是真的该少接一单。"],
  },
  {
    when: (s) => at(s, "迷宫都市拉潘"),
    metAt: "迷宫",
    role: "老练的斥候",
    bond: "师门",
    pool: "elder",
    notes: ["他教你在迷宫里怎么数脚步声。", "他从不走在队伍最后，理由从来没说过。"],
    secrets: ["他上一次带队进去，只回来他一个。"],
  },
  {
    when: (s) => s.character.adventurerRank !== "未注册",
    metAt: "酒馆",
    role: "落魄的佣兵",
    bond: "熟人",
    pool: "human",
    notes: ["他喝到第三杯才开始讲当年。", "他说自己只是运气差，说了很多年。"],
  },

  /* ---------- 魔大陆 ---------- */
  {
    when: (s) => at(s, "米格路德族之村") || s.character.originGroup === "demon",
    metAt: "部族",
    role: "同族的少年",
    bond: "挚友",
    pool: "demon",
    notes: ["他用念话跟你说话，你只能用嘴回答，他觉得这很有趣。", "他把部族外面的世界想成了另一种样子。"],
  },
  {
    when: (s) => at(s, "米格路德族之村") || s.character.originGroup === "demon",
    metAt: "部族",
    role: "部族的猎人",
    bond: "同僚",
    pool: "demon",
    notes: ["他教你怎么在沙里找水。", "他对人族没有敌意，也没有好感。"],
  },

  /* ---------- 兽族与大森林 ---------- */
  {
    when: (s) => s.character.originGroup === "beast",
    metAt: "大森林",
    role: "同村的猎手",
    bond: "挚友",
    pool: "beast",
    notes: ["你们比过谁先爬上那棵树，谁也没赢。", "她说森林会记住每个进来过的人。"],
  },
  {
    when: (s) => s.character.originGroup === "beast",
    metAt: "大森林",
    role: "族里的长者",
    bond: "师门",
    pool: "beast",
    notes: ["他讲兽神的时候不看天，看地。", "他说预言这种东西，多半是给活人找的借口。"],
  },

  /* ---------- 旅途与边境 ---------- */
  {
    when: () => true,
    metAt: "旅途",
    role: "同路的旅人",
    bond: "熟人",
    pool: "human",
    notes: ["他走的路和你有一段重叠，仅此而已。", "他背的包里有个从来不打开的小盒子。"],
    secrets: ["他换了名字，而且不打算换回去。"],
  },
  {
    when: (s) => s.character.status === "贵族子弟" || s.character.status === "平民",
    metAt: "集市",
    role: "常来赶集的行商",
    bond: "熟人",
    pool: "human",
    notes: ["他的价钱永远比别家高一点，货也好一点。", "他每次来都会顺口带一句远方的消息。"],
  },
];

/** 场合遇合的总量上限。超过之后，最淡的旧识会自然淡出 */
export const ACQUAINTANCE_LIMIT = 28;

/** 已认识的人名，避免重名 */
function usedNames(s: GameState): Set<string> {
  return new Set(s.relations.map((r) => r.name));
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length) % arr.length];
}

/**
 * 按玩家当下的处境挑一个场合，生成一位新认识的人。
 * 条件不成立或名字用尽时返回 null，由调用方决定跳过。
 */
export function meetAcquaintance(s: GameState, rng: () => number): Relation | null {
  const pool = SLOTS.filter((slot) => slot.when(s));
  if (pool.length === 0) return null;
  const slot = pick(rng, pool);

  const taken = usedNames(s);
  const candidates = NAME_POOLS[slot.pool].filter((n) => !taken.has(n));
  if (candidates.length === 0) return null;

  // 好感起步：挚友与师门给得高一些，其余是刚认识
  const base = slot.bond === "挚友" ? 3 : slot.bond === "师门" ? 2 : 1;
  const stars = Math.min(5, Math.max(1, base + (rng() < 0.25 ? 1 : 0)));

  return withBirthYear(
    {
      name: pick(rng, candidates),
      role: slot.role,
      stars,
      note: pick(rng, slot.notes),
      secret: slot.secrets && rng() < 0.6 ? pick(rng, slot.secrets) : undefined,
      bond: slot.bond,
      metAt: slot.metAt,
      // 遇合跟着场合走：你在哪儿碰上他，他就在哪儿
      place: s.character.residence,
    },
    s.year,
  );
}

/** 遇合时写进纪事的一句话。语气跟着关系性质走 */
export function acquaintanceLine(rel: Relation): string {
  const where = rel.metAt ?? "路上";
  switch (rel.bond) {
    case "挚友":
      return `在${where}，你和一个人熟了起来。他叫${rel.name}，${rel.role}。`;
    case "师门":
      return `在${where}，一位${rel.role}愿意指点你几句。他叫${rel.name}。`;
    case "同僚":
      return `在${where}，你认识了${rel.name}。他是${rel.role}，往后大概还会遇上。`;
    default:
      return `在${where}，你和${rel.name}搭上了话。他是${rel.role}。`;
  }
}

/* ---------- 关系互动 ---------- */

export interface RelationActionDef {
  id: string;
  label: string;
  /** 需要的好感门槛 */
  minStars: number;
  detail: string;
  /** 成事之后把这个人立为配偶。只有求婚用得上 */
  marksSpouse?: boolean;
  /** 本地结算，不经过模型：结果随好感与一点运气浮动 */
  run: (rel: Relation, rng: () => number) => { lines: string[]; effects: EventEffects; ok?: boolean };
}

/**
 * 关系互动。这是关系网真正开始推动剧情的地方：
 * 每一次互动占一次行动，换回来的不只是好感，还可能是消息、人情与线索。
 */
export const RELATION_ACTIONS: RelationActionDef[] = [
  {
    id: "chat",
    label: "闲谈几句",
    minStars: 1,
    detail: "不图什么，就是聊聊。有时候闲聊比打听更有用。",
    run: (rel, rng) => {
      const gain = rng() < 0.55 + rel.stars * 0.06;
      return {
        lines: [
          `你找到${rel.name}，两个人站在那儿说了一会儿话。`,
          gain ? "说到后来，有些话他没打算说，还是说了。" : "这次没说什么要紧的。",
        ],
        effects: {
          stats: { charm: gain ? 2 : 1 },
          energy: -8,
          starDelta: gain ? { match: rel.name, delta: 1 } : undefined,
        },
      };
    },
  },
  {
    id: "help",
    label: "帮他一把",
    minStars: 2,
    detail: "搭把手，花掉一些工夫与钱。人情是这样攒起来的。",
    run: (rel, rng) => {
      const well = rng() < 0.7;
      return {
        lines: [
          `你替${rel.name}把这件事办了。`,
          well ? "他没多说什么，但往后提起你的时候，语气会不一样。" : "事情办得不太顺，不过他知道你出了力。",
        ],
        effects: {
          stats: { fame: well ? 3 : 1, wealth: -30 },
          energy: -14,
          goal: 3,
          starDelta: { match: rel.name, delta: well ? 1 : 0 },
        },
      };
    },
  },
  {
    id: "gift",
    label: "送一份人情",
    minStars: 2,
    detail: "挑一件对方用得上、又不显得刻意的东西。",
    run: (rel, rng) => {
      const fits = rng() < 0.75;
      return {
        lines: [
          `你把东西递过去，${rel.name}推辞了一下才收下。`,
          fits ? "看得出来，他确实需要这个。" : "他收下了，但没放在用得着的地方。",
        ],
        effects: {
          stats: { wealth: -60, charm: 1 },
          starDelta: { match: rel.name, delta: fits ? 2 : 1 },
        },
      };
    },
  },
  {
    id: "ask",
    label: "请他帮个忙",
    minStars: 4,
    detail: "只有交情到了才开得了这个口。办成办不成，都会留下点什么。",
    run: (rel, rng) => {
      const ok = rng() < 0.55 + rel.stars * 0.07;
      const stats: Record<string, number> = ok ? { scheme: 3, int: 2 } : { int: 1 };
      return {
        lines: [
          `你把这个难处跟${rel.name}说了。`,
          ok
            ? "他想了想，说可以试试。这件事有了一条你原本找不到的路。"
            : "他沉默了一会儿，说他帮不上。你从他脸上看得出，他不太想谈这个。",
        ],
        effects: {
          stats,
          goal: ok ? 8 : 0,
          energy: -10,
          notice: ok ? `${rel.name}愿意替你在那件事上想办法。` : undefined,
          rumor: ok ? `听说${rel.name}最近在替人打听一件事。` : undefined,
        },
      };
    },
  },
  {
    id: "propose",
    label: "把话说明白",
    minStars: 5,
    detail: "交情到顶了才开得了这个口。成了，往后就是一个家的人。",
    marksSpouse: true,
    run: (rel, rng): { lines: string[]; effects: EventEffects; ok?: boolean } => {
      // 好感满星也未必一次就成：这事本来就没有稳的
      const ok = rng() < 0.6;
      return {
        ok,
        lines: ok
          ? [
              `你把话说了。${rel.name}很久没出声。`,
              "最后他点了点头，说得告诉家里一声。",
            ]
          : [
              `你把话说了。${rel.name}听完，先笑了一下。`,
              "他说再等等。他没说等什么，也没说等到什么时候。",
            ],
        effects: ok
          ? {
              stats: { charm: 4, fame: 3 },
              goal: 12,
              energy: -10,
              starDelta: { match: rel.name, delta: 1, note: "你和他把这件事说定了" },
              notice: `${rel.name}答应了。你们成了一个家的人。`,
              rumor: `有人在打听${rel.name}最近是不是定了亲。`,
            }
          : {
              stats: { int: 3, scheme: 2 },
              energy: -12,
              starDelta: { match: rel.name, delta: -1, note: "你开口太早了" },
            },
      };
    },
  },
];

/** 羁绊角色是否够格主动来找你 */
export const CONTACT_MIN_STARS = 4;

/**
 * 羁绊角色的开场白。语气按关系性质分开写，
 * 这样同一句「有人来找你」，师门、挚友、宿敌读起来是三个人。
 */
const OPENERS: Record<RelationBond, string[]> = {
  血亲: [
    "「你最近回过家吗。」这句话问得很轻，像是随口一提。",
    "「饭吃了没有。」她先问这个，才说别的事。",
  ],
  师门: [
    "「你上次那个动作还是错的。」他一见面就说这个。",
    "「最近练了没有。」他问得很直接，也不打算听客套话。",
  ],
  挚友: [
    "「有点事想跟你说。」他坐下才想起来该先打个招呼。",
    "「你最近是不是有心事。」他看人一向很准。",
  ],
  恋情: [
    "「我有话想跟你说。」她说完就别开了脸。",
    "「你忙的话我改天再来。」他说是这么说，人已经坐下了。",
  ],
  宿敌: [
    "「好久不见。」他说这话的时候，手没有离开剑柄。",
    "「听说你最近过得不错。」他从不说祝贺的话。",
  ],
  同僚: [
    "「有件事，你大概会想知道。」他把声音压低了。",
    "「上面给了个差事，我想问问你有没有兴趣。」",
  ],
  熟人: [
    "「正巧路过，就想来看看你。」",
    "「听说你在这儿，我绕了点路。」",
  ],
};

export function openingLine(rel: Relation, rng: () => number): string {
  return pick(rng, OPENERS[rel.bond ?? "熟人"]);
}
