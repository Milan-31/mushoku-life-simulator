import type { EventEffects, GameState, HookKind, PendingEvent } from "../types";
import { CANON_EVENTS } from "../data/canonEvents";
import { PLACE_EVENTS } from "../data/placeEvents";
import { RUDEUS_EVENTS } from "../data/rudeusEvents";
import { CANON_CHARACTERS, canonKnown, type CanonCharacter } from "../data/characters";
import { RUDEUS_NAME } from "../data/rudeus";
import { skillById } from "../data/skills";

export type { EventEffects };

export interface EventOptionDef {
  id: string;
  label: string;
  detail?: string;
  risk?: "低" | "中" | "高";
  lines: string[];
  outcome: EventEffects;
}

export interface DecisionEventDef {
  id: string;
  title: string;
  body: string[];
  when: (s: GameState) => boolean;
  weight?: number;
  /**
   * 只能由「你的行动」里某条指令翻开，不进随机池。
   * 不是世界找上你，而是你自己走到那一步把这件事挑起来的。
   */
  commandOnly?: boolean;
  options: EventOptionDef[];
}

const TIER_STEP = 16;

/* ---------- 原作人物的剧本钩子 ---------- */

/**
 * 名录里每个人都有一次属于自己的戏。
 * 这里不写一百多条事件，只写六种模板：钩子记录的是「这个人以什么方式介入你的人生」，
 * 模板负责把那份介入变成一次真正的抉择。
 */

const HOOK_TITLE: Record<HookKind, (name: string) => string> = {
  授艺: (n) => `${n}肯教你一手`,
  求助: (n) => `${n}开口求你`,
  挑衅: (n) => `${n}当众找你麻烦`,
  同行: (n) => `${n}邀你同行`,
  托付: (n) => `${n}把东西交到你手上`,
  重逢: (n) => `${n}认出了你`,
};

const HOOK_TAIL: Record<HookKind, string> = {
  授艺: "他只示范一遍。你看清楚没有，他不管。",
  求助: "他说得不长，说完就等你表态。",
  挑衅: "周围的人停下来看。他们也在看你怎么办。",
  同行: "路不近。他没说要走多久。",
  托付: "他把东西往前推了推，没有解释为什么是你。",
  重逢: "他等你想起来，不催。",
};

/** 非授艺类钩子里，向对方讨教时用的说法。北神流管这叫不打不相识 */
const HOOK_ASK_LABEL: Record<Exclude<HookKind, "授艺">, string> = {
  求助: "事办完后问他有没有可教的",
  挑衅: "打完问他这一手的来路",
  同行: "路上向他请教",
  托付: "把东西收好后请教他",
  重逢: "叙旧时向他请教",
};

/** 此人手上最值得教的一手：只取高级技能，练不出来的那种 */
function grantOf(c: CanonCharacter): string | undefined {
  return (c.grants ?? []).find((id) => skillById(id)?.grade === "高级");
}

function teachOption(c: CanonCharacter, grant: string, label = "向他请教"): EventOptionDef {
  const skill = skillById(grant)!;
  return {
    id: "ask",
    label,
    detail: `他肯把「${skill.name}」交给你。这种招式练不出来，只能有人教。`,
    risk: "低",
    lines: [
      "你把话问出口了。他看了你一会儿，然后开始示范。",
      "他教得不算耐心，但每一步都清楚。临走只丢下一句：别在顺风的时候忘了脚下。",
    ],
    outcome: {
      learnSkill: skill.id,
      stats: { fame: 2 },
      starDelta: { match: c.name, delta: 1 },
      notice: `你从${c.name}手上学到了「${skill.name}」。`,
    },
  };
}

