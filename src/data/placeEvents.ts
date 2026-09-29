import type { DecisionEventDef } from "../engine/events";

/**
 * 原作地点的时间点事件。
 *
 * 每个地点都有属于它自己的戏，而这些戏只在对应的时间段里等在那里：
 * 甲龙历 417 年以前没有人会在魔大陆的村子里跟你说转移的事，
 * 435 年以前西隆王宫也不会发生那场政变。
 *
 * 所以这些事件的 when 是「你人在那儿」加上「时间到了」。
 * 不触发就说明你不在场，或者来早/来晚了——这正是错过。
 *
 * 与 canonEvents 的分工：那一份写人物与锚点，这一份写地方与年份。
 */

const at = (s: { character: { residence: string } }, ...residences: string[]) =>
  residences.includes(s.character.residence);
const statOf = (s: { stats: { key: string; value: number }[] }, key: string) => s.stats.find((x) => x.key === key)?.value ?? 0;
const has = (s: { stats: { key: string; value: number }[] }, key: string, need: number) => statOf(s, key) >= need;
const rankAt = (s: { character: { adventurerRank: string } }, ranks: string[]) => ranks.includes(s.character.adventurerRank);
const hasFlag = (s: { flags?: string[] }, flag: string) => (s.flags ?? []).includes(flag);

