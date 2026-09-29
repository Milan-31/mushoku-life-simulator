import type { DecisionEventDef } from "../engine/events";
import { RUDEUS_NAME } from "./rudeus";

/**
 * 原作模式专属事件链。
 *
 * 这几个节点在原作里是主线：菲托亚领转移、转移迷宫救母、魔石病、与龙神交手、
 * 阿斯拉王位争夺、与基斯的最终决战。它们只在这一局里出现，别的人生线不会撞上。
 *
 * 三条写在这里的规矩：
 * - 每个节点都有前提。锚点不是无条件砸下来的：保罗之死的前提是玩家真的下到迷宫最底层、
 *   参与了那场决战；洛琪希之死的前提是玩家做过人神使徒。前提不成立，事件本身就不该来。
 * - 锚点事件只允许改变「你在其中的位置」。结果写在选项里，不写成必然旁白。
 * - 事件用 flag 记下发生过什么，后面的场景与指令据此才长出来（见 data/scenes.ts）。
 */

const isRudeus = (s: { character: { name: string } }) => s.character.name === RUDEUS_NAME;

/** 关系里有没有这个人，以及交情够不够 */
const knows = (s: { relations: { name: string; stars: number }[] }, name: string, stars: number) =>
  s.relations.some((r) => r.name.includes(name) && r.stars >= stars);

const statOf = (s: { stats: { key: string; value: number }[] }, key: string) => s.stats.find((x) => x.key === key)?.value ?? 0;
const hasFlag = (s: { flags?: string[] }, flag: string) => (s.flags ?? []).includes(flag);

