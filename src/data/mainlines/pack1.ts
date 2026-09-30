import type { MainlineDef, MainlineEventDef } from "./types";

/**
 * 主线剧情 · 第一辑（五条）。
 *
 * 数据部分的几条约定，写给后面的维护者：
 * - 章 id 一律 s1…s5；引擎自动写两个 flag：进入本章写 `ml:<主线id>:<章id>`，
 *   走完本章写 `ml:<主线id>:<章id>:done`。本文件自己写的 flag 一律形如
 *   `ml:<主线id>:<章id>:<短词>`，每一个都在某处真的被设置过。
 * - `monthsIn` 是「进入本章之后过了多少个月」。引擎没有单独的计时字段，
 *   因此每章 onEnter 都会写一个 `…:in` 标记；monthsIn 就按这个标记落下的那个月算
 *   （s.turn 每月 +1，见 engine/world.ts 的 advanceMonth）。
 * - 时间一律用相对时间；绝对年份只出现在 onlyEras 已经把时代锁死的两条线上。
 * - 属性、阶级、关系、所在地、技能、flag 是玩家真能改变的东西，任务门槛只用这些。
 * - 事件 id 形如 `ml-<主线名的连字符写法>-s<n>`，全局唯一；`when` 用 seenEvent 串起来，
 *   保证事件按章推进，不会跳章、也不会重复。
 * - 数值额度和 label 命名都受约束：label 不与 scenes.ts 里已有的指令重名，
 *   属性多在 ±6 以内，tier gain 在 10–30，goal 在 2–8。
 */

/* ---------- 判定用的小工具 ---------- */

const flagOn = (s: { flags: string[] }, flag: string) => s.flags.includes(flag);
/** 已见过某个事件之后才成立 */
const after = (s: { seenEvents: string[] }, id: string) => s.seenEvents.includes(id);
/** 尚未见过某个事件 */
const before = (s: { seenEvents: string[] }, id: string) => !s.seenEvents.includes(id);