function hookOptions(c: CanonCharacter, kind: HookKind): EventOptionDef[] {
  const near = (delta: number): EventEffects => ({ starDelta: { match: c.name, delta } });
  const grant = grantOf(c);

  switch (kind) {
    case "授艺":
      return [
        grant
          ? teachOption(c, grant)
          : {
              id: "ask",
              label: "接下来",
              detail: "他愿意把自己会的东西分你一点。",
              risk: "低",
              lines: ["你接下来了。他教得不耐烦，但每一句都在点子上。", "临了他只说了一句：剩下的靠你自己犯错误。"],
              outcome: { stats: { int: 4, charm: 3 }, goal: 4, ...near(1) },
            },
        {
          id: "decline",
          label: "婉拒",
          detail: "你不想欠这份人情。",
          risk: "低",
          lines: ["你说改日。他没接话，转身去忙别的了。", "你不知道还有没有下一次。"],
          outcome: { stats: { int: 2, scheme: 2 }, energy: 8 },
        },
      ];
    case "求助":
      return [
        {
          id: "help",
          label: "帮他一把",
          risk: "中",
          lines: ["你答应了。他松了口气，松得很轻，几乎看不出来。", "事情办完，他记住了这件事。"],
          outcome: { stats: { fame: 4, charm: 3 }, energy: -12, goal: 4, ...near(1) },
        },
        {
          id: "refuse",
          label: "推掉",
          risk: "低",
          lines: ["你说自己脱不开身。他点点头，说理解。", "他走开的时候没有回头。"],
          outcome: { stats: { scheme: 3 }, ...near(-1) },
        },
      ];
    case "挑衅":
      return [
        {
          id: "fight",
          label: "当场应战",
          detail: "风险不低，但躲开一次不会躲开一辈子。",
          risk: "高",
          lines: ["你应下了。他笑了一下，那种笑不是给朋友的。", "这一场打完，你身上多了几处要疼好几天的伤，也多了点别的东西。"],
          outcome: { stats: { sword: 5, fame: 4, health: -4 }, lifespan: -1, ...near(1) },
        },
        {
          id: "yield",
          label: "退一步",
          risk: "低",
          lines: ["你退了一步。他嗤笑了一声，收手走了。", "围观的人散得很快。这件事你没跟任何人提。"],
          outcome: { stats: { int: 3, scheme: 2 }, ...near(-1) },
        },
      ];
    case "同行":
      return [
        {
          id: "join",
          label: "同行一段",
          risk: "中",
          lines: ["你们一起上路了。头三天话不多，第四天开始有点默契。", "到了岔路口，各自说了句保重。"],
          outcome: { tier: { kind: "adventure", gain: TIER_STEP }, stats: { fame: 3, int: 2 }, ...near(1) },
        },
        {
          id: "part",
          label: "各走各的",
          risk: "低",
          lines: ["你说自己还有别的事。他说好，然后就走了。", "你按原路回去，路上比来时安静。"],
          outcome: { energy: 12, stats: { int: 2 } },
        },
      ];
    case "托付":
      return [
        {
          id: "take",
          label: "收下",
          detail: "接手别人的事，也接手别人的麻烦。",
          risk: "中",
          lines: ["你收下了。他点了点头，像是把一件压了很久的东西放下了。", "往后这东西会一直跟着你。"],
          outcome: { stats: { fame: 5, faith: 2 }, goal: 6, ...near(1) },
        },
        {
          id: "decline",
          label: "推辞",
          risk: "低",
          lines: ["你把东西推了回去。他没有勉强的意思，只是收起了手。", "你们之间到此为止。"],
          outcome: { stats: { scheme: 3, int: 2 }, energy: 6, ...near(-1) },
        },
      ];
    default:
      return [
        {
          id: "recognize",
          label: "相认",
          risk: "低",
          lines: ["你叫出了他的名字。他愣了一下，然后笑了。", "你们说起当年的事，说起一半就都停了。"],
          outcome: { stats: { fame: 3, charm: 2 }, ...near(1) },
        },
        {
          id: "ignore",
          label: "装作不认识",
          risk: "低",
          lines: ["你从他身边走过去了。他没有再叫你。", "你想，这也算一种了结。"],
          outcome: { stats: { scheme: 4 }, energy: 6 },
        },
      ];
  }
}

