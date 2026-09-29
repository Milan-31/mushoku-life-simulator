import type { DecisionEventDef } from "../engine/events";
import { RUDEUS_NAME } from "./rudeus";

/**
 * 原作事件名录。
 *
 * 这些事件全部来自《无职转生》原作的时间线与人物线，写成抉择事件后会并入引擎的抉择池。
 * 两条规矩：
 * - 不可改变的锚点（保罗之死、洛琪希之死、菲托亚领转移、拉普拉斯复活）只允许改变「你在这个事件里的位置」，
 *   不允许改写事件本身。所以选项的后果里，锚点照常发生，只有玩家自己的处境会变。
 * - 高级招式只能由事件或强大角色亲手给出，因此本名录是「高级技能」的第二条合法来源。
 */

const has = (s: { stats: { key: string; value: number }[] }, key: string, need: number) =>
  (s.stats.find((x) => x.key === key)?.value ?? 0) >= need;
const isRudyEra = (s: { character: { era: string } }) =>
  s.character.era === "鲁迪乌斯时代" || s.character.era === "战后时代";
const inFittoa = (s: { character: { residence: string } }) => ["布耶纳村", "罗亚町"].includes(s.character.residence);
const atCollege = (s: { character: { college: string; residence: string; origin: string } }) =>
  s.character.college === "拉诺亚魔法大学" || s.character.residence === "魔法都市夏利亚" || s.character.origin.includes("大学");
const atSanctuary = (s: { character: { origin: string; residence: string; swordSchool: string } }) =>
  s.character.origin.includes("剑之圣地") || s.character.residence === "剑之圣地" || s.character.swordSchool === "剑神流";
const inDemon = (s: { character: { originGroup: string; residence: string } }) =>
  s.character.originGroup === "demon" || s.character.residence === "米格路德族之村";
const rankAt = (s: { character: { adventurerRank: string } }, ranks: string[]) =>
  ranks.includes(s.character.adventurerRank);
const HIGH = ["圣级", "王级", "帝级", "神级"];