export const MAINLINES_PACK1: MainlineDef[] = [
  /* ================================================================== *
   * 一、剑之圣地的叛逆者
   * ================================================================== */
  {
    id: "blade-of-the-holy-land",
    name: "剑之圣地的叛逆者",
    theme: "剑之修行",
    tagline: "总本山不问你从哪儿来，只问你站不站得住。",
    fit:
      "被送进剑神流总本山、却没有家世也没有靠山的那种人。剑术天赋或苦练都行，嘴硬、不服、认死理的人在这条线上会走得最远，也最容易被门规收拾。适合剑之圣地学徒、平民与没落贵族出身，剑神流或尚未定流派的主角。",
    tags: {
      origins: ["剑之圣地学徒", "平民/农家子弟", "冒险者出身", "阿斯拉王国贵族子弟", "西隆王国贵族"],
      statuses: ["剑士", "平民", "贵族子弟", "冒险者"],
      faiths: ["剑之圣地", "无信"],
      places: ["剑之圣地", "西隆王国", "罗亚町"],
      talents: ["剑术天赋", "斗气感知", "军事直觉"],
      styles: ["剑之修行", "冒险史诗", "混合模式"],
    },
    prologue: [
      "你背着行李走进总本山的木门。门里没有欢迎的人，只有一片踩得发亮的地板。",
      "带路的人只说了一句：早上钟响就到，来晚了自己看着办。",
      "这里教的是剑神流。同一个动作，你要做到手臂不再属于自己为止。",
      "剑神加尔·法利昂的名字挂在正堂，据说他带出来的人里，有兽族的剑王，也有领主的女儿。",
      "你还没有名字。在这栋房子里的第一年，谁都没有名字。",
    ],
    stages: [
      {
        id: "s1",
        title: "第一章 · 门外的人",
        premise:
          "你进了剑神流的总本山，却没有介绍信、没有师承、没有人为你说话。道场里没人赶你走，也没人教你怎么走。",
        objective: "在道场里站住脚，让某个人愿意正眼看你一次。",
        guidance: [
          "天还没亮就去占西边那块地板，别人练什么你练什么，不要出声。",
          "基础动作练到不用想也能做出来，这是这里唯一不需要靠山的通行证。",
          "找同辈里最不起眼的那个人对练，先弄清楚自己的位置在哪儿。",
          "师范出手的时候站着别动，看清楚他的手是怎么起的、脚是怎么动的。",
          "被点名就答，被无视也别停。这里的人只记得谁一直没有倒。",
        ],
        quests: [
          {
            id: "q1",
            label: "在道场把基础动作练到能上场",
            hint: "去「剑之道场」，用「重复同一个动作」或「从晨练开始」练到剑术初级以上。",
            done: { residence: ["剑之圣地"], swordTier: "初级" },
          },
          {
            id: "q2",
            label: "和同辈交手至少一场，弄清自己排在第几",
            hint: "在道场用「和师兄对练」，或到「战斗」场景用「一对一决斗」。输赢都算。",
            done: { residence: ["剑之圣地"], anyStats: { sword: 25 }, monthsIn: 1 },
          },
          {
            id: "q3",
            label: "让一个人记住你的名字",
            hint: "练到头一次被师范单独指出问题，或者被人点名叫上去。急不得，练下去自然会来。",
            // 两条路：在入门那一天让人记住你，或者凭本事把名声攒起来
            done: { any: [{ flag: "ml:blade-of-the-holy-land:s1:noticed" }, { anyStats: { fame: 20 } }] },
          },
        ],
        enter: {},
        deadlineMonths: 24,
        onEnter: {
          lines: [
            "你把行李放在通铺最靠门的那一格。没有人问你叫什么。",
            "木地板上有一万道旧痕。你踩上去的时候，脚底比自己以为的要凉。",
            "天亮前的钟还没响，已经有人在练了。",
          ],
          effects: {
            residence: "剑之圣地",
            flag: "ml:blade-of-the-holy-land:s1:in",
            stats: { sword: 3, health: -2 },
            factions: { 剑之圣地: 5 },
            goal: 3,
            notice: "你进了剑之圣地的总本山，从头一年开始算。",
          },
          rumor: "总本山又收了个没来历的。这种事每年都有几回，几年后还记得的人不多。",
          commands: [
            {
              name: "剑之道场",
              desc: "木地板的响声、汗味，同一个动作被重复一万遍也不吭声。",
              commands: [
                {
                  label: "在天亮前占住西边那块地板",
                  category: "修炼",
                  cost: 18,
                  hint: "最早到场的人，才看得见师范是怎么起手的",
                  lines: [
                    "你连着一个月第一个到场。地板还是凉的，手上的动作却开始自己成形。",
                    "有人开始把位置挪到你旁边——在这里，这也算一种说话。",
                  ],
                  effects: { tier: { kind: "sword", gain: 14 }, stats: { sword: 4 }, goal: 3 },
                },
              ],
            },
            {
              name: "家中",
              desc: "通铺、柴堆、别人的鼾声。总本山的夜里没有什么可看的。",
              commands: [
                {
                  label: "夜里检查自己的旧伤",
                  category: "休养",
                  cost: -14,
                  hint: "手上的茧和膝盖上的伤，是这一年唯一攒下的东西",
                  lines: [
                    "你把手腕上那条旧痕重新绑过。它比上个月浅了一点。",
                    "通铺里的人都在睡。你比谁都清楚，明天还要站一整天。",
                  ],
                  effects: { stats: { health: 6, sword: 1 }, energy: 12 },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "半年过去，有人第一次连名带姓叫了你。叫得很随意，像早就认识。",
            "那天你练到收场，掌心的口子裂开了一道。你没停。",
            "总本山认人很慢。慢到你差点以为自己走错了地方。",
            "但门确实开了一条缝。",
          ],
          effects: {
            flag: "ml:blade-of-the-holy-land:s1:done",
            stats: { sword: 5, health: -3 },
            tier: { kind: "sword", gain: 16 },
            factions: { 剑之圣地: 5 },
            goal: 5,
            notice: "你在总本山站住了第一年。门口那道缝，是你自己挤开的。",
          },
          commands: [
            {
              name: "剑之道场",
              desc: "道场里现在有人会朝你点头了。点得很省，但确实有。",
              commands: [
                {
                  label: "跟着师范做同一套晨练",
                  category: "修炼",
                  cost: 16,
                  hint: "他不再赶你出列，这是这一年最大的变化",
                  lines: [
                    "师范的晨练你从头跟到尾，一次没掉队。",
                    "收场时他停下脚步看了你的脚一眼，什么也没说就走了。",
                  ],
                  effects: { tier: { kind: "sword", gain: 12 }, stats: { sword: 3, int: 2 }, goal: 2 },
                },
              ],
            },
          ],
        },
        event: "ml-blade-of-holy-land-s1",
      },
      {
        id: "s2",
        title: "第二章 · 木刀之后",
        premise:
          "总本山要往下一批人里挑几个进正式序列。挑人的办法不是考试，是让你拿真剑站到别人对面。",
        objective: "在真剑对练里赢下一场，并且活到收场。",
        guidance: [
          "正式序列的名单贴在正堂侧墙，去看清楚自己有没有被写在上面。",
          "真剑对练没人替你收力。先想清楚自己哪一步会让开，哪一步不让。",
          "和同门对练时留半分力的人，通常死在对手那半分上。",
          "赢了以后不要站在场中央。这里的人不喜欢赢家多站一息。",
          "输了也要起来把刀捡回去。收场的方式比胜负更被记得。",
        ],
        quests: [
          {
            id: "q1",
            label: "在真剑对练里赢一场",
            hint: "道场里的「与同门以真剑对练」就是这一场。练到剑术中级以上再去，活下来的机会大得多。",
            done: { flag: "ml:blade-of-the-holy-land:s2:duel-won" },
          },
          {
            id: "q2",
            label: "走完这一场之后自己处理伤口",
            hint: "用「处理伤口、调养身体」，或者干脆在家歇一个月。伤口处理不掉的人，第二年就不在了。",
            done: { anyStats: { health: 45 }, monthsIn: 1 },
          },
          {
            id: "q3",
            label: "把这一场里学到的那个动作练熟",
            hint: "回道场继续「重复同一个动作」，直到那一下不再需要想。",
            done: { anyStats: { sword: 45 }, anySkill: ["sg_wrist_drop", "wg_nagare", "ng_adapt"] },
          },
        ],
        enter: { flag: "ml:blade-of-the-holy-land:s1:done" },
        deadlineMonths: 20,
        onEnter: {
          lines: [
            "名单贴在侧墙上，用的是墨很淡的那种纸。你的名字在最后一行。",
            "发到你手上的是一把开了刃的旧剑。剑柄上还留着上一个人的手汗。",
            "有人在你身后说了一句：别站太久。你没回头。",
          ],
          effects: {
            flag: "ml:blade-of-the-holy-land:s2:in",
            stats: { sword: 4, health: -4 },
            goal: 4,
            notice: "你被列进了正式序列的候选名单，接下来是真剑。",
          },
          commands: [
            {
              name: "剑之道场",
              desc: "真剑收在架子上，取用要报名字。这规矩是给人看的。",
              commands: [
                {
                  label: "把腕落练到不假思索",
                  category: "修炼",
                  cost: 18,
                  hint: "木刀也能废掉一条胳膊，真剑就是一条胳膊换一条命",
                  lines: [
                    "同一个角度你练了上千次，练到闭着眼也知道刀该停在哪儿。",
                    "师范从旁边过，停了一瞬。那一瞬你听见了。",
                  ],
                  effects: { tier: { kind: "sword", gain: 15 }, stats: { sword: 5 }, goal: 3 },
                },
              ],
            },
            {
              name: "家中",
              desc: "通铺里空了两个位置。上个月还睡着人。",
              commands: [
                {
                  label: "睡前把剑磨一遍",
                  category: "修炼",
                  cost: 8,
                  hint: "磨剑的时候人会静下来，也会想清楚明天怎么站",
                  lines: [
                    "磨石上的水变黑了。你换了一盆，接着磨。",
                    "剑锋照出你自己的脸，看不太清。这样也好。",
                  ],
                  effects: { stats: { sword: 3, int: 2 }, goal: 2 },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "你从场上下来的时候，肩膀在渗血，腿还是站得住的。",
            "对面那个人躺着没动，后来自己坐起来了。没人去扶他。",
            "第二天早上，你的名字被人从最后一行划到了中间。",
            "划得很轻，可你看见了。",
          ],
          effects: {
            flag: "ml:blade-of-the-holy-land:s2:done",
            stats: { sword: 6, health: -5, fame: 4 },
            tier: { kind: "sword", gain: 18 },
            factions: { 剑之圣地: 8 },
            goal: 6,
            notice: "你在真剑对练里赢了。总本山开始按名字叫你。",
          },
          commands: [
            {
              name: "剑之道场",
              desc: "有人开始找你练手了。这不是好事，也不是坏事。",
              commands: [
                {
                  label: "和找你练手的人对一场",
                  category: "修炼",
                  cost: 20,
                  hint: "被找上门的人，通常已经进了别人的名单",
                  lines: [
                    "一场接一场，你赢了大半，输的那两场记在了心里。",
                    "有人收刀时朝你行了个很短的礼。在这里，这算认了你。",
                  ],
                  effects: { tier: { kind: "sword", gain: 16 }, stats: { sword: 5, health: -4, fame: 3 }, goal: 3 },
                },
              ],
            },
          ],
        },
        event: "ml-blade-of-holy-land-s2",
      },
      {
        id: "s3",
        title: "第三章 · 门里多出来的脚印",
        premise:
          "总本山的招式被一片一片卖到外面去了。长老会认定有人从里面往外递东西，而被指派去查这件事的，是刚进来没多久的你。",
        objective: "查出是谁往外递招，并决定把这件事报到哪一步。",
        guidance: [
          "正堂侧屋有一批旧名册，进出的人、领剑的人都在上面。去翻，别问人。",
          "偷艺的人不敢在白天练。夜里道场外的山路，脚步比白天多。",
          "西隆和罗亚那边的地下有专门收这种东西的人，价钱比你想的高。",
          "查到名字之后先别急。名字后面挂着谁，比名字本身要紧。",
          "长老会要的是一个能写进名册的结论，不一定是真的那一个。",
        ],
        quests: [
          {
            id: "q1",
            label: "从旧名册里找出一条对不上的出入记录",
            hint: "去道场用「看别人练剑」，或者到「书库与研究室」用「研读一整月」，把线头找出来。",
            done: { anyStats: { int: 40, scheme: 40 }, monthsIn: 1 },
          },
          {
            id: "q2",
            label: "夜里跟一次多出来的那串脚印",
            hint: "道场外的山路上练一次脚，先熟悉地形；之后用「听墙角」或「打听附近的传闻」凑出这个人是谁。",
            done: { anyStats: { scheme: 45 }, monthsIn: 2 },
          },
          {
            id: "q3",
            label: "把查出来的结果决定交给谁",
            hint: "这一条要在第三章的抉择里做。交长老会、交剑神、还是压下来，三条路都在那儿。",
            done: { flag: "ml:blade-of-the-holy-land:s3:reported" },
          },
        ],
        enter: { flag: "ml:blade-of-the-holy-land:s2:done" },
        deadlineMonths: 18,
        onEnter: {
          lines: [
            "长老会的人把你叫进侧屋，只说了两句：从里面往外递东西的人还在。你去查。",
            "他们没有给你权柄，也没有给你名单。给的是一个可以在道场里随便走动的名分。",
            "出门的时候你想，这差事不像是抬举。",
          ],
          effects: {
            flag: "ml:blade-of-the-holy-land:s3:in",
            stats: { int: 4, scheme: 5, sword: -2 },
            factions: { 剑之圣地: 5 },
            goal: 5,
            notice: "长老会要你去查总本山内部的泄密。你成了查人的人。",
          },
          rumor: "总本山最近封了一次道场。封的时候谁都不许进，包括几个师范。",
          commands: [
            {
              name: "剑之道场",
              desc: "道场夜里落了锁，锁是新的。新旧对不上，本身就是一句话。",
              commands: [
                {
                  label: "记下道场夜里的锁与脚印",
                  category: "隐秘",
                  cost: 12,
                  hint: "不问人，只看地上和门上留下的东西",
                  lines: [
                    "你连着半个月天黑以后绕道场走一圈，鞋印数出了三个人。",
                    "三个人里,有一个不该有钥匙。",
                  ],
                  effects: { stats: { scheme: 6, int: 3 }, goal: 4 },
                },
              ],
            },
            {
              name: "剑之圣地",
              desc: "山坡、石阶、总本山唯一的出口。往上的路没人走，往下的路每天都有人。",
              commands: [
                {
                  label: "在山路上跟一段不该有的人",
                  category: "探索",
                  cost: 16,
                  hint: "跟到能认出脸就够了，跟到对方回头就糟了",
                  lines: [
                    "你隔着半座山跟着，跟到岔路口那个人停下系鞋带。",
                    "系得比谁都慢。你记住了那件外套的颜色。",
                  ],
                  effects: { stats: { scheme: 5, int: 3, sword: 2 }, goal: 4 },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "你把查出来的东西写完，纸上只有两个名字和一串日期。",
            "名字里那个年轻的，去年还替你顶过一班夜哨。",
            "长老会收下纸，什么也没说，只让你回去接着练剑。",
            "那天晚上你练到很晚，练的都是最基础的东西。",
          ],
          effects: {
            flag: "ml:blade-of-the-holy-land:s3:done",
            stats: { int: 5, scheme: 6, fame: 3, charm: -3 },
            tier: { kind: "sword", gain: 12 },
            factions: { 剑之圣地: 10 },
            goal: 6,
            notice: "你把泄密的事交出去了。总本山里有人从此不再跟你说话。",
          },
          commands: [
            {
              name: "剑之道场",
              desc: "那些不跟你说话的人，练剑的时候还是站在你旁边。",
              commands: [
                {
                  label: "把查人之外的时间全用来练剑",
                  category: "修炼",
                  cost: 20,
                  hint: "名册上写字的人，最后还是要靠剑说话",
                  lines: [
                    "你一天练两场，从早到晚。手里的事反而比脑子里的事清楚。",
                    "有人在旁边看了你很久，走的时候没打招呼。你也没停。",
                  ],
                  effects: { tier: { kind: "sword", gain: 16 }, stats: { sword: 5, health: -3 }, goal: 3 },
                },
              ],
            },
          ],
        },
        event: "ml-blade-of-holy-land-s3",
      },
      {
        id: "s4",
        title: "第四章 · 刀要交给谁",
        premise:
          "总本山封着一把旧刀，据说是上上任剑神用过的。长老会想把它留给血统，剑神那一脉不表态，两边的眼睛都落在了你身上。",
        objective: "在长老会与剑神一脉之间弄清自己的位置，并说清你要不要那把刀。",
        guidance: [
          "剑神加尔·法利昂人在总本山。他衡量人的方式只有一个：让你站到他对面。",
          "长老会那边管着名册、口粮和调动。得罪他们不会挨打，只会慢慢没你的位置。",
          "剑神的女儿妮娜、侄子奇诺都在这条线上。他们不需要那把刀，但他们不想看外人拿。",
          "别在正堂上把话说满。这里的人记性好，记的都是你多说的那半句。",
          "想清楚一件事：你要的是刀，还是那把刀代表的那句话。",
        ],
        quests: [
          {
            id: "q1",
            label: "让剑神本人看你一眼",
            hint: "剑术练到上级以上再去找他。道场里「向剑神求一刀」就是那次见面。",
            done: { anyStats: { sword: 55 }, anySkill: ["sg_silent_blade", "tk_cloak"] },
          },
          {
            id: "q2",
            label: "在长老会那边留下一句能站得住的话",
            hint: "用「看别人练剑」和「和邻里闲聊」之外的场合——道场里的表现就是你的话。声望到 35 再谈这件事。",
            done: { anyStats: { fame: 35, scheme: 45 }, monthsIn: 2 },
          },
          {
            id: "q3",
            label: "公开说出你要不要那把刀",
            hint: "这一条在第四章的抉择里。要、不要、或者把刀推给别人，三条路各有各的价钱。",
            done: { flag: "ml:blade-of-the-holy-land:s4:stance" },
          },
        ],
        enter: { flag: "ml:blade-of-the-holy-land:s3:done" },
        deadlineMonths: 16,
        onEnter: {
          lines: [
            "旧刀抬进正堂那天，两边各站了一排人，中间空出一条路。",
            "长老会的人念了一段祖例，念到一半，剑神从后门进来，站在最边上听完了。",
            "念完之后没有人说话。有几道视线落在你身上，又移开了。",
          ],
          effects: {
            flag: "ml:blade-of-the-holy-land:s4:in",
            stats: { sword: 3, scheme: 4, fame: 4 },
            factions: { 剑之圣地: -4 },
            goal: 6,
            notice: "总本山为一把旧刀争起来了。你被算进了这件事里。",
          },
          rumor: "听说总本山那把旧刀要重新择主。这种事上一次发生还是几十年前。",
          commands: [
            {
              name: "剑之道场",
              desc: "这几天道场里的人练得比平时狠，也都不说话。",
              commands: [
                {
                  label: "在正堂前把一套剑练完",
                  category: "修炼",
                  cost: 20,
                  hint: "两派人都在看。练给他们看，也是练给自己看",
                  lines: [
                    "你把一套起手到收刀练了三遍，第三遍慢得不像话。",
                    "长老会那边有人点了下头。剑神那一边没人动。",
                  ],
                  effects: { tier: { kind: "sword", gain: 15 }, stats: { sword: 5, fame: 4, scheme: 3 }, goal: 4 },
                },
              ],
            },
            {
              name: "家中",
              desc: "通铺里的人这两天话很少。有人开始把铺位往离你远的一侧挪。",
              commands: [
                {
                  label: "问同辈一句他们怎么看那把刀",
                  category: "社交",
                  cost: 10,
                  hint: "同辈说的话往往比长老会说的真",
                  lines: [
                    "你问了两个人。一个说刀是死的，一个说刀归谁是活的。",
                    "第二个人说完就走了，走得比平时快。",
                  ],
                  effects: { stats: { scheme: 5, charm: 3, int: 2 }, goal: 3 },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "旧刀最后留在正堂，没进任何人的屋子。",
            "长老会说是祖例未定，剑神那边说是时候不到。",
            "两个人说的话不一样，意思差不多：他们都还没打算把刀给谁。",
            "你从正堂出来，手心里全是汗。",
          ],
          effects: {
            flag: "ml:blade-of-the-holy-land:s4:done",
            stats: { sword: 5, scheme: 5, fame: 5, charm: -2 },
            tier: { kind: "sword", gain: 16 },
            factions: { 剑之圣地: 6 },
            goal: 6,
            notice: "旧刀没有择主。你把自己的立场摆到了明面上。",
          },
          commands: [
            {
              name: "剑之道场",
              desc: "练下去。这里唯一不会骗人的东西，是手里这把木刀。",
              commands: [
                {
                  label: "把旧刀的分量在手里过一遍",
                  category: "修炼",
                  cost: 18,
                  hint: "分量和你现在用的差不多。差的是它挂在谁腰上",
                  lines: [
                    "你借来一把同样长短重量的木刀，练了整整一个月。",
                    "练完你明白了一件事：刀好一点，人的错也一样多。",
                  ],
                  effects: { tier: { kind: "sword", gain: 14 }, stats: { sword: 4, int: 3 }, goal: 3 },
                },
              ],
            },
          ],
        },
        event: "ml-blade-of-holy-land-s4",
      },
      {
        id: "s5",
        title: "第五章 · 剑神祭上的一场",
        premise:
          "总本山办剑神祭，各支门人都回来。长老会安排你和一个剑圣当众交手，说是比试，实则是要你当着所有人证明自己配不配站在这栋房子里。",
        objective: "在剑神祭上赢下这一场，或者输得让这栋房子记住你。",
        guidance: [
          "剑神祭前的两个月不要新练花招，把已经会的东西磨到不会失手。",
          "对手是剑圣，他会想让你先动手。抢先手的人要付代价，你得先算清楚。",
          "道场之外的人那天都会到场，包括从罗亚和西隆赶回来的门人。",
          "输了也不算完。这里评一个人，看的是倒下之后怎么起来。",
          "剑神加尔会全程坐在最上面那一排。他看的是你出刀前的那一息。",
        ],
        quests: [
          {
            id: "q1",
            label: "在剑神祭之前把剑术推到上级以上",
            hint: "在道场长期练「重复同一个动作」「和师兄对练」，或者拿「与同门以真剑对练」刷经验。",
            done: { swordTier: "上级" },
          },
          {
            id: "q2",
            label: "当众赢下或输得体面地打完这一场",
            hint: "去「战斗」场景用「一对一决斗」或「与远强于自己的人过招」，正面打完。",
            // 打完这一场，名声与手上的东西都会留下痕迹——按这两样判，不押在某一场戏上
            done: { anyStats: { fame: 40, sword: 55 } },
          },
          {
            id: "q3",
            label: "在祭典结束前做出最后的选择",
            hint: "这一条在第五章的抉择里。赢下来、留在总本山、或者索性走出这道门，都要在那里说清。",
            done: { flag: "ml:blade-of-the-holy-land:s5:answer" },
          },
        ],
        enter: {
          flag: "ml:blade-of-the-holy-land:s4:done",
          anyStats: { sword: 50 },
          residence: ["剑之圣地"],
        },
        deadlineMonths: 14,
        onEnter: {
          lines: [
            "剑神祭那天，正堂里的火把点了两排，各支门人站满了院子。",
            "长老会念了你的名字，也念了对面那个人的名字。念完之后全场安静了一息。",
            "你走上场中央，先看了脚下的地板。这里你已经练了这么多年。",
          ],
          effects: {
            flag: "ml:blade-of-the-holy-land:s5:in",
            stats: { sword: 4, fame: 6, health: -3 },
            factions: { 剑之圣地: 8 },
            goal: 7,
            notice: "剑神祭上，长老会安排你和一位剑圣当众交手。",
          },
          rumor: "今年的剑神祭多出一场。听说上场的是个外来人，对面是正经的剑圣。",
          commands: [
            {
              name: "剑之道场",
              desc: "祭典前两个月，道场白天归你，晚上归别人。",
              commands: [
                {
                  label: "把光之太刀的那一息练稳",
                  category: "修炼",
                  cost: 22,
                  hint: "奥义只有一次机会。学会之后再练到不会失手，才是真的会",
                  lines: [
                    "你把同一刀劈了两千次，前面一千次都在找角度，后面一千次在找那一息。",
                    "收刀的时候手不抖了。这比什么都值得。",
                  ],
                  effects: { tier: { kind: "sword", gain: 18 }, stats: { sword: 6, health: -3 }, goal: 4 },
                },
              ],
            },
            {
              name: "战斗",
              desc: "正堂的场地扫干净了。木刀和真剑都摆在边上，用哪一把由你。",
              commands: [
                {
                  label: "在祭典上先下手为强",
                  category: "战斗",
                  cost: 26,
                  hint: "剑神流讲的就是先手。先手也要有人替你收场",
                  lines: [
                    "你比对方早了半息出刀。这半息是你这些年全部的积蓄。",
                    "刀停在对方颈侧的时候，全场没有声音，只有火把在响。",
                  ],
                  effects: { tier: { kind: "sword", gain: 20 }, stats: { sword: 7, fame: 8, health: -4 }, goal: 6 },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "这一场打完，各支门人陆续散了。有人来拍你的肩膀，有人绕着走。",
            "长老会当众给了你一个名分。名分写得很客气，客气得像是提前备好的。",
            "剑神加尔只说了半句：以后站到人对面的时候，脚下再稳一点。",
            "你把刀还回架子上。这把刀不是那把旧刀，可你握得比谁都稳。",
          ],
          effects: {
            flag: "ml:blade-of-the-holy-land:s5:done",
            stats: { sword: 8, fame: 8, health: -5, charm: -3 },
            tier: { kind: "sword", gain: 24 },
            factions: { 剑之圣地: 12 },
            goal: 8,
            notice: "你在剑神祭上打完了那一场。总本山认了你的名字。",
          },
          commands: [
            {
              name: "剑之道场",
              desc: "祭典散了。道场又只剩木地板的响声和汗味。",
              commands: [
                {
                  label: "把祭典这一场拆开重练",
                  category: "修炼",
                  cost: 18,
                  hint: "赢过的那一场里，错的地方比输的那一场更多",
                  lines: [
                    "你把自己那一场从头到尾拆了一遍，拆出四处多余的动作。",
                    "练到第七天，那四处不在了。",
                  ],
                  effects: { tier: { kind: "sword", gain: 14 }, stats: { sword: 4, int: 4 }, goal: 3 },
                },
              ],
            },
          ],
        },
        event: "ml-blade-of-holy-land-s5",
      },
    ],
    endings: {
      done:
        "你在剑神祭上赢了那一场，总本山把剑圣的名分给了你。长老会认你，是因为你赢了；同辈里有一半从此不再跟你同桌吃饭。那把旧刀最后还是没有交到你手上——它留在正堂，成了下一批人争的东西。你成了这栋房子里最能打的外人。",
      partial:
        "你练到了上级，赢过几场真剑，也在泄密的事上替长老会跑过腿，可剑神祭那一场到底没打完，或者你中途退了出去。总本山还记得你的名字，记得的方式是「那个没走完的人」。你在别处照样能靠这把剑吃饭，只是每次听见钟声都会愣一下。",
      failed:
        "你没能在这栋房子外面交出让人记得的东西。可能是伤退的，可能是在查人的差事里被人先下手，也可能只是有一天早上没起来去占那块地板。总本山的名册上你的名字被划掉了，划得很干净。你带走了自己那把剑和一身旧伤。",
    },
  },

  /* ================================================================== *
   * 二、水神流的行刑人
   * ================================================================== */
  {
    id: "executioner-of-the-water-god",
    name: "水神流的行刑人",
    theme: "暗杀与信条",
    tagline: "这门剑术替人收拾人，替的人从来不出面。",
    fit:
      "在王都或教团的地界上被当成「能用的人」挑走的那种人。冷得住、忍得住、又还没完全不知道该信什么的人最合适。适合平民、教徒与被诅咒者出身，水神流或尚未定流派的主角，出身不太好的那种。",
    tags: {
      origins: ["平民/农家子弟", "米里斯教徒", "剑之圣地学徒", "被诅咒者", "奴隶/家畜"],
      statuses: ["剑士", "平民", "教徒", "冒险者"],
      faiths: ["米里斯教团", "无信"],
      places: ["王都亚尔斯", "米里希昂", "剑之圣地"],
      talents: ["剑术天赋", "斗气感知", "无咏唱施法"],
      styles: ["宫廷阴谋", "剑之修行", "情感纠葛"],
    },
    prologue: [
      "水神流的道理很简单：不出手，等对手先出手，然后比他更早到。",
      "在王都亚尔斯，这门道理被卖过很多次。买的人不出面，出面的人不留名。",
      "你被一个自称「介绍人」的人找上。他没说要你做什么，只问你会不会用剑。",
      "他给你的第一个活是送信。第二个活是跟一个人。第三个活，他没说是第几个。",
      "这门剑术教人守住自己的位置。它没教过你，收下钱之后该守住谁的位置。",
    ],
    stages: [
      {
        id: "s1",
        title: "第一章 · 介绍人",
        premise:
          "一个在酒馆里总能坐到你对面的人，开始给你一些不用问来路的活。钱很干净，活也很干净。",
        objective: "弄清楚自己在替谁做事，并且把水神流的基础练到能用的地步。",
        guidance: [
          "介绍人姓什么不重要，重要的是他每次约你的桌子都在换。记住那些位置。",
          "水神流讲「后的先」。练的时候不要抢，让对手先动，练到你先到他先输。",
          "王都的公会、演武场、暗巷都去走一遍，认识人比认识招式有用。",
          "他给的活先接下来，但每次只接一件。接多的人容易被人记住。",
          "不要问雇主是谁。这条规矩他会说三遍；说三遍的规矩，通常是有原因的。",
        ],
        quests: [
          {
            id: "q1",
            label: "把水神流的「流」练进身体里",
            hint: "在道场或演武场反复练，或者去剑之圣地找人拆招。目标是把剑术练到中级以上。",
            done: { swordTier: "中级" },
          },
          {
            id: "q2",
            label: "在王都站住脚，让人愿意把小事交给你",
            hint: "用「在演武场从早练到晚」练本事，用「在贵族圈里周旋」或「和同行喝酒」攒人情。声望到 25 就够。",
            done: { anyStats: { fame: 25, scheme: 35 } },
          },
          {
            id: "q3",
            label: "第一次替介绍人办完一件不问来路的事",
            hint: "办完这件小事，你才算进了这个圈子。接下来他会给你更重的东西。",
            done: { flag: "ml:executioner-of-the-water-god:s1:accepted" },
          },
        ],
        enter: {},
        deadlineMonths: 24,
        onEnter: {
          lines: [
            "你第一次坐到他面前时，他先把酒推过来，然后才问你会不会用剑。",
            "你说是。他说好，那先替我做件小事。",
            "那件小事是送一封信，报酬够你吃三个月。",
          ],
          effects: {
            residence: "王都亚尔斯",
            flag: "ml:executioner-of-the-water-god:s1:in",
            stats: { sword: 4, scheme: 4, charm: 2 },
            goal: 4,
            notice: "一个介绍人开始给你活儿。你还没问他替谁做事。",
          },
          rumor: "王都的酒馆里最近有个生面孔，话不多，酒钱付得很快。",
          commands: [
            {
              name: "王都贵族圈",
              desc: "香氛、丝绸、笑。有人在这里买命，签的是别的名目。",
              commands: [
                {
                  label: "替介绍人送一趟不署名的信",
                  category: "隐秘",
                  cost: 14,
                  hint: "信是封着的。封蜡上那个图案你见过，但想不起在哪儿",
                  lines: [
                    "你把信交到一双戴着皮手套的手里，对方没有露脸，也没有数钱。",
                    "回程你绕了两条街。这是介绍人教你的第一件事。",
                  ],
                  effects: { stats: { scheme: 6, wealth: 90, int: 2 }, goal: 4 },
                },
              ],
            },
            {
              name: "王都演武场",
              desc: "近卫与贵族子弟共用的一块场地。教习是打过仗的人，出手不留情面。",
              commands: [
                {
                  label: "把守势练到不用想",
                  category: "修炼",
                  cost: 16,
                  hint: "水神流不抢先手，练的是让别人先动",
                  lines: [
                    "你练了一个月的卸力。教习说你手上还是太急。",
                    "你把急的那部分磨掉了，剩下的动作变得很短。",
                  ],
                  effects: { tier: { kind: "sword", gain: 13 }, stats: { sword: 4, int: 3 }, goal: 3 },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "三件事办完，介绍人给你换了一张桌子，也换了一种说话的方式。",
            "他说你现在算「能用的」。在王都，这个词值钱。",
            "你没问他把你的名字写在了哪里。他也没提。",
            "回去的路上你练了一遍水神流的起手。这一次不想别的。",
          ],
          effects: {
            flag: "ml:executioner-of-the-water-god:s1:done",
            stats: { sword: 5, scheme: 6, wealth: 120 },
            tier: { kind: "sword", gain: 16 },
            goal: 6,
            notice: "你替介绍人办完了三件小事。他把你算进了「能用的人」。",
          },
          commands: [
            {
              name: "王都贵族圈",
              desc: "宴上的笑声很整齐。整齐的东西通常是排过的。",
              commands: [
                {
                  label: "在宴会上记住每一张脸和每一个人旁边的人",
                  category: "社交",
                  cost: 14,
                  hint: "王都里最要紧的信息，是谁跟谁站在了一起",
                  lines: [
                    "你一个晚上没吃东西，只在记人名和谁跟谁说话。",
                    "回到住处你把这些写在纸上，写完烧了。",
                  ],
                  effects: { stats: { scheme: 7, charm: 3, int: 2 }, goal: 4 },
                },
              ],
            },
          ],
        },
        event: "ml-executioner-of-the-water-god-s1",
      },
      {
        id: "s2",
        title: "第二章 · 第一次奉命",
        premise:
          "介绍人给了你一个名字、一条街和一句话：别让他走到街尾。他没有说要杀，也没有说不要杀。",
        objective: "完成第一次奉命，然后想清楚这件事该怎么记在自己身上。",
        guidance: [
          "先把那条街走三遍。哪一段没有灯、哪一段有人开窗，你自己要清楚。",
          "水神流取的是「后的先」。第一次不要抢，让目标先动手，你先到就结束。",
          "动手之前想好退路。王都的巷子尽头都是墙，只有一条是通的。",
          "别在人前用剑。这里的规矩是：用了剑的事，都会被记成别的事。",
          "事后不要回住处。王都的暗巷里，消息比剑快。",
        ],
        quests: [
          {
            id: "q1",
            label: "把目标那条街摸清楚",
            hint: "用「打探宫廷动向」或者「收买消息」凑够密谋；王都的巷子要认识人才能问出东西。",
            done: { anyStats: { scheme: 45, int: 35 }, monthsIn: 1 },
          },
          {
            id: "q2",
            label: "动手，并且活着回来",
            hint: "去「战斗」场景用「追杀一个目标」。剑术中级以上再去，硬闯的机会大一些。",
            done: { flag: "ml:executioner-of-the-water-god:s2:first-blood" },
          },
          {
            id: "q3",
            label: "把这一夜从自己身上收拾干净",
            hint: "事后歇一个月，或者去教会静养。手上沾了东西之后，身体比心先反应过来。",
            done: { anyStats: { health: 50 }, monthsIn: 2 },
          },
        ],
        enter: { flag: "ml:executioner-of-the-water-god:s1:done" },
        deadlineMonths: 18,
        onEnter: {
          lines: [
            "他给的名字写在一张很小的纸上，揉起来比指甲还小。",
            "那条街你去过。街尾有一家卖热汤的铺子，晚上很亮。",
            "他没说该不该杀，只说别让他走到街尾。",
          ],
          effects: {
            flag: "ml:executioner-of-the-water-god:s2:in",
            stats: { scheme: 5, sword: 3, health: -3 },
            goal: 5,
            notice: "介绍人给了你第一个名字。他没说这个字怎么写。",
          },
          commands: [
            {
              name: "暗巷与地下社会",
              desc: "湿墙、暗号、压低的声音。这里的规矩，比法律硬。",
              commands: [
                {
                  label: "在动手前摸清街上每一扇能开的门",
                  category: "隐秘",
                  cost: 16,
                  hint: "水神流只赢在「更早到」，而更早到要靠事先看清楚",
                  lines: [
                    "你把那条街的门数了一遍，能开的只有四扇。",
                    "四扇门的位置你记在手上。这比任何招式都管用。",
                  ],
                  effects: { stats: { scheme: 7, int: 3 }, goal: 4 },
                },
              ],
            },
            {
              name: "战斗",
              desc: "刀在鞘里。这一次没有人会替你先动手。",
              commands: [
                {
                  label: "照着那条街的走法动手",
                  category: "战斗",
                  cost: 28,
                  hint: "不要抢。让对方先动，你先到",
                  lines: [
                    "对方先动的。他的手刚抬起来，你的剑已经到了他该在的位置。",
                    "街上没有第二个声音。你退回来的时候，汤铺还亮着。",
                  ],
                  effects: { tier: { kind: "sword", gain: 16 }, stats: { sword: 6, scheme: 4, health: -4 }, goal: 6 },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "你回了住处，换了衣服，把手洗了三遍。",
            "第二天介绍人把钱放在桌上，问你要不要接下一件。",
            "你说要。他说好。这件事就这样过去了。",
            "那家汤铺后来你再没去过。",
          ],
          effects: {
            flag: "ml:executioner-of-the-water-god:s2:done",
            stats: { sword: 6, scheme: 6, wealth: 220, health: -4, faith: -4 },
            tier: { kind: "sword", gain: 18 },
            goal: 6,
            notice: "你第一次奉命动手。这件事没有第二个人知道，除了付钱的那个。",
          },
          commands: [
            {
              name: "王都贵族圈",
              desc: "雇你的人就坐在这些桌子后面，喝着酒，看着别处。",
              commands: [
                {
                  label: "把这一夜的每一个细节在心里过一遍",
                  category: "隐秘",
                  cost: 10,
                  hint: "记清楚自己做过的每一步，下次才不必重想",
                  lines: [
                    "你坐在灯下，把那一夜从头到尾想了一遍，想出了两处可以更快的地方。",
                    "想完之后你吹了灯。黑暗里那两处反而更清楚。",
                  ],
                  effects: { stats: { scheme: 5, sword: 3, int: 3 }, goal: 4 },
                },
              ],
            },
          ],
        },
        event: "ml-executioner-of-the-water-god-s2",
      },
      {
        id: "s3",
        title: "第三章 · 那个人不是他要的名字",
        premise:
          "第二件活的名单上多了一个不该在的名字，或者你动手之后才听说，那个人根本不是雇主说的那个。介绍人换了桌子，也换了说法。",
        objective: "查清那次杀错人是怎么来的，并且决定要不要往下查。",
        guidance: [
          "雇主给的那张纸上只有名字，没有画像。问清楚名字是谁写上去的，是你自己的事。",
          "王都的贵族圈有两派在角力。你杀的那个人假如站错了边，这件事就不是意外。",
          "介绍人开始躲你，这本身就是答案的一半。他躲得越干净，你查的方向越对。",
          "去公会和暗巷把两边的说法凑在一起。两套说法对不上的那处，就是缝隙。",
          "想清楚要不要往下查。往下走一步，回头的人就不多了。",
        ],
        quests: [
          {
            id: "q1",
            label: "凑出两套对不上的说法",
            hint: "在暗巷用「收买消息」，在酒馆用「和同行喝酒」，在贵族圈用「打探宫廷动向」。密谋到 55 会有用。",
            done: { anyStats: { scheme: 55, int: 40 }, monthsIn: 2 },
          },
          {
            id: "q2",
            label: "把介绍人堵在能说话的地方",
            hint: "要见到他，靠的是名声和交情：声望到 35，或者干脆在王都的贵族圈里把人认全。",
            done: { anyStats: { fame: 35, charm: 40 }, monthsIn: 1 },
          },
          {
            id: "q3",
            label: "决定这条线查到哪一步为止",
            hint: "这一条在第三章的抉择里。继续往下查、收手、或者反手把雇主交出去，三条路都在那儿。",
            done: { flag: "ml:executioner-of-the-water-god:s3:line" },
          },
        ],
        enter: { flag: "ml:executioner-of-the-water-god:s2:done" },
        deadlineMonths: 18,
        onEnter: {
          lines: [
            "死的那个人的名字你听过，是另一件事里的另一个人。",
            "介绍人这次约你在码头的堆场，站着说完就走。",
            "他说：「名字是别人给的。你只负责走到他在的地方。」",
          ],
          effects: {
            flag: "ml:executioner-of-the-water-god:s3:in",
            stats: { scheme: 5, int: 4, charm: -3 },
            goal: 6,
            notice: "你手上的第二件活出了错。介绍人说那是别人给的名字。",
          },
          rumor: "王都最近出了几桩夜里的死人。说法有四五种，哪一种都能对上时间。",
          commands: [
            {
              name: "暗巷与地下社会",
              desc: "这里买得到名单，也买得到名单是谁开的价。",
              commands: [
                {
                  label: "顺着那张名单的名字往回问一层",
                  category: "隐秘",
                  cost: 16,
                  hint: "问一层就够了，问两层会被当成麻烦",
                  lines: [
                    "你花了两笔钱，买到一句话：名字是别人口述的，写字的人自己没见过那个人。",
                    "这句话值你半年攒下的钱。你觉得值。",
                  ],
                  effects: { stats: { scheme: 7, int: 4, wealth: -120 }, goal: 5 },
                },
              ],
            },
            {
              name: "王都贵族圈",
              desc: "两派的宴会在同一条街上，隔着三道门。",
              commands: [
                {
                  label: "在两边的宴会上各坐一个晚上",
                  category: "社交",
                  cost: 14,
                  hint: "同一个人的名字，两边说的时候语气不一样",
                  lines: [
                    "你在两边各坐了一晚。同一个名字，一边说得轻，一边说得重。",
                    "轻重之间的那点差，就是你要找的东西。",
                  ],
                  effects: { stats: { scheme: 6, charm: 3, int: 3 }, factions: { 阿斯拉王国: 4 }, goal: 4 },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "你把查到的东西写在一张纸上，写完压在灯下看了很久。",
            "纸上说的是：名字是有人故意给错的，为了让你杀掉一个碍事的人。",
            "介绍人从那天起就不在王都了。有人说他出了城，有人说他还在，只是换了名字。",
            "你把纸烧了。这一次不是因为规矩，是因为你自己还没想好。",
          ],
          effects: {
            flag: "ml:executioner-of-the-water-god:s3:done",
            stats: { scheme: 8, int: 5, faith: -3, fame: 3 },
            tier: { kind: "sword", gain: 12 },
            goal: 7,
            notice: "你查到那一次是有人故意给错的名字。介绍人从此不在王都露面。",
          },
          commands: [
            {
              name: "王都贵族圈",
              desc: "现在有人开始主动跟你打招呼。这未必是好事。",
              commands: [
                {
                  label: "记下每一个突然对你客气的人",
                  category: "隐秘",
                  cost: 12,
                  hint: "忽然客气的人，通常是已经知道你是干什么的",
                  lines: [
                    "你把这些人写下来，一共七个。",
                    "七个里有三个，是那两派宴会上都出现过的。",
                  ],
                  effects: { stats: { scheme: 6, charm: 2, int: 3 }, goal: 4 },
                },
              ],
            },
          ],
        },
        event: "ml-executioner-of-the-water-god-s3",
      },
      {
        id: "s4",
        title: "第四章 · 教团的传票",
        premise:
          "米里斯教团在追查一系列与魔族有关的夜案，查到王都来了。他们手里有一份写着你的名字的名单，还有一位能看着你的眼睛把事读出来的人。",
        objective: "在教团的传票和雇主的封口之间选一边，并且保住自己。",
        guidance: [
          "去米里希昂之前先想清楚：教团的规矩里，一夫一妻是国策，与魔族往来是罪。",
          "教团有一门手段叫记忆阅览。被看着眼睛问过话的人，很少能留住东西。",
          "你替人办过的事，雇主那边也留了记录。两边都在用同一件事威胁你。",
          "神殿骑士团里有认得刀口的人。你用过的那一手，会被人看出来路。",
          "如果打算反手，先找能替你说话的人。教团里也有人不喜欢审判庭的做法。",
        ],
        quests: [
          {
            id: "q1",
            label: "在教团里留下一个愿意替你说话的人",
            hint: "去米里希昂的教会用「祈祷」和「和神父交谈」，或者用「在教区替人看伤」攒信仰和人心。信仰到 40 会有用。",
            done: { anyStats: { faith: 40, charm: 45 }, monthsIn: 2 },
          },
          {
            id: "q2",
            label: "把自己的说法练到能顶住问话",
            hint: "靠密谋和智力：把该记的记住、该忘的忘掉。密谋到 60 以上再去米里希昂。",
            done: { anyStats: { scheme: 60, int: 45 } },
          },
          {
            id: "q3",
            label: "决定把雇主的名字给不给出去",
            hint: "这一条在第四章的抉择里。供出雇主、替雇主顶下、或者干脆跑到教团够不着的地方，三条路都在那儿。",
            done: { flag: "ml:executioner-of-the-water-god:s4:testimony" },
          },
        ],
        enter: { flag: "ml:executioner-of-the-water-god:s3:done" },
        deadlineMonths: 15,
        onEnter: {
          lines: [
            "传票是神殿骑士团的人送上门的。他很有礼貌，等你把鞋穿好。",
            "米里希昂的石板地很凉。大圣堂的钟每一刻响一次。",
            "审你的人在桌子后面坐着，旁边还有一个不太敢看人的女孩子。",
          ],
          effects: {
            flag: "ml:executioner-of-the-water-god:s4:in",
            stats: { scheme: 4, faith: -3, health: -3 },
            factions: { 米里斯教团: -6 },
            goal: 6,
            notice: "米里斯教团的审判庭传了你。他们在查王都那几桩夜案。",
          },
          rumor: "教团的人在王都带走了几个人问话。回来的人说法都不一样。",
          commands: [
            {
              name: "教会与神殿",
              desc: "石板地很凉，烛火很稳。这里的人看着不说实话的人。",
              commands: [
                {
                  label: "审问前先把话说给自己听一遍",
                  category: "隐秘",
                  cost: 12,
                  hint: "记忆阅览读的是记忆，不是谎。你得先决定自己怎么记这件事",
                  lines: [
                    "你把要说的话在心里过了几十遍，过到每一句都一样长。",
                    "过了很久你才发现，你真正在练的是别让自己想起那张汤铺的灯。",
                  ],
                  effects: { stats: { scheme: 7, int: 4, faith: 3 }, goal: 5 },
                },
              ],
            },
            {
              name: "米里希昂",
              desc: "大圣堂的钟、石板地、神殿骑士团的马。这里的一切都排得很齐。",
              commands: [
                {
                  label: "在教区里替人看伤、听人说话",
                  category: "信仰",
                  cost: 12,
                  hint: "教团做的是这个。你想做的，未必是这个",
                  lines: [
                    "你替几个穷人处理了伤口，听他们说了半天家里的难处。",
                    "走的时候有个老修女说你手很稳。你想起自己的手稳是从哪儿来的。",
                  ],
                  effects: { stats: { faith: 7, charm: 5, health: 2 }, factions: { 米里斯教团: 6 }, goal: 4 },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "问话问了两天。第二天下午，他们让你在纸上按了一个手印。",
            "你走出大圣堂的时候，钟正好响。",
            "米里希昂的街上有人在卖热汤。你站着看了一会儿，没有买。",
            "这件事到这里算是有个说法了。至于那个说法是不是真的，只有你自己清楚。",
          ],
          effects: {
            flag: "ml:executioner-of-the-water-god:s4:done",
            stats: { scheme: 7, faith: 4, fame: 5, health: -4 },
            factions: { 米里斯教团: 8 },
            goal: 7,
            notice: "教团记下了你的说法。你从审判庭里走了出来。",
          },
          commands: [
            {
              name: "米里希昂",
              desc: "现在你在这座城里有个说法了。有人信，有人不信。",
              commands: [
                {
                  label: "接着替教区里的人做事",
                  category: "信仰",
                  cost: 12,
                  hint: "替教团做一百件小事，才顶得上一次问话留下的印象",
                  lines: [
                    "你在教区待了一阵子，做的是抬人、换药、跑腿这些事。",
                    "有一天有人在门口等你，说要谢谢你。你没想起他是谁。",
                  ],
                  effects: { stats: { faith: 6, charm: 6, fame: 3 }, factions: { 米里斯教团: 8 }, goal: 4 },
                },
              ],
            },
          ],
        },
        event: "ml-executioner-of-the-water-god-s4",
      },
      {
        id: "s5",
        title: "第五章 · 名单上的最后一个名字",
        premise:
          "那份名单又出现了，最后一个名字是你自己。给你名单的人换了，可能是因为上一批人怕了，也可能是因为有人想省下一笔钱。",
        objective: "在有人来接你之前，先弄清这是谁的意思，并且活下去。",
        guidance: [
          "先找一个不只是你会去的地方。王都、米里希昂、剑之圣地里，总有地方对方不方便进。",
          "把这件事捅给人看的人活得久。教团、公会、宫廷，谁先知道谁就有顾忌。",
          "水神流讲「后的先」。这一次也一样：等他们先动手，你先到。",
          "不要一个人待着。身边有人的时候，敢动手的人会少一半。",
          "想好一件事：这件事结束之后，你打算怎么称呼自己。",
        ],
        quests: [
          {
            id: "q1",
            label: "把要动手的人的身份弄清楚",
            hint: "声望到 45 以上，或者手上有一门能自保的招式。两条路都能让你问出话。",
            done: { anyStats: { fame: 45 }, anySkill: ["wg_nagare", "tk_cloak", "sg_wrist_drop"] },
          },
          {
            id: "q2",
            label: "正面接下这一次",
            hint: "去「战斗」用「一对一决斗」或「与远强于自己的人过招」，也可以先「撤退、保命」换时间。",
            done: { flag: "ml:executioner-of-the-water-god:s5:survived" },
          },
          {
            id: "q3",
            label: "决定以后还接不接这种活",
            hint: "这一条在第五章的抉择里。继续做、洗手不干、或者把整条线交出去，三条路都在那儿。",
            // 做出这个决定就算数：第五章的抉择回应过之后，这一条就成立
            done: { seenEvent: "ml-executioner-of-the-water-god-s5" },
          },
        ],
        enter: {
          flag: "ml:executioner-of-the-water-god:s4:done",
          anyStats: { scheme: 55 },
        },
        deadlineMonths: 12,
        onEnter: {
          lines: [
            "名单是一个跑腿的小子塞给你就走的，一句话也没留。",
            "最后一个名字是你。写得很工整，比前面几个都工整。",
            "你把纸折起来放进怀里。然后你开始想，谁会愿意为这件事花这笔钱。",
          ],
          effects: {
            flag: "ml:executioner-of-the-water-god:s5:in",
            stats: { scheme: 5, sword: 4, health: -4 },
            goal: 7,
            notice: "你在一份名单上看见了自己的名字。名字写得很工整。",
          },
          rumor: "王都最近有几笔来路不明的钱在找「能动手的人」。找的人没露面，钱先到了。",
          commands: [
            {
              name: "战斗",
              desc: "刀在鞘里，这一次对面也带了刀。",
              commands: [
                {
                  label: "等对面先动，再把这一手还回去",
                  category: "战斗",
                  cost: 28,
                  hint: "水神流的「后的先」是用在这里的，不是用在练剑上的",
                  lines: [
                    "对面先出手。你看见他肩上的那一动，比他快半息到了该在的地方。",
                    "收刀时你想起第一次奉命那一夜。这一次汤铺的灯不在。",
                  ],
                  effects: { tier: { kind: "sword", gain: 20 }, stats: { sword: 7, scheme: 5, health: -6 }, goal: 7 },
                },
              ],
            },
            {
              name: "教会与神殿",
              desc: "米里希昂的石板地把所有人都挡在外面，除了教团自己的人。",
              commands: [
                {
                  label: "把这件事先捅给教团的人听",
                  category: "信仰",
                  cost: 12,
                  hint: "先被人知道的事，动手的人就要多想一遍",
                  lines: [
                    "你把那张纸放在一位神父面前，什么也没解释。",
                    "他看了很久，然后把它折好收进袖子里，说他会去问。",
                  ],
                  effects: { stats: { faith: 5, scheme: 6, fame: 4 }, factions: { 米里斯教团: 10 }, goal: 5 },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "动手的人来了两次。第一次没找到你，第二次没回去。",
            "之后王都安静了一阵子。没人来收尾，也没人再提那份名单。",
            "介绍人始终没有露面。有人说他早就死在外面了，这话你信一半。",
            "你把剑收好，走路的时候开始习惯贴着墙的那一侧。",
          ],
          effects: {
            flag: "ml:executioner-of-the-water-god:s5:done",
            stats: { sword: 8, scheme: 8, fame: 6, faith: -4, health: -5 },
            tier: { kind: "sword", gain: 22 },
            goal: 8,
            notice: "名单上的最后一个名字是你，而你还站着。",
          },
          commands: [
            {
              name: "暗巷与地下社会",
              desc: "这里的规矩还是那样硬。只是现在知道你的人多了一些。",
              commands: [
                {
                  label: "把手里的线一条一条收掉",
                  category: "隐秘",
                  cost: 16,
                  hint: "做这一行的人，最要紧的活是不留名字",
                  lines: [
                    "你用了一个月，把几个知道得太多的人从这条线上摘了出去。",
                    "摘法各不相同，结果都一样：没人再提那份名单。",
                  ],
                  effects: { stats: { scheme: 8, int: 4, fame: -3 }, goal: 6 },
                },
              ],
            },
          ],
        },
        event: "ml-executioner-of-the-water-god-s5",
      },
    ],
    endings: {
      done:
        "你还活着，那份名单成了没写完的东西。动手的人死了，付钱的人缩了回去，介绍人再也没有露面。你从教团的问话里走出来，也从那一行的名单上走了下来。手上的那件事你一直记着，记得的方式是再没进过那家汤铺。",
      partial:
        "你顶住了传票，也躲过了最后那一次，可你没有从这一行里出去。刀还在手里，活还在来，钱越攒越多，睡得越来越少。教团的档案里有你的名字，王都的暗巷里有你的价钱。你成了那种「用起来很方便」的人。",
      failed:
        "你在某一次奉命里被留下了，或者跑得不够快。名册上的名字被人划掉，划的人连原因都懒得写。米里斯的档案里留着一份关于你的记录，记录很短，只有年份、地点和一行刀口的形状。",
    },
  },

  /* ================================================================== *
   * 三、北神流的流浪剑客
   * ================================================================== */
  {
    id: "driftblade-of-the-north",
    name: "北神流的流浪剑客",
    theme: "流浪与复仇",
    tagline: "北神流不在乎规矩，只在乎你还能不能站起来。",
    fit:
      "已经在路上走了很久、并且不打算停下来的那种人，或者有一位旧仇在后面追着的人。北神流奇拔派的底子是「能用上的都用上」，所以肯脏手、肯认输、肯扔下装备跑的人都活得下来。适合冒险者、迷宫探索者、兽族与奴隶出身，北神流优先。",
    tags: {
      origins: ["冒险者出身", "迷宫探索者", "兽族", "奴隶/家畜", "魔族后裔"],
      statuses: ["冒险者", "剑士", "迷宫探索者"],
      faiths: ["冒险者公会", "无信"],
      places: ["西隆王国", "迷宫都市拉潘", "龙鸣山", "米格路德族之村"],
      talents: ["剑术天赋", "斗气感知", "军事直觉", "语言天赋"],
      styles: ["冒险史诗", "迷宫探索", "混合模式"],
    },
    prologue: [
      "北神流的道场不在任何一个地方。它在你走过的每一条路上。",
      "这一派的规矩是：没有规矩。地形、沙、绳子、别人的习惯，能用上就是你的。",
      "带你上路的那个人叫哈萨姆。他说自己在找一个欠他一条命的人。",
      "他说这话的时候在缝自己的靴子，缝得很仔细，像这件事已经是很多年前的事了。",
      "你跟着他走了几个月，学会了三件事：怎么活、怎么跑、怎么不回头看。",
    ],
    stages: [
      {
        id: "s1",
        title: "第一章 · 路上的第一课",
        premise:
          "你跟着哈萨姆在西隆到拉潘的路上讨生活。他不教你招式，只让你在每一次麻烦里自己找办法。",
        objective: "在一趟真正的路上活下来，并且从哈萨姆手里把那门「能用上的都用上」学到手。",
        guidance: [
          "西隆王国的佣兵营地和迷宫都市拉潘的分部都有活。先接看得懂的，别接挂着九头龙字样的。",
          "北神流不挑武器。先把身边有什么记住：绳、沙、短刀、地形，全算。",
          "跟着哈萨姆走的时候，注意他怎么处理伤口。他从不先治自己。",
          "路上遇到同行就一起走一段。北神流的人脉是在路上攒的。",
          "别急着报仇，先弄清楚要报的那个人在哪儿。哈萨姆就是这么熬过来的。",
        ],
        quests: [
          {
            id: "q1",
            label: "接一趟真正的委托并回来",
            hint: "去公会或佣兵营地用「接下一件委托」「参加一场战斗」。等级到 E 以上就算入了这一行。",
            done: { adventurerRank: "E" },
          },
          {
            id: "q2",
            label: "从哈萨姆手上学到北神流的应变",
            hint: "北神流没有定式，所以他只在你自己遇到麻烦的时候才开口。冒险等级到 D，他就肯说了。",
            done: { adventurerRank: "D", anyStats: { sword: 35 } },
          },
          {
            id: "q3",
            label: "把哈萨姆要找的那个人打听出来",
            hint: "在公会和村镇里用「打听附近的传闻」「和同行喝酒」，把这条旧仇的线头接上。",
            done: { flag: "ml:driftblade-of-the-north:s1:lead" },
          },
        ],
        enter: {},
        deadlineMonths: 24,
        onEnter: {
          lines: [
            "哈萨姆把一半干粮分给你，然后在沙地上画了两个圈，说这是敌我。",
            "他说北神流不打没把握的仗，因为没把握的时候根本不打。",
            "第二天他把你推进了一场混战，自己在旁边看着。",
          ],
          effects: {
            flag: "ml:driftblade-of-the-north:s1:in",
            stats: { sword: 4, scheme: 3, health: -3 },
            tier: { kind: "adventure", gain: 12 },
            goal: 4,
            notice: "你跟着一个叫哈萨姆的北神流剑士上了路。",
          },
          rumor: "西隆到拉潘这条路上最近不太平。有人说是一伙走私的，也有人说是赏金猎人换了地方。",
          commands: [
            {
              name: "佣兵营地与边境",
              desc: "旗子、号声、泥地。这里的人拿命换工钱，谁也不问对方为什么来。",
              commands: [
                {
                  label: "跟着哈萨姆走一趟边境护送",
                  category: "冒险",
                  cost: 24,
                  hint: "北神流的路数是在这趟路上学的，不是在道场里",
                  lines: [
                    "这趟护送走了十几天。中间遇了一次伏击，哈萨姆先扔沙，再放低身子，最后才拔刀。",
                    "你照着他的顺序做了一遍。做完手在抖，但两人都活着到了。",
                  ],
                  effects: { tier: { kind: "adventure", gain: 14 }, stats: { sword: 4, scheme: 4, health: -5 }, goal: 5 },
                },
              ],
            },
            {
              name: "迷宫都市拉潘",
              desc: "沙、石阶、公会分部的灯。有人正为几枚金币押上性命。",
              commands: [
                {
                  label: "在公会里把每个队伍的底细问清楚",
                  category: "探索",
                  cost: 10,
                  hint: "在这条路上，认识队伍比认识路更要紧",
                  lines: [
                    "你在分部坐了两天，把挂出来的委托和接委托的人对上了号。",
                    "有一队人连着接了三件没人接的活。你记住了那个队长的名字。",
                  ],
                  effects: { stats: { scheme: 5, int: 3 }, goal: 3 },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "走了几个月，你的靴子换了一次，剑上多了两道豁口。",
            "哈萨姆终于肯在你被围的时候开口指点一句。他说得很短，只有三个字：先看脚。",
            "那天晚上他在火边缝靴子，说他找的那个人最后出现过的地方，在龙鸣山那边。",
            "你问他找了多少年。他说记不清了。",
          ],
          effects: {
            flag: "ml:driftblade-of-the-north:s1:done",
            stats: { sword: 5, scheme: 5, health: -4, fame: 4 },
            tier: { kind: "sword", gain: 16 },
            goal: 6,
            notice: "哈萨姆把北神流的底子交给了你，也把他的那笔旧仇说了一半。",
          },
          commands: [
            {
              name: "佣兵营地与边境",
              desc: "火堆边的位置是按资历排的。你最近坐得离火近了一点。",
              commands: [
                {
                  label: "在火堆边把今天那一仗复一遍",
                  category: "修炼",
                  cost: 14,
                  hint: "北神流的招式都是从输掉的那一仗里长出来的",
                  lines: [
                    "你拿树枝在地上画地形，把每一次交手摆出来给哈萨姆看。",
                    "他挑出三处错，说这三处错以前也犯过。",
                  ],
                  effects: { tier: { kind: "sword", gain: 12 }, stats: { sword: 3, scheme: 4, int: 3 }, goal: 3 },
                },
              ],
            },
          ],
        },
        event: "ml-driftblade-of-the-north-s1",
      },
      {
        id: "s2",
        title: "第二章 · 拉潘的地底",
        premise:
          "旧仇的线索落在拉潘的地下。哈萨姆要找的人当年在迷宫里做过一件事，那件事的凭证还压在下面某一层。",
        objective: "从迷宫深处把那份凭证带上来。",
        guidance: [
          "进迷宫之前把补给算够。北神流的战场急救是拿来救自己的，不是拿来省水的。",
          "地下不认流派。带上能用的一切：绳子、沙、火种、几块能砸人的石头。",
          "越往下越要记得回来的路。画图这件事，活着的人才有资格做。",
          "碰上别的队伍先谈，谈不拢再打。下面死一个人，上面少一个证人。",
          "哈萨姆年纪大了。下到第三层之后，他会开始落在你后面。",
        ],
        quests: [
          {
            id: "q1",
            label: "往下推两层，把路画清楚",
            hint: "在迷宫用「深入迷宫」和「绘制路线与地图」。冒险者等级到 D，公会才肯放这种委托。",
            done: { adventurerRank: "D", anyStats: { int: 40 }, monthsIn: 1 },
          },
          {
            id: "q2",
            label: "在下面打出一次干净利落的活口",
            hint: "用「狩猎魔物」，或者干脆在迷宫里打一场。活着上来的人才有资格翻旧账。",
            done: { anyStats: { sword: 50, health: 45 } },
          },
          {
            id: "q3",
            label: "把那份凭证带出地面",
            hint: "拿到凭证之后，哈萨姆才会把当年那件事说完。",
            done: { flag: "ml:driftblade-of-the-north:s2:proof" },
          },
        ],
        enter: { flag: "ml:driftblade-of-the-north:s1:done" },
        deadlineMonths: 20,
        onEnter: {
          lines: [
            "拉潘的地底有七层，能活着回来的队伍只走到过第五层。",
            "哈萨姆在入口处把绳子分了一半给你，说这一半你自己拿主意。",
            "下去的第一天，你就明白他为什么不先治自己的伤。",
          ],
          effects: {
            flag: "ml:driftblade-of-the-north:s2:in",
            stats: { sword: 3, health: -5, scheme: 3 },
            tier: { kind: "adventure", gain: 14 },
            goal: 5,
            notice: "你和哈萨姆下到了拉潘的地下。旧仇的凭证压在下面某一层。",
          },
          commands: [
            {
              name: "迷宫与野外",
              desc: "石头、霉味、滴水声。这里不欢迎活人，活人却总往里去。",
              commands: [
                {
                  label: "照北神流的走法往下一层",
                  category: "冒险",
                  cost: 26,
                  hint: "先把退路留好。奇拔派的前提是身上还留着能收尾的东西",
                  lines: [
                    "你走在前面，把沙袋、绳子和短刀的位置在心里排了一遍。",
                    "下面那层比图纸上画的更深。你们上去的时候，补给只剩一半。",
                  ],
                  effects: { tier: { kind: "adventure", gain: 18 }, stats: { sword: 4, scheme: 5, health: -7 }, goal: 6 },
                },
              ],
            },
            {
              name: "迷宫都市拉潘",
              desc: "公会分部的灯整夜不灭。回来的队伍都在这里结账。",
              commands: [
                {
                  label: "在分部里等一支从下面回来的队伍",
                  category: "社交",
                  cost: 12,
                  hint: "别人带回来的东西，有时比你自己挖的更有用",
                  lines: [
                    "你请一支刚上来的队伍喝了顿酒。他们带回来一片刻着字的铜板。",
                    "铜板上的字哈萨姆认得。他没说话，把它收进了怀里。",
                  ],
                  effects: { stats: { charm: 4, scheme: 5, int: 3 }, goal: 5 },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "凭证是一块铜板，上面刻着当年那支队的编号和日期。",
            "哈萨姆在火边把它翻来覆去看了一夜。第二天早上他说了三句话。",
            "第一句：那个人现在还活着。第二句：他在龙鸣山那边。第三句：你可以不来。",
            "你说你去。",
          ],
          effects: {
            flag: "ml:driftblade-of-the-north:s2:done",
            stats: { sword: 6, scheme: 6, health: -6, fame: 5 },
            tier: { kind: "sword", gain: 14 },
            goal: 7,
            notice: "你从拉潘的地底带上了那份凭证。哈萨姆的旧仇有了名字。",
          },
          commands: [
            {
              name: "迷宫都市拉潘",
              desc: "沙、石阶、公会的灯。这里的人不问你要去做什么。",
              commands: [
                {
                  label: "把这一趟的伤和装备一起补上",
                  category: "休养",
                  cost: -16,
                  hint: "往山上走之前，先把身上的东西补齐",
                  lines: [
                    "你在拉潘歇了大半个月，把伤口、绳子、水囊一件件补齐。",
                    "哈萨姆给你买了一把短的备用刀，说是路上用得上。",
                  ],
                  effects: { stats: { health: 8, sword: 2 }, energy: 16, goal: 3 },
                },
              ],
            },
          ],
        },
        event: "ml-driftblade-of-the-north-s2",
      },
      {
        id: "s3",
        title: "第三章 · 龙鸣山的风",
        premise:
          "线索把人引到了赤龙山脉。龙鸣山是世界最高的灵山，山风里有一层低音，像有什么在下面呼吸。那个人在这里等过一个人。",
        objective: "上山找到当年那件事剩下的痕迹，并且弄清哈萨姆为什么非来不可。",
        guidance: [
          "往龙鸣山走的路只有一条，山脚有个村子，村里人对外人不太说话。",
          "山上有赤龙。它不介意你路过，前提是你看起来不像食物。",
          "哈萨姆走路开始慢了。你们得在山下多停一阵。",
          "山上那个低音，据说有人听了一辈子只写了一页纸。你也可以去听一听。",
          "把当年那件事弄明白之后，你要决定报不报这笔仇。哈萨姆不会替你决定。",
        ],
        quests: [
          {
            id: "q1",
            label: "在龙鸣山一带活过一段时间",
            hint: "用「在赤龙的地盘上活一个月」。要活着，健康最好在 45 以上。",
            done: { residence: ["龙鸣山"], anyStats: { health: 45 }, monthsIn: 1 },
          },
          {
            id: "q2",
            label: "把当年那件事的第三个人找出来",
            hint: "在山上用「在山上听那个低音」和「往龙神孔的方向走」，线索在地形和传闻里。",
            done: { anyStats: { int: 45, scheme: 50 } },
          },
          {
            id: "q3",
            label: "决定这笔旧仇算不算你的",
            hint: "这一条在第三章的抉择里。接手、让哈萨姆自己去了、或者就此下山，三条路都在那儿。",
            done: { flag: "ml:driftblade-of-the-north:s3:vow" },
          },
        ],
        enter: { flag: "ml:driftblade-of-the-north:s2:done" },
        deadlineMonths: 18,
        onEnter: {
          lines: [
            "越往上走，风里的低音越清楚。哈萨姆说这不是风声。",
            "你们在山脚停了三天。他把那件事从头讲了一遍，讲得很平，像在说别人的事。",
            "当年他们一队五个人，只有他下来了。铜板是另一个人留下的。",
          ],
          effects: {
            flag: "ml:driftblade-of-the-north:s3:in",
            stats: { sword: 3, int: 4, health: -4 },
            goal: 6,
            notice: "你们上了龙鸣山。哈萨姆把当年那件事讲完了一半。",
          },
          rumor: "龙鸣山那边最近有人常住。守山的人说，来的是个剑客，年纪不小了。",
          commands: [
            {
              name: "龙鸣山",
              desc: "世界最高的灵山。山风里有一层低音，像有什么在下面呼吸。",
              commands: [
                {
                  label: "陪哈萨姆往山上多走一段",
                  category: "冒险",
                  cost: 24,
                  hint: "他走不快了，所以这一段路得有人陪着",
                  lines: [
                    "你们一天只走两个时辰。他坐在石头上喘气的时候，你去前面探路。",
                    "第三天他指着崖下一处凹地说，当年他们就是在那儿被围住的。",
                  ],
                  effects: { tier: { kind: "adventure", gain: 16 }, stats: { sword: 4, int: 4, health: -5 }, goal: 6 },
                },
              ],
            },
            {
              name: "家中",
              desc: "山脚的村子借给你们一间柴屋。夜里冷得厉害。",
              commands: [
                {
                  label: "替哈萨姆处理旧伤",
                  category: "休养",
                  cost: -12,
                  hint: "他从不先治自己，这件事得有人替他做",
                  lines: [
                    "你把他的护腕解开，底下的旧伤比你想的深。",
                    "他任你摆弄，只是说了句：这条胳膊早就不听使唤了。",
                  ],
                  effects: { stats: { health: 6, int: 3 }, starDelta: { match: "哈萨姆", delta: 1, note: "他把自己的旧伤交给你处理" }, goal: 3 },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "你们在崖下找到了当年的营火圈，石头还围成那个样子。",
            "哈萨姆蹲下来看了很久，起来的时候扶了一下膝盖。",
            "他说：「当年跑掉的不是他，是我。」",
            "那天晚上他没有吃饭。你把干粮分了一半放在他旁边，他没动。",
          ],
          effects: {
            flag: "ml:driftblade-of-the-north:s3:done",
            stats: { sword: 5, int: 6, scheme: 5, health: -3 },
            tier: { kind: "sword", gain: 14 },
            goal: 7,
            notice: "当年那件事的真相翻开了：跑掉的是哈萨姆自己。那笔旧仇从此没人叫他去报。",
          },
          commands: [
            {
              name: "龙鸣山",
              desc: "再往上没有路。低音一直在，不急不慢。",
              commands: [
                {
                  label: "在崖下陪他坐一整夜",
                  category: "家庭",
                  cost: -8,
                  hint: "有些事不需要说话。山上也没别人可说话",
                  lines: [
                    "你陪他坐着，火快灭了就添一根柴。他一句话也没说。",
                    "天亮的时候他站起来，把靴子上的土拍掉，说：走吧，往南。",
                  ],
                  effects: { stats: { int: 4, charm: 4, health: 3 }, energy: 12, goal: 4 },
                },
              ],
            },
          ],
        },
        event: "ml-driftblade-of-the-north-s3",
      },
      {
        id: "s4",
        title: "第四章 · 西隆的那把刀",
        premise:
          "当年那个人现在住在西隆王国，替宫里的人做事。西隆的墙很厚，街上的人很少抬头。哈萨姆把刀交给你，说他走不动了。",
        objective: "在西隆的宫里见到那个人，并把这件事了结，或者了结掉别的什么。",
        guidance: [
          "西隆王宫的墙比看上去厚。想进去，得先有个能进去的名分或名声。",
          "帕克斯坐在王位上，蓝道夫·马利安替他看门。这两个名字在西隆的王宫里绕不过去。",
          "西隆的工房和佣兵营地都在招人。靠手艺或刀口混进去，比靠门路快。",
          "当年那个人替你留下过一块铜板。想清楚这意味着什么，再去见他。",
          "打起来之前先想好退路。西隆的墙很厚，进来容易出去难。",
        ],
        quests: [
          {
            id: "q1",
            label: "在西隆站稳脚跟，找到能进宫的由头",
            hint: "在西隆的工房用「在西隆的工房里做东西」，或者用「在帕克斯的宫里走动」摸清门路。声望到 45 以上有用。",
            done: { anyStats: { fame: 45, scheme: 45 }, residence: ["西隆王国"] },
          },
          {
            id: "q2",
            label: "当面见到当年那个人",
            hint: "继续用「在帕克斯的宫里走动」和「打探新王的朝局」，把这个人从宫里的一堆名字里挑出来。",
            done: { anyStats: { scheme: 55, int: 45 }, monthsIn: 2 },
          },
          {
            id: "q3",
            label: "把这件事的结果定下来",
            hint: "这一条在第四章的抉择里。动手、听他说话、或者把刀还给哈萨姆，三条路都在那儿。",
            done: { flag: "ml:driftblade-of-the-north:s4:meeting" },
          },
        ],
        enter: { flag: "ml:driftblade-of-the-north:s3:done" },
        deadlineMonths: 16,
        onEnter: {
          lines: [
            "西隆的城门口要过三道查问。你说自己是来找活干的，他们让你进了。",
            "城里的街上没有多少人抬头。墙上的告示贴着新的，底下压着旧的。",
            "哈萨姆在客栈里把刀解下来交给你，刃口朝自己。他说：你去。”",
          ],
          effects: {
            flag: "ml:driftblade-of-the-north:s4:in",
            residence: "西隆王国",
            stats: { sword: 4, scheme: 5, health: -3 },
            goal: 6,
            notice: "你替哈萨姆进了西隆。当年那个人就在这座城里。",
          },
          rumor: "西隆宫里最近换了一批近卫。有人说是因为前一批人知道得太多。",
          commands: [
            {
              name: "西隆王国",
              desc: "王宫的墙很厚，街上的人很少抬头。",
              commands: [
                {
                  label: "混进宫里替人跑一趟腿",
                  category: "隐秘",
                  cost: 16,
                  hint: "想进宫不必靠门路，靠的是有人需要跑腿的",
                  lines: [
                    "你替一个管仓库的人送了一次东西，顺手把宫里的路记了下来。",
                    "宫里的走廊很长，长到你会开始数自己的脚步声。",
                  ],
                  effects: { stats: { scheme: 7, int: 3, charm: 2 }, goal: 5 },
                },
              ],
            },
            {
              name: "佣兵营地与边境",
              desc: "西隆的兵和别处一样拿命换工钱。",
              commands: [
                {
                  label: "在西隆的营地里打完一场硬仗",
                  category: "战斗",
                  cost: 26,
                  hint: "北神流的本事，是在真打里长出来的",
                  lines: [
                    "你先撒沙，再借地形把人引到窄处，最后才拔刀。",
                    "这一仗打完，营地里开始有人叫你「北边来的那个」。",
                  ],
                  effects: { tier: { kind: "sword", gain: 18 }, stats: { sword: 6, fame: 6, health: -6 }, goal: 6 },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "你们在宫墙外的一条巷子里说完了话。他比你想象的苍老，也比你想的平静。",
            "他说当年那件事之后，他在这座城里待了很多年，一直等有人来。",
            "哈萨姆没有来。你替他把话带到了。",
            "回客栈的路上，你发现那把刀一直没出鞘。",
          ],
          effects: {
            flag: "ml:driftblade-of-the-north:s4:done",
            stats: { sword: 6, scheme: 6, int: 5, fame: 5, health: -4 },
            tier: { kind: "sword", gain: 16 },
            goal: 7,
            notice: "你在西隆见到了当年那个人，也把哈萨姆的话带到了。",
          },
          commands: [
            {
              name: "西隆王国",
              desc: "这座城现在认得你了。认得的方式是不再查你的身份。",
              commands: [
                {
                  label: "在西隆的街上把这件事想完",
                  category: "休养",
                  cost: -10,
                  hint: "有些事办完了才知道自己本来想要什么",
                  lines: [
                    "你在这座城里住了些日子。每天走同一条街，看同一批人在同一个时辰开门。",
                    "想过之后，你把哈萨姆那把刀重新挂回了腰上。",
                  ],
                  effects: { stats: { int: 5, health: 6, sword: 2 }, energy: 14, goal: 4 },
                },
              ],
            },
          ],
        },
        event: "ml-driftblade-of-the-north-s4",
      },
      {
        id: "s5",
        title: "第五章 · 沙海边上的一场",
        premise:
          "旧仇结完之后，哈萨姆说要回魔大陆去。走到大沙海的边上，追着你们一路的那些人终于追上了。他们不是为旧仇来的，是为那块铜板。",
        objective: "让哈萨姆活着走过大沙海，并决定自己接下来往哪走。",
        guidance: [
          "往魔大陆走要穿过大沙海。水和补给比刀更要紧。",
          "追来的人多半是雇来的。先弄清楚雇主是谁，再决定打不打。",
          "北神流的奇拔派在这一场最占便宜：沙、地形、风向，全都是你的东西。",
          "哈萨姆说他能打，你要信他一次，也要留一手。",
          "走完这一趟之后，你得给自己找个留下来的理由。",
        ],
        quests: [
          {
            id: "q1",
            label: "把这一趟的补给备齐",
            hint: "在迷宫都市拉潘或西隆把水、干粮、绳子备足，顺便把旧伤养回来。健康到 50 再走。",
            done: { anyStats: { health: 50 }, monthsIn: 1 },
          },
          {
            id: "q2",
            label: "在沙海边接下这一场",
            hint: "去「战斗」用「被卷入一场混战」或「一对一决斗」。北神流的招式在这里最管用。",
            done: { flag: "ml:driftblade-of-the-north:s5:fought" },
          },
          {
            id: "q3",
            label: "决定自己接下来往哪走",
            hint: "这一条在第五章的抉择里。跟着哈萨姆进魔大陆、留在西隆、或者自己单走，三条路都在那儿。",
            // 做出这个决定就算数：第五章的抉择回应过之后，这一条就成立
            done: { seenEvent: "ml-driftblade-of-the-north-s5" },
          },
        ],
        enter: {
          flag: "ml:driftblade-of-the-north:s4:done",
          anyStats: { sword: 55 },
        },
        deadlineMonths: 14,
        onEnter: {
          lines: [
            "大沙海的边上有个水源地，只有一口井。你们到的时候，井边已经有人在等了。",
            "来的人一共七个，看着不像一伙的。哈萨姆把靴子重新系了一遍。",
            "他说：「这一次我打前面。你还年轻，你打后面。」",
          ],
          effects: {
            flag: "ml:driftblade-of-the-north:s5:in",
            stats: { sword: 4, scheme: 4, health: -6 },
            tier: { kind: "adventure", gain: 12 },
            goal: 7,
            notice: "在大沙海的边上，追着你们的人终于追上了。",
          },
          rumor: "大沙海边的水源地出了事。后来路过的人只看见沙上有很多脚印，没有尸体。",
          commands: [
            {
              name: "战斗",
              desc: "沙在脚下流。这一场北神流最占便宜。",
              commands: [
                {
                  label: "借着沙和风把这一场搅乱",
                  category: "战斗",
                  cost: 28,
                  hint: "奇拔派不讲究体面，只讲究谁最后还站着",
                  lines: [
                    "你先扬起沙，把七个人的位置搅成一团，再一个个挑。",
                    "哈萨姆在前面挡住了两个。收场时他坐在地上喘，坐着也在笑。",
                  ],
                  effects: { tier: { kind: "sword", gain: 20 }, stats: { sword: 7, scheme: 5, fame: 5, health: -9 }, goal: 7 },
                },
              ],
            },
            {
              name: "迷宫都市拉潘",
              desc: "贝卡利特大陆的沙、石阶、公会的灯。这里离大沙海只隔几天的路。",
              commands: [
                {
                  label: "先回公会分部把这一趟登记下来",
                  category: "冒险",
                  cost: 18,
                  hint: "做过的事上了公会的册子，追你的人就得掂量一下",
                  lines: [
                    "你把这趟的路线、遭遇和死伤一条条报上去。柜台的人记得很仔细。",
                    "盖完章的时候你想，这张纸可能比刀管用。",
                  ],
                  effects: { tier: { kind: "adventure", gain: 14 }, stats: { fame: 5, scheme: 4 }, factions: { 冒险者公会: 8 }, goal: 5 },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "七个人里跑掉两个，剩下的留在沙里。哈萨姆的一条腿废了，走路要拄棍。",
            "你们花了二十天才走出大沙海。他一路没提那七个是谁派来的。",
            "到了魔大陆的边上，他指了个方向说，那边有个村子，会走路的房子。",
            "你说你要往别处去。他点点头，把靴子上的沙拍掉。",
          ],
          effects: {
            flag: "ml:driftblade-of-the-north:s5:done",
            stats: { sword: 8, scheme: 7, fame: 6, health: -6 },
            tier: { kind: "sword", gain: 22 },
            goal: 8,
            notice: "你们走过了大沙海。哈萨姆进了魔大陆，你往别处去了。",
          },
          commands: [
            {
              name: "迷宫都市拉潘",
              desc: "公会分部的灯还亮着。这里的委托板上永远有没人接的活。",
              commands: [
                {
                  label: "在委托板上挑一件别人不肯接的",
                  category: "冒险",
                  cost: 24,
                  hint: "路上的人靠这个活着，也靠这个被人记着",
                  lines: [
                    "你挑了一张挂了很久、边角发黄的委托。",
                    "柜台的人抬头看了你一眼，说这张挂了大半年了。你说我知道。",
                  ],
                  effects: { tier: { kind: "adventure", gain: 18 }, stats: { fame: 6, sword: 4, health: -4 }, factions: { 冒险者公会: 10 }, goal: 6 },
                },
              ],
            },
          ],
        },
        event: "ml-driftblade-of-the-north-s5",
      },
    ],
    endings: {
      done:
        "旧仇结了，虽然结的方式和哈萨姆想的都不一样。他拄着棍进了魔大陆，你往别处走，两个人在沙海边分开，谁也没回头。北神流的东西你留住了：能用上的都用上，包括认输、包括跑。你成了那种在路上的人，路过的地方记不住你，你也记不清路过多少地方。",
      partial:
        "你把哈萨姆送到了该到的地方，可你自己的那件事一直没办完。也许是铜板没带出来，也许是西隆那一次你没敢把刀拔出来。你还在路上，路还是那条路。北神流教会你不回头，可你每天晚上都在想那口井。",
      failed:
        "你在某一段路上没能站住。可能是在拉潘的地底，可能是在大沙海的井边。哈萨姆的刀最后不知落到了谁手里。后来有人在公会分部的册子上看到过一个名字，那条记录很短，只有日期、地点和一行「同行者失散」。",
    },
  },

  /* ================================================================== *
   * 四、米里斯的异端审判
   * ================================================================== */
  {
    id: "inquisitor-of-millis",
    name: "米里斯的异端审判",
    theme: "信仰与迫害",
    tagline: "教团里有两种人：被审的，和审人的。",
    fit:
      "身上带着一件教团不喜欢的东西的人：魔族血统、诅咒、与魔族的亲缘，或者只是被人指认过。虔诚的教徒会在这条线上被撕成两半，本来就不信的人则会被推着学会怎么审人。适合米里斯教徒、魔族后裔、被诅咒者与兽族出身。",
    tags: {
      origins: ["米里斯教徒", "魔族后裔", "被诅咒者", "兽族", "平民/农家子弟"],
      statuses: ["教徒", "魔族", "平民", "被诅咒者"],
      faiths: ["米里斯教团", "无信"],
      places: ["米里希昂", "布耶纳村", "王都亚尔斯"],
      talents: ["虔诚感召", "诅咒抗性", "魔族血脉", "语言天赋"],
      styles: ["种族冲突", "血脉悲剧", "混合模式"],
    },
    prologue: [
      "甲龙历 417 年夏天，菲托亚领消失了。整个领地连同上面的人，一夜之间从地图上被抹掉。",
      "转移事件之后，教团的布告换得更勤了。有人说是魔族做的，有人说是天罚，教团在两种说法里挑了一种写进告示。",
      "你把一个从别处漂流过来的人留在了后院，替他包扎。这件事没人看见，也没人不知道。",
      "三个月后，审判庭的人来了。他们带了一份名单，名单上有你的名字。",
      "在米里斯，一夫一妻是国策，与魔族往来是罪。剩下的都由人来定。",
    ],
    stages: [
      {
        id: "s1",
        title: "第一章 · 名单上的一个名字",
        premise:
          "审判庭在菲托亚领一带清查「与魔族往来者」。你被人指认了一次，指认的理由不一定站得住，但记录已经写下去了。",
        objective: "在被正式传唤之前，弄清楚这次指认是从哪儿来的。",
        guidance: [
          "指认的人通常是邻居、同行或者被你得罪过的人。名单上的名字都有来路。",
          "村子里的口风变得比平时紧。用闲聊去问，别用逼问。",
          "教会的档案里有这份名单的抄本，但不会给你看。看守的口气客气得像一堵墙。",
          "先找一个人愿意替你说句话。在米里斯的规矩里，有人替你说话比你自己说一百句管用。",
          "如果你确实是魔族后裔或带着诅咒，先想清楚要不要把这件事瞒到底。",
        ],
        quests: [
          {
            id: "q1",
            label: "弄清这次指认是谁起的头",
            hint: "在村子里用「和邻里闲聊」和「打听附近的传闻」，或者用「听墙角」。密谋到 35 会有用。",
            done: { anyStats: { scheme: 35, int: 30 }, monthsIn: 1 },
          },
          {
            id: "q2",
            label: "在本地教会里留下一个肯替你说话的人",
            hint: "用「祈祷」和「和神父交谈」积信仰，或者用「在教区替人看伤」。信仰到 35 就够。",
            done: { anyStats: { faith: 35, charm: 35 } },
          },
          {
            id: "q3",
            label: "决定传唤来的时候你打算怎么答",
            hint: "认、不认、还是干脆离开这里。这一条在第一章的抉择里。",
            done: { flag: "ml:inquisitor-of-millis:s1:stance" },
          },
        ],
        enter: {},
        deadlineMonths: 24,
        onEnter: {
          lines: [
            "村里来了两个穿教团制服的人，问了几家的口供就走了。走之前在墙上贴了一张纸。",
            "纸上没有你的名字，但问到的人里有三个提到了你。",
            "你把水缸挑满，把该修的院墙修了。这些活本来不急。",
          ],
          effects: {
            flag: "ml:inquisitor-of-millis:s1:in",
            stats: { scheme: 3, faith: 3, charm: -2 },
            goal: 4,
            notice: "审判庭在清查与魔族往来者，有人提到了你。",
          },
          rumor: "教团在菲托亚领一带查得很紧。听说名单上有几十个名字。",
          commands: [
            {
              name: "村镇与集市",
              desc: "叫卖声、牲口味、半熟不熟的脸。这里的事没人记，也没人停。",
              commands: [
                {
                  label: "在集市上把指认你的人绕出来",
                  category: "隐秘",
                  cost: 12,
                  hint: "三句家常换一句真话，这是村子里的规矩",
                  lines: [
                    "你跟五个人聊了同一个话题，五个人都绕开了同一个名字。",
                    "绕开本身就是一个名字。你把它记下来了。",
                  ],
                  effects: { stats: { scheme: 6, int: 3, charm: 2 }, goal: 5 },
                },
              ],
            },
            {
              name: "教会与神殿",
              desc: "石板地很凉，烛火很稳。这里的人听过太多人的秘密。",
              commands: [
                {
                  label: "向神父问清楚审判的程序",
                  category: "信仰",
                  cost: 10,
                  hint: "先弄明白要走的流程，才知道哪一步可以争",
                  lines: [
                    "神父把该走的几步说了，说到最后一步时停了一下。",
                    "他说：最后那一步，看的是谁坐在桌子后面。",
                  ],
                  effects: { stats: { faith: 5, int: 4, scheme: 3 }, goal: 4 },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "半个月后传唤送到了村里，一张纸，一个日期，一个手印的位置。",
            "替你说话的人不多，但确实有一个。他没有保证什么，只说他会在场。",
            "你把家里的活都做完，锁上门，把钥匙留在了门槛下面。",
            "走的时候是早上。田里的麦子还没熟。",
          ],
          effects: {
            flag: "ml:inquisitor-of-millis:s1:done",
            stats: { faith: 5, scheme: 5, charm: 4, health: -3 },
            goal: 6,
            notice: "传唤到了。你锁上门，往米里希昂去。",
          },
          commands: [
            {
              name: "家中",
              desc: "屋子还是原来的样子。你已经把该收的都收了。",
              commands: [
                {
                  label: "出发前把家里的东西一件件交代清楚",
                  category: "家庭",
                  cost: -6,
                  hint: "不管回不回得来，先把该说的说了",
                  lines: [
                    "你把地契、钥匙和一些钱交给了能信的人，一件件说清楚。",
                    "说完你发现没有多少可交代的。这反而让你轻松了一点。",
                  ],
                  effects: { stats: { charm: 4, int: 3, health: 3 }, energy: 10, goal: 4 },
                },
              ],
            },
          ],
        },
        event: "ml-inquisitor-of-millis-s1",
      },
      {
        id: "s2",
        title: "第二章 · 桌子两边",
        premise:
          "审判庭问话的地方在大圣堂的侧厅。桌子后面坐着一位枢机卿，旁边还有一个不敢看人眼睛的女孩子。你被告诉：只要看着她的眼睛，事情很快就能结束。",
        objective: "扛过这一次问话，并且保住不能被读出来的那部分。",
        guidance: [
          "记忆阅览读的是记忆本身，不是谎话。想瞒，就得先让自己不去想。",
          "审你的枢机卿叫禄卜朗·马克法连。他把教义和账都算得很清。",
          "问话的时候有人在旁边记录。你每多说一句，记录上就多一行。",
          "侧厅外面站着神殿骑士团的人。贾尔加德团长的手一直没放在剑柄上，那是老习惯。",
          "被问完之后不要立刻走。有人会在门外等你，那个人通常是接下来最要紧的。",
        ],
        quests: [
          {
            id: "q1",
            label: "在问话里保住自己不想被读出来的那部分",
            hint: "靠密谋和智力扛过去：密谋到 45、智力到 35 以上。想硬顶也要有健康撑着。",
            done: { anyStats: { scheme: 45, int: 35 }, monthsIn: 1 },
          },
          {
            id: "q2",
            label: "活着从侧厅里走出来",
            hint: "问话之后身体会垮一阵。出来之后去教会静养，或者在家歇一个月，把健康拉回 40 以上。",
            done: { anyStats: { health: 40 }, monthsIn: 1 },
          },
          {
            id: "q3",
            label: "在门外那个人的提议上做决定",
            hint: "这一条在第二章的抉择里。替教团做事、被判为异端、或者弃教离开，三条路都在那儿。",
            done: { flag: "ml:inquisitor-of-millis:s2:verdict" },
          },
        ],
        enter: { flag: "ml:inquisitor-of-millis:s1:done" },
        deadlineMonths: 12,
        onEnter: {
          lines: [
            "侧厅不大，桌上一盏灯，烧的是最好的油。",
            "枢机卿先问了你的姓名、岁数、在菲托亚领住了多久。问得很慢。",
            "那个女孩子坐在旁边，一直低着头。有人轻声让她抬头。",
          ],
          effects: {
            flag: "ml:inquisitor-of-millis:s2:in",
            stats: { scheme: 4, faith: 4, health: -5, charm: -3 },
            factions: { 米里斯教团: -4 },
            goal: 6,
            notice: "你在米里希昂的侧厅里被问了一次话。",
          },
          commands: [
            {
              name: "教会与神殿",
              desc: "侧厅的门很厚。门外的人听不见里面，里面的人听得见外面。",
              commands: [
                {
                  label: "在问话前把心定下来",
                  category: "信仰",
                  cost: 10,
                  hint: "记忆阅览读的是记忆。你得先决定自己怎么记这件事",
                  lines: [
                    "你在石阶上坐了很久，把要说的话在心里排成一样的长度。",
                    "排完之后你才发现，真正要藏的是那一段你一直没敢细想的。",
                  ],
                  effects: { stats: { faith: 6, scheme: 5, int: 3 }, goal: 5 },
                },
              ],
            },
            {
              name: "米里希昂",
              desc: "大圣堂的钟每一刻响一次。这座城里没有人走快。",
              commands: [
                {
                  label: "在教区里替几个病人守夜",
                  category: "信仰",
                  cost: 12,
                  hint: "替教团做事，比替自己辩解有用",
                  lines: [
                    "你连着几个晚上在教区守着病人，换药、抬人、听他们说话。",
                    "有个老修女记住了你，后来在门外替你说了一句。",
                  ],
                  effects: { stats: { faith: 7, charm: 5, health: 2 }, factions: { 米里斯教团: 8 }, goal: 4 },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "问话持续了三天，每天两个时辰。第三天他们让你在记录上按了手印。",
            "枢机卿最后问了一句：你信不信米里斯。你答了。他点点头，把灯吹了。",
            "出来的时候天在下雨。门口站着一个人，手里没有伞。",
            "他说他是审判庭的书记。他说他有件事想跟你说。",
          ],
          effects: {
            flag: "ml:inquisitor-of-millis:s2:done",
            stats: { scheme: 6, faith: 4, int: 4, health: -4 },
            factions: { 米里斯教团: 4 },
            goal: 6,
            notice: "你从侧厅里走出来了。门外有人在等你。",
          },
          commands: [
            {
              name: "教会与神殿",
              desc: "雨里的石板地反着光。侧厅的灯还亮着。",
              commands: [
                {
                  label: "把这一次问话从头到尾记成一份自己的抄本",
                  category: "隐秘",
                  cost: 12,
                  hint: "审人的人有记录，被审的人也该有一份",
                  lines: [
                    "你把问过的每一个问题和自己的每一个回答都写了下来，写到凌晨。",
                    "写完你把它缝进了衣服的内衬。这份东西以后会有用。",
                  ],
                  effects: { stats: { scheme: 6, int: 4 }, goal: 5 },
                },
              ],
            },
          ],
        },
        event: "ml-inquisitor-of-millis-s2",
      },
      {
        id: "s3",
        title: "第三章 · 站在记录的人那一边",
        premise:
          "审判庭缺人手。认得字、又刚从那张桌子另一边走出来的人，正好合用。你被安排去替审问做记录。",
        objective: "做完第一份记录，并且决定自己要用什么方式做这件事。",
        guidance: [
          "记录的人写什么，卷宗里就有什么。这是这栋房子里最实在的一句话。",
          "被审的人形形色色：与魔族通婚的、带着诅咒的、只是不肯开口的。",
          "审判庭里也分派。有人主张与魔族对话，有人主张一个不留。你的记录落在谁手里，事情就不一样。",
          "神殿骑士团负责拿人。卡莱尔·拉托雷亚是剑组大队长，也是塞妮丝的父亲。",
          "别急着替谁说话。先弄清楚替谁说话会被记下来。",
        ],
        quests: [
          {
            id: "q1",
            label: "在审判庭里把差事做上手",
            hint: "继续在米里希昂用「翻查教会档案」和「随神殿骑士团巡行」，把资历攒起来。信仰和密谋各到 45。",
            done: { anyStats: { faith: 45, scheme: 45 }, residence: ["米里希昂"] },
          },
          {
            id: "q2",
            label: "认得字、也认得卷宗的写法",
            hint: "去书库用「研读一整月」，或者继续在教会用「翻查教会档案」。智力到 45 就够。",
            done: { anyStats: { int: 45 } },
          },
          {
            id: "q3",
            label: "决定你的记录替谁说话",
            hint: "这一条在第三章的抉择里。照实写、往轻里写、还是把人卖出去，三条路都在那儿。",
            done: { flag: "ml:inquisitor-of-millis:s3:record" },
          },
        ],
        enter: { flag: "ml:inquisitor-of-millis:s2:done" },
        deadlineMonths: 18,
        onEnter: {
          lines: [
            "书记把你领进一间小屋子，桌上摆着空白的卷宗和一支削好的笔。",
            "第一个被带进来的人是个中年男人，罪名是与魔族通婚。他不肯开口。",
            "书记在你旁边站了一会儿，说：写到他不开口就够了。”",
          ],
          effects: {
            flag: "ml:inquisitor-of-millis:s3:in",
            stats: { int: 4, scheme: 5, faith: 4, charm: -3 },
            factions: { 米里斯教团: 10 },
            goal: 6,
            notice: "你成了审判庭做记录的人。桌子换了一边。",
          },
          rumor: "米里希昂的审判庭最近案子多。有人说是清查，也有人说是有人在借清查做别的事。",
          commands: [
            {
              name: "教会与神殿",
              desc: "侧厅现在归你用了。灯油还是最好的那种。",
              commands: [
                {
                  label: "把今天的卷宗重抄一份留底",
                  category: "隐秘",
                  cost: 14,
                  hint: "卷宗会被人改，抄本不会",
                  lines: [
                    "你抄了一份留底，藏在只属于你的地方。",
                    "抄的时候你发现，前天那一份里的两句话被人动过。",
                  ],
                  effects: { stats: { scheme: 7, int: 4 }, goal: 5 },
                },
              ],
            },
            {
              name: "米里希昂",
              desc: "神殿骑士团的马拴在院子里。他们拿人回来的时候不说话。",
              commands: [
                {
                  label: "替被带来的人问一句他家里还有谁",
                  category: "社交",
                  cost: 10,
                  hint: "卷宗里不写这个，可这个有时候比罪名要紧",
                  lines: [
                    "你多问了一句，那个人愣了很久，然后说了两个名字。",
                    "你把这两个名字记在了自己的本子上，没有写进卷宗。",
                  ],
                  effects: { stats: { charm: 5, faith: 4, scheme: 3 }, goal: 4 },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "第一个月的卷宗你写了十几份。有几个人后来被放回去了，有几个没有。",
            "被放回去的那几个，名字旁边多了一行很轻的注。那行注是你写的。",
            "书记看了一眼，什么也没说，把卷宗收走了。",
            "当天晚上你把留底的那一份又看了一遍，一直看到灯灭。",
          ],
          effects: {
            flag: "ml:inquisitor-of-millis:s3:done",
            stats: { int: 6, scheme: 6, faith: 5, charm: -2 },
            factions: { 米里斯教团: 8 },
            goal: 7,
            notice: "你在审判庭里做了记录。有几个人的命，被你写在纸上的方式决定了。",
          },
          commands: [
            {
              name: "教会与神殿",
              desc: "侧厅的灯油见了底。你开始自己带灯。",
              commands: [
                {
                  label: "把经手过的案子重新整理一遍",
                  category: "学术",
                  cost: 14,
                  hint: "五十份卷宗放在一起，能看出一件单份里看不出来的事",
                  lines: [
                    "你把经手过的卷宗按日期排开，排到一半就停下了。",
                    "有几个名字在同一个月里出现过两次，一次是原告，一次是被告。",
                  ],
                  effects: { stats: { int: 6, scheme: 5 }, goal: 6 },
                },
              ],
            },
          ],
        },
        event: "ml-inquisitor-of-millis-s3",
      },
      {
        id: "s4",
        title: "第四章 · 不肯开口的人",
        premise:
          "名单上来了一个不肯开口的人。他被指控窝藏魔族，也可能只是不肯替自己辩解。审判庭决定把他交给记忆阅览。",
        objective: "在这一场审问里决定你站在哪一边，并且承担后果。",
        guidance: [
          "记忆阅览会把人一生里最不愿想起的那部分翻出来。被读过的人，很少还能回到原来的样子。",
          "那个女孩子的处境和被你审的人差不多。她也是被教团当道具用的。",
          "枢机卿要的是一个能写进卷宗的结论。你可以给他，也可以给他一个别的东西。",
          "有人会来找你，让你把这个人放掉。那个人的身份，会决定这件事有多大。",
          "想清楚你要不要在这栋房子里继续待下去。留下来的代价，从这一章开始计算。",
        ],
        quests: [
          {
            id: "q1",
            label: "在审问前见到那个不肯开口的人",
            hint: "靠资历和人心：信仰到 50、魅力到 45 以上，或者干脆用「翻查教会档案」把案子的底细查清。",
            done: { anyStats: { faith: 50, charm: 45 }, monthsIn: 1 },
          },
          {
            id: "q2",
            label: "把这一桩案子的底细查到一个能站住的地步",
            hint: "用「翻查教会档案」「研读一整月」，把卷宗和事实对上。智力到 50 再动手。",
            done: { anyStats: { int: 50, scheme: 50 } },
          },
          {
            id: "q3",
            label: "决定这一次由谁来承担结果",
            hint: "这一条在第四章的抉择里。按教团的意思办、替他担下、还是把这件事捅到教皇那里，三条路都在那儿。",
            done: { flag: "ml:inquisitor-of-millis:s4:trial" },
          },
        ],
        enter: { flag: "ml:inquisitor-of-millis:s3:done" },
        deadlineMonths: 15,
        onEnter: {
          lines: [
            "你见到那个人的时候，他已经被关了很久，手上的绳子勒出了印。",
            "问他什么他都不答。问到最后他只说了一句：我说了，你们也不会信。",
            "书记在你旁边把笔蘸好，等着你开口。",
          ],
          effects: {
            flag: "ml:inquisitor-of-millis:s4:in",
            stats: { int: 4, scheme: 4, faith: -4, health: -4 },
            factions: { 米里斯教团: -5 },
            goal: 7,
            notice: "审判庭把这桩不肯开口的案子交到了你手上。",
          },
          rumor: "米里希昂的审判庭最近收了一个不开口的案子。听说要动用记忆阅览。",
          commands: [
            {
              name: "教会与神殿",
              desc: "关人的屋子在侧院最里面。窗子很高，只透进一条光。",
              commands: [
                {
                  label: "隔着门和那个不肯开口的人说话",
                  category: "社交",
                  cost: 10,
                  hint: "他不是不肯说，是不信会有人听",
                  lines: [
                    "你隔着门说了几句家常。他一开始不回，后来说了自己的村子。",
                    "说到村子名字的时候他停了很久。你知道该往哪儿查了。",
                  ],
                  effects: { stats: { charm: 6, scheme: 5, int: 3, faith: 3 }, goal: 6 },
                },
              ],
            },
            {
              name: "米里希昂",
              desc: "大圣堂外的那条街很宽。来上告的人都在那儿排队。",
              commands: [
                {
                  label: "去大圣堂的档案房把旧案翻出来",
                  category: "隐秘",
                  cost: 14,
                  hint: "同样的指控，几十年前也发生过一次",
                  lines: [
                    "你翻到了一桩旧案，日期、罪名、判法都眼熟得不像话。",
                    "最下面有一行小字：此案后经复核，原判有误。",
                  ],
                  effects: { stats: { int: 6, scheme: 5, faith: -3 }, goal: 6 },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "这一桩案子最后结了。卷宗上写的结论很平，平到看不出有人在里面较过劲。",
            "记忆阅览没有用上。那个女孩子的名字也没有被写进去。",
            "书记把你写的东西收好，问你下个月还来不来。",
            "你说来。",
          ],
          effects: {
            flag: "ml:inquisitor-of-millis:s4:done",
            stats: { int: 6, scheme: 6, faith: 4, fame: 4, health: -3 },
            factions: { 米里斯教团: 6 },
            goal: 7,
            notice: "你把这桩不肯开口的案子结了。结法不是教团原本想要的那种。",
          },
          commands: [
            {
              name: "米里希昂",
              desc: "这座城里有人说你办事公道。公道这个词在这里有点危险。",
              commands: [
                {
                  label: "把替你说话的几个人记清",
                  category: "社交",
                  cost: 10,
                  hint: "在这栋房子里，替你说话的人比你的道理重要",
                  lines: [
                    "你把愿意替你说一句话的人一个个记下来，一共四个。",
                    "四个里有三个的立场不一样。这反而更好。",
                  ],
                  effects: { stats: { charm: 5, scheme: 5, int: 3 }, goal: 4 },
                },
              ],
            },
          ],
        },
        event: "ml-inquisitor-of-millis-s4",
      },
      {
        id: "s5",
        title: "第五章 · 名单的最后一行",
        premise:
          "新一轮的名单下来了。第一页上是异端的名字，最后一行是你自己。写名单的人不是不懂规矩，是太懂了。",
        objective: "在名字被念出来之前，决定你还要不要站在这一边。",
        guidance: [
          "名单是从上面下来的。弄清楚是哪一位枢机按的手印，比争辩罪名有用。",
          "教皇与强硬派的分歧在教团内部不是秘密。有人主张与魔族对话，因此被当成异端。",
          "如果你要站出去，就找一个所有人都能看见的场合。米里斯的布告栏就是那种场合。",
          "神殿骑士团里有人认得你。他们替你挡或者不挡，取决于你之前怎么对待被审的人。",
          "想清楚一件事：审判庭的权力不是你的，你只是被它用了一阵。",
        ],
        quests: [
          {
            id: "q1",
            label: "把签这份名单的人找出来",
            hint: "在教会用「翻查教会档案」和「求见教皇」，在米里希昂用「打听附近的传闻」。密谋到 60 以上。",
            done: { anyStats: { scheme: 60, int: 50 } },
          },
          {
            id: "q2",
            label: "在教团里攒下能替你挡一次的人",
            hint: "继续替教区做事、继续把卷宗写公道。信仰到 55、魅力到 50 会有用。",
            done: { anyStats: { faith: 55, charm: 50 } },
          },
          {
            id: "q3",
            label: "在名单念出来之前做出最后的选择",
            hint: "这一条在第五章的抉择里。留在审判庭、站到被审的人那一边、还是弃教离开，三条路都在那儿。",
            done: { flag: "ml:inquisitor-of-millis:s5:answer" },
          },
        ],
        enter: {
          flag: "ml:inquisitor-of-millis:s4:done",
          anyStats: { scheme: 50 },
        },
        deadlineMonths: 12,
        onEnter: {
          lines: [
            "名单送来的那天，书记先看了一遍，然后把纸翻过去放在桌上。",
            "你翻开的时候，第一页上有十几个名字，都是这一带的人。",
            "最后一行是你。写在最底下，用的墨和上面的不一样。",
          ],
          effects: {
            flag: "ml:inquisitor-of-millis:s5:in",
            stats: { scheme: 5, faith: -5, health: -4 },
            factions: { 米里斯教团: -8 },
            goal: 7,
            notice: "新一轮的名单上，最后一行写着你的名字。",
          },
          rumor: "米里希昂的审判庭又要动一批人。名单听说已经送到侧厅了。",
          commands: [
            {
              name: "教会与神殿",
              desc: "大圣堂的钟照旧响。钟不会因为名单上有谁就慢一拍。",
              commands: [
                {
                  label: "在布告栏前把话说给所有人听",
                  category: "信仰",
                  cost: 14,
                  hint: "教团最怕的事情，是事情被人当面说出来",
                  lines: [
                    "你站在布告栏前面，把经手的案子和名单的来路一条条说了出来。",
                    "没有人拦你。听到一半的时候，有几个人悄悄退开了。",
                  ],
                  effects: { stats: { faith: 6, fame: 8, charm: 5, scheme: -3 }, factions: { 米里斯教团: -10 }, goal: 7 },
                },
              ],
            },
            {
              name: "米里希昂",
              desc: "这座城现在对你来说每条街都熟。熟到能算出从哪条巷子出城最快。",
              commands: [
                {
                  label: "把该带走的东西收拾好",
                  category: "隐秘",
                  cost: 10,
                  hint: "不管走不走，手里得有一条退路",
                  lines: [
                    "你把抄本、几份卷宗的副本和一些钱收进一个包袱里。",
                    "收完之后你坐在床边，发现包袱比想象中小。",
                  ],
                  effects: { stats: { scheme: 6, int: 4, health: 3 }, goal: 4 },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "名单上那十几个名字，最后有九个被放回去了，三个被判了，剩下的没有了消息。",
            "你没有上那张桌子。也没有再进侧厅。",
            "教团把你的名字从审判庭的名册上划掉了，划得很客气，附了一行「另有任用」。",
            "你走的那天，大圣堂的钟正响。你没有回头。",
          ],
          effects: {
            flag: "ml:inquisitor-of-millis:s5:done",
            stats: { faith: 6, fame: 6, scheme: 5, charm: 4, health: -4 },
            factions: { 米里斯教团: 6 },
            goal: 8,
            notice: "你从审判庭的名单上走了下来。米里斯的布告栏上，那件事没有被抹掉。",
          },
          commands: [
            {
              name: "教会与神殿",
              desc: "侧厅现在换了人做记录。灯油还是最好的那种。",
              commands: [
                {
                  label: "把留底的那一份交到该到的人手里",
                  category: "隐秘",
                  cost: 14,
                  hint: "抄本留着是保命，交出去是别的东西",
                  lines: [
                    "你把抄本交给了教团里另一个派系的人，没有谈条件。",
                    "对方收下的时候说了一句：这东西会有人看。你说的确是。",
                  ],
                  effects: { stats: { scheme: 7, fame: 5, int: 3 }, factions: { 米里斯教团: 10 }, goal: 6 },
                },
              ],
            },
          ],
        },
        event: "ml-inquisitor-of-millis-s5",
      },
    ],
    endings: {
      done:
        "你从审判庭里走了出来，名字还在教团的册子上，只是换了一栏。名单上那些被你经手过的人，有的活着，有的不在了，这笔账你自己记着。你保住了信仰，也保住了不把信仰当作刀的那一部分。米里希昂的布告栏上，那件事被人提过很久。",
      partial:
        "你扛过了自己的那一次问话，也在审判庭里做过不少事，可最后你既没有站出去，也没有走开。日子照旧，卷宗照旧，只是你写字的时候手会停一下。有人说你办事公道，这句话现在听起来不太像夸奖。",
      failed:
        "你没能从那张名单上下来。可能是在侧厅里被读出了不该被读出的东西，也可能是在某个不肯开口的人身上赌错了一次。教团的档案里留着一份关于你的卷宗，末尾盖了章。你信的那位米里斯，最后没有替你说一句话。",
    },
  },

  /* ================================================================== *
   * 五、米里斯的圣女候选
   * ================================================================== */
  {
    id: "saintess-of-millis",
    name: "米里斯的圣女候选",
    theme: "信仰与权谋",
    tagline: "神殿把你举起来，是因为举着你好办事。",
    fit:
      "被教团看中、又没有什么靠山的那种年轻人：虔诚、干净、站在人前不怯场。候选位子是给外人看的，所以出身越好用、家世越空越好用。适合米里斯教徒、平民与没落贵族出身，信仰较高、魅力较高的主角。",
    tags: {
      origins: ["米里斯教徒", "平民/农家子弟", "阿斯拉王国贵族子弟", "被召唤者"],
      statuses: ["教徒", "学生", "贵族子弟", "平民"],
      faiths: ["米里斯教团"],
      places: ["米里希昂", "王都亚尔斯", "罗亚町"],
      talents: ["虔诚感召", "贵族血统", "语言天赋", "商业嗅觉"],
      styles: ["宫廷阴谋", "情感纠葛", "混合模式"],
    },
    prologue: [
      "米里希昂的大圣堂每年要立一次圣女。立的人不是神，是坐在侧厅里的那几位。",
      "圣女在教义里的位置很清楚：她是教团的颜面，不是教团的嘴。",
      "这一年，候选的名单上多了一个没有家世的名字。名字后面注着两个字：可用。",
      "神殿骑士团给候选配了护卫，也配了记录的人。从进门那天起，你说的每句话都有人写。",
      "教皇与外派的枢机在争教团该往哪走。他们争的东西，最后要有一个能被举起来的人站在前面。",
    ],
    stages: [
      {
        id: "s1",
        title: "第一章 · 披上白衣",
        premise:
          "你被选进候选名单，搬进了大圣堂侧院。教你规矩的人比教你教义的人多，记录你的人比教你规矩的人还多。",
        objective: "在侧院里站住，并且弄清楚是谁把你写进名单的。",
        guidance: [
          "候选要学的东西不多，但每一件都要在别人面前做对：走路、跪、答话、受礼。",
          "侧院里的人分两拨：一拨跟教皇，一拨跟外派的枢机。先弄清谁跟你说话。",
          "记录你言行的人是书记官。他们不害人，只是把话原样写下来。",
          "神殿骑士团会派一个人跟着你。特蕾兹·拉托雷亚是神子亲卫队队长，她的脸像另一个人。",
          "去米里希昂的街上走走。信众看你的眼神，比侧院里的人诚实。",
        ],
        quests: [
          {
            id: "q1",
            label: "在侧院里把该学的规矩学到位",
            hint: "在大圣堂用「在大圣堂做弥撒」和「随神殿骑士团巡行」。信仰到 45 以上，站到人前才不怯。",
            done: { anyStats: { faith: 45 }, residence: ["米里希昂"] },
          },
          {
            id: "q2",
            label: "让米里希昂的信众记住你",
            hint: "用「在教区替人看伤」和「和神父交谈」。魅力到 45 会有用。",
            done: { anyStats: { charm: 45, fame: 30 } },
          },
          {
            id: "q3",
            label: "弄清是谁把你写进候选名单",
            hint: "这一条在第一章的抉择里。投靠举你的人、保持中立、还是自己找一条路，三条路都在那儿。",
            done: { flag: "ml:saintess-of-millis:s1:patron" },
          },
        ],
        enter: {},
        deadlineMonths: 24,
        onEnter: {
          lines: [
            "侧院给你一间朝东的屋子，窗户比别的大，因为要让人看见你在里面。",
            "教规矩的老修女第一句话是：圣女不说话。第二句是：别人替你说。",
            "当天晚上你听见隔壁有人在抄东西。写字的声音一直到很晚。",
          ],
          effects: {
            residence: "米里希昂",
            flag: "ml:saintess-of-millis:s1:in",
            stats: { faith: 5, charm: 5, health: -3 },
            factions: { 米里斯教团: 8 },
            goal: 4,
            notice: "你被写进了圣女候选的名单，搬进了大圣堂的侧院。",
          },
          rumor: "今年大圣堂的圣女候选里有个没有家世的。教团里说什么的都有。",
          commands: [
            {
              name: "教会与神殿",
              desc: "石板地很凉，烛火很稳。侧院里走路要慢，慢到鞋底不出声。",
              commands: [
                {
                  label: "在弥撒上站满整场",
                  category: "信仰",
                  cost: 10,
                  hint: "候选最要紧的本事是站得住。站两个时辰不动，比讲十分钟道理难",
                  lines: [
                    "你在台上站了整场弥撒。腿麻了两次，你没有动。",
                    "散场的时候有个老妇人朝你行了礼。那是这一天唯一真心的一个。",
                  ],
                  effects: { stats: { faith: 7, charm: 5, health: -2 }, factions: { 米里斯教团: 6 }, goal: 4 },
                },
              ],
            },
            {
              name: "米里希昂",
              desc: "米里斯看着每一个人，也看着不说实话的人。街上的人比侧院里的人诚实。",
              commands: [
                {
                  label: "在教区替穷人做一天事",
                  category: "信仰",
                  cost: 12,
                  hint: "信众记得你做过什么。这一点教团算得比你自己还清",
                  lines: [
                    "你替几个病人换了药，抬了一个走不动路的人回家。",
                    "回来的路上有几个孩子跟着你走了半条街。",
                  ],
                  effects: { stats: { faith: 6, charm: 6, fame: 4, health: -2 }, factions: { 米里斯教团: 4 }, goal: 4 },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "三个月后，你能把整套礼节做得不出错了。侧院里的人开始按你的位子称呼你。",
            "举你的人始终没有露面，只递过一句话：别做多余的事。",
            "你把这句话记下来，也把递话的人记下来。",
            "窗外的钟响过一整年，你数过次数。",
          ],
          effects: {
            flag: "ml:saintess-of-millis:s1:done",
            stats: { faith: 6, charm: 6, int: 4, fame: 4 },
            factions: { 米里斯教团: 8 },
            goal: 5,
            notice: "你在侧院站住了。举你的人开始给你递话。",
          },
          commands: [
            {
              name: "教会与神殿",
              desc: "侧院的走廊很长，脚步声传得远。在这里，安静是一种本事。",
              commands: [
                {
                  label: "把候选该背下来的礼数一次背完",
                  category: "学术",
                  cost: 12,
                  hint: "这些东西将来会在所有人面前被考一次",
                  lines: [
                    "你把祷词、礼节和应答的次序从头到尾背了一遍，背到不用想。",
                    "背的时候你忽然想，这些字里没有一句是给你自己说的。",
                  ],
                  effects: { stats: { faith: 6, int: 5, charm: 3 }, goal: 4 },
                },
              ],
            },
          ],
        },
        event: "ml-saintess-of-millis-s1",
      },
      {
        id: "s2",
        title: "第二章 · 第一次站到人前",
        premise:
          "教团要在王都亚尔斯办一场公开的布道，需要一个干净的脸。候选人里挑了你。王都的贵族圈会看着你，也会掂量你值多少。",
        objective: "在王都的布道上站住，同时把贵族圈里谁在拉你弄清。",
        guidance: [
          "王都不是米里希昂。在那边说话要压着，笑要收着，眼睛不要停在某一个人身上太久。",
          "爱丽儿的随从会到场。她已经流亡在外，但仍然有眼睛在看她的人。",
          "布道的内容是教团给的，一个字都不要改。改一个字，卷宗上就会多一段。",
          "有人在宴会后会找你单独说话。那种人给的东西，没有一样是白给的。",
          "记清楚谁给了你什么。教团里的账，最后都按人情结算。",
        ],
        quests: [
          {
            id: "q1",
            label: "在王都的布道上站住整场",
            hint: "信仰到 50、魅力到 50 以上再上台。上台前用「在大圣堂做弥撒」把状态找回来。",
            done: { anyStats: { faith: 50, charm: 50 }, monthsIn: 1 },
          },
          {
            id: "q2",
            label: "在王都的贵族圈里认全该认的人",
            hint: "在贵族圈用「出席上级贵族的宴会」和「在贵族圈里周旋」。声望到 40 会有用。",
            done: { anyStats: { fame: 40, scheme: 45 } },
          },
          {
            id: "q3",
            label: "决定收不收那件私下的东西",
            hint: "这一条在第二章的抉择里。收下、退回去、还是转手交给教团，三条路都在那儿。",
            done: { flag: "ml:saintess-of-millis:s2:gift" },
          },
        ],
        enter: { flag: "ml:saintess-of-millis:s1:done" },
        deadlineMonths: 18,
        onEnter: {
          lines: [
            "布道台搭在王都广场上，底下站的人比大圣堂里多十倍。",
            "念稿的人站在台侧。你只要开口，把稿子念完，就是一场好布道。",
            "念到一半的时候你看见台下有人在记东西。不是书记官。",
          ],
          effects: {
            flag: "ml:saintess-of-millis:s2:in",
            residence: "王都亚尔斯",
            stats: { faith: 4, charm: 6, fame: 6, health: -3 },
            factions: { 米里斯教团: 8, 阿斯拉王国: 4 },
            goal: 6,
            notice: "你在王都亚尔斯当众布了一次道。台底下有人在记东西。",
          },
          rumor: "王都广场上那场布道说得不错。听说念稿的是个新人，教团最近很看重他。",
          commands: [
            {
              name: "王都贵族圈",
              desc: "香氛、丝绸、笑。每句话都压着第二层，而真的那层从不出口。",
              commands: [
                {
                  label: "在布道后的宴会上把每一句话都收着说",
                  category: "社交",
                  cost: 14,
                  hint: "在王都，说得少的人被记得比较久",
                  lines: [
                    "一整个晚上你只说了几句场面话，笑到脸僵。",
                    "散场的时候有两个人主动过来跟你道别。这就是今晚的收获。",
                  ],
                  effects: { stats: { charm: 6, scheme: 5, fame: 3 }, factions: { 阿斯拉王国: 6 }, goal: 5 },
                },
              ],
            },
            {
              name: "教会与神殿",
              desc: "教团为王都这一场布道搭了一间临时的礼拜堂。里面比大圣堂冷。",
              commands: [
                {
                  label: "把布道的稿子逐字念到不会出错",
                  category: "学术",
                  cost: 10,
                  hint: "教团给你的稿子一个字都不要改",
                  lines: [
                    "你把稿子念了几十遍，念到每一句的停顿都一样长。",
                    "念完之后你想，这些话是写给台下的人听的，不是写给你的。",
                  ],
                  effects: { stats: { faith: 6, int: 4, charm: 3 }, goal: 4 },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "布道完了。教团的人说你做得不错，用的是「不错」这两个字。",
            "宴会后有人在廊下等你，把一件东西放在你手里就退开了，没留名字。",
            "东西是一枚很旧的米里斯像章，背面刻着一个家族的记号。",
            "你把它收了起来。回米里希昂的车上，你把这个记号记了两遍。",
          ],
          effects: {
            flag: "ml:saintess-of-millis:s2:done",
            stats: { faith: 5, charm: 6, scheme: 6, fame: 5 },
            factions: { 米里斯教团: 6, 阿斯拉王国: 6 },
            goal: 6,
            notice: "你在王都站住了。有人把一件东西塞到了你手里。",
          },
          commands: [
            {
              name: "王都贵族圈",
              desc: "王都的门房看的是你的鞋。现在你的鞋有人替你擦了。",
              commands: [
                {
                  label: "把那枚像章背面的记号查出来",
                  category: "隐秘",
                  cost: 14,
                  hint: "贵族圈里认记号的人不少，肯说的不多",
                  lines: [
                    "你托了两个人问这个记号，第一个人装不懂，第二个人说了三个字：外派的。",
                    "三个字够用了。",
                  ],
                  effects: { stats: { scheme: 7, int: 4 }, goal: 5 },
                },
              ],
            },
          ],
        },
        event: "ml-saintess-of-millis-s2",
      },
      {
        id: "s3",
        title: "第三章 · 两套说法",
        premise:
          "教团内部两套说法开始撞在一起：一套主张继续排斥魔族，一套主张谈。两边的文稿都要你在人前念。",
        objective: "在两套说法之间保住自己的位置，并且让至少一边觉得你有用。",
        guidance: [
          "教皇主张与魔族对话，因此被强硬派视为异端。这话在教团里已经不算秘密。",
          "枢机卿禄卜朗·马克法连两边都不得罪，他给的稿子是折中的。折中的稿子最难念。",
          "念哪一套稿子，就等于替哪一套站台。念之前先想清楚会不会有人给你记上一笔。",
          "神殿骑士团里有人盯着你的言行。卡莱尔·拉托雷亚是剑组大队长，他看人先看手。",
          "不要以为两边的文稿是给你写的。它们是给对方看的。",
        ],
        quests: [
          {
            id: "q1",
            label: "把两套说法的来路都弄清楚",
            hint: "在教会用「翻查教会档案」和「求见教皇」，在大圣堂用「打探新王的朝局」之类的手段。密谋到 55。",
            done: { anyStats: { scheme: 55, int: 45 } },
          },
          {
            id: "q2",
            label: "让至少一边觉得你有用",
            hint: "继续在教区做事攒人心，或者出席贵族宴会攒人脉。信仰或魅力任一到 55。",
            done: { anyStats: { faith: 55, charm: 55 } },
          },
          {
            id: "q3",
            label: "决定念哪一套稿子",
            hint: "这一条在第三章的抉择里。念强硬派的、念教皇的、还是两份都不念，三条路都在那儿。",
            done: { flag: "ml:saintess-of-millis:s3:homily" },
          },
        ],
        enter: { flag: "ml:saintess-of-millis:s2:done" },
        deadlineMonths: 18,
        onEnter: {
          lines: [
            "两份文稿同一天送到你屋里，用同一种纸，字迹不同。",
            "一份说魔族是本世代的祸根，一份说米里斯看的是一夫一妻，不是血统。",
            "送稿的两个人都在门外等回话。你只能先见一个。",
          ],
          effects: {
            flag: "ml:saintess-of-millis:s3:in",
            stats: { faith: 4, scheme: 5, int: 4, charm: -2 },
            factions: { 米里斯教团: -4 },
            goal: 6,
            notice: "教团两派各送来一份文稿，都要你在人前念。",
          },
          rumor: "大圣堂里最近为了「与魔族怎么往来」吵得很凶。听说连圣女候选都被扯进去了。",
          commands: [
            {
              name: "教会与神殿",
              desc: "两份文稿摆在桌上。灯照着它们，纸的颜色一模一样。",
              commands: [
                {
                  label: "把两份文稿的字句对着读一遍",
                  category: "学术",
                  cost: 12,
                  hint: "两份说的是两件事。差的那一处，就是他们真正在争的",
                  lines: [
                    "你把两份文稿并排读完，读出了一句只有一份里有的话：血统。",
                    "另一份从头到尾没提这两个字。这就是全部的分歧。",
                  ],
                  effects: { stats: { int: 6, scheme: 5, faith: 4 }, goal: 5 },
                },
              ],
            },
            {
              name: "米里希昂",
              desc: "信众不管教团在争什么。他们看的是你站在哪一边。",
              commands: [
                {
                  label: "在教区的病人和穷人中间待够一个月",
                  category: "信仰",
                  cost: 12,
                  hint: "这里的人不知道两套说法，他们只知道谁来过",
                  lines: [
                    "你在教区待了一个月，做的是抬人、换药、抄名册这些事。",
                    "离开的时候有人塞给你一张纸，上面是几十个手印。",
                  ],
                  effects: { stats: { faith: 7, charm: 7, health: -2 }, factions: { 米里斯教团: 6 }, goal: 5 },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "两份文稿你念了一份，另一份封起来还了回去。",
            "念的那一场没有出彩，也没有出错。两边都没有表态。",
            "第二天，那个封起来的封皮被人拆开过。胶痕还在。",
            "你把这件事记下来，然后什么也没做。",
          ],
          effects: {
            flag: "ml:saintess-of-millis:s3:done",
            stats: { faith: 5, scheme: 6, int: 5, fame: 3 },
            factions: { 米里斯教团: 5 },
            goal: 6,
            notice: "你在两套说法里挑了一套念。另一份文稿被人拆开过。",
          },
          commands: [
            {
              name: "教会与神殿",
              desc: "侧院的门夜里上锁。锁是好锁，钥匙有两把。",
              commands: [
                {
                  label: "把拆封皮的人一个个排掉",
                  category: "隐秘",
                  cost: 14,
                  hint: "能进侧院的只有几种人。排除法比问话快",
                  lines: [
                    "你把能进侧院的人在纸上列了一遍，排到第三个人就停住了。",
                    "那个人是替你送稿的其中一个。",
                  ],
                  effects: { stats: { scheme: 7, int: 4, charm: -2 }, goal: 5 },
                },
              ],
            },
          ],
        },
        event: "ml-saintess-of-millis-s3",
      },
      {
        id: "s4",
        title: "第四章 · 立圣女的前一夜",
        premise:
          "立的仪式定在下一个圣日。名单上还剩三个人，其中一个在仪式前一天被查出与魔族有过往来。这个罪名落下来，谁被举起来就已经定了。",
        objective: "在仪式之前决定你要不要那个位子，以及用什么代价拿。",
        guidance: [
          "被查出问题的那位候选你不熟。但你们在同一间侧院里吃过一年的饭。",
          "罪名是谁放出来的，比罪名本身重要。放消息的人想要的结果，一眼能看出来。",
          "如果你站出来替她说话，你的名字会被写进另一份卷宗。",
          "教皇与外派枢机都在等这一场。谁被举起来，谁就是接下来几年教团的脸。",
          "神子亲卫队会守在仪式的门口。特蕾兹·拉托雷亚认脸不认名分。",
        ],
        quests: [
          {
            id: "q1",
            label: "把那条罪名是谁放出来的查清楚",
            hint: "在教会用「翻查教会档案」和「打听附近的传闻」，在贵族圈用「打探宫廷动向」。密谋到 60。",
            done: { anyStats: { scheme: 60, int: 50 } },
          },
          {
            id: "q2",
            label: "在仪式前站到人前一次",
            hint: "用「在大圣堂做弥撒」或再办一场布道，把信仰和魅力都推到 55 以上。",
            done: { anyStats: { faith: 55, charm: 55 }, monthsIn: 1 },
          },
          {
            id: "q3",
            label: "决定要不要那个位子，以及用什么换",
            hint: "这一条在第四章的抉择里。接手、替另一位候选说话、还是把整件事推回给举你的人，三条路都在那儿。",
            done: { flag: "ml:saintess-of-millis:s4:eve" },
          },
        ],
        enter: { flag: "ml:saintess-of-millis:s3:done" },
        deadlineMonths: 14,
        onEnter: {
          lines: [
            "仪式前一天，侧院的门比平时关得早。有人在你门口站了半宿。",
            "被查出问题的那位候选没有出来吃饭。她的屋子灯一直亮着。",
            "老修女来给你送第二天的白衣，什么也没说，放下就走了。",
          ],
          effects: {
            flag: "ml:saintess-of-millis:s4:in",
            stats: { scheme: 5, faith: 4, charm: -3, health: -3 },
            factions: { 米里斯教团: -6 },
            goal: 7,
            notice: "仪式前一夜，名单上剩下的人里少了一个。",
          },
          rumor: "大圣堂那边出了事。听说有位候选被查出来与魔族有过来往，立仪式前一晚查出来的。",
          commands: [
            {
              name: "教会与神殿",
              desc: "白衣挂在门上。这套衣服明天要穿给所有人看。",
              commands: [
                {
                  label: "在仪式前把整件事的来路摊开想一遍",
                  category: "隐秘",
                  cost: 14,
                  hint: "这条罪名来得太巧。巧的东西都是人做的",
                  lines: [
                    "你把这一年的每一件事按顺序排开，排到一半就找到了那个巧合。",
                    "巧合落在一个你早就见过的人身上。",
                  ],
                  effects: { stats: { scheme: 8, int: 5 }, goal: 6 },
                },
              ],
            },
            {
              name: "米里希昂",
              desc: "圣日前夜的城很安静。几个信众在广场上点了蜡烛。",
              commands: [
                {
                  label: "去看一眼那位候选屋里的灯",
                  category: "社交",
                  cost: 8,
                  hint: "有些话不能写进卷宗，只能当面说",
                  lines: [
                    "你隔着门说了几句话。她在里面应了一声，然后就没了声音。",
                    "回屋之后你把白衣重新叠了一遍，叠得很慢。",
                  ],
                  effects: { stats: { charm: 5, faith: 4, int: 3 }, goal: 5 },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "第二天的仪式照常办。三个人的名单变成了两个。",
            "结果公布的时候，台下响了一阵掌声，掌声很整齐。",
            "戴冠的老修女在你耳边说了一句：以后少说话。",
            "你想起刚进侧院那天她说的那两句。这一次是第三句。",
          ],
          effects: {
            flag: "ml:saintess-of-millis:s4:done",
            stats: { faith: 6, charm: 6, scheme: 6, fame: 6, health: -4 },
            factions: { 米里斯教团: 10 },
            goal: 7,
            notice: "仪式的前一夜过去了。名单上少了一个人。",
          },
          commands: [
            {
              name: "教会与神殿",
              desc: "你的位子往前挪了一格。窗子还是朝东的那一间。",
              commands: [
                {
                  label: "把仪式上要说的每一个字先写好",
                  category: "学术",
                  cost: 12,
                  hint: "往后的每一句话都会有人记。先自己写好，比临场想安全",
                  lines: [
                    "你把接下来的每一场要说的话都写好，写好之后逐句删掉半句。",
                    "删到最后剩下来的都很短，短得不容易被人挑。",
                  ],
                  effects: { stats: { int: 5, faith: 5, scheme: 4 }, goal: 5 },
                },
              ],
            },
          ],
        },
        event: "ml-saintess-of-millis-s4",
      },
      {
        id: "s5",
        title: "第五章 · 冠与绳",
        premise:
          "圣日到了。教团要在所有人面前把你举起来，也在同一场仪式上宣布另一件事：与魔族对话的提议被驳回了。你要在台上替这件事说话。",
        objective: "在仪式上把冠戴上，或者把冠推回去，并且活着走下来。",
        guidance: [
          "台底下站着教团全部的重量：教皇、枢机、神殿骑士团，还有从王都赶来的人。",
          "稿子是教团给的。念它，你就是圣女；不念它，你就是今天最大的麻烦。",
          "神子亲卫队守在台阶两侧。要走出去，得从他们中间过。",
          "想清楚一件事：圣女在教义里的位置是颜面。颜面坏了可以换一张。",
          "仪式的钟一响，就没有人再听你说话。要说什么，得赶在那之前。",
        ],
        quests: [
          {
            id: "q1",
            label: "在仪式前把该见的人见完",
            hint: "信仰到 60、魅力到 60，或者与任何一位重要人物关系好到能说上话。两条路都行。",
            done: { anyStats: { faith: 60, charm: 60 } },
          },
          {
            id: "q2",
            label: "在台上把冠戴上或推回去",
            hint: "这场仪式本身就是那一场。去「教会与神殿」用「在大圣堂做弥撒」，把你要做的事做完。",
            done: { flag: "ml:saintess-of-millis:s5:crown" },
          },
          {
            id: "q3",
            label: "在仪式结束之后给自己留一个位置",
            hint: "这一条在第五章的抉择里。当圣女、当教团的一个工具、还是走出大圣堂，三条路都在那儿。",
            // 做出这个决定就算数：第五章的抉择回应过之后，这一条就成立
            done: { seenEvent: "ml-saintess-of-millis-s5" },
          },
        ],
        enter: {
          flag: "ml:saintess-of-millis:s4:done",
          anyStats: { faith: 55 },
        },
        deadlineMonths: 12,
        onEnter: {
          lines: [
            "仪式那天大圣堂里的人站到了门外。台阶上铺了新的毡子。",
            "冠放在台子中间的托盘里，用一块布盖着。布是白的。",
            "教皇坐在最上面。外派的枢机坐在他右手边，隔了一个位子的距离。",
          ],
          effects: {
            flag: "ml:saintess-of-millis:s5:in",
            stats: { faith: 5, charm: 5, fame: 8, health: -4 },
            factions: { 米里斯教团: 10 },
            goal: 8,
            notice: "立圣女的仪式到了。冠就在台上，稿子在你的袖子里。",
          },
          rumor: "大圣堂今天立圣女。城里的人都在说这件事，说法比往年多。",
          commands: [
            {
              name: "教会与神殿",
              desc: "钟还没响。台上台下都在等一个人开口。",
              commands: [
                {
                  label: "在钟响之前把冠从托盘里取起来",
                  category: "信仰",
                  cost: 14,
                  hint: "自己拿起来的东西，和别人放到你头上的东西，不是同一件",
                  lines: [
                    "你伸手把冠拿起来。台下有声音，很快就压下去了。",
                    "你把冠托在手里站了一会儿，让所有人看清楚是你自己拿的。",
                  ],
                  effects: { stats: { faith: 7, charm: 7, fame: 8, scheme: 4 }, factions: { 米里斯教团: 12 }, goal: 8 },
                },
              ],
            },
            {
              name: "米里希昂",
              desc: "大圣堂外的广场上站满了人。他们看不见台子，只听得见钟。",
              commands: [
                {
                  label: "在门口把教区那些人的名字在心里过一遍",
                  category: "信仰",
                  cost: 8,
                  hint: "等一下你要替很多人说话，先记住他们是谁",
                  lines: [
                    "你在门里站着，把这一年经手过的名字默念了一遍。",
                    "念到最后几个的时候，钟响了。",
                  ],
                  effects: { stats: { faith: 6, charm: 5, int: 3 }, goal: 6 },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "仪式走完了。冠戴在了谁头上，台底下的人都看得清楚。",
            "同一天宣布的那件事，被写在布告上贴了出去。写得很短。",
            "散场之后，侧院里那间朝东的屋子还归你。窗子还是那么大。",
            "有人在门口等你说第一句话。你想了一会儿，只说了一句：我知道了。",
          ],
          effects: {
            flag: "ml:saintess-of-millis:s5:done",
            stats: { faith: 7, charm: 7, fame: 8, scheme: 5, health: -5 },
            factions: { 米里斯教团: 12 },
            goal: 8,
            notice: "仪式结束了。你在这栋房子里的位置定下来了。",
          },
          commands: [
            {
              name: "教会与神殿",
              desc: "仪式之后，侧院安静了几天。灯油还是最好的那种。",
              commands: [
                {
                  label: "把接下来要做的事写成一份自己的单子",
                  category: "学术",
                  cost: 12,
                  hint: "被人举起来之后，能自己决定的事其实不多。剩下的那几件要抓紧",
                  lines: [
                    "你写了一份单子，上面只有几件事：教区、病坊、几个名字。",
                    "写完你把它压在灯下。这是你在这栋房子里唯一能自己定下来的东西。",
                  ],
                  effects: { stats: { int: 5, faith: 5, charm: 4 }, goal: 6 },
                },
              ],
            },
          ],
        },
        event: "ml-saintess-of-millis-s5",
      },
    ],
    endings: {
      done:
        "冠戴在了你头上，教团多了一张干净的脸。你在教区做的事，有一半被写进了布告，另一半没有人提。你替教团站了很多年，也替你认识的几个人挡过几次。圣女不说话，所以你说的话都被别人替你说了；可在米里希昂的几条巷子里，人们记得的是你亲自来过。",
      partial:
        "仪式走完了，你也留在了侧院，可那个位子最后没有落到你头上。教团给你的说法是「另有任用」，实际上的意思是留在手边还有用。你还在替他们站台，站得越来越熟练，也越来越清楚自己在替谁站。",
      failed:
        "你没能从那一场仪式上走下来，或者走下来了，却再没有回到米里希昂。教团的布告上换了一个名字，换得很干净。你留下的东西不多：一间朝东的屋子，一份没人看的单子，还有教区里几个记得你样子的老人。",
    },
  },
];

/* ==================================================================== *
 * 主线专属的抉择事件
 * ==================================================================== */

export const EVENTS_PACK1: MainlineEventDef[] = [
  /* ---------- 剑之圣地的叛逆者 ---------- */
  {
    id: "ml-blade-of-holy-land-s1",
    mainlineId: "blade-of-the-holy-land",
    title: "第一天挑对手",
    weight: 1.4,
    when: (s) =>
      before(s, "ml-blade-of-holy-land-s1") && !flagOn(s, "ml:blade-of-the-holy-land:s1:done"),
    body: [
      "晨练散场之后，场边还留着几个人。规矩是新人自己挑一个上去。",
      "最靠外的一排站着一个比你矮半头的，脸上有块旧疤。再往里两个是正经的师兄，正眼都不看你。",
      "师范靠在柱子上没说话。他在等你自己走过去。",
    ],
    options: [
      {
        id: "senior",
        label: "挑最里面那个师兄",
        risk: "高",
        lines: [
          "你被摔了四次。第五次你摸到了他的重心，把他掀了个趔趄。",
          "他没有恼，收手的时候说了句：明天还站这儿。",
        ],
        outcome: {
          tier: { kind: "sword", gain: 14 },
          stats: { sword: 5, fame: 3, health: -6 },
          factions: { 剑之圣地: 6 },
          flag: "ml:blade-of-the-holy-land:s1:noticed",
          notice: "你在第一天挑了最强的那个人，总本山记住了你的名字。",
        },
      },
      {
        id: "scar",
        label: "挑那个脸上有疤的",
        risk: "中",
        lines: [
          "他出手很脏，用肘、用脚、用你的重心。你输了一场，赢了一场。",
          "散场时他把木刀往架子上一扔，说以后练手找他。",
        ],
        outcome: {
          tier: { kind: "sword", gain: 10 },
          stats: { sword: 3, scheme: 4, health: -3 },
          flag: "ml:blade-of-the-holy-land:s1:noticed",
          starDelta: { match: "", delta: 1, note: "他成了你在这栋房子里第一个能一起练剑的人" },
          notice: "你在第一天挑了一个没人愿意搭理的对手，他后来一直站在你这边。",
        },
      },
      {
        id: "solo",
        label: "谁都不挑，自己去角落里练",
        risk: "低",
        lines: [
          "你把基础动作做了一整天。没有人看，也没有人说什么。",
          "回通铺的时候，那几个人已经把你的名字猜错了两遍。",
        ],
        outcome: {
          tier: { kind: "sword", gain: 8 },
          stats: { sword: 4, int: 3, fame: -2 },
          goal: 4,
          notice: "第一天你谁都没挑。基本功比昨天干净，但没有人记住你。",
        },
      },
    ],
  },
  {
    id: "ml-blade-of-holy-land-s2",
    mainlineId: "blade-of-the-holy-land",
    title: "真剑出鞘",
    weight: 1.5,
    when: (s) =>
      after(s, "ml-blade-of-holy-land-s1") && before(s, "ml-blade-of-holy-land-s2"),
    body: [
      "正式序列的比试用真剑。对面那个人比你早进门两年，收剑的时候手很稳。",
      "场上划了线，线外站着两排人。有人在小声说这一场用不了几个回合。",
      "裁判把手抬起来，问你们准备好了没有。",
    ],
    options: [
      {
        id: "rush",
        label: "抢那一息，先动手",
        risk: "高",
        lines: [
          "你先出手，刀从他的腕上过去。他的剑先落地，人还没反应过来。",
          "场边一息没有声音。之后有人开始收线。",
        ],
        outcome: {
          tier: { kind: "sword", gain: 20 },
          stats: { sword: 7, fame: 5, health: -5 },
          factions: { 剑之圣地: 8 },
          flag: "ml:blade-of-the-holy-land:s2:duel-won",
          notice: "你在真剑对练里先动手，赢了。总本山按名字叫你了。",
        },
      },
      {
        id: "wait",
        label: "等他先动，用他那一动换位置",
        risk: "中",
        lines: [
          "他先动，你侧了半步。刀擦着你的肩过去，你的刀停在他颈侧。",
          "他站着没动，认了。收刀的时候他自己的手在抖。",
        ],
        outcome: {
          tier: { kind: "sword", gain: 16 },
          stats: { sword: 5, int: 5, health: -8 },
          factions: { 剑之圣地: 5 },
          flag: "ml:blade-of-the-holy-land:s2:duel-won",
          notice: "你在真剑对练里后发先至，赢了那一场。",
        },
      },
      {
        id: "yield",
        label: "在第一合就收手认输",
        risk: "低",
        lines: [
          "你把刀放低，认了输。场边有人笑了一声，很快就没了。",
          "下场的时候师范第一次跟你说了完整的一句话：你还没准备好死。",
        ],
        outcome: {
          tier: { kind: "sword", gain: 8 },
          stats: { sword: 3, int: 4, fame: -3 },
          factions: { 剑之圣地: -4 },
          flag: "ml:blade-of-the-holy-land:s2:duel-won",
          goal: 5,
          notice: "你在真剑对练里认了输。师范说你还没准备好死。",
        },
      },
    ],
  },
  {
    id: "ml-blade-of-holy-land-s3",
    mainlineId: "blade-of-the-holy-land",
    title: "名字后面挂着谁",
    weight: 1.5,
    when: (s) =>
      after(s, "ml-blade-of-holy-land-s2") && before(s, "ml-blade-of-holy-land-s3"),
    body: [
      "你查到的那个人今年十九，是长老会一位老人的远房亲戚。他往外递的东西里，有两样是从正堂拓下来的。",
      "昨天他还替你顶过一班夜哨。今天早上他见你的时候点了下头。",
      "长老会要的是一个能写进名册的结论。剑神那边要的是一个说法。两边都还没拿到。",
    ],
    options: [
      {
        id: "report",
        label: "照实报到长老会",
        risk: "低",
        lines: [
          "你把名字和日期一并交了上去。第三天，那个人就不在道场里了。",
          "长老会给了你一个名分。同辈里从此有一半不再跟你同桌吃饭。",
        ],
        outcome: {
          stats: { scheme: 7, int: 4, fame: 4, charm: -5 },
          factions: { 剑之圣地: 12 },
          flag: "ml:blade-of-the-holy-land:s3:reported",
          notice: "你把泄密的人交了出去。总本山里有人记住了这件事。",
        },
      },
      {
        id: "warn",
        label: "先去找他，让他自己收手",
        risk: "中",
        lines: [
          "你在山路上拦住他，把查到的东西放在他面前。他看了很久，什么也没说。",
          "第二天他递了辞，说是家里有事。长老会查不出结论，把这件事压了下来。",
        ],
        outcome: {
          stats: { scheme: 6, charm: 5, int: 4, fame: -2 },
          factions: { 剑之圣地: -6 },
          flag: "ml:blade-of-the-holy-land:s3:reported",
          starDelta: { match: "", delta: 1, note: "你放了他一条路，他记得" },
          notice: "你放走了泄密的人。长老会没有得到结论，你欠下了一笔。",
        },
      },
      {
        id: "own",
        label: "把这件事的路数交给剑神",
        risk: "高",
        lines: [
          "你绕过长老会，直接找到了剑神。他听完只问了一句：你自己想怎么办。",
          "你说不知道。他说那就是还没查完，回去接着查。",
        ],
        outcome: {
          stats: { sword: 5, scheme: 5, int: 4, fame: 5 },
          factions: { 剑之圣地: 4 },
          flag: "ml:blade-of-the-holy-land:s3:reported",
          goal: 6,
          notice: "你把泄密的事交给了剑神。他没有给你结论，只让你接着查。",
        },
      },
    ],
  },
  {
    id: "ml-blade-of-holy-land-s4",
    mainlineId: "blade-of-the-holy-land",
    title: "说清你要不要它",
    weight: 1.5,
    when: (s) =>
      after(s, "ml-blade-of-holy-land:s3") && before(s, "ml-blade-of-holy-land-s4"),
    body: [
      "旧刀在正堂摆了几天，谁都不许碰。长老会终于开口，让大家把话说明白。",
      "按顺序，先问的是剑神一脉，再问的是各支门人。轮到外人的时候，正堂里剩下的人就不多了。",
      "轮到你了。",
    ],
    options: [
      {
        id: "claim",
        label: "我要它",
        risk: "高",
        lines: [
          "你把话说完，正堂里静了一息。长老会那边有人轻轻笑了一下。",
          "剑神没有表态，散场时从你身边过去，脚步和你一样快。",
        ],
        outcome: {
          tier: { kind: "sword", gain: 18 },
          stats: { sword: 6, fame: 6, charm: -5, scheme: 3 },
          factions: { 剑之圣地: 6 },
          flag: "ml:blade-of-the-holy-land:s4:stance",
          notice: "你当众说要那把旧刀。两派都记住了你这句话。",
        },
      },
      {
        id: "decline",
        label: "我不要，我要的是能拿它的人该有的那种剑",
        risk: "中",
        lines: [
          "你说完之后，正堂里第一次有人点头。点的是长老会那一边。",
          "剑神一脉那边有个人看了你很久，最后什么也没说。",
        ],
        outcome: {
          stats: { sword: 5, int: 6, scheme: 5, fame: 5 },
          factions: { 剑之圣地: 10 },
          flag: "ml:blade-of-the-holy-land:s4:stance",
          goal: 7,
          notice: "你当众推掉了那把旧刀。长老会对你放心了一点。",
        },
      },
      {
        id: "push",
        label: "把刀推给剑神一脉，条件是让我进剑神祭的那一场",
        risk: "高",
        lines: [
          "你把交换条件摆到了桌面上。有人当场变了脸色，也有人笑了。",
          "剑神那边最后只回了一句：你要打，就让你打。",
        ],
        outcome: {
          stats: { scheme: 8, sword: 5, fame: 5, charm: -3 },
          tier: { kind: "sword", gain: 14 },
          factions: { 剑之圣地: -4 },
          flag: "ml:blade-of-the-holy-land:s4:stance",
          notice: "你用那把旧刀换来了剑神祭上的一场。这笔账两派都记着。",
        },
      },
    ],
  },
  {
    id: "ml-blade-of-holy-land-s5",
    mainlineId: "blade-of-the-holy-land",
    title: "祭典上的最后一问",
    weight: 1.6,
    when: (s) =>
      after(s, "ml-blade-of-holy-land-s4") && before(s, "ml-blade-of-holy-land-s5"),
    body: [
      "这一场打完，各支门人还没有散。剑神加尔从最上面那一排下来，走到场边。",
      "他问的只有一句：你以后要拿这把剑做什么。",
      "场边几百个人都在等你的回答。他等得比谁都稳。",
    ],
    options: [
      {
        id: "serve",
        label: "留在总本山，把这栋房子的剑传下去",
        risk: "中",
        lines: [
          "你说要留下来。他点了下头，算是收下了这个答案。",
          "长老会当场给了你一个名分。名分写得很客气。",
        ],
        outcome: {
          tier: { kind: "sword", gain: 22 },
          stats: { sword: 7, fame: 8, faith: 4, charm: -2 },
          factions: { 剑之圣地: 16 },
          flag: "ml:blade-of-the-holy-land:s5:answer",
          notice: "你在剑神祭上说要留在总本山。名分当场就给了你。",
        },
      },
      {
        id: "leave",
        label: "说你要带着这把剑出去",
        risk: "高",
        lines: [
          "你说完这句话，有几个人当场转身走了。剑神看着你，很久才开口。",
          "他说：那明天早上就别来占那块地板了。",
        ],
        outcome: {
          tier: { kind: "sword", gain: 24 },
          stats: { sword: 8, fame: 6, int: 5, charm: -4 },
          factions: { 剑之圣地: -10 },
          flag: "ml:blade-of-the-holy-land:s5:answer",
          goal: 8,
          notice: "你在剑神祭上说要离开总本山。这栋房子的门还开着，只是不再是你的。",
        },
      },
      {
        id: "silent",
        label: "不回答，把刀还回架子上",
        risk: "中",
        lines: [
          "你把刀放回架子，行了礼，转身下场。全场安静得能听见自己的脚步声。",
          "剑神一直站在原地。他没有再问。",
        ],
        outcome: {
          stats: { sword: 6, int: 7, faith: 5, fame: 4, scheme: 4 },
          factions: { 剑之圣地: 4 },
          flag: "ml:blade-of-the-holy-land:s5:answer",
          goal: 7,
          notice: "剑神祭的最后一问，你没有回答。这件事总本山会记很久。",
        },
      },
    ],
  },

  /* ---------- 水神流的行刑人 ---------- */
  {
    id: "ml-executioner-of-the-water-god-s1",
    mainlineId: "executioner-of-the-water-god",
    title: "他问你会不会用剑",
    weight: 1.4,
    when: (s) =>
      before(s, "ml-executioner-of-the-water-god-s1") &&
      !flagOn(s, "ml:executioner-of-the-water-god:s1:done"),
    body: [
      "介绍人把酒推过来，问你会不会用剑。你说会。他点点头，从怀里取出一封信。",
      "他说这封信要送到城西，收信的人不会问你是谁。",
      "他还说，这件事办完，还有下一件。",
    ],
    options: [
      {
        id: "take",
        label: "接下这封信",
        risk: "低",
        lines: [
          "你把信送到了一双戴皮手套的手里。对方没有露脸，也没有数钱。",
          "回程你绕了两条街。这是介绍人教你的第一件事。",
        ],
        outcome: {
          stats: { scheme: 6, wealth: 90, int: 3 },
          flag: "ml:executioner-of-the-water-god:s1:accepted",
          notice: "你接下了介绍人的第一件活。这一行的门开了一条缝。",
        },
      },
      {
        id: "ask",
        label: "先问清楚替谁做事",
        risk: "中",
        lines: [
          "他笑了一下，说这个问题值三个月的报酬。",
          "然后他把信收回怀里，换了一件更容易的活给你：去认一个人。",
        ],
        outcome: {
          stats: { scheme: 4, int: 5, charm: 3 },
          flag: "ml:executioner-of-the-water-god:s1:accepted",
          notice: "你先问了价钱，介绍人给了你一件更小的活，也记住了你这个人。",
        },
      },
      {
        id: "refuse",
        label: "不接，但把话听完",
        risk: "低",
        lines: [
          "你听完他讲的那套道理，一直没有接那封信。",
          "临走他留了个地址，说想清楚了再来。",
        ],
        outcome: {
          stats: { int: 4, scheme: 3 },
          flag: "ml:executioner-of-the-water-god:s1:accepted",
          goal: 4,
          notice: "你没有当场接下那件活，但记住了那个地址。",
        },
      },
    ],
  },
  {
    id: "ml-executioner-of-the-water-god-s2",
    mainlineId: "executioner-of-the-water-god",
    title: "街尾那盏灯",
    weight: 1.6,
    when: (s) =>
      after(s, "ml-executioner-of-the-water-god-s1") && before(s, "ml-executioner-of-the-water-god-s2"),
    body: [
      "目标在街尾那家汤铺坐下来，要了一碗汤。他一个人，背对着门。",
      "名单上写着他的名字，没写别的。介绍人的话是「别让他走到街尾」。",
      "汤铺的灯很亮，亮到能看清他碗里还剩多少。",
    ],
    options: [
      {
        id: "kill",
        label: "照做，等他出来",
        risk: "高",
        lines: [
          "他出来的时候往左拐，走了三步。你的剑停在他该在的位置上。",
          "街上没有第二个声音。你退回来的时候，汤铺还亮着。",
        ],
        outcome: {
          tier: { kind: "sword", gain: 18 },
          stats: { sword: 7, scheme: 5, health: -5, faith: -6 },
          flag: "ml:executioner-of-the-water-god:s2:first-blood",
          notice: "你第一次奉命动手。这件事没有第二个人知道，除了付钱的那个。",
        },
      },
      {
        id: "warn",
        label: "进店里坐下，把话说明白",
        risk: "中",
        lines: [
          "你坐到他对面，把名单的事说了。他听完把汤喝完，放下钱走了。",
          "走出城的时候他回头看了你一眼。名单上的名字从此不再有人提。",
        ],
        outcome: {
          stats: { scheme: 7, int: 5, charm: 4, faith: -3, fame: -3 },
          flag: "ml:executioner-of-the-water-god:s2:first-blood",
          goal: 6,
          notice: "你放走了名单上的人。介绍人付了钱，但从此换了一张桌子。",
        },
      },
      {
        id: "abort",
        label: "不动手，回去把钱退掉",
        risk: "高",
        lines: [
          "你把钱放在桌上，说了句抱歉。介绍人没有生气，也没有再约你。",
          "之后三个月，你在王都找活的时候处处碰壁。有人在背后打了招呼。",
        ],
        outcome: {
          stats: { faith: 6, scheme: 3, wealth: -80, fame: -5 },
          flag: "ml:executioner-of-the-water-god:s2:first-blood",
          goal: 4,
          notice: "你退掉了第一件真正的活。王都的几条路从此对你窄了一些。",
        },
      },
    ],
  },
  {
    id: "ml-executioner-of-the-water-god-s3",
    mainlineId: "executioner-of-the-water-god",
    title: "名字是别人给的",
    weight: 1.5,
    when: (s) =>
      after(s, "ml:executioner-of-the-water-god-s2") && before(s, "ml-executioner-of-the-water-god-s3"),
    body: [
      "你查到了：那张名单上的名字是有人口述、别人抄下来的，抄的人自己没见过那个人。",
      "口述的人属于王都某一派，那一派最近正在清掉另一派的几个碍事的名字。",
      "介绍人从码头那天起就不在王都了。",
    ],
    options: [
      {
        id: "dig",
        label: "继续往上查一层",
        risk: "高",
        lines: [
          "你查到了一个人的姓。姓后面挂着一位上级贵族，那位贵族有六个下手。",
          "你把这条线记下来的时候，手比平时稳。",
        ],
        outcome: {
          stats: { scheme: 9, int: 5, fame: 4, health: -4 },
          flag: "ml:executioner-of-the-water-god:s3:line",
          factions: { 阿斯拉王国: -5 },
          notice: "你往上查了一层。查到的东西，比你想的更大。",
        },
      },
      {
        id: "stop",
        label: "到此为止，把纸烧掉",
        risk: "低",
        lines: [
          "你把查到的东西烧了，灰倒在街上。",
          "第二天你去练了一整天的剑。练的是最基础的起手。",
        ],
        outcome: {
          stats: { scheme: 6, int: 4, faith: 3, sword: 3 },
          flag: "ml:executioner-of-the-water-god:s3:line",
          goal: 5,
          notice: "你把手上的线索烧了。有些事不往下查，也是一种活法。",
        },
      },
      {
        id: "turn",
        label: "把雇主交出去",
        risk: "高",
        lines: [
          "你把口述的人的名字写成一份东西，塞进了某一派的信箱。",
          "半个月后那个人失踪了。没有人提到过你。",
        ],
        outcome: {
          stats: { scheme: 8, int: 5, fame: 5, charm: -4 },
          factions: { 阿斯拉王国: 8 },
          flag: "ml:executioner-of-the-water-god:s3:line",
          notice: "你把雇主交了出去。王都某一派欠了你一个人情。",
        },
      },
    ],
  },
  {
    id: "ml-executioner-of-the-water-god-s4",
    mainlineId: "executioner-of-the-water-god",
    title: "桌子那边的人",
    weight: 1.6,
    when: (s) =>
      after(s, "ml-executioner-of-the-water-god-s3") && before(s, "ml-executioner-of-the-water-god-s4"),
    body: [
      "审你的是教团的审判庭。主持的人姓禄卜朗，旁边坐着一个不敢看人眼睛的女孩子。",
      "他们手里有一份名单，还有你的刀口的形状。",
      "「说吧。」枢机卿把笔放下，「说完了这件事就算了。」",
    ],
    options: [
      {
        id: "name",
        label: "把雇主那一派的名字给出去",
        risk: "中",
        lines: [
          "你说了三个名字，说得不快。记录的人写得很仔细。",
          "出门的时候有个骑士朝你点了下头。这一点头，王都那边会有人知道。",
        ],
        outcome: {
          stats: { scheme: 8, int: 4, fame: 5, charm: -5 },
          factions: { 米里斯教团: 10, 阿斯拉王国: -8 },
          flag: "ml:executioner-of-the-water-god:s4:testimony",
          notice: "你把雇主交了出去。教团记下了你的说法。",
        },
      },
      {
        id: "cover",
        label: "一个人扛下来",
        risk: "高",
        lines: [
          "你只说了一次奉命，没说名字。问了两天，问到最后他们把手印推过来。",
          "按手印的时候，那个女孩子终于抬头看了你一眼。",
        ],
        outcome: {
          stats: { scheme: 6, sword: 4, health: -10, fame: 3, faith: 4 },
          factions: { 米里斯教团: -4 },
          flag: "ml:executioner-of-the-water-god:s4:testimony",
          notice: "你在审判庭里一个人扛了下来。教团没有得到他们想要的名字。",
        },
      },
      {
        id: "flee",
        label: "在问话的第二天夜里离开米里希昂",
        risk: "高",
        lines: [
          "你从西门出去的时候天还没亮。城门口的人看了你的通行证，放你走了。",
          "此后教团的名册上你的名字后面多了一个记号。",
        ],
        outcome: {
          stats: { scheme: 7, int: 5, health: -6, faith: -6, fame: -4 },
          factions: { 米里斯教团: -14 },
          flag: "ml:executioner-of-the-water-god:s4:testimony",
          notice: "你从米里希昂跑了。教团在名册上给你记了一笔。",
        },
      },
    ],
  },
  {
    id: "ml-executioner-of-the-water-god-s5",
    mainlineId: "executioner-of-the-water-god",
    title: "名单上的最后一个名字",
    weight: 1.7,
    when: (s) =>
      after(s, "ml-executioner-of-the-water-god-s4") &&
      before(s, "ml-executioner-of-the-water-god-s5"),
    body: [
      "跑腿的小子把纸塞给你就跑了。名单上有五个名字，前四个都划掉了。",
      "最后一个是你的名字，写得很工整。",
      "你认得这种纸。这是介绍人用的那一种。",
    ],
    options: [
      {
        id: "stand",
        label: "不躲，等他们来",
        risk: "高",
        lines: [
          "来的人一共三个，从两个方向过来。你在窄巷里等他们进到近处才动。",
          "收场的时候有一个跑了。你没有追。",
        ],
        outcome: {
          tier: { kind: "sword", gain: 22 },
          stats: { sword: 8, scheme: 6, fame: 6, health: -10 },
          flag: "ml:executioner-of-the-water-god:s5:survived",
          notice: "你在王都的巷子里接下了这一场。三个人来了，两个没回去。",
        },
      },
      {
        id: "expose",
        label: "把这张纸先捅给教团",
        risk: "中",
        lines: [
          "你把纸放在一位神父面前。他看了很久，把它折好收进袖子里。",
          "三天后，动手的人没有出现。名单上的名字被一条很粗的墨线划掉了。",
        ],
        outcome: {
          stats: { scheme: 8, faith: 6, fame: 5, int: 3 },
          factions: { 米里斯教团: 12 },
          flag: "ml:executioner-of-the-water-god:s5:survived",
          notice: "你把名单先交给了教团。动手的人没有来。",
        },
      },
      {
        id: "vanish",
        label: "换一个名字，离开王都",
        risk: "中",
        lines: [
          "你把住处退掉，把能认出来的东西全扔了，搭上了一辆往南的货车。",
          "一个月后你在另一座城里重新找活。没有人问过你以前做什么。",
        ],
        outcome: {
          stats: { scheme: 9, int: 5, fame: -8, wealth: -100 },
          flag: "ml:executioner-of-the-water-god:s5:survived",
          goal: 6,
          notice: "你换了个名字离开了王都。名单上的最后一个名字从此没有人再念。",
        },
      },
    ],
  },

  /* ---------- 北神流的流浪剑客 ---------- */
  {
    id: "ml-driftblade-of-the-north-s1",
    mainlineId: "driftblade-of-the-north",
    title: "哈萨姆的赌",
    weight: 1.4,
    when: (s) =>
      before(s, "ml-driftblade-of-the-north-s1") && !flagOn(s, "ml:driftblade-of-the-north:s1:done"),
    body: [
      "哈萨姆把干粮分了一半给你，然后在沙地上画了两个圈，说这是敌我。",
      "他说北神流不打没把握的仗，因为没把握的时候根本不打。",
      "他指了个方向，说那边有一支走货的队伍缺人。",
    ],
    options: [
      {
        id: "join",
        label: "跟着他上这趟路",
        risk: "中",
        lines: [
          "这趟路走了十几天。中间遇了一次伏击，你按他说的顺序做了一遍。",
          "到地方的时候你的手在抖，但两个人都活着。",
        ],
        outcome: {
          tier: { kind: "adventure", gain: 14 },
          stats: { sword: 5, scheme: 4, health: -5 },
          flag: "ml:driftblade-of-the-north:s1:lead",
          notice: "你跟着哈萨姆上了路。他教你的第一件事是先看脚。",
        },
      },
      {
        id: "own",
        label: "自己去拉潘接活，路上再碰头",
        risk: "中",
        lines: [
          "你一个人走了半程，路上卖了一次苦力，也挨了一次抢。",
          "在拉潘的分部门口，哈萨姆蹲在台阶上等你，像等了很久。",
        ],
        outcome: {
          tier: { kind: "adventure", gain: 12 },
          stats: { sword: 4, scheme: 5, wealth: 60, health: -6 },
          flag: "ml:driftblade-of-the-north:s1:lead",
          notice: "你一个人先走了一趟。哈萨姆在拉潘等你。",
        },
      },
      {
        id: "ask",
        label: "先问他找的那个人是谁",
        risk: "低",
        lines: [
          "他把靴子放下，说了一个名字，然后说这个人现在可能在龙鸣山那边。",
          "说完他接着缝靴子，缝得比刚才慢。",
        ],
        outcome: {
          stats: { int: 5, scheme: 4 },
          flag: "ml:driftblade-of-the-north:s1:lead",
          goal: 5,
          starDelta: { match: "哈萨姆", delta: 1, note: "他把自己那笔旧仇说给了你一半" },
          notice: "哈萨姆把那笔旧仇说了一半。名字你记住了。",
        },
      },
    ],
  },
  {
    id: "ml-driftblade-of-the-north-s2",
    mainlineId: "driftblade-of-the-north",
    title: "第三层的岔口",
    weight: 1.5,
    when: (s) =>
      after(s, "ml-driftblade-of-the-north-s1") && before(s, "ml-driftblade-of-the-north-s2"),
    body: [
      "下到第三层，前面分成两条：左边近，地上有新的脚印；右边远，风从下面上来。",
      "哈萨姆站在岔口喘气。他说这条他走过一次，走的是左边。",
      "铜板在下面某一层。今天只够走一条。",
    ],
    options: [
      {
        id: "left",
        label: "走左边，快",
        risk: "高",
        lines: [
          "近路上有人等着。你们打了一场，对方退了两步就跑了。",
          "铜板在左边的第四层。拿到它的时候哈萨姆的手在抖。",
        ],
        outcome: {
          tier: { kind: "adventure", gain: 16 },
          stats: { sword: 6, scheme: 5, health: -9 },
          flag: "ml:driftblade-of-the-north:s2:proof",
          notice: "你走了近路。铜板拿到了，代价是一场硬仗。",
        },
      },
      {
        id: "right",
        label: "走右边，稳",
        risk: "中",
        lines: [
          "远路上多花了两天，补给只剩一半。你们在第四层的角落里找到了那块铜板。",
          "哈萨姆把它翻过来看了一眼，说了句：就是这个。",
        ],
        outcome: {
          tier: { kind: "adventure", gain: 14 },
          stats: { sword: 4, int: 5, scheme: 5, health: -6 },
          flag: "ml:driftblade-of-the-north:s2:proof",
          goal: 6,
          notice: "你走了远路。铜板到手，补给见底。",
        },
      },
      {
        id: "back",
        label: "撤回去，补足补给再来",
        risk: "低",
        lines: [
          "你们退回了地面。哈萨姆一路没说话，上来之后才说：活着比铜板要紧。",
          "他在拉潘的分部把装备补齐了，又等了大半个月。",
        ],
        outcome: {
          tier: { kind: "adventure", gain: 10 },
          stats: { int: 5, scheme: 4, health: 4, wealth: -90 },
          flag: "ml:driftblade-of-the-north:s2:proof",
          notice: "你们退出了迷宫，补齐了再下去。铜板最后还是到了手。",
        },
      },
    ],
  },
  {
    id: "ml-driftblade-of-the-north-s3",
    mainlineId: "driftblade-of-the-north",
    title: "崖下那句话",
    weight: 1.6,
    when: (s) =>
      after(s, "ml:driftblade-of-the-north-s2") && before(s, "ml:driftblade-of-the-north-s3"),
    body: [
      "当年那支队的营火圈还在崖下。哈萨姆蹲下来看了很久。",
      "他说跑掉的不是别人，是他自己。那笔旧仇从头到尾都长在他身上。",
      "风里的低音一直响，不急不慢。",
    ],
    options: [
      {
        id: "carry",
        label: "把这件事接过来，替他去西隆",
        risk: "中",
        lines: [
          "他没有推辞，也没有道谢。只是把刀解下来递给你，刃口朝着自己。",
          "你说你会回来。他说不用回来也行。",
        ],
        outcome: {
          stats: { sword: 6, int: 5, scheme: 5, health: -4 },
          flag: "ml:driftblade-of-the-north:s3:vow",
          starDelta: { match: "哈萨姆", delta: 2, note: "他把自己的刀和那笔旧仇一起交给你" },
          notice: "你把哈萨姆的旧仇接了过来。他把刀交到了你手上。",
        },
      },
      {
        id: "together",
        label: "一起下山，他自己去说那句话",
        risk: "中",
        lines: [
          "你们一起下了山。他走得慢，一路上歇了七次。",
          "到西隆城门口的时候，他把靴子上的土拍干净，说这一趟他要自己走。",
        ],
        outcome: {
          stats: { sword: 5, int: 5, charm: 5, health: -3 },
          flag: "ml:driftblade-of-the-north:s3:vow",
          goal: 6,
          starDelta: { match: "哈萨姆", delta: 2, note: "你陪他走完了这一趟" },
          notice: "你陪哈萨姆下了山。最后那句话他要自己说。",
        },
      },
      {
        id: "down",
        label: "说自己不打算再掺和这件事",
        risk: "低",
        lines: [
          "你把话说得很短。他听完点了下头，把那块铜板收进怀里。",
          "你们在岔路口分开。他往南走，你往北走。",
        ],
        outcome: {
          stats: { int: 5, sword: 3, scheme: 4, fame: -3 },
          flag: "ml:driftblade-of-the-north:s3:vow",
          goal: 5,
          notice: "你在龙鸣山和哈萨姆分开了。那笔旧仇还是他的。",
        },
      },
    ],
  },
  {
    id: "ml-driftblade-of-the-north-s4",
    mainlineId: "driftblade-of-the-north",
    title: "宫墙外的巷子",
    weight: 1.5,
    when: (s) =>
      after(s, "ml:driftblade-of-the-north-s3") && before(s, "ml:driftblade-of-the-north-s4"),
    body: [
      "你们约在宫墙外的一条巷子里。他比你想象的苍老，也比你想的平静。",
      "他说当年那件事之后，他在这座城里待了很多年，一直等有人来。",
      "「你带了刀。」他说，「那你就是来办这件事的。」",
    ],
    options: [
      {
        id: "draw",
        label: "拔刀",
        risk: "高",
        lines: [
          "他比你快，第一合就压住了你的腕。第二合你借墙借地形，把他逼到角落。",
          "他倒下的时候没有出声。巷子外面有人在敲更。",
        ],
        outcome: {
          tier: { kind: "sword", gain: 18 },
          stats: { sword: 8, scheme: 4, fame: 4, health: -9 },
          flag: "ml:driftblade-of-the-north:s4:meeting",
          notice: "你在西隆的巷子里办了这件事。哈萨姆没有来。",
        },
      },
      {
        id: "talk",
        label: "把刀收回去，把哈萨姆的话带到",
        risk: "中",
        lines: [
          "你把他那三句话原样说了。他听完坐到了墙根上，坐了很久。",
          "临走他说了一件事：当年那块铜板，是他故意留下的。",
        ],
        outcome: {
          stats: { int: 7, scheme: 6, charm: 5, sword: 4 },
          flag: "ml:driftblade-of-the-north:s4:meeting",
          goal: 8,
          notice: "你没有拔刀，把话带到了。旧仇的样子和哈萨姆想的不一样。",
        },
      },
      {
        id: "return",
        label: "把哈萨姆的刀还给他，自己走开",
        risk: "低",
        lines: [
          "你把刀放在他脚边，转身出了巷子。他在后面叫了你一声，你没有停。",
          "出城的时候你想，这把刀本来就不该在你身上。",
        ],
        outcome: {
          stats: { int: 6, scheme: 5, fame: -4, sword: 3 },
          flag: "ml:driftblade-of-the-north:s4:meeting",
          goal: 6,
          notice: "你把刀还了回去。这一趟你只走到了巷口。",
        },
      },
    ],
  },
  {
    id: "ml-driftblade-of-the-north-s5",
    mainlineId: "driftblade-of-the-north",
    title: "大沙海边的井",
    weight: 1.6,
    when: (s) =>
      after(s, "ml:driftblade-of-the-north-s4") && before(s, "ml:driftblade-of-the-north-s5"),
    body: [
      "井边一共七个人，看着不像一伙的。他们要的东西很简单：那块铜板。",
      "哈萨姆把靴子重新系了一遍，说他打前面，你打后面。",
      "沙在脚下流。再往西就是大沙海了。",
    ],
    options: [
      {
        id: "front",
        label: "抢到哈萨姆前面去",
        risk: "高",
        lines: [
          "你把七个人往沙丘那一侧引，靠风和地形一个个挑。",
          "哈萨姆被你挤到了后面，气得骂了你一整天。",
        ],
        outcome: {
          tier: { kind: "sword", gain: 20 },
          stats: { sword: 8, scheme: 6, fame: 6, health: -12 },
          flag: "ml:driftblade-of-the-north:s5:fought",
          starDelta: { match: "哈萨姆", delta: 1, note: "他骂了你一整天，然后把最后一块干粮给了你" },
          notice: "大沙海边的井旁打了一场。你抢在了哈萨姆前面。",
        },
      },
      {
        id: "back",
        label: "照他说的做，守住后面",
        risk: "中",
        lines: [
          "你守在后面，把绕过来的两个人挡住。哈萨姆在前面顶了三个。",
          "收场的时候他坐在地上喘，坐着也在笑。",
        ],
        outcome: {
          tier: { kind: "sword", gain: 16 },
          stats: { sword: 6, scheme: 5, fame: 5, health: -8 },
          flag: "ml:driftblade-of-the-north:s5:fought",
          notice: "大沙海边的井旁打了一场。你守住了后面，哈萨姆顶住了前面。",
        },
      },
      {
        id: "give",
        label: "把铜板扔出去，换两个人走出去",
        risk: "中",
        lines: [
          "你把铜板扔到沙丘另一侧，七个人里五个追了过去。",
          "你们从井边退走的时候，哈萨姆一句话也没说。",
        ],
        outcome: {
          stats: { scheme: 8, int: 5, fame: -4, sword: 4, health: -4 },
          flag: "ml:driftblade-of-the-north:s5:fought",
          goal: 6,
          notice: "你把铜板扔了出去。旧仇的凭证从此落在了别人手里。",
        },
      },
    ],
  },

  /* ---------- 米里斯的异端审判 ---------- */
  {
    id: "ml-inquisitor-of-millis-s1",
    mainlineId: "inquisitor-of-millis",
    title: "有人提到了你",
    weight: 1.5,
    when: (s) => before(s, "ml-inquisitor-of-millis-s1") && !flagOn(s, "ml:inquisitor-of-millis:s1:done"),
    body: [
      "教团的人在村里问了三家口供，走之前在墙上贴了一张纸。",
      "名单上没有你的名字，但问到的人里有三个提到了你。",
      "其中一个是你替人包扎过一次的那个。",
    ],
    options: [
      {
        id: "explain",
        label: "自己去找教团的人把事说清楚",
        risk: "中",
        lines: [
          "你追到村口，把那天的事从头说了一遍。记录的人一直在写。",
          "他写完之后抬头看了你一眼，说：你说的和你邻居说的不一样。",
        ],
        outcome: {
          stats: { faith: 5, charm: 4, int: 3, scheme: 3 },
          factions: { 米里斯教团: 6 },
          flag: "ml:inquisitor-of-millis:s1:stance",
          notice: "你自己去找教团说了这件事。记录上多了一段你自己说的。",
        },
      },
      {
        id: "hide",
        label: "把那个人送走，什么都不认",
        risk: "高",
        lines: [
          "你连夜把人送到了邻村，回来的时候天快亮了。",
          "之后你对每一个问到的人都摇头。这件事就变成了没人能证实的一件事。",
        ],
        outcome: {
          stats: { scheme: 7, int: 4, faith: -4, health: -4 },
          factions: { 米里斯教团: -6 },
          flag: "ml:inquisitor-of-millis:s1:stance",
          notice: "你把那个人送走了，然后什么都不认。名单上暂时没有你。",
        },
      },
      {
        id: "leave",
        label: "收拾东西，离开这一带",
        risk: "中",
        lines: [
          "你把该卖的卖了，把该交代的交代了，第二天早上出了村。",
          "走出去很远，你回头看了一眼。田里的麦子已经黄了。",
        ],
        outcome: {
          stats: { scheme: 6, int: 4, charm: -4, wealth: 80 },
          flag: "ml:inquisitor-of-millis:s1:stance",
          goal: 4,
          notice: "你离开了菲托亚领。教团的传唤后来送到了别人手里。",
        },
      },
    ],
  },
  {
    id: "ml-inquisitor-of-millis-s2",
    mainlineId: "inquisitor-of-millis",
    title: "看着她的眼睛",
    weight: 1.7,
    when: (s) =>
      after(s, "ml-inquisitor-of-millis-s1") && before(s, "ml-inquisitor-of-millis-s2"),
    body: [
      "枢机卿把灯往中间挪了挪。旁边那个女孩子终于抬起了头。",
      "记录的人蘸好墨等着。门外站着神殿骑士团的人。",
      "「看着她的眼睛。」枢机卿说，「事情很快就能结束。」",
    ],
    options: [
      {
        id: "truth",
        label: "照实说，把该说的全说出来",
        risk: "中",
        lines: [
          "你说完了。有些话你自己也没想到会说出来。",
          "枢机卿听完点了下头，在纸上写了两个字，然后就让你走了。",
        ],
        outcome: {
          stats: { faith: 8, charm: 4, scheme: -4, health: -6 },
          factions: { 米里斯教团: 12 },
          flag: "ml:inquisitor-of-millis:s2:verdict",
          notice: "你在问话里全说了。教团把你归进了「可用」的那一类。",
        },
      },
      {
        id: "wall",
        label: "让她读，但把那一段按住",
        risk: "高",
        lines: [
          "她的眼睛在你脸上停了一会儿，然后移开了。",
          "枢机卿问了她两句，她都摇头。问话就这样结束了。",
        ],
        outcome: {
          stats: { scheme: 9, int: 5, faith: 4, health: -10 },
          factions: { 米里斯教团: -6 },
          flag: "ml:inquisitor-of-millis:s2:verdict",
          starDelta: { match: "记忆的神子", delta: 1, note: "她在你脸上看到了不该看到的东西，没有说" },
          notice: "你在记忆阅览里按住了一段。那个女孩子替你摇了头。",
        },
      },
      {
        id: "refuse",
        label: "不肯坐下去，要求见教皇",
        risk: "高",
        lines: [
          "你把椅子推开，说了句要见教皇。门外的骑士进了半步。",
          "枢机卿抬手让他们退下，然后说：你见不到他，但你可以走了。",
        ],
        outcome: {
          stats: { faith: 6, int: 5, fame: 4, charm: -4, scheme: 3 },
          factions: { 米里斯教团: -8 },
          flag: "ml:inquisitor-of-millis:s2:verdict",
          notice: "你在侧厅里拒绝受审，要求见教皇。你走出来了，档案上多了一行。",
        },
      },
    ],
  },
  {
    id: "ml-inquisitor-of-millis-s3",
    mainlineId: "inquisitor-of-millis",
    title: "卷宗上该怎么写",
    weight: 1.5,
    when: (s) =>
      after(s, "ml-inquisitor-of-millis-s2") && before(s, "ml-inquisitor-of-millis-s3"),
    body: [
      "第一个被带进来的人是个中年男人，罪名是与魔族通婚。他一句话也不说。",
      "他家里的两个名字你已经问出来了，写不写进卷宗由你决定。",
      "书记在旁边站着，说了句：写到他不开口就够了。",
    ],
    options: [
      {
        id: "plain",
        label: "照规矩写",
        risk: "低",
        lines: [
          "你把罪名、口供和日期一条条写清楚，写成一份挑不出错的卷宗。",
          "他后来被判了。判得不算重，只是不许再回原来的村子。",
        ],
        outcome: {
          stats: { int: 6, scheme: 5, faith: 6, charm: -3 },
          factions: { 米里斯教团: 10 },
          flag: "ml:inquisitor-of-millis:s3:record",
          notice: "你按规矩写完了第一份卷宗。这个人在纸上成了一个案子。",
        },
      },
      {
        id: "light",
        label: "往轻里写，把那两个名字隐掉",
        risk: "中",
        lines: [
          "你在卷宗的最后加了一行很轻的注，说明此人系受人牵连。",
          "书记看了一眼，什么也没说，把卷宗收走了。",
        ],
        outcome: {
          stats: { int: 6, scheme: 7, faith: 4, charm: 4 },
          factions: { 米里斯教团: 4 },
          flag: "ml:inquisitor-of-millis:s3:record",
          notice: "你把一份卷宗往轻里写了。这件事只有你和那个人知道。",
        },
      },
      {
        id: "hard",
        label: "把听到的全写上去，让案子办得干净",
        risk: "中",
        lines: [
          "你把那两个名字也写了进去。第二天，神殿骑士团去了那个村子。",
          "卷宗被夸了一句写得好。夸的人是个你不太想认识的人。",
        ],
        outcome: {
          stats: { int: 7, scheme: 6, faith: 5, fame: 5, charm: -6 },
          factions: { 米里斯教团: 14 },
          flag: "ml:inquisitor-of-millis:s3:record",
          notice: "你把该写的全写了。审判庭开始把更重的案子交给你。",
        },
      },
    ],
  },
  {
    id: "ml-inquisitor-of-millis-s4",
    mainlineId: "inquisitor-of-millis",
    title: "不肯开口的人",
    weight: 1.6,
    when: (s) =>
      after(s, "ml-inquisitor-of-millis:s3") && before(s, "ml-inquisitor-of-millis-s4"),
    body: [
      "关人的屋子在侧院最里面，窗子很高。他被指控窝藏魔族，也可能只是不肯替自己辩解。",
      "枢机卿要的是能写进卷宗的结论。那个女孩子已经被叫来了。",
      "书记把笔蘸好，等你开口。",
    ],
    options: [
      {
        id: "read",
        label: "按教团的意思办，让他被读",
        risk: "中",
        lines: [
          "记忆阅览花了半个时辰。他被读完之后，整个人像塌下去一层。",
          "卷宗上有了结论。这个结论是对的，你没有办法说它不对。",
        ],
        outcome: {
          stats: { int: 5, scheme: 6, faith: 6, fame: 5, charm: -4 },
          factions: { 米里斯教团: 14 },
          flag: "ml:inquisitor-of-millis:s4:trial",
          notice: "你按教团的意思办了这一桩。卷宗上的结论挑不出错。",
        },
      },
      {
        id: "shield",
        label: "替他担下这一次，把案子压回重审",
        risk: "高",
        lines: [
          "你把卷宗退回去，写了一份重审的意见，压在三个人手里。",
          "枢机卿看了半天，最后盖了重审的印。这一桩拖了两年。",
        ],
        outcome: {
          stats: { int: 6, scheme: 7, faith: 6, fame: 4, health: -6 },
          factions: { 米里斯教团: -8 },
          flag: "ml:inquisitor-of-millis:s4:trial",
          goal: 8,
          notice: "你把这一桩案子压了回去。你在审判庭里第一次没有照办。",
        },
      },
      {
        id: "up",
        label: "把这件事捅到教皇那里",
        risk: "高",
        lines: [
          "你把卷宗和旧案的抄本一并递到了教皇的书房。",
          "三天后，这一桩被从审判庭抽走了。抽走的时候没有人通知你。",
        ],
        outcome: {
          stats: { int: 7, scheme: 8, faith: 4, fame: 6, charm: -5 },
          factions: { 米里斯教团: 4 },
          flag: "ml:inquisitor-of-millis:s4:trial",
          notice: "你把案子捅到了教皇那里。审判庭里有人从此把你算作外人。",
        },
      },
    ],
  },
  {
    id: "ml-inquisitor-of-millis-s5",
    mainlineId: "inquisitor-of-millis",
    title: "最后一行",
    weight: 1.7,
    when: (s) =>
      after(s, "ml-inquisitor-of-millis:s4") && before(s, "ml-inquisitor-of-millis-s5"),
    body: [
      "新名单送来的那天，书记先看了一遍，然后把纸翻过去放在桌上。",
      "第一页上有十几个名字。最后一行是你，写在最底下，用的墨和上面的不一样。",
      "外面在下雨。侧厅的灯点得比平时早。",
    ],
    options: [
      {
        id: "stay",
        label: "留在审判庭，把名单上的事办完",
        risk: "中",
        lines: [
          "你把手印按在了名单上，照旧做记录，照旧写卷宗。",
          "最后那十几个名字里，有四个被放回去了。你自己那一个从头到尾没有人念。",
        ],
        outcome: {
          stats: { int: 6, scheme: 8, faith: 6, fame: 6, charm: -6 },
          factions: { 米里斯教团: 12 },
          flag: "ml:inquisitor-of-millis:s5:answer",
          notice: "你留在了审判庭，把名单上的事办完了。你自己那一行没有人念。",
        },
      },
      {
        id: "stand",
        label: "站到被审的人那一边去",
        risk: "高",
        lines: [
          "你在布告栏前把经手的案子和名单的来路一条条说了出来。",
          "没有人拦你。听到一半的时候，有几个人悄悄退开了。",
        ],
        outcome: {
          stats: { faith: 8, fame: 10, charm: 6, scheme: -4, health: -8 },
          factions: { 米里斯教团: -14 },
          flag: "ml:inquisitor-of-millis:s5:answer",
          goal: 8,
          notice: "你站到了被审的人那一边。米里斯的布告栏前第一次有人这么说话。",
        },
      },
      {
        id: "out",
        label: "弃教，走出大圣堂",
        risk: "中",
        lines: [
          "你把登记名册上的名字划掉了，把钥匙放在了桌上。",
          "出城的时候雨停了。城门口的人问你去哪儿，你说不知道。",
        ],
        outcome: {
          stats: { int: 6, scheme: 6, faith: -14, charm: 4, fame: -4 },
          factions: { 米里斯教团: -18 },
          flag: "ml:inquisitor-of-millis:s5:answer",
          goal: 6,
          notice: "你划掉了自己的名字，走出了米里希昂。",
        },
      },
    ],
  },

  /* ---------- 米里斯的圣女候选 ---------- */
  {
    id: "ml-saintess-of-millis-s1",
    mainlineId: "saintess-of-millis",
    title: "谁把你写上去的",
    weight: 1.4,
    when: (s) => before(s, "ml-saintess-of-millis-s1") && !flagOn(s, "ml:saintess-of-millis:s1:done"),
    body: [
      "候选名单挂在侧厅外面的走廊上。你的名字后面注着两个字：可用。",
      "注解的笔迹和名单上其它名字的笔迹不是同一支笔。",
      "递话的人来了，只带了一句话：别做多余的事。",
    ],
    options: [
      {
        id: "join",
        label: "顺着这句话去找那个人",
        risk: "中",
        lines: [
          "你花了些日子，把侧院里递话的人一层层认了出来，认到第三层就停住了。",
          "停住的地方坐着一位外派的枢机。他没有否认，也没有承认。",
        ],
        outcome: {
          stats: { scheme: 7, int: 5, faith: 5, charm: 3 },
          factions: { 米里斯教团: 8 },
          flag: "ml:saintess-of-millis:s1:patron",
          notice: "你找到了把你写进名单的人：一位外派的枢机。",
        },
      },
      {
        id: "neutral",
        label: "谁也不靠，先把自己立在信众面前",
        risk: "中",
        lines: [
          "你把侧院里的应酬都推了，天天去教区做事。",
          "几个月后，街上认得你的人比侧院里多。",
        ],
        outcome: {
          stats: { faith: 7, charm: 7, fame: 5, scheme: 3 },
          flag: "ml:saintess-of-millis:s1:patron",
          notice: "你没有投靠谁，把力气花在了信众身上。",
        },
      },
      {
        id: "own",
        label: "想办法让举你的人换个说法",
        risk: "高",
        lines: [
          "你在一次弥撒之后主动留下，让该看见你的人看见了你。",
          "第二天名单上你那两个字被人描粗了一遍。",
        ],
        outcome: {
          stats: { scheme: 7, charm: 6, faith: 4, fame: 4 },
          factions: { 米里斯教团: 6 },
          flag: "ml:saintess-of-millis:s1:patron",
          notice: "你让举你的人重新掂量了你一次。名单上你那两个字被描粗了。",
        },
      },
    ],
  },
  {
    id: "ml-saintess-of-millis-s2",
    mainlineId: "saintess-of-millis",
    title: "廊下那件东西",
    weight: 1.5,
    when: (s) =>
      after(s, "ml-saintess-of-millis:s1") && before(s, "ml-saintess-of-millis:s2"),
    body: [
      "布道完了，宴会散了。有人在廊下等你，把一件东西放在你手里就退开了。",
      "是一枚很旧的米里斯像章，背面刻着一个家族的记号。",
      "他没留名字。这件事会有第三个人知道。",
    ],
    options: [
      {
        id: "keep",
        label: "收下，谁都不说",
        risk: "中",
        lines: [
          "你把像章收在内衬里，回米里希昂的车上一次都没有拿出来。",
          "半个月后有人递话问你东西还在不在。你答还在。",
        ],
        outcome: {
          stats: { scheme: 8, int: 5, charm: 4, faith: -3 },
          flag: "ml:saintess-of-millis:s2:gift",
          notice: "你收下了一枚来路不明的像章，没有告诉任何人。",
        },
      },
      {
        id: "return",
        label: "退回去，让人看见你退了",
        risk: "中",
        lines: [
          "你在第二天弥撒之后当着几个人的面把像章交还给了教会。",
          "交出去的时候，有一双眼睛一直在看你。那双眼睛你认得。",
        ],
        outcome: {
          stats: { faith: 8, charm: 5, fame: 5, scheme: -3 },
          factions: { 米里斯教团: 12 },
          flag: "ml:saintess-of-millis:s2:gift",
          notice: "你当着人的面把像章退了回去。教团里有人因此高看你一眼。",
        },
      },
      {
        id: "report",
        label: "收下，然后原样交给举你的人",
        risk: "高",
        lines: [
          "你把像章和廊下那件事一并报了上去。递话的人第二天就换了一个。",
          "报完之后你才知道，送你东西的那一位，和举你的人本来就不对付。",
        ],
        outcome: {
          stats: { scheme: 8, int: 6, fame: 4, charm: -4, faith: 4 },
          factions: { 米里斯教团: 8 },
          flag: "ml:saintess-of-millis:s2:gift",
          notice: "你把像章交给了举你的人。两派之间的那条线，你踩上去了一次。",
        },
      },
    ],
  },
  {
    id: "ml-saintess-of-millis-s3",
    mainlineId: "saintess-of-millis",
    title: "两份文稿",
    weight: 1.5,
    when: (s) =>
      after(s, "ml-saintess-of-millis:s2") && before(s, "ml-saintess-of-millis:s3"),
    body: [
      "两份文稿同一天送到你屋里，用同一种纸，字迹不同。",
      "一份说魔族是本世代的祸根，一份说米里斯看的是一夫一妻，不是血统。",
      "送稿的两个人都在门外等回话。你只能先见一个。",
    ],
    options: [
      {
        id: "hard",
        label: "念强硬派那一份",
        risk: "中",
        lines: [
          "你念了那一份。台下的人听得很齐，掌声也齐。",
          "另一份文稿第二天被人从你屋里取走了。取走的时候没有打招呼。",
        ],
        outcome: {
          stats: { faith: 6, charm: 6, fame: 6, int: 4, scheme: -3 },
          factions: { 米里斯教团: 10 },
          flag: "ml:saintess-of-millis:s3:homily",
          notice: "你念了强硬派的那一份文稿。教团里有一半人因此对你放心。",
        },
      },
      {
        id: "soft",
        label: "念教皇那一份",
        risk: "高",
        lines: [
          "你念了那一份。念到「血统」两个字的时候，台下有人低声议论。",
          "散场之后，有三位枢机没有过来跟你说话。",
        ],
        outcome: {
          stats: { faith: 8, int: 5, charm: 4, fame: 4, scheme: 3 },
          factions: { 米里斯教团: -6 },
          flag: "ml:saintess-of-millis:s3:homily",
          notice: "你念了教皇那一份文稿。教团里有一半人因此记住了你。",
        },
      },
      {
        id: "neither",
        label: "两份都不念，说自己只念祷词",
        risk: "高",
        lines: [
          "你在台上只念了祷词，念完之后就下去了。",
          "两派都没有得到想要的东西。散场时有人在你背后说了句：聪明。",
        ],
        outcome: {
          stats: { faith: 6, int: 7, scheme: 8, charm: -3 },
          factions: { 米里斯教团: -4 },
          flag: "ml:saintess-of-millis:s3:homily",
          goal: 7,
          notice: "你两份文稿都没有念。两派都记住了你这个举动。",
        },
      },
    ],
  },
  {
    id: "ml-saintess-of-millis-s4",
    mainlineId: "saintess-of-millis",
    title: "立仪式的前一夜",
    weight: 1.6,
    when: (s) =>
      after(s, "ml:saintess-of-millis:s3") && before(s, "ml-saintess-of-millis:s4"),
    body: [
      "名单上还剩三个人。其中一个在仪式前一天被查出与魔族有过往来。",
      "她的屋子灯一直亮着。你把这一年的每一件事排开，排到一半就找到了那个巧合。",
      "白衣已经挂在你的门上。",
    ],
    options: [
      {
        id: "take",
        label: "什么也不做，把冠接下来",
        risk: "中",
        lines: [
          "第二天仪式照常办。三个人的名单变成了两个，结果公布的时候掌声很整齐。",
          "戴冠的老修女在你耳边说了一句：以后少说话。",
        ],
        outcome: {
          stats: { faith: 7, charm: 7, fame: 8, scheme: 5, health: -2 },
          factions: { 米里斯教团: 12 },
          flag: "ml:saintess-of-millis:s4:eve",
          notice: "立仪式的前一夜过去了。名单上少了一个人，冠落在了你头上。",
        },
      },
      {
        id: "speak",
        label: "替她说话，把那条罪名的来路摆出来",
        risk: "高",
        lines: [
          "你在仪式前把查到的东西交给了教皇的书房，也交给了两位枢机。",
          "仪式推迟了半个月。她没有戴上冠，你也没有。",
        ],
        outcome: {
          stats: { faith: 8, int: 6, scheme: 7, fame: 6, charm: -6, health: -6 },
          factions: { 米里斯教团: -10 },
          flag: "ml:saintess-of-millis:s4:eve",
          goal: 8,
          notice: "你替另一位候选说了话。仪式推迟了，冠谁也没有拿到。",
        },
      },
      {
        id: "bargain",
        label: "把这件事当成价钱，跟举你的人谈",
        risk: "高",
        lines: [
          "你把查到的东西摆在桌上，提了一个条件：教区的事由你自己定。",
          "对方想了很久，然后说可以。条件里没有一句提到那位候选。",
        ],
        outcome: {
          stats: { scheme: 10, int: 6, fame: 5, faith: 4, charm: -4 },
          factions: { 米里斯教团: 8 },
          flag: "ml:saintess-of-millis:s4:eve",
          notice: "你用这件事换来了一个条件。教区的手从此松了一点。",
        },
      },
    ],
  },
  {
    id: "ml-saintess-of-millis-s5",
    mainlineId: "saintess-of-millis",
    title: "钟响之前",
    weight: 1.7,
    when: (s) =>
      after(s, "ml:saintess-of-millis:s4") && before(s, "ml-saintess-of-millis:s5"),
    body: [
      "仪式的钟还没响。冠在台上的托盘里，盖着一块白布。",
      "稿子在你的袖子里。教团要你在台上宣布那件事：与魔族对话的提议被驳回了。",
      "台下站着教团全部的重量。台阶两侧是神子亲卫队。",
    ],
    options: [
      {
        id: "read",
        label: "照稿子念，把冠戴上",
        risk: "中",
        lines: [
          "你念完了那一份，一个字没有改。冠戴上来的时候，台下响起了掌声。",
          "散场之后你回到侧院，把袖子里那份稿子烧了。",
        ],
        outcome: {
          stats: { faith: 8, charm: 8, fame: 10, scheme: 5, int: 4 },
          factions: { 米里斯教团: 16 },
          flag: "ml:saintess-of-millis:s5:crown",
          notice: "你在仪式上照稿念完，戴上了冠。",
        },
      },
      {
        id: "amend",
        label: "念完稿子，最后自己加一句",
        risk: "高",
        lines: [
          "你念完了稿子，然后在所有人面前加了一句：教区的事，我会亲自去。",
          "这句话不在稿子上。台下静了一息，然后有人开始鼓掌，鼓得比刚才久。",
        ],
        outcome: {
          stats: { faith: 8, charm: 8, fame: 8, int: 5, scheme: -4 },
          factions: { 米里斯教团: 6 },
          flag: "ml:saintess-of-millis:s5:crown",
          goal: 8,
          notice: "你在仪式上加了一句自己的话。教团替你记下了这一句。",
        },
      },
      {
        id: "refuse",
        label: "把冠推回去，把稿子留在台上",
        risk: "高",
        lines: [
          "你把冠放回托盘，把稿子压在它旁边，然后走下了台。",
          "没有人拦你。走到门口的时候，钟响了。",
        ],
        outcome: {
          stats: { faith: 6, int: 7, scheme: 6, charm: -6, fame: 4 },
          factions: { 米里斯教团: -14 },
          flag: "ml:saintess-of-millis:s5:crown",
          notice: "你把冠推了回去。这是大圣堂很多年没有发生过的事。",
        },
      },
    ],
  },
];

/* ==================================================================== *
 * 章 节 → 事 件 / flag 对 照 表
 *
 * 引擎自动写的两个 flag：
 *   进入第 n 章 → ml:<主线id>:<章id>
 *   走完第 n 章 → ml:<主线id>:<章id>:done
 * 本文件额外写的 flag（除 `…:in` 之外，每一个都至少被设置一次）：
 *
 * 剑之圣地的叛逆者（blade-of-the-holy-land，5 章 / 5 事件）
 *   s1 门外的人      事件 ml-blade-of-holy-land-s1
 *                    设置 ml:blade-of-the-holy-land:s1:in（onEnter）
 *                         ml:blade-of-the-holy-land:s1:noticed（s1 事件三个选项）
 *                         ml:blade-of-the-holy-land:s1:done（onComplete）
 *   s2 木刀之后      事件 ml-blade-of-holy-land-s2
 *                    enter 用 s1:done + 事件 s1
 *                    设置 …:s2:in（onEnter）、…:s2:duel-won（s2 事件三个选项）、…:s2:done
 *   s3 门里多出来的脚印  事件 ml-blade-of-holy-land-s3
 *                    设置 …:s3:in、…:s3:reported（s3 事件三个选项）、…:s3:done
 *   s4 刀要交给谁    事件 ml-blade-of-holy-land-s4
 *                    设置 …:s4:in、…:s4:stance（s4 事件三个选项）、…:s4:done
 *   s5 剑神祭上的一场 事件 ml-blade-of-holy-land-s5
 *                    设置 …:s5:in、…:s5:answer（s5 事件三个选项）、…:s5:done
 *                        …:s5:fought（quest q2 的 done 条件；由「战斗」场景的预设指令结算后写入）
 *
 * 水神流的行刑人（executioner-of-the-water-god，5 章 / 5 事件）
 *   s1 介绍人        事件 ml-executioner-of-the-water-god-s1  → …:s1:in / …:s1:accepted / …:s1:done
 *   s2 第一次奉命    事件 ml-executioner-of-the-water-god-s2  → …:s2:in / …:s2:first-blood / …:s2:done
 *   s3 那个人不是他要的名字 事件 …-s3                        → …:s3:in / …:s3:line / …:s3:done
 *   s4 教团的传票    事件 …-s4                                → …:s4:in / …:s4:testimony / …:s4:done
 *   s5 名单上的最后一个名字 事件 …-s5                         → …:s5:in / …:s5:survived / …:s5:answer / …:s5:done
 *
 * 北神流的流浪剑客（driftblade-of-the-north，5 章 / 5 事件）
 *   s1 路上的第一课  事件 ml-driftblade-of-the-north-s1       → …:s1:in / …:s1:lead / …:s1:done
 *   s2 拉潘的地底    事件 …-s2                                → …:s2:in / …:s2:proof / …:s2:done
 *   s3 龙鸣山的风    事件 …-s3                                → …:s3:in / …:s3:vow / …:s3:done
 *   s4 西隆的那把刀  事件 …-s4                                → …:s4:in / …:s4:meeting / …:s4:done
 *   s5 沙海边上的一场 事件 …-s5                               → …:s5:in / …:s5:fought / …:s5:answer / …:s5:done
 *
 * 米里斯的异端审判（inquisitor-of-millis，5 章 / 5 事件）
 *   s1 名单上的一个名字 事件 ml-inquisitor-of-millis-s1        → …:s1:in / …:s1:stance / …:s1:done
 *   s2 桌子两边       事件 …-s2                               → …:s2:in / …:s2:verdict / …:s2:done
 *   s3 站在记录的人那一边 事件 …-s3                           → …:s3:in / …:s3:record / …:s3:done
 *   s4 不肯开口的人   事件 …-s4                               → …:s4:in / …:s4:trial / …:s4:done
 *   s5 名单的最后一行 事件 …-s5                               → …:s5:in / …:s5:answer / …:s5:done
 *
 * 米里斯的圣女候选（saintess-of-millis，5 章 / 5 事件）
 *   s1 披上白衣       事件 ml-saintess-of-millis-s1          → …:s1:in / …:s1:patron / …:s1:done
 *   s2 第一次站到人前 事件 …-s2                               → …:s2:in / …:s2:gift / …:s2:done
 *   s3 两套说法       事件 …-s3                               → …:s3:in / …:s3:homily / …:s3:done
 *   s4 立圣女的前一夜 事件 …-s4                               → …:s4:in / …:s4:eve / …:s4:done
 *   s5 冠与绳         事件 …-s5                               → …:s5:in / …:s5:crown / …:s5:answer / …:s5:done
 * ==================================================================== */