function hookEvent(c: CanonCharacter): DecisionEventDef {
  const hook = c.hook!;
  const options = hookOptions(c, hook.kind);
  // 手上真有绝活的，无论这场戏是怎么开的场，都留一条请教的岔路给他
  if (hook.kind !== "授艺") {
    const grant = grantOf(c);
    if (grant) options.push(teachOption(c, grant, HOOK_ASK_LABEL[hook.kind]));
  }
  return {
    id: `canon-hook-${c.name}`,
    title: HOOK_TITLE[hook.kind](c.name),
    body: [hook.text, HOOK_TAIL[hook.kind]],
    // 先得认识这个人，钩子才成立；开局几个月留给主线，不让人物挤满前面的回合
    when: (s) => s.turn >= 6 && canonKnown(s, c),
    weight: 0.8,
    options,
  };
}

/** 名录里所有带钩子的人物，各生成一条只触发一次的抉择事件 */
export const CANON_HOOK_EVENTS: DecisionEventDef[] = CANON_CHARACTERS.filter((c) => c.hook).map(hookEvent);

/**
 * 只能由指令翻开的特殊事件。
 *
 * 这些不进随机池（pickEvent 会跳过 commandOnly 的条目）：不是世界找上你，
 * 而是你在「你的行动」里主动走到那一步。指令某一档结果用 triggerEvent 点名它们。
 * 它们同样只发生一次，选项与后果都写在事件自己身上，结算走 resolveEvent。
 */
const COMMAND_EVENTS: DecisionEventDef[] = [
  {
    id: "home-reckoning",
    commandOnly: true,
    title: "家里把话摊开了",
    when: () => true,
    body: [
      "这些年攒下的事，家里谁都没有提过。这次是你先开的口。",
      "桌子两边都坐着人，谁也没打算先低头。",
    ],
    options: [
      {
        id: "push",
        label: "把该说的都说完",
        detail: "说完就回不去了。可一直不说，同样回不去。",
        risk: "中",
        lines: [
          "你把话一条条摆出来。有人中途站起来，又坐下了。",
          "到最后没有人道歉。但饭桌上的空气，松了一点。",
        ],
        outcome: {
          stats: { charm: 4, int: 3 },
          goal: 6,
          flag: "familyTalked",
          notice: "家里那点旧账，你终于把话摊开说了。",
        },
      },
      {
        id: "ease",
        label: "挑能说的说，把话圆过去",
        detail: "这顿饭还能吃下去，只是有些东西继续留在桌子底下。",
        risk: "低",
        lines: ["你把最重的那几件绕开了。大家都听得出来，也都装作没听出来。", "这顿饭吃得很客气。"],
        outcome: { stats: { scheme: 4, charm: 1 }, energy: 6 },
      },
    ],
  },
];