export const RUDEUS_EVENTS: DecisionEventDef[] = [
  {
    id: "rud-transfer",
    title: "十岁生日的第二天",
    when: (s) => isRudeus(s) && s.year >= 417 && s.year <= 419,
    weight: 6,
    body: [
      "天空没有预兆地裂开了。白光从菲托亚领的一端推到另一端，把田地和屋顶一起吞下去。",
      "你脚下的地在移位。有人喊你的名字，声音被拉得很长，听不出是谁。",
    ],
    options: [
      {
        id: "hold",
        label: "伸手抓住身边的人，不松开",
        risk: "中",
        lines: [
          "你抓住了一只手腕。白光过后，你和那个人一起摔在一片完全陌生的沙地上。",
          "沙子是红的。你们走了很多天，才走到一处村子——那里的人都不长高。",
        ],
        outcome: {
          stats: { fame: 3, health: -6 },
          goal: 6,
          residence: "米格路德族之村",
          starDelta: { match: "", delta: 2, note: "在转移里你抓住了他，没有松手" },
          flag: "transferSurvived",
          notice: "菲托亚领转移事件发生了。你和身边的人被抛到了魔大陆。",
        },
      },
      {
        id: "rush",
        label: "逆着人流往家的方向跑",
        risk: "高",
        lines: [
          "你朝家的方向跑，跑得比这辈子任何时候都快。",
          "你没能跑到。白光之后是红沙，你只捡到一件被丢在路上的东西，攥了很久。",
        ],
        outcome: {
          stats: { sword: 3, health: -10, int: 3 },
          goal: 8,
          residence: "米格路德族之村",
          flag: "transferSurvived",
          notice: "菲托亚领转移事件发生了。你被抛到魔大陆，只带走了一件遗物。",
        },
      },
      {
        id: "brace",
        label: "抱住头，等它过去",
        risk: "低",
        lines: [
          "你抱住头，趴在地上等。等的时间不长，长得像一辈子。",
          "再站起来的时候，熟悉的村子不在了，脚下是沙。你活了下来。",
        ],
        outcome: {
          lifespan: 1,
          stats: { health: -4, faith: 3 },
          residence: "米格路德族之村",
          flag: "transferSurvived",
          notice: "菲托亚领转移事件发生了。你活了下来，被抛到了魔大陆。",
        },
      },
    ],
  },
  {
    id: "rud-labyrinth",
    title: "基斯的信",
    when: (s) => isRudeus(s) && s.year >= 422 && s.year <= 424 && !hasFlag(s, "labyrinthDone"),
    weight: 6,
    body: [
      "信是基斯写的，字很潦草，只有几行：贝卡利特大陆，迷宫都市拉潘，最深的那层关着一个人。",
      "信的末尾写着父亲的名字。塞妮丝还活着，被卡在迷宫的核心里。",
      "去的人不少。回来的说法不多。",
    ],
    options: [
      {
        id: "descend",
        label: "随队下到最底层",
        detail: "你带着队伍往下走。这一趟要面对的是迷宫守护者。",
        risk: "高",
        lines: [
          "最下面那层的主人是九头龙海德拉。九个头颅轮流扑下来，中间没有空隙。",
          "它盯上了你——魔力最多的人永远是它的第一选择。你被甩了出去，有人把你踢开了。",
          "塞妮丝被带出了迷宫。她的眼睛是睁着的，但谁喊她都没有回应。",
          "父亲没有上来。他挡住了那一口。",
        ],
        outcome: {
          tier: { kind: "adventure", gain: 44 },
          stats: { fame: 12, sword: 6, health: -16 },
          lifespan: -2,
          factions: { 冒险者公会: 12 },
          starDelta: { match: "保罗", delta: 3, note: "他把你推出了那一口的范围" },
          flag: "paulDead",
          notice: "保罗·格雷拉特死在了转移迷宫里。你在他身边，你活了下来。",
        },
      },
      {
        id: "outside",
        label: "留在迷宫外接应",
        detail: "总得有人在上面拉着绳子、数着人数。",
        risk: "中",
        lines: [
          "你在入口守了六天，看人一批批下去，又一批批上来。",
          "第七天，他们抬着两个人出来。母亲救回来了，只是不再认得人。",
          "父亲拄着一根断掉的剑走出来，一条腿废了，但活着。他看见你时愣了一下，什么也没说。",
        ],
        outcome: {
          tier: { kind: "adventure", gain: 20 },
          stats: { fame: 5, int: 4, health: -3 },
          flag: "labyrinthDone",
          notice: "转移迷宫的救援结束了。塞妮丝被救出但失去心智，保罗活着回来，一条腿废了。",
        },
      },
      {
        id: "refuse",
        label: "不去。那不是你能管的事",
        risk: "低",
        lines: [
          "你没有去。消息是半年后传到你耳朵里的。",
          "母亲被救出来了，只是不再认得人。父亲带着她回来了。",
          "你听完，把手里的事做完了。那一天你没跟任何人说话。",
        ],
        outcome: {
          stats: { scheme: 4, int: 2 },
          lifespan: 1,
          flag: "labyrinthDone",
          notice: "你没有去转移迷宫。塞妮丝被救出但失去心智，保罗活着。",
        },
      },
    ],
  },
  {
    id: "rud-roxy",
    title: "门后面的东西",
    when: (s) => isRudeus(s) && s.year >= 424 && s.year <= 427 && (hasFlag(s, "humanGodApostle") || s.character.status === "人神使徒"),
    weight: 6,
    body: [
      "那个声音又来了，还是那副客气的语气。它说，有一扇门，你打开它就好。",
      "它说得太轻松了。轻松得像早就知道结果。",
      "门就在你面前。油漆剥落，门缝底下有风。",
    ],
    options: [
      {
        id: "open",
        label: "照它说的，把门推开",
        risk: "高",
        lines: [
          "门后面没有怪物，只有一层薄薄的白尘。你当时觉得，就这。",
          "三个月后，洛琪希开始咳。魔石病，没有名字的医生也认得。",
          "她走的那天你不在房里。桌上还摊着她没写完的信。",
        ],
        outcome: {
          stats: { scheme: 8, int: 5, faith: -8 },
          lifespan: -2,
          starDelta: { match: "洛琪希", delta: -3, note: "她到死都不知道那扇门是你开的" },
          flag: "roxyDead",
          threads: { humanGod: "它让你开了一扇门。门后面的东西带走了洛琪希。它一句解释都没有。" },
          notice: "洛琪希·米格路迪亚感染魔石病去世了。这件事是你开的那扇门带来的。",
        },
      },
      {
        id: "seal",
        label: "把门钉死，不去碰",
        detail: "你不打算再照它的话做任何一件事。",
        risk: "中",
        lines: [
          "你把门板从外面钉死，加了三道横木，还在门缝里灌了泥。",
          "那个声音停了很久。再开口时，语气还是客气的，只是不再提门的事了。",
          "洛琪希那年冬天病了一场，又好了。她后来还给你写过信。",
        ],
        outcome: {
          stats: { int: 6, faith: 5, scheme: 4 },
          goal: 10,
          starDelta: { match: "洛琪希", delta: 2, note: "她不知道你替她挡过什么" },
          flag: "defiedHumanGod",
          threads: { humanGod: "你拒绝了它。它没有生气，只是换了个说法，也换了个人。" },
          notice: "你没有打开那扇门。洛琪希活了下来，人神把注意力转到了别处。",
        },
      },
      {
        id: "ask",
        label: "先去找洛琪希，把这件事问清楚",
        risk: "低",
        lines: [
          "你把门的事原原本本讲给她听。她听完没有笑你，也没有安慰你。",
          "她只说了一句：「那就先别开。」然后低头继续改她的术式。",
          "门最后也没开。有些事，说出来就已经不一样了。",
        ],
        outcome: {
          stats: { int: 5, charm: 4, mana: 4 },
          goal: 8,
          starDelta: { match: "洛琪希", delta: 2, note: "你把最不该说的话说给了她听" },
          flag: "defiedHumanGod",
          notice: "你把门的事告诉了洛琪希。她活了下来，你们之间多了一件只有彼此知道的事。",
        },
      },
    ],
  },
  {
    id: "rud-orsted",
    title: "轮回到这一世的人",
    when: (s) => isRudeus(s) && s.year >= 425 && !hasFlag(s, "metOrsted") && (statOf(s, "fame") >= 45 || statOf(s, "sword") >= 50 || statOf(s, "mana") >= 70),
    weight: 5,
    body: [
      "那个人站在路口，像已经站了很久。他看你的眼神不是打量，是确认。",
      "你没有见过他，但你听过这个名字：奥尔斯帝德。念出来会招来东西的那种名字。",
    ],
    options: [
      {
        id: "fight",
        label: "与他正面交手",
        detail: "你想知道，自己和传说之间隔着多少。",
        risk: "高",
        lines: [
          "你连他出手都没看清。第三合，你已经被按在地上，肋骨断了两根。",
          "他停手了，问了一句：「你为什么在这儿。」你把这一世的活法讲给他听。",
          "他听完，说了句「那就跟着我」。这不是邀请，也不是命令，是结论。",
        ],
        outcome: {
          tier: { kind: "sword", gain: 24 },
          stats: { sword: 8, int: 6, health: -18, fame: 8 },
          lifespan: -1,
          flag: "underDragonGod",
          threads: { dragonGod: "你和他交过手，然后站到了他那一侧。" },
          notice: "你与龙神奥尔斯帝德交手，败了，此后归入他的阵营。",
        },
      },
      {
        id: "back",
        label: "退开，不打算和这种人打交道",
        risk: "低",
        lines: [
          "你后退了半步。他看了你一会儿，没说什么，转身走了。",
          "回家路上你一直在想那半秒——你退的不是步子，是选择。",
        ],
        outcome: {
          stats: { int: 4, scheme: 4 },
          lifespan: 1,
          flag: "metOrsted",
          notice: "你见过龙神，但没有走上去。他从你身边过去了。",
        },
      },
    ],
  },
  {
    id: "rud-asura",
    title: "从阿斯拉来的一封信",
    when: (s) => isRudeus(s) && s.year >= 432 && (knows(s, "爱丽儿", 3) || knows(s, "希露菲", 3)),
    weight: 5,
    body: [
      "信写得很短，落款是第二王女的名字。她没有求你，只写了一件事：第一王子那边已经不打算按规矩来了。",
      "信末附了一句：「你来不来，我都会做。」",
    ],
    options: [
      {
        id: "go",
        label: "回阿斯拉，站到第二王女一边",
        risk: "高",
        lines: [
          "你在王都住了一个月。那一个月里，有人被罢免，有人被调走，有人再也没出现过。",
          "最后的那天，基列奴一个人进去，一个人出来，剑上干干净净。",
          "新王登基的时候，你站在第二排。没有人给你记功，但很多人记住了你站在哪儿。",
        ],
        outcome: {
          tier: { kind: "adventure", gain: 30 },
          stats: { fame: 14, scheme: 8, charm: 5, health: -8 },
          factions: { 阿斯拉王国: 24 },
          starDelta: { match: "爱丽儿", delta: 3, note: "你选了她那一边，而且真的到了" },
          flag: "asuraWon",
          notice: "阿斯拉王位争夺战以第二王女一派获胜告终。你在场。",
        },
      },
      {
        id: "stay",
        label: "留在原地，不掺和这件事",
        risk: "低",
        lines: [
          "你回了信，只有几行，说的是自己走不开。",
          "半年后你听说王都换了主人。你在酒馆里听到这个消息，把杯子里的东西喝完了。",
        ],
        outcome: {
          stats: { int: 4, scheme: 3 },
          lifespan: 1,
          flag: "asuraSkipped",
          notice: "你没有参与阿斯拉的王位争夺。第二王女那一派自己办成了。",
        },
      },
    ],
  },
  {
    id: "rud-kishi",
    title: "战帖",
    when: (s) =>
      isRudeus(s) &&
      s.year >= 438 &&
      (hasFlag(s, "underDragonGod") || hasFlag(s, "metOrsted") || knows(s, "基斯", 2)),
    weight: 5,
    body: [
      "帖子是当众递过来的，字写得比从前工整。落款只有一个人：基斯。",
      "帖子里写明了时间、地点，还有他站在哪一边——他自己承认了，他是人神的使徒。",
      "他说他会带三件东西来：斗神铠、北神、还有前剑神。",
    ],
    options: [
      {
        id: "accept",
        label: "接下来",
        detail: "这一战之后，人神手里就没有棋子了。",
        risk: "高",
        lines: [
          "打了很久。斗神铠被拆开的时候，里面的人已经不像人了。",
          "前剑神是最后倒下的。他倒下之前看了你一眼，那一眼里没有恨。",
          "结束之后，你在原地站到天黑。有些东西从此不会再来了。",
        ],
        outcome: {
          tier: { kind: "sword", gain: 30 },
          stats: { sword: 10, fame: 20, health: -22, faith: 6 },
          lifespan: -2,
          factions: { 冒险者公会: 16 },
          flag: "kishiDefeated",
          threads: { humanGod: "它的棋子在这一战里用完了。它没有再说话。" },
          notice: "你接下了基斯的战帖，并且赢了。人神手里的棋子至此清空。",
        },
      },
      {
        id: "prepare",
        label: "先答应，但把准备做足",
        risk: "中",
        lines: [
          "你把日子往后拖了一年。这一年里你造东西、找人、试招。",
          "决战那天，你带着准备了好几个月的东西站到了他对面。",
          "这一战赢得不算漂亮，但赢的是你。",
        ],
        outcome: {
          tier: { kind: "sword", gain: 18 },
          stats: { int: 8, sword: 6, fame: 12, wealth: -120, health: -12 },
          goal: 12,
          flag: "kishiDefeated",
          threads: { humanGod: "你拖了一年才应战。它在这一年里没能再做别的。" },
          notice: "你拖了一年才应下基斯的战帖，准备做足，赢下了这一战。",
        },
      },
    ],
  },
];