export const PLACE_EVENTS: DecisionEventDef[] = [
  {
    id: "place-buena-harvest",
    title: "秋收之后的那一场酒",
    when: (s) => at(s, "布耶纳村") && s.year >= 414 && s.year <= 418,
    weight: 1.6,
    body: [
      "麦子进了仓，村里照例摆一场酒。父亲被几个男人围着，灌得脸上发光。",
      "他大声讲了半件旧事，讲到一半忽然停了，自己给自己倒满。",
    ],
    options: [
      {
        id: "ask",
        label: "等人散了，问他刚才没讲完的那半件",
        risk: "低",
        lines: [
          "他沉默了很久，只说是很多年以前的事，跟一个家有关。",
          "「有些门是自己走出去的，不是被赶出去的。」他说完这句就不肯再说了。",
        ],
        outcome: {
          stats: { int: 4, scheme: 3, charm: 2 },
          goal: 5,
          starDelta: { match: "保罗", delta: 1, note: "他难得跟你讲了半件旧事" },
          notice: "你从父亲嘴里听到了半件旧事，关于他离开家的那一年。",
        },
      },
      {
        id: "drink",
        label: "陪他喝完这一场",
        risk: "低",
        lines: [
          "你替他挡了几轮，最后两个人一起被人抬回院子。",
          "第二天他什么都没提，只是把院墙又补高了一截。",
        ],
        outcome: {
          stats: { charm: 5, health: -3 },
          starDelta: { match: "保罗", delta: 1, note: "你替他挡了酒" },
          goal: 3,
        },
      },
      {
        id: "leave",
        label: "回屋，不去听那些大人的话",
        risk: "低",
        lines: ["你回屋了。外面的笑声一直到后半夜才散。", "你在灯下把该背的东西背完了。"],
        outcome: { stats: { int: 3 }, energy: 6 },
      },
    ],
  },
  {
    id: "place-roa-tutor",
    title: "伯雷亚斯家要找一位家教",
    when: (s) => at(s, "罗亚町", "布耶纳村") && s.year >= 414 && s.year <= 417 && statOf(s, "mana") >= 40,
    weight: 2,
    body: [
      "宅邸的管事找上门，说要给家里那位千金请一位教魔术的人。条件写得很清楚：年纪小一点，别怕她。",
      "他补了一句：「上一个教了三天就走了。」",
    ],
    options: [
      {
        id: "take",
        label: "接下这份差事",
        risk: "中",
        lines: [
          "你第一次上课，那位千金差点用剑把你的教本劈成两半。",
          "门外站着一位兽族的剑士，一直在看你的手。她告诉你，她叫基列奴。",
        ],
        outcome: {
          tier: { kind: "magic", gain: 16 },
          stats: { int: 5, charm: 4, fame: 5, wealth: 80 },
          goal: 6,
          factions: { 阿斯拉王国: 6 },
          notice: "你成了伯雷亚斯家那位千金的家教。",
        },
      },
      {
        id: "decline",
        label: "推掉。你还有自己的事",
        risk: "低",
        lines: ["管事没有多劝，只留了个地址就走了。", "你把那张纸夹进书里，后来再没翻到过。"],
        outcome: { stats: { int: 2, scheme: 3 }, energy: 8, goal: 2 },
      },
    ],
  },
  {
    id: "place-ars-factions",
    title: "王座下面有三个影子",
    when: (s) => at(s, "王都亚尔斯") && s.year >= 428,
    weight: 1.8,
    body: [
      "王都近来安静得反常。第一王子派、第二王子派、第二王女派，三家都收着自己的手。",
      "有人把一封没有落款的请帖塞进了你的门缝。",
    ],
    options: [
      {
        id: "go",
        label: "赴约，听听对方要什么",
        risk: "高",
        lines: [
          "那人没有自我介绍，只问了你三个问题。",
          "你答得很慢，答完之后他点了点头，说「以后会有用得着你的地方」。",
        ],
        outcome: {
          stats: { scheme: 9, int: 4, fame: 5 },
          goal: 5,
          factions: { 阿斯拉王国: 10 },
          notice: "你被王都的某一家看中了。是福是祸还不清楚。",
        },
      },
      {
        id: "burn",
        label: "把请帖烧了",
        risk: "低",
        lines: ["你把帖子烧了，灰倒进水里。", "你决定不玩这场游戏。至少这一次。"],
        outcome: { stats: { scheme: -4, faith: 3, int: 2 }, lifespan: 1 },
      },
      {
        id: "probe",
        label: "先查清楚是谁递的，再决定",
        risk: "中",
        lines: [
          "你摸了一个月，摸出帖子的来路。那一家离王座最近，也离王座最远。",
          "想清楚之后，你把帖子放回了门缝里。",
        ],
        outcome: { stats: { scheme: 7, int: 5 }, goal: 4, notice: "你查清了王都那张请帖的来路。" },
      },
    ],
  },
  {
    id: "place-sharia-special",
    title: "特殊生的名额",
    when: (s) => at(s, "魔法都市夏利亚") && s.year >= 420 && !hasFlag(s, "shariaEnrolled"),
    weight: 2,
    body: [
      "拉诺亚魔法大学的教务处在招特殊生：不必按年上课，只需把名字借给学校，学校把你的魔力记进档案。",
      "审查官看了你一会儿，问：「你自己觉得，你算不算特殊？」",
    ],
    options: [
      {
        id: "sit",
        label: "让他审。该问什么就问什么",
        risk: "中",
        lines: [
          "他们测了三天。第三天下午，审查官把一份名册推过来，让你签字。",
          "从这一天起，你的名字写在夏利亚的档案上。",
        ],
        outcome: {
          stats: { int: 6, mana: 4, fame: 4 },
          goal: 5,
          factions: { 魔法大学: 14, 魔术公会: 8 },
          flag: "shariaEnrolled",
          notice: "你以特殊生的身份被记进了拉诺亚魔法大学的名册。",
        },
      },
      {
        id: "walk",
        label: "不签。你不想被记进任何人的册子",
        risk: "低",
        lines: ["你把名册推了回去。审查官没有挽留，只说了句「随时可以再来」。", "你走出校门，天正好。"],
        outcome: { stats: { int: 3, scheme: 3 }, lifespan: 1, energy: 8 },
      },
    ],
  },
  {
    id: "place-mirees-heresy",
    title: "神殿骑士团在找一个不洁者",
    when: (s) => at(s, "米里希昂") && s.year >= 424,
    weight: 1.8,
    body: [
      "骑士团这一趟进山，说是找一个「不洁者」。布告上写的理由很含糊。",
      "他们在城门设了卡，逐个问话。轮到你了。",
    ],
    options: [
      {
        id: "answer",
        label: "照着规矩答",
        risk: "低",
        lines: ["你答得干净。他们放你过去，把名字划在册子上。", "你走出去很远，才想起自己刚才出了一身汗。"],
        outcome: { stats: { faith: 5, scheme: 3 }, factions: { 米里斯教团: 6 } },
      },
      {
        id: "lie",
        label: "替身后那个人挡一句",
        risk: "高",
        lines: [
          "你说那个人跟你走了一路，信的是米里斯，念得出祷词。",
          "骑士看了你三秒，把册子合上了。你不知道是信了，还是懒得查。",
        ],
        outcome: {
          stats: { faith: 3, charm: 5, scheme: 5, fame: 3 },
          factions: { 米里斯教团: -5 },
          notice: "你在米里希昂的城门替一个被追的人说了话。",
        },
      },
      {
        id: "watch",
        label: "什么都不说，看着他们把那个人带走",
        risk: "低",
        lines: ["那人被带走的时候没有喊。", "你在原地站了很久，才想起该往哪儿走。"],
        outcome: { stats: { faith: 3, int: 3, charm: -2 }, goal: 3 },
      },
    ],
  },
  {
    id: "place-migurd-village",
    title: "不会长高的族人",
    when: (s) => at(s, "米格路德族之村") && s.year >= 417,
    weight: 2,
    body: [
      "这个村子里的人过了七岁就不再长高。他们管这叫「长够了」。",
      "村口那户人家的女儿很早以前就走了，走出去再没回来。老两口提起她时，语气跟你提起某个名字时一样。",
    ],
    options: [
      {
        id: "stay",
        label: "留下来住一段，听他们把话讲完",
        risk: "低",
        lines: [
          "老太太拿出一个旧盒子，里面是几封信，字迹很小，写得很密。",
          "她说，女儿在外面当了老师。这句话她说了三遍。",
        ],
        outcome: {
          stats: { int: 5, faith: 4, charm: 3 },
          goal: 5,
          starDelta: { match: "洛琪希", delta: 1, note: "你见过她的父母" },
          notice: "你在米格路德族之村见过洛琪希的父母，听到了她离家的缘由。",
        },
      },
      {
        id: "go",
        label: "只借一晚的宿，第二天就走",
        risk: "低",
        lines: ["你借了水，添了粮，把该付的钱放在桌上。", "他们送到村口就回去了，没有客套。"],
        outcome: { stats: { int: 3 }, energy: 6 },
      },
      {
        id: "learn",
        label: "留下来，跟他们学怎么把咏唱缩短",
        risk: "中",
        lines: [
          "他们不教公式，只让你在水边坐着听。听了三天，你听见了水里的那个节拍。",
          "从那以后，你的咒文开始变短。",
        ],
        outcome: {
          tier: { kind: "magic", gain: 20 },
          stats: { mana: 7, int: 5 },
          goal: 5,
          notice: "你从米格路德族手里学到了缩短咏唱的路子。",
        },
      },
    ],
  },
  {
    id: "place-lapan-bounty",
    title: "拉潘的悬赏令",
    when: (s) => at(s, "迷宫都市拉潘") && s.year >= 421 && rankAt(s, ["F", "E", "D", "C", "B", "A", "S"]),
    weight: 2,
    body: [
      "公会分部挂出一张悬赏，数目比平常高出一截，偏偏没人接。",
      "柜台的人说，挂这张纸的人只留了一句话：「要找的东西在最下面。」",
    ],
    options: [
      {
        id: "take",
        label: "接，然后往下走",
        risk: "高",
        lines: [
          "你下到第七层就明白为什么没人接。这里的东西不是给活人准备的。",
          "你带回来半张图。雇主把它翻过来看了很久，最后付了全款。",
        ],
        outcome: {
          tier: { kind: "adventure", gain: 22 },
          stats: { fame: 8, wealth: 180, int: 4, health: -10 },
          lifespan: -1,
          goal: 6,
          factions: { 冒险者公会: 8 },
          notice: "你接了拉潘那张没人敢接的悬赏，并且活着回来了。",
        },
      },
      {
        id: "ask",
        label: "先问清楚雇主是谁",
        risk: "低",
        lines: [
          "柜台的人翻了半天账本，只查出一个经手人的名字。那名字早就死了。",
          "你把悬赏令放回了板上。",
        ],
        outcome: { stats: { scheme: 6, int: 4 }, goal: 3, notice: "你查过拉潘那张悬赏的来路，没查出来。" },
      },
      {
        id: "pass",
        label: "不接。你还想活着走出这座城",
        risk: "低",
        lines: ["你从悬赏令前走开了。三个月后它还在那儿。", "只是数目又高了一截。"],
        outcome: { stats: { int: 2, health: 3 }, energy: 6 },
      },
    ],
  },
  {
    id: "place-shillon-zanoba",
    title: "第三王子的手",
    when: (s) => at(s, "西隆王国") && s.year >= 422,
    weight: 1.8,
    body: [
      "王宫的一间偏殿被改成了工房，地上摊着几十具人偶的半成品。",
      "蹲在中间的那个人手指很粗，捧着人偶的手却极轻。他说他叫扎诺巴。",
    ],
    options: [
      {
        id: "help",
        label: "留下帮他做完手里这一具",
        risk: "低",
        lines: [
          "你们做了半个月。他几乎不说话，只在关节卡住的时候发出一声很短的鼻音。",
          "做完那天，他把一只手按在你肩上，力道大得让你眼前一黑。",
        ],
        outcome: {
          stats: { int: 6, wealth: 70, health: -2 },
          goal: 4,
          starDelta: { match: "扎诺巴", delta: 2, note: "你们一起做完了一具人偶" },
          notice: "你陪扎诺巴做完了半具人偶，他把你当成同类。",
        },
      },
      {
        id: "talk",
        label: "和他讲讲外面的手艺人",
        risk: "低",
        lines: [
          "他听得很认真，听到会动的关节时，忽然抬头看你。",
          "「要做得到这种的。」他说，「我出钱。」",
        ],
        outcome: { stats: { int: 4, charm: 3, wealth: 40 }, starDelta: { match: "扎诺巴", delta: 1 } },
      },
      {
        id: "leave",
        label: "退出偏殿，不去打扰他",
        risk: "低",
        lines: ["你退出去的时候他才发现屋里进过人。", "他抬头看了一眼门，又低下去继续做。"],
        outcome: { stats: { int: 2, scheme: 2 }, energy: 6 },
      },
    ],
  },
  {
    id: "place-ranoah-envoy",
    title: "三大国在同一张桌上",
    when: (s) => at(s, "拉诺亚王国") && s.year >= 430,
    weight: 1.8,
    body: [
      "内里斯、巴舍兰特与拉诺亚的使节在宫里密会了三天。谈的内容没有公开。",
      "第二天，有人来请你去旁听一场「不重要的」会议。",
    ],
    options: [
      {
        id: "attend",
        label: "去。坐在最边上听完",
        risk: "中",
        lines: [
          "他们谈的是钱与通路，偶尔提到一处遗迹的归属。",
          "你全程没说话。散会时有一位使节向你点了下头，那种点头是记人的方式。",
        ],
        outcome: {
          stats: { int: 6, scheme: 6, fame: 5 },
          goal: 5,
          factions: { 魔术公会: 6 },
          notice: "你旁听过魔法三大国的一次密会。",
        },
      },
      {
        id: "skip",
        label: "推掉。那种桌子不适合你",
        risk: "低",
        lines: ["你回了住处。当晚街上多了几队巡逻的人。", "你睡得很好。"],
        outcome: { stats: { int: 3, scheme: 2 }, energy: 8, lifespan: 1 },
      },
    ],
  },
  {
    id: "place-sanctuary-gate",
    title: "入门的那一天",
    when: (s) => at(s, "剑之圣地") && s.character.swordSchool !== "无",
    weight: 1.6,
    body: [
      "道场的规矩写在门口的木牌上：不问你从哪儿来，只问你能不能把同一个动作做一万遍。",
      "今天轮到你在牌子上写自己的名字。",
    ],
    options: [
      {
        id: "write",
        label: "写下去，然后从晨练开始",
        risk: "低",
        lines: ["你写的字很丑。旁边的人没笑。", "第一个月你只做了两个动作，做到手臂抬不起来为止。"],
        outcome: {
          tier: { kind: "sword", gain: 14 },
          stats: { sword: 4, health: -3 },
          goal: 3,
          factions: { 剑之圣地: 8 },
          notice: "你在剑之圣地的名册上写下了自己的名字。",
        },
      },
      {
        id: "watch",
        label: "先在旁边看一个月再决定",
        risk: "低",
        lines: [
          "你看了整整一个月，看出了一件事：这里没有天才，只有还在的人。",
          "月底你去把名字写了上去。",
        ],
        outcome: {
          tier: { kind: "sword", gain: 8 },
          stats: { int: 5, sword: 3 },
          goal: 3,
          factions: { 剑之圣地: 4 },
        },
      },
      {
        id: "refuse",
        label: "把笔放下，转身走",
        risk: "低",
        lines: ["你没有写。走出山门的时候，里面传来木刀相击的声音。", "那声音跟了很久。"],
        outcome: { stats: { int: 3, scheme: 3 }, lifespan: 1, energy: 6 },
      },
    ],
  },
  {
    id: "place-sky-audience",
    title: "甲龙王的审判",
    when: (s) => at(s, "天空之城") && s.year >= 442,
    weight: 2,
    body: [
      "甲龙王让你在殿中央站定。他没有问你是什么人，只问：「你打算拿这条命做什么。」",
      "殿里很静，五龙将站在两侧，一个也没看你的脸。",
    ],
    options: [
      {
        id: "honest",
        label: "把实话讲完，包括讲不出口的那部分",
        risk: "中",
        lines: [
          "你讲了很久。讲到一半你自己都觉得难听，但还是讲完了。",
          "他听完只说：「至少你没编。」然后让人给你看了一样东西。",
        ],
        outcome: {
          stats: { fame: 10, int: 8, charm: 5 },
          lifespan: 1,
          goal: 8,
          factions: { 剑之圣地: 4 },
          notice: "甲龙王听完了你这一生，并且给了你一句评价。",
        },
      },
      {
        id: "craft",
        label: "挑好听的说",
        risk: "低",
        lines: ["你讲得很得体。他听完没有点头，也没有摇头。", "退回殿外的时候，你觉得自己刚才像个卖货的。"],
        outcome: { stats: { charm: 3, scheme: 4 }, goal: 3 },
      },
    ],
  },
  {
    id: "place-ryumei-maze",
    title: "山里的那扇门",
    when: (s) => at(s, "龙鸣山") && s.year >= 445 && (has(s, "int", 45) || has(s, "mana", 50)),
    weight: 2,
    body: [
      "龙神孔的入口比传闻里小。石上刻着斗神语的「五」。",
      "门是开着的。开着这件事本身，比门关着更让人不敢进。",
    ],
    options: [
      {
        id: "enter",
        label: "进去，走到不能再走为止",
        risk: "高",
        lines: [
          "你在里面走了三天，路过的每一面墙都在记你走过来的样子。",
          "第四天你退了出来。你带出来的只有一句话，写在纸上：「往下还有第七层。」",
        ],
        outcome: {
          tier: { kind: "adventure", gain: 30 },
          stats: { int: 10, mana: 6, fame: 8, health: -14 },
          lifespan: -2,
          goal: 8,
          threads: { dragonGod: "你进过龙神孔迷宫的第一层，并且带出了一句话。" },
          notice: "你进过龙神孔迷宫，活着出来，带走了一句话。",
        },
      },
      {
        id: "mark",
        label: "在门口做记号，转身下山",
        risk: "低",
        lines: ["你刻了个自己不认得的记号，然后走了。", "记号的意思是「来过，没进去」。"],
        outcome: { stats: { int: 5, scheme: 4 }, goal: 4, notice: "你在龙神孔迷宫的入口留下了自己的记号。" },
      },
    ],
  },
];