export const DECISION_EVENTS: DecisionEventDef[] = [
  {
    id: "human-god",
    title: "梦里有人跟你商量",
    when: (s) => s.turn >= 5,
    weight: 1.2,
    body: [
      "你梦见有人在跟你说话，语气很客气，像认识很久的人。",
      "他没有命令你，只是「建议」你去做一件小事，小到不像值得专门托梦的事。",
    ],
    options: [
      {
        id: "accept",
        label: "照他说的做",
        detail: "每一句都对。越对，你越不安。",
        risk: "中",
        lines: ["你照做了。那件小事确实没有害处，甚至还帮上了你。", "你醒过来想了很久：他图什么。"],
        outcome: {
          stats: { fame: 4, scheme: 6 },
          goal: 4,
          // 从这一刻起，你已经站在那条路上了。往后会有它自己的事件找上来
          flag: "humanGodApostle",
          notice: "你接受了人神的一次「建议」。",
        },
      },
      {
        id: "refuse",
        label: "在梦里摇头",
        detail: "你不喜欢有人趁你睡着时跟你说话。",
        risk: "低",
        lines: ["你在梦里摇了摇头。那个声音没有生气，只是很轻地停住了。", "醒来时枕头是湿的。你说不清为什么。"],
        outcome: { stats: { faith: 4 } },
      },
      {
        id: "bargain",
        label: "问他代价",
        detail: "你想在答应之前，先把账算清。",
        risk: "高",
        lines: ["你问他代价是什么。他笑了笑，没有回答。", "你把这句话记下了，也把那个笑记下了。"],
        outcome: { stats: { scheme: 8, int: 3 }, notice: "你试图和人神谈条件。" },
      },
    ],
  },
  {
    id: "dragon-god",
    title: "隔着很远的一次注视",
    // 原作模式里这件事由专属事件链接手，这里只留给别的人生线
    when: (s) => s.turn >= 18 && s.character.name !== RUDEUS_NAME,
    weight: 1,
    body: [
      "你听见一个名字：奥尔斯帝德。说的人压低了声音，好像念出来就会招来什么。",
      "当天夜里，你莫名觉得有人隔得很远在看你。",
    ],
    options: [
      {
        id: "meet",
        label: "朝那个方向走过去",
        detail: "也许是错觉。但你想确认。",
        risk: "高",
        lines: ["你没有见到人。你只是在夜里走了很久。", "回到住处，桌上多了一枚你没见过的旧硬币。"],
        outcome: { stats: { int: 4, fame: 5 }, notice: "你朝龙神的方向走出了第一步。" },
      },
      {
        id: "avoid",
        label: "当作错觉，回去睡",
        risk: "低",
        lines: ["你躺回床上，很快睡着了。什么都没发生。", "第二天，你几乎把这件事忘了。"],
        outcome: { energy: 10 },
      },
    ],
  },
  {
    id: "transfer",
    title: "那天天空裂开了",
    // 原作模式有自己那一版（rud-transfer），这里留给别的人生线
    when: (s) =>
      s.character.name !== RUDEUS_NAME &&
      s.year >= 417 &&
      (s.character.residence === "布耶纳村" || s.character.residence === "罗亚町"),
    weight: 3,
    body: [
      "菲托亚领的天空毫无预兆地裂开，白光把田地和屋顶一起吞了。",
      "你脚下的大地在移位。很多人在喊，声音被拉得很长。",
    ],
    options: [
      {
        id: "grab",
        label: "抓住身边人的手，不松开",
        risk: "中",
        lines: ["你抓住了那只手。白光过后，你和一个陌生人一起落在完全陌生的地方。", "至少，你们还在一起。"],
        outcome: {
          stats: { fame: 3 },
          starDelta: { match: "", delta: 1 },
          goal: 5,
          residence: "拉诺亚王国",
          flag: "transferSurvived",
          notice: "转移事件中你护住了一个人。你被抛到了中央大陆的别处。",
        },
      },
      {
        id: "home",
        label: "逆着人流往家跑",
        risk: "高",
        lines: ["你朝家的方向跑，跑得比这辈子任何时候都快。", "你没能赶到。你只捡到一件被丢下的东西。"],
        outcome: {
          stats: { sword: 3, fame: 2 },
          residence: "拉诺亚王国",
          flag: "transferSurvived",
          notice: "转移事件中你失去了某些东西。你被抛到了中央大陆的别处。",
        },
      },
      {
        id: "stay",
        label: "蹲下，抱住头，等它过去",
        risk: "低",
        lines: ["你抱住头，等白光散去。", "你活了下来。周围的一切都不一样了。"],
        outcome: { lifespan: 1, residence: "拉诺亚王国", flag: "transferSurvived", notice: "你从转移事件里活了下来，落到了中央大陆的别处。" },
      },
    ],
  },
  {
    id: "loss",
    title: "走了的人",
    when: (s) => s.turn >= 8 && s.relations.length > 0,
    weight: 1,
    body: [
      "消息传来：一个和你有关的人走了。走得很急，来不及说再见。",
      "你站在门口，发现自己不知道该做什么。",
    ],
    options: [
      {
        id: "funeral",
        label: "守灵到天亮",
        risk: "低",
        lines: ["你守了一整夜。天亮时你想通一件事：不能再等了。", "你把那件一直想做的事，写进了自己的计划。"],
        outcome: { goal: 8, stats: { faith: 3 }, starDelta: { match: "母亲", delta: 1 } },
      },
      {
        id: "drink",
        label: "一个人喝到天亮",
        risk: "中",
        lines: ["你喝到天亮。醒来头痛得像要裂开，胸口却空了一块。", "从这天起，有些后悔就留在你身体里了。"],
        outcome: { stats: { fame: -2, charm: -2 }, lifespan: -1, notice: "你用一种沉沦的方式记住了这次离别。" },
      },
      {
        id: "relic",
        label: "把遗物收好，继续赶路",
        risk: "低",
        lines: ["你把遗物仔细包好，放进随身的包里。", "你继续赶路。你带着它一起走。"],
        outcome: { stats: { int: 2 }, goal: 4 },
      },
    ],
  },
  {
    id: "sword",
    title: "道场里有人指名找你",
    when: (s) => s.character.swordSchool !== "无" || s.character.origin === "剑之圣地学徒",
    weight: 1.6,
    body: [
      "道场里有人指名要和你交手，不掩饰敌意。",
      "师父坐在一边，什么都没说。这本身就是一种态度。",
    ],
    options: [
      {
        id: "accept",
        label: "当场答应，全力应战",
        risk: "中",
        lines: ["你赢了，赢得不轻松。", "师父只丢下一句：多余的动作。"],
        outcome: { tier: { kind: "sword", gain: TIER_STEP }, stats: { sword: 4, fame: 3 } },
      },
      {
        id: "humble",
        label: "先认输，回去继续练",
        risk: "低",
        lines: ["你认了输。对方很得意。", "当晚你挥刀到深夜。你知道自己差在哪里。"],
        outcome: { tier: { kind: "sword", gain: TIER_STEP + 6 }, stats: { sword: 3, int: 3 }, energy: -10 },
      },
    ],
  },
  {
    id: "forbidden",
    title: "夹在书里的一页纸",
    when: (s) => s.character.college === "拉诺亚魔法大学" || s.character.magicTier !== "未觉醒",
    weight: 1.4,
    body: [
      "你在旧书的夹层里翻到一页，不属于这本书。",
      "上面的字迹潦草，像是有人匆忙记下的施法方式。",
    ],
    options: [
      {
        id: "study",
        label: "私下照着练",
        risk: "高",
        lines: ["你练成了。代价是连着几天耳鸣，还有说不清的眩晕。", "你把它记进自己的笔记，没有人知道。"],
        outcome: { tier: { kind: "magic", gain: TIER_STEP + 4 }, stats: { mana: 6, scheme: 4 }, lifespan: -2 },
      },
      {
        id: "report",
        label: "交给教授处理",
        risk: "低",
        lines: ["教授看完，脸色变了。他收走那页纸，郑重地向你道谢。", "几周后，你收到一份额外的奖学金。"],
        outcome: { stats: { int: 4, wealth: 60, fame: 3 }, notice: "你因上交禁书页而得到了学院的认可。" },
      },
    ],
  },
  {
    id: "market",
    title: "急着回老家的行商",
    when: () => true,
    weight: 1.5,
    body: [
      "集市上，一个行商在低价抛一批货，说急着回老家。",
      "你身上正好有闲钱。",
    ],
    options: [
      {
        id: "buy",
        label: "全买下，再转手卖出",
        risk: "中",
        lines: ["你买下了那批货。半个月后，你以三倍价卖了出去。", "你第一次尝到钱生钱的滋味。"],
        outcome: { stats: { wealth: 120, charm: 2, scheme: 3 } },
      },
      {
        id: "pass",
        label: "不碰，走开",
        risk: "低",
        lines: ["你摇摇头走开了。", "后来你听说那批货里有假货。你庆幸了一整天。"],
        outcome: { stats: { int: 2 } },
      },
    ],
  },
  {
    id: "discrimination",
    title: "有人朝孩子扔石头",
    when: (s) => s.character.originGroup === "demon" || s.character.originGroup === "beast",
    weight: 1.5,
    body: [
      "集市上，一个异族孩子被人扔石头。没有人出来拦。",
      "围着的人都在看。他们也在看你会怎么做。",
    ],
    options: [
      {
        id: "intervene",
        label: "站到孩子前面",
        risk: "中",
        lines: ["你挡在孩子前面。人群安静了。", "有人认出了你。这件事后来传了很远。"],
        outcome: { stats: { fame: 6, charm: 3 }, goal: 5 },
      },
      {
        id: "ignore",
        label: "低头走开",
        risk: "低",
        lines: ["你走开了。你告诉自己这不关你的事。", "那天夜里你睡得不太好。"],
        outcome: { stats: { fame: -1, scheme: 2 } },
      },
    ],
  },
  {
    id: "marriage",
    title: "媒人上门",
    when: (s) => s.character.age >= 16,
    weight: 1,
    body: [
      "有人替你说了一门亲事。对方家境不错，条件也体面。",
      "你还没见过对方。",
    ],
    options: [
      {
        id: "agree",
        label: "答应见一面",
        risk: "低",
        lines: ["你见了对方。说不上喜欢，但也不讨厌。", "你们决定先相处看看。"],
        outcome: {
          starDelta: { match: "伴侣", delta: 2 },
          addRelation: { name: "伴侣", role: "婚约者", stars: 3, note: "你们还在互相试探。" },
          stats: { charm: 3, wealth: 40 },
        },
      },
      {
        id: "refuse",
        label: "婉拒，说你有别的打算",
        risk: "低",
        lines: ["你婉拒了。媒人有些失望。", "你知道自己要什么——至少现在知道。"],
        outcome: { goal: 6, stats: { int: 2 } },
      },
    ],
  },
  {
    id: "noble-court",
    title: "从门缝塞进来的信",
    when: (s) => s.character.originGroup === "noble" || s.character.politics !== "中立",
    weight: 1.5,
    body: [
      "一封没有署名的信从门缝塞进来，字迹很工整。",
      "信里说，有位大人物想见你，时间地点随你定。",
    ],
    options: [
      {
        id: "go",
        label: "赴约",
        risk: "高",
        lines: ["你见到了那个人。他没有自我介绍，只问了你三个问题。", "你答得很小心。他满意地点了点头。"],
        outcome: { stats: { scheme: 8, fame: 4, int: 3 }, goal: 4, notice: "你进入了大人物们的视线。" },
      },
      {
        id: "burn",
        label: "把信烧了",
        risk: "低",
        lines: ["你把信烧了，灰倒进水里。", "你决定不玩这场游戏。至少这一次。"],
        outcome: { stats: { scheme: -4, faith: 3 }, lifespan: 1 },
      },
    ],
  },
  {
    id: "maze",
    title: "入口被封了",
    when: (s) => s.character.adventurerRank !== "未注册" || s.character.residence === "迷宫都市拉潘" || s.character.origin === "迷宫探索者",
    weight: 1.6,
    body: [
      "公会把一个迷宫入口封了，理由是「危险」。没有人解释危险什么。",
      "你站在封条前面，听见下面有很轻的水声。",
    ],
    options: [
      {
        id: "enter",
        label: "掀开封条，下去看看",
        risk: "高",
        lines: ["你在下面走了很久。你带上来一件说不清用途的遗物。", "公会没有没收它，只是把你的名字记了下来。"],
        outcome: { tier: { kind: "adventure", gain: 22 }, stats: { fame: 6, wealth: 90 }, lifespan: -1 },
      },
      {
        id: "report",
        label: "回去让公会加封",
        risk: "低",
        lines: ["你把下面的水声报给了公会。他们派人重新加固了封条。", "你的委托板上多了一条「协助」记录。"],
        outcome: { tier: { kind: "adventure", gain: 8 }, stats: { fame: 2 } },
      },
    ],
  },
  {
    id: "heresy",
    title: "神父请你走一趟",
    when: (s) => s.character.originGroup === "mirees" || s.character.faith === "米里斯教团",
    weight: 1.2,
    body: [
      "教区神父的语气比平时客气，也比平时生硬。他请你去一趟。",
      "你说不清这是邀请，还是传唤。",
    ],
    options: [
      {
        id: "confess",
        label: "如实回答",
        risk: "低",
        lines: ["你如实答了。神父在纸上记了几笔，让你回去。", "你不知道自己有没有被写进某份名单。"],
        outcome: { stats: { faith: 6, scheme: 2 } },
      },
      {
        id: "dodge",
        label: "含糊过去",
        risk: "中",
        lines: ["你绕开了所有要点。神父的眼神沉了一下。", "你走出来时，后背是湿的。"],
        outcome: { stats: { scheme: 6, faith: -4 } },
      },
    ],
  },
  {
    id: "harvest",
    title: "雨不来了",
    when: (s) => s.character.originGroup === "commoner",
    weight: 1.4,
    body: [
      "雨季一推再推，地里的收成眼看要泡汤。全村人都在发愁。",
      "有人提议一起挖条渠，可没人有钱，也没人带头。",
    ],
    options: [
      {
        id: "lead",
        label: "站出来，带头挖渠",
        risk: "中",
        lines: ["你带着大家挖了半个月。渠通的那天，下了今年头一场雨。", "从此村里人提起你，先想起那条渠。"],
        outcome: { stats: { fame: 6, charm: 3, int: 2 }, goal: 5, starDelta: { match: "父亲", delta: 1 } },
      },
      {
        id: "self",
        label: "先顾好自家的地",
        risk: "低",
        lines: ["你把自家的地保住了。别人家的，你顾不上。", "没有人怪你。但你自己记着。"],
        outcome: { stats: { wealth: 40, fame: -1 } },
      },
    ],
  },
  {
    id: "thief",
    title: "偷东西的孩子",
    when: () => true,
    weight: 1.2,
    body: [
      "你抓住一个偷你东西的孩子。他又瘦又小，手上全是冻疮。",
      "他一直在说对不起。",
    ],
    options: [
      {
        id: "release",
        label: "把东西要回来，放他走",
        risk: "低",
        lines: ["你要回了东西，放他走。", "他跑出很远，又回头看了你一眼。"],
        outcome: { stats: { charm: 3, fame: 2 } },
      },
      {
        id: "help",
        label: "放过他，再管他一顿饭",
        risk: "低",
        lines: ["你请他吃了一顿饭。他吃得很急，一直没抬头。", "很多年后，你还会再见到他。"],
        outcome: { stats: { wealth: -10, charm: 4, faith: 3 }, addRelation: { name: "当年的孩子", role: "旧识", stars: 3, note: "他一直记得那顿饭。" } },
      },
    ],
  },

  /* 原作事件名录：人物、地名与锚点都来自原作考据，见 src/data/canonEvents.ts */
  ...CANON_EVENTS,
  /* 原作地点的时间点事件：人在那儿、年分到了才会来，见 src/data/placeEvents.ts */
  ...PLACE_EVENTS,
  /* 原作模式专属事件链：只在这一局出现，见 src/data/rudeusEvents.ts */
  ...RUDEUS_EVENTS,
  /* 原作人物的个人钩子：名录里每人一条，见过一次就关掉 */
  ...CANON_HOOK_EVENTS,
  /* 只能由「你的行动」里的指令翻开的特殊事件 */
  ...COMMAND_EVENTS,
];

/** 挑选一个当前可触发、且未经历过的抉择事件。只能由指令翻开的不在池子里 */
export function pickEvent(s: GameState, rng: () => number): DecisionEventDef | null {
  const pool = DECISION_EVENTS.filter((e) => !e.commandOnly && !s.seenEvents.includes(e.id) && e.when(s));
  if (pool.length === 0) return null;

  const weighted = pool.flatMap((e) => {
    const w = Math.max(1, Math.round((e.weight ?? 1) * 10));
    return Array.from({ length: w }, () => e);
  });
  const pick = weighted[Math.floor(rng() * weighted.length) % weighted.length];

  // 同一事件（human-god / dragon-god / transfer 等主线）不重复；日常事件也只在经历一次后关闭
  return pick;
}

export function toPending(def: DecisionEventDef): PendingEvent {
  return {
    id: def.id,
    title: def.title,
    body: def.body,
    options: def.options.map((o) => ({ id: o.id, label: o.label, detail: o.detail, risk: o.risk })),
  };
}

export function eventById(id: string): DecisionEventDef | undefined {
  return DECISION_EVENTS.find((e) => e.id === id);
}