export const CANON_EVENTS: DecisionEventDef[] = [
  {
    id: "canon-sylphie",
    title: "村口的石头",
    when: (s) => isRudyEra(s) && inFittoa(s) && s.character.age <= 16,
    weight: 1.4,
    body: [
      "几个孩子围着一个人扔石头。被围的那个有对很长的耳朵，一声不出，只抱着头。",
      "围观的人不少，没有一个走过去。",
    ],
    options: [
      {
        id: "shield",
        label: "站到那孩子前面",
        risk: "低",
        lines: [
          "你挡在中间，石头砸在你背上。扔石头的人骂了几句就散了。",
          "那孩子抬起头看你，眼睛很亮。她说她叫希露菲叶特。",
        ],
        outcome: {
          stats: { charm: 6, fame: 3 },
          starDelta: { match: "希露菲叶特", delta: 2, note: "你替她挡了石头" },
          notice: "你与希露菲叶特成了朋友。",
        },
      },
      {
        id: "teach",
        label: "赶走他们，再教她一手能自保的",
        risk: "低",
        lines: [
          "你赶走那几个人，然后教她把手心的风推出去。",
          "她学得极快。快到你开始怀疑，到底是谁在教谁。",
        ],
        outcome: {
          stats: { charm: 4, mana: 4 },
          starDelta: { match: "希露菲叶特", delta: 3, note: "她把你当成第一个老师" },
          learnSkill: "mg_air_burst",
        },
      },
      {
        id: "ignore",
        label: "低头走开",
        risk: "低",
        lines: ["你走开了。石头砸下去的声音，隔了很远还听得见。", "那天夜里你睡得很浅。"],
        outcome: { stats: { charm: -2, scheme: 2 } },
      },
    ],
  },
  {
    id: "canon-roxy",
    title: "老师要走了",
    when: (s) => isRudyEra(s) && inFittoa(s) && s.character.magicTier !== "未觉醒",
    weight: 1.3,
    body: [
      "教了你一段时间的魔术师要走了。她个子比你还小，收拾行李时很安静。",
      "临走前她问你：有没有哪一手，你还没学会。",
    ],
    options: [
      {
        id: "beg",
        label: "请她把最难的那手教完",
        risk: "低",
        lines: [
          "她停下手里的活，把魔杖重新放回你手上。",
          "「看好了。水不是砸下去的，是让它自己落下去。」",
        ],
        outcome: {
          stats: { mana: 8, int: 4 },
          starDelta: { match: "洛琪希", delta: 2, note: "她把自己会的东西留给了你" },
          learnSkill: "mg_waterfall",
          notice: "洛琪希离开前，把水系统的基础留给了你。",
        },
      },
      {
        id: "wait",
        label: "送她走，以后自己练",
        risk: "低",
        lines: ["你把她送到村口，看她走远。", "你说的最后一句是「再见」，不是「等我」。"],
        outcome: { tier: { kind: "magic", gain: 14 }, stats: { int: 3 } },
      },
    ],
  },
  {
    id: "canon-kish",
    title: "角落里那个话多的人",
    when: (s) => isRudyEra(s) && has(s, "fame", 22),
    weight: 1.2,
    body: [
      "一个不爱动的男人坐在角落，酒要得很勤，话也多。他听完你这一路的事，笑了一下。",
      "「你这个人，我记住了。」他说得像句客气话，可你不觉得那是客气。",
    ],
    options: [
      {
        id: "listen",
        label: "认真听一次，并照做",
        risk: "中",
        lines: [
          "他给的建议确实有用。照他说的走，你少绕了半个月的弯路。",
          "事后你回想，他每句话都对，对得像提前知道结果。",
        ],
        outcome: {
          stats: { scheme: 10, int: 3 },
          starDelta: { match: "基斯", delta: 1, note: "他开始留意你" },
          threads: { humanGod: "有个人给你的建议，准得不像话。你还没想明白这意味着什么。" },
          notice: "基斯记住了你。你不知道这是好事还是坏事。",
        },
      },
      {
        id: "pay",
        label: "谢过他，请他喝一轮，然后不再联系",
        risk: "低",
        lines: ["你把酒钱结了，起身告辞。他摆摆手，没有留你。", "你出门时背后没有视线——这让你有点不安。"],
        outcome: { stats: { scheme: 5, int: 2 }, energy: 10 },
      },
    ],
  },
  {
    id: "canon-gino",
    title: "最年轻的那个剑圣",
    when: (s) => isRudyEra(s) && atSanctuary(s) && s.character.age >= 10,
    weight: 1.5,
    body: [
      "道场里最出名的不是最强的那个，是最年轻拿到剑圣称号的那个少年。",
      "他握剑的样子懒散，像个不情愿的学徒。有人告诉你，他今年十二岁。",
    ],
    options: [
      {
        id: "challenge",
        label: "向他挑战",
        risk: "中",
        lines: [
          "他赢了，赢得不算吃力。收剑时他说了一句：「你的起手太早了。」",
          "这句话比输掉这场比试值钱得多。",
        ],
        outcome: { tier: { kind: "sword", gain: 22 }, stats: { sword: 6, health: -3, int: 3 } },
      },
      {
        id: "ask",
        label: "请他慢一点，把那一下拆开给你看",
        risk: "低",
        lines: [
          "他愣了一下，然后把那一下拆成三步，做给你看。",
          "「腕落。」他说，「学会这个，至少能保住一条胳膊。」",
        ],
        outcome: {
          tier: { kind: "sword", gain: 12 },
          stats: { sword: 4 },
          learnSkill: "sg_wrist_drop",
          starDelta: { match: "奇诺", delta: 1, note: "他教了你一手" },
        },
      },
    ],
  },
  {
    id: "canon-gal",
    title: "木刀抛过来的时候",
    when: (s) => isRudyEra(s) && atSanctuary(s) && ["上级", ...HIGH].includes(s.character.swordTier),
    weight: 1.6,
    body: [
      "剑神加尔·法利昂走到场中央，把木刀抛给你。",
      "「挡一刀。」他说，「挡得住，我教你别的。」",
    ],
    options: [
      {
        id: "hold",
        label: "站定，接他这一刀",
        risk: "高",
        lines: [
          "你什么都没看见。木刀停在你颈侧，比你的意识还早到。",
          "「看见了没有？」他问，「这就是无音之太刀。挥斩的时候，刀身不该有声音。」",
        ],
        outcome: {
          tier: { kind: "sword", gain: 40 },
          stats: { sword: 12, health: -6 },
          learnSkill: "sg_silent_blade",
          factions: { 剑之圣地: 15 },
          notice: "你在剑神的试炼里站住了，剑神流的上位技法向你打开。",
        },
      },
      {
        id: "step",
        label: "侧身避开，不接",
        risk: "中",
        lines: [
          "你避开了。他没有追第二刀，只是收了手。",
          "「会躲，也算本事。」他转身走了，「回去吧，练到敢接为止。」",
        ],
        outcome: { tier: { kind: "sword", gain: 18 }, stats: { sword: 4, int: 4 }, energy: -12 },
      },
      {
        id: "refuse",
        label: "摇头，退下场",
        risk: "低",
        lines: [
          "你退到场边。没有人笑你，道场里输给剑神不是丢脸的事。",
          "但你自己记下了这一刻。",
        ],
        outcome: { stats: { int: 3, sword: 2 }, goal: 8 },
      },
    ],
  },
  {
    id: "canon-reida",
    title: "水神的一转",
    when: (s) => isRudyEra(s) && atSanctuary(s) && s.character.swordSchool === "水神流" && ["上级", ...HIGH].includes(s.character.swordTier),
    weight: 1.5,
    body: [
      "水神蕾伊达·莉亚来看过一次道场。她年纪很大，出手却比谁都轻。",
      "她让你朝她劈一刀。刀出去之后，她只是把剑转了一个很小的角度。",
    ],
    options: [
      {
        id: "ask-art",
        label: "请教这一转的道理",
        risk: "中",
        lines: [
          "「水神流不是防，是后的先。」她说，「你先出手，所以我先到。」",
          "她把初代水神留下的奥义之一，一步一步喂给了你。",
        ],
        outcome: {
          tier: { kind: "sword", gain: 34 },
          stats: { sword: 10, int: 6 },
          learnSkill: "wg_nagare",
          factions: { 剑之圣地: 10 },
          notice: "你在水神门下学到了真正的一手。",
        },
      },
      {
        id: "ask-seal",
        label: "求她展示那道「剝奪剣界」",
        risk: "高",
        lines: [
          "她沉默了一会儿，让你出刀。你的刀到半途就没有了——不是被挡开，是不存在于那个位置上。",
          "「你现在学它，只会学成一个壳。」她说。",
        ],
        outcome: {
          tier: { kind: "sword", gain: 20 },
          stats: { sword: 6, int: 8, health: -4 },
          goal: 10,
          notice: "你见过水神流的第六道奥义，但还没到能学的份上。",
        },
      },
    ],
  },
  {
    id: "canon-cliff",
    title: "比你矮一头的天才",
    when: (s) => isRudyEra(s) && atCollege(s),
    weight: 1.4,
    body: [
      "实验室里有个比你矮一头的人，正对着一堆碎掉的魔法阵挑刺。他头也不抬：「别碰，这是精密的东西。」",
      "他自称天才，而且说得很响。",
    ],
    options: [
      {
        id: "help",
        label: "留下来帮他做这个实验",
        risk: "低",
        lines: [
          "你按他说的递材料、记数据，一直忙到灯快烧完。",
          "他最后承认你「还算有点用」，顺手给你画了一张结界术的图。",
        ],
        outcome: {
          stats: { int: 8, mana: 5 },
          starDelta: { match: "克里夫", delta: 2, note: "他把你当成可用的人" },
          learnSkill: "mg_binding",
        },
      },
      {
        id: "mock",
        label: "笑他两句就走",
        risk: "低",
        lines: ["你笑了一声。他抬起头瞪了你一眼，那眼神很记仇。", "你走出实验室，觉得外面的空气比里头舒服。"],
        outcome: { stats: { scheme: 3, int: 2 }, starDelta: { match: "克里夫", delta: -1 } },
      },
    ],
  },
  {
    id: "canon-nanahoshi",
    title: "图书馆最里面那个人",
    when: (s) => isRudyEra(s) && atCollege(s),
    weight: 1.3,
    body: [
      "图书馆最里面永远坐着同一个人，穿着不属于这个国家的衣服。她不应答任何人。",
      "这一次，她手上的书掉了一本，正好落在你脚边。",
    ],
    options: [
      {
        id: "help",
        label: "把书捡起来，放回她桌上",
        risk: "低",
        lines: [
          "她说了声谢谢，声音很短。你瞥见书页上密密麻麻的算式。",
          "「无咏唱。」她忽然说，「你们这儿的人当它是才能，其实只是把咏唱压进呼吸里。」",
        ],
        outcome: {
          stats: { mana: 8, int: 6 },
          starDelta: { match: "七星", delta: 1, note: "她记住了你，但只记住了脸" },
          learnSkill: "mg_chantless",
          notice: "七星静香顺手点破了无咏唱施法的窍门。",
        },
      },
      {
        id: "leave",
        label: "不打扰她",
        risk: "低",
        lines: ["你把书放在她桌角，退开了。", "她连头都没有抬。"],
        outcome: { stats: { int: 3 }, energy: 5 },
      },
    ],
  },
  {
    id: "canon-zanoba",
    title: "手指很粗的那个人",
    when: (s) => isRudyEra(s) && (atCollege(s) || s.character.residence === "西隆王国"),
    weight: 1.3,
    body: [
      "有人给你看了一尊人偶。做工极好，关节能转，眼睛像在看人。",
      "「我要的是这种。」端详它的人手指很粗，捧着它却很轻，「你能帮我找到做它的人吗。」",
    ],
    options: [
      {
        id: "accept",
        label: "答应下来",
        risk: "中",
        lines: [
          "你按他给的线索跑了几个城镇，最后在奴隶市场找到一个手上有老茧的少女。",
          "他没有道谢，只是当场把价付清，然后把一件刻着魔力纹的东西塞给你。",
        ],
        outcome: {
          stats: { wealth: 90, int: 6 },
          starDelta: { match: "扎诺巴", delta: 2, note: "他把你算进自己的计划" },
          notice: "你替扎诺巴找到了会做人偶的人。",
        },
      },
      {
        id: "decline",
        label: "推掉，说你不擅长这种事",
        risk: "低",
        lines: ["你推掉了。他看着你，脸上没什么表情，转头就去找下一个。", "这个人不会因为被拒绝而生气——这反而更让人记着。"],
        outcome: { stats: { int: 3 } },
      },
    ],
  },
  {
    id: "canon-ruijerd",
    title: "额上嵌着红宝石的人",
    when: (s) => isRudyEra(s) && inDemon(s) && s.character.age >= 12,
    weight: 1.5,
    body: [
      "沙漠边缘坐着一个斯佩路德族。他先把刀解下来放在脚边，才开口跟你说话。",
      "「我不是来抢东西的。」他说得很慢，「我只是想问问路。」",
    ],
    options: [
      {
        id: "walk",
        label: "与他同行一段",
        risk: "中",
        lines: [
          "他话很少，但一路把该挡的都挡了。你学会一件事：他拔刀之前，先放下的总是自己的刀。",
          "分开时他说：「别因为一族的名声去看人。」",
        ],
        outcome: {
          tier: { kind: "adventure", gain: 28 },
          stats: { fame: 5, sword: 5, scheme: 4 },
          starDelta: { match: "瑞杰路德", delta: 2, note: "他认你是可以同行的人" },
          learnSkill: "ng_adapt",
        },
      },
      {
        id: "guide",
        label: "只给他指路，然后走开",
        risk: "低",
        lines: ["你指了个方向，绕开了。他没有拦你，也没有追。", "走出去很远，你回头看了一眼，他还坐在那里。"],
        outcome: { stats: { int: 3, scheme: 2 } },
      },
    ],
  },
  {
    id: "canon-labyrinth",
    title: "迷宫深处的求救",
    // 原作模式里这一场由专属事件链（rud-labyrinth）接手，前提与结局都写在那里
    when: (s) => s.character.name !== RUDEUS_NAME && isRudyEra(s) && s.year >= 422 && rankAt(s, ["D", "C", "B", "A", "S"]),
    weight: 3,
    body: [
      "消息传开：贝卡利特大陆的转移迷宫深处困着一个人。有人正在组救援队。去的人不少，回来的说法不多。",
      "组队的人里有一个名字你很熟：保罗·格雷拉特。",
    ],
    options: [
      {
        id: "join",
        label: "跟着队伍深入迷宫",
        risk: "高",
        lines: [
          "你到了最下面那层。守着深处的是九头龙海德拉，九个头轮流扑来，没有空隙。",
          "队伍活着出来了。保罗没有。他把一个人推开，自己被咬住，剩下的都被带了出去。",
        ],
        outcome: {
          tier: { kind: "adventure", gain: 44 },
          stats: { fame: 12, sword: 6, health: -14 },
          lifespan: -2,
          factions: { 冒险者公会: 12 },
          starDelta: { match: "保罗", delta: 2, note: "他把你推出了那一口的范围" },
          notice: "保罗·格雷拉特死在了转移迷宫里。这件事无法改变，但你在他身边。",
        },
      },
      {
        id: "support",
        label: "留在迷宫外接应",
        risk: "中",
        lines: [
          "你在入口守了六天，看人一批批下去，又一批批上来。",
          "第七天他们抬着一个人出来。你不必问也知道那是谁。",
        ],
        outcome: {
          tier: { kind: "adventure", gain: 18 },
          stats: { fame: 4, int: 4, health: -3 },
          notice: "你在转移迷宫外见证了一场没有胜者的救援。",
        },
      },
      {
        id: "refuse",
        label: "不去。那不是你能管的事",
        risk: "低",
        lines: ["你没有去。消息是后来才传到你耳朵里的。", "你听完，什么也没说。"],
        outcome: { stats: { scheme: 4, int: 2 }, lifespan: 1 },
      },
    ],
  },
  {
    id: "canon-perugius",
    title: "石碑旁边吹响笛子",
    // 龙王之笛这条线在甲龙历 429 年之后才接得上：甲龙王那时才为齐格哈鲁特赐名
    when: (s) => s.year >= 429 && has(s, "fame", 58),
    weight: 2,
    body: [
      "一块石碑上刻着斗神语的「七」，周围环着七道纹样。石面冰冷，其中一道纹样在发亮。",
      "有人告诉过你：在这块石头旁吹响甲龙王的笛子，会有人来接你。",
    ],
    options: [
      {
        id: "blow",
        label: "吹响那支笛子",
        risk: "高",
        lines: [
          "笛声很短。云层里有东西动了一下，落下来一个人。",
          "「甲龙王要见你。」她说，「只有一句话的时间。」",
        ],
        outcome: {
          stats: { fame: 14, int: 6 },
          addRelation: {
            name: "轰雷的克里亚奈特",
            role: "五龙将",
            stars: 2,
            note: "她奉命来接你，只说了该说的话。",
            bond: "熟人",
            canonId: "kalia",
            lore: "轰雷的克里亚奈特，甲龙王的五龙将之一，在石碑附近听到笛声便会前来接引。",
          },
          notice: "你用龙王之笛换到了一次上天空之城的机会。",
        },
      },
      {
        id: "hide",
        label: "把笛子收起来，转身离开",
        risk: "低",
        lines: ["你把笛子塞回怀里，快步走开。那么多年的传闻，你决定继续把它当传闻。", "石碑上的纹样慢慢暗了下去。"],
        outcome: { stats: { int: 3, scheme: 3 }, lifespan: 1 },
      },
    ],
  },
  {
    id: "canon-laplace",
    title: "裂缝里的旧气味",
    when: (s) => s.year >= 425,
    weight: 2.4,
    body: [
      "魔大陆深处的地面裂开一道缝。缝里没有风，只有一种很旧、很沉的气味。",
      "同一天，各地石碑上名字最靠前的那一位，纹样全都暗了一瞬。",
    ],
    options: [
      {
        id: "report",
        label: "把这件事报给魔术公会与公会分部",
        risk: "低",
        lines: [
          "公会把你的记录封存归档，给你一份不算多的报酬，外带一句「不要再靠近」。",
          "你知道自己做过什么，也知道自己太小了。",
        ],
        outcome: {
          stats: { int: 6, scheme: 5 },
          factions: { 魔术公会: 10, 冒险者公会: 8 },
          notice: "你上报了封印异动。有人记下了你的名字。",
        },
      },
      {
        id: "look",
        label: "自己下到缝里看一眼",
        risk: "高",
        lines: [
          "你在下面走了很久，直到连回声都没有。你在墙上摸到一段不属于任何已知文字的刻痕。",
          "上来之后，你的耳朵里有几天一直响着低音。",
        ],
        outcome: {
          stats: { int: 8, mana: 6, health: -8 },
          lifespan: -2,
          threads: { dragonGod: "你在拉普拉斯的封印下摸到了一段刻痕。有人会因此注意到你。" },
          notice: "你亲眼见过拉普拉斯的封印，也为此付出了代价。",
        },
      },
    ],
  },
];

export function canonEventById(id: string): DecisionEventDef | undefined {
  return CANON_EVENTS.find((e) => e.id === id);
}
