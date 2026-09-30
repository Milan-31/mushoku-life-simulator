import type { MainlineDef, MainlineEventDef } from "./types";

/**
 * 主线数据 · 第四包。
 *
 * 五条线，各自写一种「代价」：
 * - 无咏唱的异端：学术与突破。代价是被人当成资料。
 * - 商会的旗子：谋生与权钱。代价是庇护的价码。
 * - 西隆的旗：战争与佣兵。代价是那条命令与那笔抚恤。
 * - 被诅咒的血脉：血脉与诅咒。代价是身体不属于自己。
 * - 另一个世界的影子：同乡与时间。代价是回不去这件事本身。
 *
 * 时间一律用相对时间（monthsIn、deadlineMonths）与自己的 flag，
 * 绝对年份只在 onlyEras 已经把时代锁死的「另一个世界的影子」里出现。
 * 本文件不引用 engine 里的任何东西：判定条件全是数据。
 */
export const MAINLINES_PACK4: MainlineDef[] = [
  /* ================================================================== *
   * 一 · 无咏唱的异端
   * ================================================================== */
  {
    id: "the-chantless-heretic",
    name: "无咏唱的异端",
    theme: "学术与突破",
    tagline: "魔术的规矩是可以咏唱，可以不咏唱的人却必须解释自己。",
    fit:
      "适合魔力与智力都不算差、又不肯把咏唱背熟的主角。学生、特别生、自学出身的乡下来的魔术师都行。" +
      "这一条线里没有反派，只有流程：登记、审查、撤回、署名。",
    tags: {
      origins: ["拉诺亚魔法大学学生", "平民/农家子弟", "转生者"],
      talents: ["无咏唱施法", "强大魔力", "炼金术天赋"],
      places: ["魔法都市夏利亚", "拉诺亚王国"],
      styles: ["魔法大学日常", "混合模式"],
    },
    prologue: [
      "夏利亚的城墙不高，塔却高得不像话——魔术公会的塔，魔法大学的钟楼，还有一排整夜不熄的窗。",
      "入学登记的那张表上有一栏写着「咏唱熟练度」。你在那一栏画了条横线，柜台的人抬头看了你一眼。",
      "他什么也没说，把表收走了。第二天，教务处多了一个只在纸上存在的名字。",
      "你二十一岁，钱袋里有三十枚银币，脑子里有一堆没人肯听的术式。",
    ],
    stages: [
      {
        id: "heretic-1",
        title: "第一章 · 名分",
        premise:
          "你不是学生，也不是公会的术士，只是城里一个会在街角把手一抬就点着火的人。夏利亚可以容忍这种人，前提是这种人别太多。",
        objective: "在夏利亚落下脚，并且让学校的名册上有你的一行。",
        guidance: [
          "去魔法都市夏利亚，先解决住处——大学外的那几排出租屋按月收钱，不问你从哪儿来。",
          "在魔法大学的讲堂里坐满一个月，哪怕你不上课，也把教授们说话的方式记下来。",
          "去书库与研究室把咏唱式的写法抄一遍，你要知道自己绕开的是哪一门语法。",
          "上魔术公会的塔问一次特别生的名分，把「观察期」这三个字问清楚是什么意思。",
          "找一个愿意让你旁听实验的人。在这个城里，没人带你，你连门都进不去。",
        ],
        quests: [
          {
            id: "heretic-1-arrive",
            label: "在夏利亚住满一个月",
            hint: "先有住的地方，才有别的。旅馆按周算钱，住满一个月就开始划算。",
            done: { residence: ["魔法都市夏利亚"], monthsIn: 1 },
          },
          {
            id: "heretic-1-study",
            label: "在讲堂与书库待够",
            hint: "去大学听课、去书库研读，都是本地就能做的事。智力要到 40，魔力要到 40。",
            done: { anyStats: { int: 40, mana: 40 } },
          },
          {
            id: "heretic-1-spark",
            label: "练成第一手能拿出手的魔术",
            hint: "练习咏唱与法阵，或者请教授示范一次。手上没有真东西，没人会跟你谈术式。",
            done: { anySkill: ["mg_chantless", "mg_stone_cannon", "mg_ice_break", "mg_deep_mist", "mg_healing"] },
          },
          {
            id: "heretic-1-tie",
            label: "认识一个愿意在这件事上替你说话的人",
            hint: "和同学来往、请教授示范，都会攒下交情。在这座城里，一个人替你说一句话，比十页论文管用。",
            done: { relation: { name: "", minStars: 2 } },
          },
        ],
        enter: {},
        onEnter: {
          lines: [
            "你到夏利亚的第三天下了一场雨。塔尖在雨里看不出高低。",
            "登记处的队伍排到门外，前面的人都在背咏唱。你把手插在袖子里，一个字也没背。",
            "轮到你了。你在「咏唱熟练度」那一栏画了条横线。",
          ],
          effects: {
            stats: { int: 5, mana: 4, fame: 2 },
            goal: 3,
            factions: { 魔法大学: 5, 魔术公会: 3 },
            flag: "ml:the-chantless-heretic:1:sharia",
          },
          commands: [
            {
              name: "魔法都市夏利亚",
              desc: "报名处的队伍、塔下的石板路，和一间按月收钱的旧屋。",
              commands: [
                {
                  label: "去报名处填一张入学登记",
                  category: "学术",
                  cost: 12,
                  hint: "表上有一栏问你的咏唱熟练度。怎么填，你自己定。",
                  lines: [
                    "表格有三页，第二页要你写「主修系统」。你写了两个系统，柜台的人划掉一个。",
                    "他把回执递给你时，多看了你一眼，那一眼是记人的方式。",
                  ],
                  effects: { stats: { int: 4, fame: 2 }, tier: { kind: "magic", gain: 6 }, factions: { 魔法大学: 6 }, goal: 2 },
                },
              ],
            },
            {
              name: "书库与研究室",
              desc: "纸的味道、天光、翻页声。有人在这儿用一辈子换一页纸。",
              commands: [
                {
                  label: "抄一遍最基础的咏唱式",
                  category: "学术",
                  cost: 12,
                  hint: "你要绕开的正是这一门语法，所以得先把它抄熟。",
                  lines: [
                    "一段咏唱三十七个音节，其中十几个是可以省掉的。这个发现不算新，但你第一次自己数出来。",
                    "你把数出来的地方圈上，圈了整整两页。",
                  ],
                  effects: { stats: { int: 6, mana: 3 }, tier: { kind: "magic", gain: 8 }, goal: 3 },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "教务处的名册上多了一行你的名字，旁边注着「观察期一年」。",
            "同一个星期，公会的塔里给你开了一份临时登记，编号写在铜牌背面。",
            "你把铜牌放进口袋，走到讲堂外面。台阶上有人在念咏唱，念得很熟，一个字都没错。",
          ],
          effects: {
            stats: { int: 6, mana: 4, fame: 3 },
            goal: 5,
            factions: { 魔法大学: 8, 魔术公会: 4 },
            flag: "ml:the-chantless-heretic:1:enrolled",
          },
          rumor: "夏利亚的报名处传出一个说法：今年有个学生在咏唱熟练度那一栏画了条横线。",
        },
        event: "ml4-heretic-entrance",
      },
      {
        id: "heretic-2",
        title: "第二章 · 混成",
        premise:
          "你把两个系统扣在一起用，效果比任何单系都好。问题在于，公会的教学大纲里没有这一栏，也没有人能给你出教学许可。",
        objective: "把混成的做法做成一份能被人读懂的记录，并且找到一个不打算告发你的人。",
        guidance: [
          "在书库与研究室里做验证。混成不是灵感，是把两个术式的起手时间对齐。",
          "大学里有一位教授，讲义每年只改两页，研究室向学生开放，却从不发表。去找他。",
          "偷看禁书区里那段被人涂掉的记载——那里写着几十年前有人做过同样的事，以及那个人的下场。",
          "把实验做在城外。城里有记录仪式的习惯，有些动静不该留在记录里。",
          "找一两个能替你打掩护的同学。你一个人做不完，也瞒不住。",
        ],
        quests: [
          {
            id: "heretic-2-lab",
            label: "做够实验",
            hint: "书库与研究室里的做实验与验证、研读一整月都算。智力要到 48。",
            done: { stats: { int: 48 }, monthsIn: 4 },
          },
          {
            id: "heretic-2-mix",
            label: "把两个系统扣成一发",
            hint: "练成混成魔术，或者练到不必开口就能发动。前者要两个系统都到中级。",
            done: { anySkill: ["mg_mud_swamp", "mg_stone_cannon", "mg_chantless", "mg_disturb"] },
          },
          {
            id: "heretic-2-prof",
            label: "和那位不肯发表的教授说上话",
            hint: "多去听课、请教授示范、和同学来往。交情攒到两颗星，他才肯把研究室的门留一条缝。",
            done: { relation: { name: "", minStars: 2 }, anyStats: { int: 50, charm: 30 } },
          },
          {
            id: "heretic-2-record",
            label: "把做法写成别人能照着做的东西",
            hint: "写下你自己的记法。这一步在书库做，做完了这一章才算有着落。",
            done: { flag: "ml:the-chantless-heretic:2:notes" },
          },
        ],
        enter: {
          any: [
            { flag: "ml:the-chantless-heretic:1:enrolled" },
            { anyStats: { int: 45, mana: 45 } },
          ],
          residence: ["魔法都市夏利亚", "拉诺亚王国"],
          monthsIn: 2,
        },
        deadlineMonths: 30,
        onEnter: {
          lines: [
            "你把两个术式的起手对齐了。第三十一次，泥和石头一起出来，落在同一个点上。",
            "……原来可以这样。",
            "那天晚上你写到天亮，写完又把纸揉了——纸上的说法太像咏唱式，别人照着做不出来。",
          ],
          effects: {
            stats: { int: 8, mana: 5, scheme: 3 },
            goal: 6,
            factions: { 魔法大学: 4 },
            flag: "ml:the-chantless-heretic:2:lab",
          },
          commands: [
            {
              name: "书库与研究室",
              desc: "这一层的灯到后半夜只剩两盏，其中一盏在你桌上。",
              commands: [
                {
                  label: "把两个系统扣在一起试一次",
                  category: "学术",
                  cost: 18,
                  hint: "混成的关键不是威力，是两发之间那半息。",
                  lines: [
                    "你按抄下来的顺序起手，中间没有停。两个系统在同一个位置上合上了。",
                    "隔壁桌的人抬起头，你把手放下来，装作在整理纸。",
                  ],
                  effects: { stats: { mana: 5, int: 6 }, tier: { kind: "magic", gain: 12 }, goal: 4 },
                },
                {
                  label: "验证一遍别人做不出来的那一步",
                  category: "学术",
                  cost: 16,
                  hint: "把做不到的地方单独拎出来，反复做，直到你知道它为什么做不到。",
                  lines: [
                    "你让三个同学照着你的纸试，三个都失败，失败的位置完全一样。",
                    "那一步不是手的问题，是他们心里还在数音节。",
                  ],
                  effects: { stats: { int: 8, mana: 4, charm: 2 }, tier: { kind: "magic", gain: 8 }, goal: 3 },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "那位教授把你的纸看了两遍，第二遍看得很慢。",
            "「这个我不能署名。」他说，「但你可以。」",
            "他把自己的研究室钥匙留在了桌上，锁着的那一格他没提。",
          ],
          effects: {
            stats: { int: 9, mana: 5, scheme: 4 },
            goal: 6,
            factions: { 魔法大学: 6, 魔术公会: -3 },
            flag: "ml:the-chantless-heretic:2:notes",
          },
        },
        event: "ml4-heretic-experiment",
      },
      {
        id: "heretic-3",
        title: "第三章 · 登记",
        premise:
          "公会的规矩很朴素：凡是要教的魔术，都得先登记。你去登记了。三个月后回话来了，说这份术式「不宜列入教学」，并请你在回执上签个名字。",
        objective: "把术式挂到公会的墙上，同时弄清是谁在往回按。",
        guidance: [
          "上魔术公会的塔正式递一次登记，把每一份回执都留着，编号抄两份。",
          "在夏利亚与拉诺亚之间跑几趟。这件事不只在夏利亚办得了。",
          "请能说话的人替你说话。教授、同学、同乡，谁愿意开口就找谁。",
          "去王都亚尔斯打听一次。魔术公会与宫廷之间那点分歧，在王都比在塔里好问。",
          "把你要说的话写成三句，背下来。审查席上没人有耐心听第四句。",
        ],
        quests: [
          {
            id: "heretic-3-file",
            label: "把术式递进公会的流程",
            hint: "在魔术公会的塔里办事、上塔办事都算。这件事要跑腿，也要脸面。",
            done: { flag: "ml:the-chantless-heretic:3:filed" },
          },
          {
            id: "heretic-3-name",
            label: "攒够愿意替你说话的人",
            hint: "魅力三十、声望二十五，各处的宴会与同行酒桌都得去坐。没人替你说话，回执只会越来越客气。",
            done: { anyStats: { charm: 30, fame: 25 } },
          },
          {
            id: "heretic-3-backer",
            label: "找一个肯背书的去处",
            hint: "大学或公会，选一边站。智力到 55 也就够了——审查也看值不值得为你得罪人。",
            done: { anyStats: { int: 55, fame: 30 } },
          },
        ],
        enter: {
          any: [
            { flag: "ml:the-chantless-heretic:2:notes" },
            { anyStats: { int: 55, fame: 25 } },
          ],
          monthsIn: 4,
        },
        deadlineMonths: 24,
        onEnter: {
          lines: [
            "递文件的那天要交三个铜币的手续费，收据上写着「学术审查」。",
            "你在走廊里等了两个上午，见到的第三个人问你：「这一手教出去，出了事谁负责。」",
            "你答不上来。回去的路上你想了一路，想到的答案是：谁也负不了。",
          ],
          effects: {
            stats: { int: 6, scheme: 4, fame: -2 },
            goal: 5,
            factions: { 魔术公会: -4, 魔法大学: 3 },
            flag: "ml:the-chantless-heretic:3:filed",
          },
          commands: [
            {
              name: "魔法都市夏利亚",
              desc: "公会的塔在城北，上去的台阶一共一百二十七级。",
              commands: [
                {
                  label: "把术式正式递进公会的登记处",
                  category: "学术",
                  cost: 14,
                  hint: "你会拿到一个编号，编号将来有用。",
                  lines: [
                    "你把三页纸和一份回执递上去。柜台的人按流程翻到最后一页，盖了个很小的章。",
                    "编号是四位数字。你抄了两份，一份放在家里，一份缝进衣服内衬。",
                  ],
                  effects: { stats: { int: 4, scheme: 5, fame: 2 }, factions: { 魔术公会: 5 }, goal: 3 },
                },
                {
                  label: "在登记处门口等一次回话",
                  category: "社交",
                  cost: 10,
                  hint: "递完东西得等。等着的时候，你能看清谁在替谁跑腿。",
                  lines: [
                    "你在走廊上坐了两天，看清了七个人进出的顺序。",
                    "有一份文件被人从后门送进去，再没出来。",
                  ],
                  effects: { stats: { scheme: 5, int: 3, charm: 2 }, goal: 2 },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "回话说：术式可以留在公会档案里，但不列入教学。你可以继续用，不能教。",
            "你把回执收好。同时有人递了一张纸过来，上面是一位上级审查官的名字。",
            "「他明年退。」递纸的人说，「你的术式在他那儿压了两年。」",
          ],
          effects: {
            stats: { int: 7, scheme: 6, fame: 3, faith: -2 },
            goal: 6,
            factions: { 魔术公会: -6, 魔法大学: 4 },
            flag: "ml:the-chantless-heretic:3:refused",
          },
        },
        event: "ml4-heretic-registry",
      },
      {
        id: "heretic-4",
        title: "第四章 · 抄本",
        premise:
          "回绝你的那位审查官退了，接手的人比你年轻，也比你好说话。他给了一条路：把术式交上来，署名写两个，他可以替你把教学许可办下来。",
        objective: "在署名这件事上拿定主意，然后把实验接着做下去——不管有没有许可。",
        guidance: [
          "把三年来所有的实验记录重抄一遍，按日期排。这是你唯一拿得出手的东西。",
          "去禁书区翻那段被涂掉的记载。几十年里做过同一件事的人不止你一个。",
          "城外的实验场地要重新找。上次那个位置已经有人在看了。",
          "别停下来。你一旦停下来，公会那份档案就成了他们唯一记得的东西。",
          "顺带看看自己的身子。熬夜和魔力透支都记账，账单到期时会一起送来。",
        ],
        quests: [
          {
            id: "heretic-4-lab",
            label: "把实验接着做下去",
            hint: "做实验与验证、依据文献修正术式，或者干脆练到不必开口。你得一直在做这件事。",
            done: {
              any: [
                { flag: "ml:the-chantless-heretic:4:understood" },
                { anySkill: ["mg_chantless", "mg_frost_nova", "mg_electric"] },
              ],
            },
          },
          {
            id: "heretic-4-read",
            label: "把被涂掉的那段读完",
            hint: "禁书区、抄录不外传的东西、翻书架最里面那一层，都算。智力要到 58。",
            done: { stats: { int: 58 }, monthsIn: 6 },
          },
          {
            id: "heretic-4-body",
            label: "把自己的身体撑住",
            hint: "在家歇上一个月、在教会静养、在营地休整都行。健康要留在 35 以上。",
            done: { stats: { health: 35 } },
          },
        ],
        enter: {
          any: [
            { flag: "ml:the-chantless-heretic:3:refused" },
            { flag: "ml:the-chantless-heretic:3:copied" },
          ],
          monthsIn: 6,
        },
        deadlineMonths: 36,
        onEnter: {
          lines: [
            "接手的人姓什么你没听清，只听清他要一个共同署名。",
            "你回去把三年的记录摞起来，摞起来的高度比桌子上的灯还高。",
            "「共同署名。」你把这句话在心里念了一遍，念出来的时候发现是问句。",
          ],
          effects: {
            stats: { int: 8, scheme: 5, health: -4 },
            goal: 6,
            factions: { 魔术公会: 4, 魔法大学: -3 },
            flag: "ml:the-chantless-heretic:4:understood",
          },
          commands: [
            {
              name: "书库与研究室",
              desc: "你把研究室的门反锁过一次，第二天就有人来问你锁坏了没有。",
              commands: [
                {
                  label: "在没有记录的地方重做一遍实验",
                  category: "隐秘",
                  cost: 18,
                  hint: "城里做实验会留下记录。这一次不留。",
                  lines: [
                    "你出城走了半里地，在一片没有路的坡上把东西摊开。",
                    "做到了第七次，成功的那一发没有旁观的人，你自己看见了，就够了。",
                  ],
                  effects: { stats: { int: 5, mana: 7, scheme: 5 }, tier: { kind: "magic", gain: 14 }, goal: 4 },
                },
                {
                  label: "把三年的记录按日期重排一遍",
                  category: "学术",
                  cost: 12,
                  hint: "排完之后你会发现，最难的那一步其实是第二年的冬天。",
                  lines: [
                    "纸按日期铺了一地，铺到墙角。你蹲在中间看了一夜。",
                    "第二年冬天有三个月是空的——那三个月你在给人跑腿换饭吃。",
                  ],
                  effects: { stats: { int: 8, scheme: 3 }, tier: { kind: "magic", gain: 8 }, goal: 3 },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "你没把术式交上去，也没让谁署名。",
            "你带着抄本离开了夏利亚一趟，回来的时候城里已经有了关于你的两种说法，一种比一种难听。",
            "公会那份档案还在。编号没变。",
          ],
          effects: {
            stats: { int: 8, scheme: 6, fame: 5, faith: -2 },
            goal: 7,
            factions: { 魔术公会: -8, 魔法大学: 6 },
            flag: "ml:the-chantless-heretic:4:pressed",
          },
        },
        event: "ml4-heretic-signature",
      },
      {
        id: "heretic-5",
        title: "第五章 · 公开",
        premise:
          "你可以去王都亚尔斯，那里认名字比认术式多；也可以去拉诺亚的王宫，那里的国王和公会共治一座城，两边都想在自己手里多一件东西。",
        objective: "当众放一次谁都能看见的魔术，然后决定这份东西算谁的。",
        guidance: [
          "去王都亚尔斯或拉诺亚王国。要谈署名，就得在能谈署名的地方谈。",
          "找一位贵族或者王室的人来看。他们要的未必是术式，多半是一个可以被记住的名字。",
          "在公开场合放一次。别挑小的放——你只有一次机会让人闭嘴。",
          "留一份抄本在别人手里。你死了，抄本还活着，这才是你真正要的东西。",
          "准备好被追问。有人会问你师承，有人会问你为什么不早说，还有人会问你是不是转过生。",
        ],
        quests: [
          {
            id: "heretic-5-city",
            label: "走到能谈这件事的地方",
            hint: "王都亚尔斯，或者拉诺亚王国。在夏利亚你已经谈完了。",
            done: { residence: ["王都亚尔斯", "拉诺亚王国"] },
          },
          {
            id: "heretic-5-patron",
            label: "找一个肯站在台下的名字",
            hint: "参加宴会、在贵族圈里周旋、接一份王国挂出的委托。他们出的是庇护，你出的是让人看的场面。",
            done: { anyStats: { charm: 40, fame: 40 }, flag: "ml:the-chantless-heretic:5:patron" },
          },
          {
            id: "heretic-5-live",
            label: "当众放一次",
            hint: "在公开场合演示。做完这一步，这条线的路就走到头了。",
            done: { flag: "ml:the-chantless-heretic:5:claim" },
          },
        ],
        enter: {
          any: [
            { flag: "ml:the-chantless-heretic:4:pressed" },
            { anyStats: { int: 65, fame: 45 } },
          ],
          monthsIn: 6,
        },
        deadlineMonths: 24,
        onEnter: {
          lines: [
            "亚尔斯的石板路比夏利亚宽，马车也多。你在这里没有熟人，只有一份抄本和一个编号。",
            "你被人引荐进一间不算大的厅。厅里坐了十几个人，有三个人是真懂魔术的。",
            "你把抄本拿出来的时候，手是稳的。",
          ],
          effects: {
            stats: { charm: 5, scheme: 5, int: 4, fame: 4 },
            goal: 6,
            factions: { 阿斯拉王国: 8, 魔法大学: 4 },
            flag: "ml:the-chantless-heretic:5:patron",
          },
          commands: [
            {
              name: "王都亚尔斯",
              desc: "王都的每句话都压着第二层。你只需要管住第一层。",
              commands: [
                {
                  label: "在一间不算大的厅里放一次",
                  category: "学术",
                  cost: 16,
                  hint: "演示三发：一发火，一发石，一发两样一起。第三发不必解释。",
                  lines: [
                    "第三发落下去，桌上的杯子跳了一下。懂的那三个人先是没出声。",
                    "「再放一次。」其中一个说。你放了。",
                  ],
                  effects: { stats: { fame: 8, int: 5, mana: 4 }, tier: { kind: "magic", gain: 10 }, factions: { 阿斯拉王国: 6 }, goal: 4 },
                },
                {
                  label: "把抄本留一份在别人手里",
                  category: "隐秘",
                  cost: 10,
                  hint: "抄本在别人手里，你才算真的写过这份东西。",
                  lines: [
                    "你把一份抄本交给了一个跟这件事没有利害关系的人，交代他别弄丢。",
                    "他问你要不要写个收据，你说不用。",
                  ],
                  effects: { stats: { scheme: 6, int: 4 }, goal: 4, notice: "你的一份术式抄本，现在在别人手里。" },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "演示之后的第十一天，魔术公会撤回了那份「不宜列入教学」的回执。",
            "新回执上的措辞改成了「暂缓审定」。没有编号，也没有署名。",
            "有人在走廊上跟你打招呼，用的是你的名字。你花了几步路才想起来自己确实叫这个名字。",
          ],
          effects: {
            stats: { fame: 12, int: 6, charm: 5 },
            goal: 8,
            factions: { 魔术公会: 8, 魔法大学: 6, 阿斯拉王国: 4 },
            flag: "ml:the-chantless-heretic:5:claim",
          },
          rumor: "关于「有一个不用开口就能放魔术的人」，王都和夏利亚各传了一版，两版对不上。",
        },
        event: "ml4-heretic-public",
      },
    ],
    endings: {
      done:
        "你的术式进了档案，署名只有你一个人。往后十几年里，夏利亚的讲堂上偶尔有人提起那一栏被画掉的横线。你教过两个学生，第二个学得比你当年快。代价是你这辈子都会被当成一页纸来引用，而不是一个人。",
      partial:
        "你在半路上停了。回执还压在公会档案里，抄本还在你抽屉最下面。后来你换过几个地方住，每次都把那三页纸带上。它们始终没能变成别人的东西。",
      failed:
        "你没能走到那间厅里。有人替你把这件事讲了出去，讲得比你本来要讲的圆熟得多，署名是别人的。你活着，也还在放那一手，只是不再提它叫什么。",
    },
  },

  /* ================================================================== *
   * 二 · 商会的旗子
   * ================================================================== */
  {
    id: "greyrat-and-company",
    name: "商会的旗子",
    theme: "谋生与权钱",
    tagline: "从七颗鸡蛋到一块招牌，中间隔着一本账和一份庇护的价目。",
    fit:
      "适合把价钱算得比剑快的主角。平民、农家子弟、退下来的冒险者都行。" +
      "这一条线里，生意靠的是账本、欠条、伙计与一次押错的货，不是天赋。",
    tags: {
      origins: ["平民/农家子弟", "冒险者出身", "阿斯拉王国贵族子弟"],
      talents: ["商业嗅觉", "语言天赋", "贵族血统"],
      places: ["布耶纳村", "罗亚町", "王都亚尔斯"],
      styles: ["日常人生", "极度现实"],
    },
    prologue: [
      "布耶纳村的集市一个月开四次，第一次你带了七颗鸡蛋去，回来的时候手里是一小把铜币。",
      "你把铜币倒在床上数了两遍，第三遍数出少了一枚——路上掉了。",
      "罗亚町的价钱是村里的三倍，王都亚尔斯的价钱是罗亚的三倍，路费也差不多是三倍。",
      "这段人生从一枚掉在路上的铜币开始。",
    ],
    stages: [
      {
        id: "greyrat-1",
        title: "第一章 · 七颗鸡蛋",
        premise:
          "本钱少到没法做错任何一笔。你要先弄清楚这一带什么东西贵、什么东西能存、什么东西摆在摊上也没人问。",
        objective: "把第一笔像样的本钱攒出来，并且让别人记住你卖的东西。",
        guidance: [
          "去集市摆摊做点生意。摆摊不丢人，丢人的是摊子上没有一样是别人非买不可的。",
          "和邻里闲聊，问清这一带谁家收什么、什么季节缺什么。",
          "打听附近的传闻。商路上出事，多半是有人先知道了。",
          "照看家里的活计。本钱不够的时候，家里的东西也算本钱。",
          "记账。第一天就记。哪怕只是一本用炭写的旧账。",
        ],
        quests: [
          {
            id: "greyrat-1-stall",
            label: "把摊子摆起来",
            hint: "在布耶纳村或罗亚町的集市摆摊做点生意，攒下第一笔钱。",
            done: { anyStats: { wealth: 120, charm: 20 } },
          },
          {
            id: "greyrat-1-news",
            label: "把这一带的价问清楚",
            hint: "和邻里闲聊、打听附近的传闻、听墙角都行。密谋到 20 就算问明白了。",
            done: { anyStats: { scheme: 20, int: 25 } },
          },
          {
            id: "greyrat-1-book",
            label: "记下你的第一本账",
            hint: "货物进出、谁欠谁多少，都写在上面。写完这一本，你才算在做生意。",
            // 两条路：在集市上把这本账起个头，或者靠买卖做出这一带的头一笔本钱
            done: { any: [{ flag: "ml:greyrat-and-company:1:ledger" }, { anyStats: { wealth: 150 } }] },
          },
        ],
        enter: {},
        onEnter: {
          lines: [
            "第一批货是七颗鸡蛋和一捆晒干的草药。鸡蛋碎了两个，草药没人要。",
            "你把剩下的卖掉，钱袋里有二十四枚铜币。",
            "回家路上你算了一遍：按这个速度，攒够一间铺子的本钱要六年。",
          ],
          effects: {
            stats: { wealth: 60, charm: 4, scheme: 3 },
            goal: 3,
            factions: { 冒险者公会: 2 },
            flag: "ml:greyrat-and-company:1:started",
          },
          commands: [
            {
              name: "布耶纳村",
              desc: "麦田、牲口、驻在骑士的院子。这里的事没人记，也没人停。",
              commands: [
                {
                  label: "把家里的余粮挑去村口换成货",
                  category: "谋生",
                  cost: 12,
                  hint: "以物换物赚得少，但不用先有本钱。",
                  lines: [
                    "两袋麦子换了一筐鸡蛋和一把铁钉。铁钉在村里比鸡蛋好卖。",
                    "回来的时候你多绕了一段路，去看了看另一个村口的价钱。",
                  ],
                  effects: { stats: { wealth: 55, scheme: 3, int: 2 }, goal: 2 },
                },
              ],
            },
            {
              name: "罗亚町",
              desc: "领首府的价钱硬，买家的脸色也硬。",
              commands: [
                {
                  label: "在罗亚的集市上试一试水",
                  category: "谋生",
                  cost: 14,
                  hint: "第一次带外地货进罗亚，先带容易出手的那一种。",
                  lines: [
                    "你把货摆在城里人叫「下市口」的位置，那里摊位费最便宜。",
                    "一个上午卖掉一半。剩下的半筐，你换了明天的摊位钱。",
                  ],
                  effects: { stats: { wealth: 95, charm: 3, scheme: 3 }, goal: 3 },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "你的第一本账写到第十九页，最后一页记着一笔欠款：村东头老裁缝欠你十一枚铜币，欠了四十天。",
            "他去还钱那天带了半个饼，说下个月还。你说不用还了，改天给我做件褂子。",
            "这笔账最后没亏。你后来把它抄进了新账本的第一页。",
          ],
          effects: {
            stats: { wealth: 120, charm: 5, scheme: 4, int: 3 },
            goal: 5,
            flag: "ml:greyrat-and-company:1:ledger",
          },
          rumor: "村里开始有人说，那家的孩子拿鸡蛋倒过几手，居然攒下了钱。",
        },
        event: "ml4-company-firstcoin",
      },
      {
        id: "greyrat-2",
        title: "第二章 · 罗亚的铺面",
        premise:
          "罗亚町的好处是人多、钱多、货通；坏处是这里的商人早就在一张桌上坐了几十年，新来的要么交学费，要么被挤出去。",
        objective: "在罗亚或更大的城里立住一间铺子，并且弄明白谁在定这一行的价。",
        guidance: [
          "在镇上盘一间铺子。盘下来只是开始，地点比价钱重要。",
          "在罗亚的集市做买卖，反复做，摸清三种货的差价。",
          "雇一个伙计。你一个人守不住摊子，也跑不了外路。",
          "打听伯雷亚斯家的事。这一带的商路，一半以上要经过伯雷亚斯家的地。",
          "和本地的商人打过一次交道之后，记住他们的脸。将来你会需要这笔账。",
        ],
        quests: [
          {
            id: "greyrat-2-shop",
            label: "把铺子盘下来",
            hint: "在镇上盘一间铺子，本钱要两百，也要有人肯卖给你。",
            done: { anyStats: { wealth: 200 }, monthsIn: 3 },
          },
          {
            id: "greyrat-2-network",
            label: "认识两个做生意的人",
            hint: "在集市做买卖、和邻里闲聊、和同行喝酒。交情攒到两颗星，他们才会在缺货的时候先想到你。",
            done: { relation: { name: "", minStars: 2 }, anyStats: { charm: 30, scheme: 30 } },
          },
          {
            id: "greyrat-2-route",
            label: "弄清哪条路是伯雷亚斯家的",
            hint: "在罗亚打听伯雷亚斯家的事。知道路是谁的，才知道过路钱该给谁。",
            done: { flag: "ml:greyrat-and-company:2:route" },
          },
        ],
        enter: {
          any: [
            { flag: "ml:greyrat-and-company:1:ledger" },
            { anyStats: { wealth: 220 } },
          ],
          residence: ["罗亚町", "布耶纳村", "王都亚尔斯"],
          monthsIn: 2,
        },
        deadlineMonths: 30,
        onEnter: {
          lines: [
            "铺面在下市口往北的第二排，前任主人是个卖布的，欠了半年的摊位钱。",
            "交接那天他把钥匙递过来，钥匙上拴着一块布，布上写着「别接大客户的急单」。",
            "你把布解下来，收进了抽屉。",
          ],
          effects: {
            stats: { wealth: 80, charm: 4, scheme: 5, int: 3 },
            goal: 4,
            flag: "ml:greyrat-and-company:2:shop",
          },
          commands: [
            {
              name: "罗亚町",
              desc: "城墙、宅邸的尖顶、公会的委托板，还有几条不必让人看见的巷子。",
              commands: [
                {
                  label: "给铺子找一条比市价便宜的进货路",
                  category: "谋生",
                  cost: 14,
                  hint: "便宜的路都在城外。走一趟，谈成算你的。",
                  lines: [
                    "你在一处村口谈定了按季收的价钱，比城里低两成。",
                    "代价是先付一半定金，货要自己拉。",
                  ],
                  effects: { stats: { wealth: 110, scheme: 4, int: 3 }, goal: 3 },
                },
                {
                  label: "雇一个伙计并把账教给他看",
                  category: "谋生",
                  cost: 16,
                  hint: "伙计要能替你收钱，也要看得懂你写的账。",
                  lines: [
                    "来的孩子十四岁，识得几个字，算钱比你快。",
                    "你把账本翻开，教他先看欠款那一页。",
                  ],
                  effects: { stats: { wealth: 70, charm: 5, int: 3 }, goal: 3, notice: "你的铺子有了第一个伙计。" },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "铺子开到第三个月，你发现真正替你带来客人不是货，是那本放在柜台上、谁都能翻的账。",
            "同一条街上的另外两家铺子开始跟着你调价。调得很小心，一次几枚铜币。",
            "第一次有人上门跟你谈「一起定个价」，你请他在柜台前坐下，给他倒了水。",
          ],
          effects: {
            stats: { wealth: 160, charm: 6, scheme: 6, fame: 4 },
            goal: 6,
            flag: "ml:greyrat-and-company:2:route",
          },
        },
        event: "ml4-company-shop",
      },
      {
        id: "greyrat-3",
        title: "第三章 · 一支商队",
        premise:
          "一间铺子只能挣一条街的钱。要走远路就得有车、有伙计、有能对付路霸的人，还得有人替你在路上打点。",
        objective: "凑出第一支能跑长途的商队，或者加入一个已经跑起来的。",
        guidance: [
          "在西隆王国或拉诺亚王国一带做买卖。远路的价钱比近路高得多。",
          "在冒险者公会的委托板上找护送。价钱谈不拢的时候，先谈路线。",
          "路上会有人来收钱。想清楚给多少：给多了养肥他们，给少了一次都不够亏。",
          "账本上留一栏给损耗。没有损耗栏的账，两个月就会开始骗你自己。",
          "找扎诺巴商会那样的买家。他们要的量稳，给的价也稳。",
        ],
        quests: [
          {
            id: "greyrat-3-caravan",
            label: "让第一趟车队走出去",
            hint: "接下护送委托、在集市做买卖、在西隆的工房里做东西攒货。你得先有一车能卖的东西。",
            done: { anyStats: { wealth: 450 }, flag: "ml:greyrat-and-company:3:caravan" },
          },
          {
            id: "greyrat-3-guard",
            label: "把路上的事安排下来",
            hint: "冒险者等级到 E，或者剑术声望够看。商队不是兵器，但路上总得有人站着。",
            done: { any: [{ adventurerRank: "E" }, { anyStats: { fame: 40, sword: 30 } }] },
          },
          {
            id: "greyrat-3-loss",
            label: "经历一次亏本的货",
            hint: "押错一次货。这一栏你必须自己填上，否则你不知道账该怎么改。",
            done: { flag: "ml:greyrat-and-company:3:loss" },
          },
        ],
        enter: {
          any: [
            { flag: "ml:greyrat-and-company:2:route" },
            { anyStats: { wealth: 350, fame: 30 } },
          ],
          monthsIn: 4,
        },
        deadlineMonths: 36,
        onEnter: {
          lines: [
            "第一趟出车是三辆板车，八个人，两头拉车的牲口。",
            "出城的那一段路是石板，走得稳；过了第三个村口就是泥，泥里插着半截车轴——上个月翻的那辆。",
            "你坐在最后一辆车上，手里攥着账本。这一趟的本钱是全部。",
          ],
          effects: {
            stats: { wealth: 120, scheme: 6, int: 4, health: -4 },
            goal: 5,
            flag: "ml:greyrat-and-company:3:caravan",
          },
          commands: [
            {
              name: "西隆王国",
              desc: "王宫的墙很厚，街上的人很少抬头。这里的货便宜，路基差。",
              commands: [
                {
                  label: "跟一趟长途车队走完全程",
                  category: "冒险",
                  cost: 24,
                  hint: "全程大约两个月。赚多少看运气，亏多少看你自己。",
                  lines: [
                    "第三程遇上倒春寒，两头牲口病了一头。你把那批最容易坏的东西先卖掉了。",
                    "到地方的时候，车还是三辆，人少了一个。那一个人是自己走的，走之前拿了两袋干粮。",
                  ],
                  effects: { stats: { wealth: 260, scheme: 7, health: -6, int: 4 }, tier: { kind: "adventure", gain: 12 }, goal: 5 },
                },
                {
                  label: "和路上收钱的人谈一次价钱",
                  category: "隐秘",
                  cost: 14,
                  hint: "他们收的不是税。谈得下来，往后这一段就安生。",
                  lines: [
                    "对方来了四个人，坐在路边的石头上，其中一个始终没开口。",
                    "你报的数目比他要的低三成，加一句「以后每趟都从你这儿过」。他想了很久，点了头。",
                  ],
                  effects: { stats: { scheme: 8, charm: 4, wealth: -60 }, goal: 4 },
                },
              ],
            },
            {
              name: "西隆王国",
              desc: "工房里的手艺人不问你要做什么，只问你要多少。",
              commands: [
                {
                  label: "在工房里订一批能卖出去的货",
                  category: "谋生",
                  cost: 16,
                  hint: "订的货要卖得掉，不要好看。",
                  lines: [
                    "你订了三百件铁件，规格按买家给的样子做。",
                    "工头把样子纸退回来，改了两处，说照你原来的做，卖不出第二次。",
                  ],
                  effects: { stats: { wealth: 170, int: 5, scheme: 3 }, goal: 3 },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "第二趟回来的时候，你账上的损耗栏里写着：一车草药、半车陶器、一个伙计的抚恤。",
            "那批草药是你自己押的。本钱压在上面的时候，天气就是你的合伙人。",
            "你把这三行抄到了账本最前面，往后每趟出发前都要先看一眼。",
          ],
          effects: {
            stats: { wealth: -80, scheme: 9, int: 6, fame: 4, health: -3 },
            goal: 7,
            flag: "ml:greyrat-and-company:3:loss",
          },
        },
        event: "ml4-company-road",
      },
      {
        id: "greyrat-4",
        title: "第四章 · 庇护的价钱",
        premise:
          "你的招牌在王都挂起来了。挂起来之后就会有人来告诉你：在这一带做生意，得先有个人替你说话。那个人不要你的钱，他要你的一部分。",
        objective: "拿到庇护，并且算清楚它每年要拿走多少。",
        guidance: [
          "去王都亚尔斯。贵族的门房看的是你的鞋，不是你的话。",
          "在王都做本钱上的事。做大了才有人来找你，太小的时候连被剥削的资格都没有。",
          "参加宴会、在贵族圈里周旋。这一行的规矩写在人的脸上，不写在纸上。",
          "接一份贵族私下的委托。做完这一件，你才算被算进去。",
          "把每一笔「人情」都记成账。不记的话，你会在某一年发现自己欠了一大笔不知道从哪来的钱。",
        ],
        quests: [
          {
            id: "greyrat-4-court",
            label: "在王都站住",
            hint: "在王都亚尔斯做本钱上的事、参加宴会。本钱到六百，站不住的人拿不出这个数。",
            done: { residence: ["王都亚尔斯"], anyStats: { wealth: 600, fame: 45 } },
          },
          {
            id: "greyrat-4-patron",
            label: "找到一个愿意署名的人",
            hint: "在贵族圈里周旋、在某个派系里做事。魅力四十以上，才轮得到你被打量。",
            done: { flag: "ml:greyrat-and-company:4:patron" },
          },
          {
            id: "greyrat-4-cut",
            label: "算清他每年拿多少",
            hint: "把人情记成账。做完这一步，庇护就不再是恩情，是一笔开支。",
            done: { flag: "ml:greyrat-and-company:4:cut" },
          },
        ],
        enter: {
          any: [
            { flag: "ml:greyrat-and-company:3:loss" },
            { anyStats: { wealth: 700, fame: 50 } },
          ],
          monthsIn: 6,
        },
        deadlineMonths: 30,
        onEnter: {
          lines: [
            "王都的铺面比罗亚贵四倍，招牌挂上去的时候要交一笔「门面钱」。",
            "第三天有人上门，说大人的管事想见你一面，时间定在后天下午。",
            "你问是哪位大人。来人笑了笑，说见了就知道。",
          ],
          effects: {
            stats: { wealth: 200, charm: 6, scheme: 7, fame: 5 },
            goal: 6,
            factions: { 阿斯拉王国: 10 },
            flag: "ml:greyrat-and-company:4:patron",
          },
          commands: [
            {
              name: "王都亚尔斯",
              desc: "石板路、马车、穿制服的门房。每句话都压着第二层。",
              commands: [
                {
                  label: "和管事把分成谈成一条一条",
                  category: "谋生",
                  cost: 16,
                  hint: "谈成条文，比谈成情分管用。",
                  lines: [
                    "管事拿出一张纸，上面是空白的几条，留给你填。",
                    "「第一年不要你的，第二年一半。」他念了一条，你说三条。谈到傍晚，四条。",
                  ],
                  effects: { stats: { scheme: 9, int: 5, wealth: -100 }, goal: 5, factions: { 阿斯拉王国: 8 } },
                },
                {
                  label: "把每一笔人情都记成账",
                  category: "谋生",
                  cost: 10,
                  hint: "人情记进账里，你才知道自己一年送出去多少。",
                  lines: [
                    "新开的一页叫「往来」，左边写送出去的，右边写收回来的。",
                    "写到第六行，你发现收回来的那一栏一直是空的。",
                  ],
                  effects: { stats: { int: 6, scheme: 6 }, goal: 4, notice: "你开始把人情形的东西记成账。" },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "庇护是真的。你的车队从此没在路上被拦过，税卡的人见了招牌就抬手放行。",
            "账簿上多了固定的一页：每季送出去的、每趟让出去的、每年替他垫的。",
            "合起来大约是收入的三成。你把这个数目写下来，看了很久，然后把纸吹干。",
          ],
          effects: {
            stats: { wealth: 260, scheme: 8, int: 5, charm: 4 },
            goal: 8,
            factions: { 阿斯拉王国: 14, 冒险者公会: 4 },
            flag: "ml:greyrat-and-company:4:cut",
          },
        },
        event: "ml4-company-patronage",
      },
      {
        id: "greyrat-5",
        title: "第五章 · 一块招牌",
        premise:
          "你手上终于有了三样东西：一条跑得通的路、一块有人认的招牌、和一个每年拿走三成的人。到该决定这块招牌算谁的时候了。",
        objective: "把招牌变成一份别人无法收回的东西，或者体面地把它卖掉。",
        guidance: [
          "把手上的铺子、车队、欠条、伙计名单重新点一遍。这一行的家底是一张纸，不是一屋子货。",
          "和更大的买家坐到同一张桌上。扎诺巴商会要的是量，王都的贵族要的是名，两样价钱不一样。",
          "在西隆或拉诺亚之间再跑一趟。走得越远，别人越难替掉你。",
          "给伙计留一份。没有这一份，你出事的时候，招牌会跟着你一起没。",
            "最后去一次那位管事的书房。这一次是你去谈，不是被叫去。",
        ],
        quests: [
          {
            id: "greyrat-5-yard",
            label: "把家底点一遍",
            hint: "账本、欠条、伙计、铺子的租期。本钱到九百，才算真有家底。",
            done: { anyStats: { wealth: 900, scheme: 50 } },
          },
          {
            id: "greyrat-5-partner",
            label: "和更大的买家谈成一份约",
            hint: "参加宴席、接一份王国挂出的委托、在西隆的工房里订大货。谈成了这一步，招牌就有了第二个名字。",
            done: { anyStats: { fame: 55, charm: 45 }, flag: "ml:greyrat-and-company:5:partner" },
          },
          {
            id: "greyrat-5-charter",
            label: "把招牌写到纸上",
            hint: "该签的签，该让的让。做完这一步，商会这件事就有结论了。",
            done: { flag: "ml:greyrat-and-company:5:charter" },
          },
        ],
        enter: {
          any: [
            { flag: "ml:greyrat-and-company:4:cut" },
            { anyStats: { wealth: 1100, fame: 60 } },
          ],
          monthsIn: 6,
        },
        deadlineMonths: 48,
        onEnter: {
          lines: [
            "你把三样东西摊在桌上：一张路线图、一本记着欠款的账、一块从门口摘下来的招牌。",
            "欠款那一页加起来，比招牌本身值钱。",
            "这一年你三十四岁，头发里已经有了白的那几根。",
          ],
          effects: {
            stats: { scheme: 8, int: 6, charm: 5, fame: 6, health: -3 },
            goal: 8,
            factions: { 阿斯拉王国: 6, 冒险者公会: 6 },
            flag: "ml:greyrat-and-company:5:partner",
          },
          commands: [
            {
              name: "王都亚尔斯",
              desc: "要在王都立一份字据，得先在王都有一间自己的屋子。",
              commands: [
                {
                  label: "把招牌和股本写成一份字据",
                  category: "谋生",
                  cost: 18,
                  hint: "写清楚谁占多少、谁签字、谁在你不在了的时候接手。",
                  lines: [
                    "你把股本分成十二份，自己留五份，伙计们合起来三份，剩下的给那位管事。",
                    "写字的人问你要不要加一条「后人继承」。你让他加了。",
                  ],
                  effects: { stats: { wealth: 300, scheme: 9, fame: 6, int: 5 }, goal: 6, factions: { 阿斯拉王国: 8 } },
                },
                {
                  label: "给伙计们留一份",
                  category: "社交",
                  cost: 12,
                  hint: "他们跟着你跑了这么多年，得有个说法。",
                  lines: [
                    "你把几个老伙计叫到后院，把那一页念给他们听。",
                    "念完没有人说话。最老的那个把帽子摘下来，在手里攥了半天。",
                  ],
                  effects: { stats: { charm: 8, scheme: 3, wealth: -120 }, goal: 5, starDelta: { match: "", delta: 2, note: "你给了他一份写下来的东西" } },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "字据立了两份，一份在你手上，一份在管事的柜子里。",
            "招牌没有换，还是那块旧木头。只是底下多了一行小字，写着「商会」。",
            "第二年春天，那位管事换了人。新来的人翻了翻柜子，照旧收他那三成。",
            "你站在铺子门口，看车队出城。这一趟车上装的东西，你已经不必亲自押了。",
          ],
          effects: {
            stats: { wealth: 500, scheme: 8, fame: 8, charm: 5 },
            goal: 10,
            factions: { 阿斯拉王国: 10, 冒险者公会: 8, 魔术公会: 4 },
            flag: "ml:greyrat-and-company:5:charter",
          },
        },
        event: "ml4-company-signboard",
      },
    ],
    endings: {
      done:
        "你活着看到了那块招牌变成一份可以传下去的东西。商路、车队、伙计、欠条都有了名字，而名字下面有你签的字。代价写在账本最前面那一页：每年三成，一直付到你死。",
      partial:
        "生意做到了罗亚和王都，也雇得起伙计，却始终没凑齐那份把招牌写下来的心思。你死后第三年，车队散了，招牌被人摘下来卖给了收旧木头的。",
      failed:
        "你押错了最后一批货，亏掉的不只是本钱，还有那位管事对你的耐心。铺子抵了债，伙计各自去找了别的东家。你后来在一支别人的车队里做账，做得很好，也不再多问什么。",
    },
  },

  /* ================================================================== *
   * 三 · 西隆的旗
   * ================================================================== */
  {
    id: "banner-of-shirone",
    name: "西隆的旗",
    theme: "战争与佣兵",
    tagline: "签三年，管饭，月钱四枚银币，阵亡抚恤十二枚。",
    fit:
      "适合剑术或胆量比门路多的主角。佣兵、逃兵、被卷进战场的平民都能走这条线。" +
      "这一条线里没有英雄，只有工钱、命令、同袍和那些没有回来的名字。",
    tags: {
      origins: ["冒险者出身", "平民/农家子弟", "西隆王国贵族"],
      talents: ["军事直觉", "剑术天赋", "斗气感知"],
      places: ["西隆王国", "迷宫都市拉潘"],
      styles: ["冒险史诗", "剑之修行"],
    },
    prologue: [
      "西隆王国的征兵官在镇口的树下摆了一张桌子，桌上压着一叠契约和一枚印章。",
      "契约上写的是：签三年，管饭，月钱四枚银币，阵亡抚恤十二枚。",
      "你签名字的时候，后面有人在催。你把名字写完了，画押，领了一双靴子和一件旧外衣。",
      "靴子大一指，塞了草。后来你塞了三年。",
    ],
    stages: [
      {
        id: "shirone-1",
        title: "第一章 · 编入队列",
        premise:
          "军中的第一课不是怎么杀人，是怎么在泥地里站两个时辰不挪窝，以及怎么记住前后左右四个人的脸。",
        objective: "活过第一个月，让同队的人记住你的名字。",
        guidance: [
          "去西隆王国或迷宫都市拉潘的佣兵营地报到。营地在城外的坡上，旗子是褪色的。",
          "在佣兵营地跟着操练。教官教的都是笨办法，笨办法在泥地里最管用。",
          "和同袍相处。挨过同一场冻的人，才会在你倒下的时候停下来。",
          "找机会参加一场小规模的战斗。不打过，你永远不知道自己站在哪一边。",
          "第一笔月钱别全花在酒上。军中什么都能欠，鞋不能欠。",
        ],
        quests: [
          {
            id: "shirone-1-drill",
            label: "跟着操练，把队列站住",
            hint: "在佣兵营地或王都演武场操练。剑术造诣到 35，或者声望到 25，教官才会记住你。",
            done: { anyStats: { sword: 35, fame: 25 } },
          },
          {
            id: "shirone-1-mates",
            label: "认识一起挨冻的人",
            hint: "和战友相处、在军营里替人顶一班岗。交情攒到两颗星，你才不只是一个编号。",
            done: { relation: { name: "", minStars: 2 }, anyStats: { charm: 25 } },
          },
          {
            id: "shirone-1-first",
            label: "打第一场小的",
            hint: "在佣兵营地参加一场战斗。活着回来就算完成。",
            done: { any: [{ flag: "ml:banner-of-shirone:1:first" }, { adventurerRank: "E" }] },
          },
        ],
        enter: {},
        onEnter: {
          lines: [
            "你被编进第四队，队里十一个人，来自四个地方。",
            "发装备的时候少了一双鞋，管事的让你等下个月。前一个人把自己的旧鞋脱给你：「拿去，我脚上这双还能撑。」",
            "第一夜你睡在草垛上，听见有人在另一头小声念经。",
          ],
          effects: {
            stats: { sword: 5, health: 4, fame: 3 },
            goal: 3,
            factions: { 冒险者公会: 3 },
            flag: "ml:banner-of-shirone:1:enlisted",
          },
          commands: [
            {
              name: "西隆王国",
              desc: "王宫的墙很厚，街上的人很少抬头。城门外的坡上扎着旗。",
              commands: [
                {
                  label: "在营地的空地上把基本动作练到会",
                  category: "修炼",
                  cost: 18,
                  hint: "军中那一套动作丑，但每一动都是为着同一件事：让你活着撑到下一次换班。",
                  lines: [
                    "教习让你把起手做了一百遍，第一百遍他没有再看你。",
                    "你知道那不是不管你，是你已经不用看了。",
                  ],
                  effects: { stats: { sword: 5, health: 3 }, tier: { kind: "sword", gain: 12 }, goal: 3 },
                },
                {
                  label: "在夜里替人值一班岗",
                  category: "社交",
                  cost: 10,
                  hint: "替谁值，谁就欠你一次。军中就是靠这个活下来的。",
                  lines: [
                    "你替一个拉肚子的老兵守了后半夜。他第二天什么也没说，把他的水壶塞给了你。",
                    "水壶是铁的，磕得看不出原来的形状。",
                  ],
                  effects: { stats: { charm: 4, fame: 3, health: -2 }, goal: 2, starDelta: { match: "", delta: 1, note: "你替他守了半夜的岗" } },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "第一次上阵是在边境一处没名字的村子边上，对方是另一支佣兵，打着另一面旗。",
            "打了半天，各自退回原地。你身上多了两道口子，对面大概也一样。",
            "夜里点名，十一个人，回来了十个。",
          ],
          effects: {
            stats: { sword: 6, fame: 6, health: -6 },
            tier: { kind: "sword", gain: 10 },
            goal: 5,
            factions: { 冒险者公会: 4 },
            flag: "ml:banner-of-shirone:1:first",
          },
        },
        event: "ml4-shirone-firstblood",
      },
      {
        id: "shirone-2",
        title: "第二章 · 边村",
        premise:
          "上头把你们派到边境的一处村子，任务是「确保这一段路的安全」。到了以后你发现，这一段路上几乎没人在走。",
        objective: "把这一段的巡逻做完，同时问清楚你们到底在替谁守路。",
        guidance: [
          "跟着队伍完成驻守。操练、巡行、在营地里打探军情都算。",
          "和村子里的老人说话。他们记得三十年前的边界画在哪儿。",
          "在营地打听调度。知道下一仗在哪儿打，比会打更重要。",
          "把你的剑练上去。这一段安静的月份是最好的修炼时间。",
          "记住你队里每一个人的名字。这件事在最后会变得很重要。",
        ],
        quests: [
          {
            id: "shirone-2-post",
            label: "把驻守做完",
            hint: "在佣兵营地操练和打探军情，或者接几件附近的委托。驻守满半年就算做完。",
            done: { anyStats: { fame: 35, sword: 40 }, monthsIn: 6 },
          },
          {
            id: "shirone-2-ask",
            label: "问清这段路在替谁守",
            hint: "在营地里打探军情与调度，或者和村里的人说话。密谋到 35 就够拼出轮廓。",
            done: { anyStats: { scheme: 35, int: 30 } },
          },
          {
            id: "shirone-2-arm",
            label: "把剑练到能带一个人回来",
            hint: "剑术到中级以上，才有资格在退的时候把别人拖走。",
            done: { any: [{ flag: "ml:banner-of-shirone:2:post" }, { anyStats: { sword: 50 } }] },
          },
        ],
        enter: {
          any: [{ flag: "ml:banner-of-shirone:1:first" }, { anyStats: { fame: 30, sword: 35 } }],
          monthsIn: 3,
        },
        deadlineMonths: 24,
        onEnter: {
          lines: [
            "边村有十四户人家，水井在村北，井绳是新换的。",
            "你们驻扎在村口的一座旧磨坊里。磨盘早就不转了，底层铺上草，睡八个人。",
            "第三天你问村里的老人这段路通向哪儿。他说通向一个已经不存在的关口。",
          ],
          effects: {
            stats: { sword: 4, scheme: 4, health: 3, fame: 4 },
            goal: 4,
            flag: "ml:banner-of-shirone:2:post",
          },
          commands: [
            {
              name: "西隆王国",
              desc: "旧磨坊、褪色的旗、十四户人家和一条没什么人走的路。",
              commands: [
                {
                  label: "把这一段路从头到尾走一遍",
                  category: "探索",
                  cost: 14,
                  hint: "用脚量一遍，比在地图上看十遍有用。",
                  lines: [
                    "你走了三天，记下三处能设伏的地方和两处塌方。",
                    "回来你把这些画在磨坊的墙上，教习看了一眼，什么也没说，第二天把它抄走了。",
                  ],
                  effects: { stats: { int: 5, scheme: 6, health: -3 }, tier: { kind: "adventure", gain: 10 }, goal: 3 },
                },
                {
                  label: "和村里的老人坐到天黑",
                  category: "社交",
                  cost: 10,
                  hint: "他们记得的事，军中的档案里没有。",
                  lines: [
                    "老人说三十年前这个关口还在，收过路钱的是本地人。",
                    "「后来上面换了两回旗，钱还是那些人收。」他说完就去喂牲口了。",
                  ],
                  effects: { stats: { scheme: 6, int: 4, charm: 3 }, goal: 3 },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "驻守的第七个月，上面来了一道命令：整队北上，去一个你在地图上找了三遍才找到的地方。",
            "走的那天，村里只有老人出来送。他给了你们一筐干粮，说路上吃。",
            "你把自己的名字和队里十个人的名字都记在了靴子里侧。写得很小。",
          ],
          effects: {
            stats: { scheme: 6, sword: 5, fame: 5, charm: 4 },
            goal: 5,
            factions: { 冒险者公会: 4 },
            flag: "ml:banner-of-shirone:2:march",
          },
        },
        event: "ml4-shirone-village",
      },
      {
        id: "shirone-3",
        title: "第三章 · 伍长",
        premise:
          "你被提成了伍长，管十个人。工钱多了一枚银币，夜里睡不着的时间多了两个时辰。上头给你的任务是「把路口堵住，不放一个人过去」。",
        objective: "带着这十个人打一场像样的仗，然后活着把人带回来。",
        guidance: [
          "在佣兵营地跟着操练，把这十个人的动作练到一致。队形不齐，第一个死的是最前面那个。",
          "主动去接最苦的那一段活儿。伍长的位置不是靠抢来的，是靠站在最前面站出来的。",
          "打探军情与调度。你要在开打之前知道自己被放在哪一块。",
          "把伤员处理后送。打了这么多年，你至少学会了一件事：抬人的和砍人的一样重要。",
          "死掉的人要登记名字。这件事没人催，但总得有人做。",
        ],
        quests: [
          {
            id: "shirone-3-lead",
            label: "把这十个人练成一支队",
            hint: "操练、和战友相处、在演武场从早练到晚。声望到 45，剑术到 55，队伍才像队伍。",
            done: { anyStats: { fame: 45, sword: 55 } },
          },
          {
            id: "shirone-3-fight",
            label: "打一场你被点名负责的仗",
            hint: "在佣兵营地参加一场战斗，或者接一件高出自己一级的委托。这一仗你得自己扛。",
            done: { any: [{ flag: "ml:banner-of-shirone:3:line" }, { adventurerRank: "D" }] },
          },
          {
            id: "shirone-3-roll",
            label: "把死人登记下来",
            hint: "在营地里打探军情的时候顺带做。这一页写满了，你就会开始问为什么要打。",
            done: { anyStats: { int: 40, scheme: 40 }, monthsIn: 4 },
          },
        ],
        enter: {
          any: [{ flag: "ml:banner-of-shirone:2:march" }, { anyStats: { fame: 40, sword: 45 } }],
          monthsIn: 4,
        },
        deadlineMonths: 30,
        onEnter: {
          lines: [
            "你把十个人排成两列，排了半个上午才排齐。",
            "这一仗的地形是一片收割过的麦地，麦茬扎脚，跑起来会绊。",
            "号声响的时候，你前面那一段路口上还没有人。",
          ],
          effects: {
            stats: { sword: 6, fame: 7, scheme: 4, health: -5 },
            tier: { kind: "sword", gain: 10 },
            goal: 6,
            factions: { 冒险者公会: 5 },
            flag: "ml:banner-of-shirone:3:line",
          },
          commands: [
            {
              name: "西隆王国",
              desc: "麦地、麦茬、号声，和你身后那十个人。",
              commands: [
                {
                  label: "把自己放在队伍最前面那一步",
                  category: "战斗",
                  cost: 26,
                  hint: "伍长站在哪儿，队形就长成什么样。",
                  lines: [
                    "你站在最前面半步，那半步是留给自己的。",
                    "对面冲上来的第一排人踩进麦茬，慢了一瞬。就这一瞬。",
                  ],
                  effects: { stats: { sword: 6, fame: 8, health: -8 }, tier: { kind: "sword", gain: 14 }, goal: 6 },
                },
                {
                  label: "亲自把伤员往后抬",
                  category: "社交",
                  cost: 16,
                  hint: "抬人的和砍人的一样重要，而且抬人的活得久一点。",
                  lines: [
                    "你背了一个走了半里地，放下的时候他还有气。",
                    "第二个抬到一半就凉了。你把他放在路边，先记下名字，回来再收。",
                  ],
                  effects: { stats: { charm: 6, fame: 5, scheme: 3, health: -4 }, goal: 5, starDelta: { match: "", delta: 2, note: "你把他从麦地里背了出来" } },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "十个人回来了七个。三个的名字你写在靴子内侧，写在了自己名字的下面。",
            "抚恤金是十二枚银币一个。管事的说名单要报到上面去核，核完再发。",
            "核了四个月。有个人的妻子来了两趟，第二趟带着孩子。",
          ],
          effects: {
            stats: { fame: 8, sword: 5, scheme: 6, faith: -3, health: -4 },
            goal: 7,
            factions: { 冒险者公会: 5, 阿斯拉王国: -3 },
            flag: "ml:banner-of-shirone:3:lost",
          },
        },
        event: "ml4-shirone-payroll",
      },
      {
        id: "shirone-4",
        title: "第四章 · 不该打的仗",
        premise:
          "命令下来了：越过界石，把对面那个村子烧掉。理由是那里藏着对方的粮。你看过那个村子，村里只有老人、井和一座磨坊。",
        objective: "在这一道命令上做出决定，并且承受它的后果。",
        guidance: [
          "先去把命令核实一遍。军令从上面往下传，会在某一层被改写，改写的人通常不署名。",
          "在营地里打探军情与调度，弄清这一仗是谁要打。",
          "把队里的人一个一个问过去。你至少要知道谁跟你走，谁不走。",
          "把话直接说到上面去。说完之后无论结果如何，你都不会再是从前那个人。",
          "准备好退路。抗命和逃兵之间只隔着一条河。",
        ],
        quests: [
          {
            id: "shirone-4-check",
            label: "把这道命令的来路查清楚",
            hint: "在营地里打探军情与调度。密谋到 45，你才看得到改写命令的那一层。",
            done: { anyStats: { scheme: 45, int: 40 } },
          },
          {
            id: "shirone-4-refuse",
            label: "做出你的选择",
            hint: "当面回绝，或者半路把队伍带偏。两条路都要付代价。",
            done: { flag: "ml:banner-of-shirone:4:refused" },
          },
          {
            id: "shirone-4-out",
            label: "活着从那一段路上出来",
            hint: "打一场，或者退一场。健康要留在 30 以上，声望不能掉到底。",
            done: { any: [{ anyStats: { health: 30, fame: 35 } }, { flag: "ml:banner-of-shirone:4:desert" }] },
          },
        ],
        enter: {
          any: [
            { flag: "ml:banner-of-shirone:3:lost" },
            { anyStats: { fame: 55, sword: 60 } },
          ],
          monthsIn: 4,
        },
        deadlineMonths: 18,
        onEnter: {
          lines: [
            "命令上盖着两个章，第一个章你认得，第二个章你不认得。",
            "你把那张纸对着灯看了一遍：粮仓的位置画得极准，村子的位置画得极糙。",
            "传令的人催你出发，说天黑之前要到。",
          ],
          effects: {
            stats: { scheme: 7, int: 6, faith: -3, fame: 3 },
            goal: 6,
            flag: "ml:banner-of-shirone:4:hungry",
          },
          commands: [
            {
              name: "西隆王国",
              desc: "两个章的军令、一道界石、一个只有老人和井的村子。",
              commands: [
                {
                  label: "把队伍带到界石这一侧停住",
                  category: "战斗",
                  cost: 24,
                  hint: "停在界石边上，既不违令，也不越线。这是最贵的一条路。",
                  lines: [
                    "你在界石这一侧扎了营，派人回话：地形不明，请求补一份地图。",
                    "回话的人第二天回来，带了一张空白的纸和一句「按原令执行」。",
                  ],
                  effects: { stats: { scheme: 9, int: 7, fame: -4, health: -4 }, goal: 6, factions: { 阿斯拉王国: -6 } },
                },
                {
                  label: "夜里带人往北绕一段",
                  category: "隐秘",
                  cost: 20,
                  hint: "绕路的说法有很多种。选一种，往后就一直用那一种。",
                  lines: [
                    "你们连夜走了三个时辰，天亮时站在一片林子里，离那个村子有半个白天的路。",
                    "队伍里没有人问为什么。有两个人的眼神你记住了。",
                  ],
                  effects: { stats: { scheme: 10, int: 5, sword: 3, health: -6 }, goal: 6, flag: "ml:banner-of-shirone:4:desert" },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "那个村子没有被烧。粮仓里确实有粮，是村里自己过冬的。",
            "你被叫回营里问了一次话，问了一个下午，问的人一直在记。",
            "你没有被处置。上头把你调去了另一段路，那一段路上没有村子，只有石头。",
          ],
          effects: {
            stats: { scheme: 9, int: 6, faith: 4, fame: -3, health: -5 },
            goal: 8,
            factions: { 冒险者公会: 6, 阿斯拉王国: -6 },
            flag: "ml:banner-of-shirone:4:refused",
          },
        },
        event: "ml4-shirone-order",
      },
      {
        id: "shirone-5",
        title: "第五章 · 抚恤",
        premise:
          "西隆的王宫里换了人。新王要清点军队、重发抚恤、把旧的欠账一笔勾掉——顺带把知道旧账的人也算进去。",
        objective: "把死去同袍的名字送上该去的地方，然后决定自己往后站在哪一边。",
        guidance: [
          "进西隆的王宫走一趟。这件事在营地里办不成，王宫的走廊才办得成。",
          "把那本写着名字的册子递到一个会留着它的人手里。递上去只是第一步，得有人肯认。",
          "如果王宫进不去，就先回佣兵营地或者拉潘，把话讲给还在队伍里的人听。",
          "有人会来跟你谈价钱，让你把册子收起来。谈的时候你不必发火，记住数目就行。",
          "最后决定自己留在队伍里，还是走出这一段路。",
        ],
        quests: [
          {
            id: "shirone-5-court",
            label: "把话说到能办这件事的地方",
            hint: "在西隆的王宫里走动、在帕克斯的宫里走动。声望五十以上，才有人把你放进走廊。",
            done: { any: [{ residence: ["西隆王国"] }, { flag: "ml:banner-of-shirone:5:camp" }], anyStats: { fame: 50 } },
          },
          {
            id: "shirone-5-roll",
            label: "让册子有人接手",
            hint: "在宫里走动、和战友相处、接一份王国挂出的委托。交情与门路都算数。",
            // 交情与人望到位了，自然有人愿意接这本册子
            done: { anyStats: { charm: 45, fame: 55 } },
          },
          {
            id: "shirone-5-out",
            label: "决定自己站在哪一边",
            hint: "留下，或者走。选完这一条，这段路就有尽头了。",
            done: { flag: "ml:banner-of-shirone:5:stand" },
          },
        ],
        enter: {
          any: [
            { flag: "ml:banner-of-shirone:4:refused" },
            { flag: "ml:banner-of-shirone:4:desert" },
            { anyStats: { fame: 65, sword: 65 } },
          ],
          monthsIn: 6,
        },
        deadlineMonths: 24,
        onEnter: {
          lines: [
            "西隆的王宫里在换地毯。旧的那一批卷起来堆在廊下，颜色比新的深。",
            "你在走廊上等了半天，见到的第一个人问你：「你那本东西，谁签的字。」",
            "你答：死掉的那七个人，每个人自己签的。",
          ],
          effects: {
            stats: { scheme: 7, int: 6, fame: 6, charm: 4 },
            goal: 7,
            factions: { 阿斯拉王国: 4, 冒险者公会: 6 },
            flag: "ml:banner-of-shirone:5:camp",
          },
          commands: [
            {
              name: "西隆王国",
              desc: "换过地毯的走廊、压着旧账的柜子，和一本写着七个名字的册子。",
              commands: [
                {
                  label: "把那本册子按程序递上去",
                  category: "社交",
                  cost: 14,
                  hint: "程序慢，但程序留下的痕迹抹不掉。",
                  lines: [
                    "管文书的人翻了两页，问你要不要抄本。你说要三份。",
                    "他把印按在最后一页上，印有点歪。",
                  ],
                  effects: { stats: { scheme: 6, fame: 7, int: 4 }, goal: 6, factions: { 阿斯拉王国: 6 }, notice: "那本写着名字的册子进了西隆的档案。" },
                },
                {
                  label: "回营地跟还活着的人把话说清",
                  category: "社交",
                  cost: 12,
                  hint: "抚恤发不发得下来，队伍里的人得先知道有这回事。",
                  lines: [
                    "你在营地的空地上把册子念了一遍，念得很慢。",
                    "念完没有人散开。最老的那个兵问了一句：「那我们的呢。」",
                  ],
                  effects: { stats: { charm: 8, fame: 6, sword: 3 }, goal: 6, starDelta: { match: "", delta: 2, note: "你替他们把名字念了出来" } },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "抚恤分三次发了下来。第三次发到的时候，名单上有两个名字已经找不到家人了。",
            "钱留在营部的柜子里，记在一个没有人会翻的本子上。",
            "你把自己那本册子留了一份抄本在营地，剩下的带走了。往后你不再问这笔钱去了哪儿。",
          ],
          effects: {
            stats: { fame: 10, scheme: 8, charm: 6, faith: 3, health: -4 },
            goal: 9,
            factions: { 冒险者公会: 10, 阿斯拉王国: 5 },
            flag: "ml:banner-of-shirone:5:stand",
          },
          rumor: "边境上流传一种说法：有个伍长把抚恤的名单递进了王宫，递上去的册子没有回来。",
        },
        event: "ml4-shirone-banner",
      },
    ],
    endings: {
      done:
        "你在西隆的队伍里待到了最后一年，工钱从四枚银币涨到了六枚。你没当成将军，也没死在麦地里。那几个名字最后进了档案，虽然只是附录里的三行。代价是往后每一次听见号声，你都会先数一遍身边的人。",
      partial:
        "你在某一仗里退了伍，回到没有仗的地方。工钱结清了，伤养好了，册子留在营地没人接。你后来做过几种活，都做得不错，也都没做长。",
      failed:
        "你倒在了那片收割过的麦地里，和那七个人一起。名字是后来别人替你补上的，补错了一个字。抚恤照发，发给了你家里的人，他们没问是怎么死的。",
    },
  },

  /* ================================================================== *
   * 四 · 被诅咒的血脉
   * ================================================================== */
  {
    id: "curse-of-the-blood",
    name: "被诅咒的血脉",
    theme: "血脉与诅咒",
    tagline: "教会说这是诅咒，学者说这是天赋，而它一直在你身上。",
    fit:
      "适合身上带着说不清的东西的主角：魔力远超常人、被诅咒者、带魔族血脉、或者上一代留下的旧账。" +
      "这一条线里没有人想害你，他们只是想用你。",
    tags: {
      origins: ["被诅咒者", "魔族后裔", "魔王之裔", "转生者"],
      talents: ["强大魔力", "魔族血脉", "龙族血脉", "诅咒抗性"],
      places: ["米里希昂", "魔法都市夏利亚", "王都亚尔斯"],
      styles: ["血脉悲剧", "种族冲突"],
    },
    prologue: [
      "你出生那天村里死了两头牲口，一滴血也没流。接生的人说孩子很壮，说完就走了。",
      "你七岁那年，村里的孩子不敢跟你玩，大人说话会先看你一眼。",
      "你十三岁，一个人能搬动两个成年男人搬不动的石磨。石磨搬动了，别人看你的眼神也变了。",
      "后来你想明白了一件事：他们怕的不是你，是你身上那件他们说不清的东西。",
    ],
    stages: [
      {
        id: "curse-1",
        title: "第一章 · 说不清的东西",
        premise:
          "教会说这是诅咒，学者说这是天赋，村里的老人说这是祖宗留下来的账。三样说法你都听过，没有一样能解释你夜里手为什么发烫。",
        objective: "弄清楚自己身上到底是什么，或者至少弄清楚谁的说法离真相最近。",
        guidance: [
          "去米里希昂。教会的档案里记过和你一样的人，记的方式很难看。",
          "如果你走不到神圣国，就在被诅咒的村庄附近待着，把这一带的老说法一个个问过来。",
          "练。咒也好病也好，你总得先知道它在什么情况下发作。",
          "在教会与神殿里静养一个月。有时候安静比医药有用。",
          "把发作的日子记下来。日子排成排，规律就会自己出来。",
        ],
        quests: [
          {
            id: "curse-1-know",
            label: "把三样说法都听一遍",
            hint: "在教会档案里翻、向邻里打听、和神父交谈。智力到 35 才算听明白。",
            done: { anyStats: { int: 35, faith: 30 } },
          },
          {
            id: "curse-1-body",
            label: "弄清它在什么情况下发作",
            hint: "把魔力往上推一次，看看会发生什么。魔力到 45 就够吓自己一跳。",
            done: { anyStats: { mana: 45, health: 30 } },
          },
          {
            id: "curse-1-record",
            label: "写下一份记录",
            hint: "发作的日子、时辰、当时在做什么。写下来，这份东西后来会有别人想读。",
            // 两条路：自己把它记下来，或者弄清它的规律（想弄清就得先读懂它）
            done: { any: [{ flag: "ml:curse-of-the-blood:1:diary" }, { anyStats: { int: 45 } }] },
          },
        ],
        enter: {},
        onEnter: {
          lines: [
            "手上的温度是从小臂往上走的，走到肘就停，停半个时辰。",
            "母亲说过一句：「你爷爷也这样。」说完她就不肯再说了。",
            "你现在住的屋子后面有一口水缸。发作的时候你会去把手按进水里，水开之前你会先听见声音。",
          ],
          effects: {
            stats: { mana: 6, health: -2, int: 4, faith: 3 },
            goal: 4,
            factions: { 米里斯教团: 3 },
            flag: "ml:curse-of-the-blood:1:noticed",
          },
          commands: [
            {
              name: "米里希昂",
              desc: "大圣堂的钟、石板地、神殿骑士团的马。米里斯看着每一个人，也看着不说实话的人。",
              commands: [
                {
                  label: "让教会的医师看一次自己的手",
                  category: "信仰",
                  cost: 8,
                  hint: "他会摸你的脉，也会记下他摸到的。",
                  lines: [
                    "医师按了你的脉，又让你把手翻过来看了一遍，然后开始写。",
                    "他写完问你几岁。你说完，他就在名字旁边补了一个数。",
                  ],
                  effects: { stats: { faith: 4, int: 3, scheme: 2, health: 3 }, goal: 3, factions: { 米里斯教团: 4 }, notice: "教会的名册上有了你的名字。" },
                },
                {
                  label: "把手按进冷水里，看它烧到什么地步",
                  category: "修炼",
                  cost: 12,
                  hint: "知道自己能烧到什么地步，往后才敢在人前说话。",
                  lines: [
                    "水缸响了一下，声音很小，然后水面冒了气。",
                    "你把手拿出来，皮肤是红的，没有破。你盯着自己的手看了很久。",
                  ],
                  effects: { stats: { mana: 6, int: 4, health: -3 }, tier: { kind: "magic", gain: 8 }, goal: 3 },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "记录写到第四十页，你排出了一条规律：每次发作之前，你会先感到饿。",
            "那本册子你藏在床板下面。写的时候用的是最简单的字，怕别人捡到看不懂。",
            "同一个月，教会派人来过村里一趟。问了三户人家，没有问你。",
          ],
          effects: {
            stats: { int: 7, mana: 5, scheme: 4, faith: 2 },
            goal: 5,
            factions: { 米里斯教团: 3 },
            flag: "ml:curse-of-the-blood:1:diary",
          },
        },
        event: "ml4-curse-village",
      },
      {
        id: "curse-2",
        title: "第二章 · 名册",
        premise:
          "夏利亚接纳所有来路不明的东西，只要它有用。你在这里可以学，可以查，可以被人研究。三件事是同一件事。",
        objective: "在夏利亚找到愿意替你解释这份血脉的人，代价是让他记录你。",
        guidance: [
          "去魔法都市夏利亚。魔力到四十五、智力到四十五，大学的名册就会收你。",
          "在书库与研究室里查诅咒与魔法阵的记载。这两样东西在书上是连着的。",
          "去大学的讲堂里坐着。这里有一位特别生专攻诅咒研究，他问问题的方式和教会不一样。",
          "让人把你看一遍。记录做出来，你至少能拿到一份自己的数据。",
          "别把全部的事都说出来。留一页不说，是你往后唯一的本钱。",
        ],
        quests: [
          {
            id: "curse-2-arrive",
            label: "进到夏利亚的名册里",
            hint: "夏利亚要魔力四十五或智力四十五。住满两个月，或者以特别生的身份进去。",
            done: { residence: ["魔法都市夏利亚"] },
          },
          {
            id: "curse-2-study",
            label: "把诅咒那部分文献读完",
            hint: "在书库研读、做实验与验证、抄录不外传的东西。智力到 55 才读得懂写法。",
            done: { anyStats: { int: 55 }, flag: "ml:curse-of-the-blood:2:file" },
          },
          {
            id: "curse-2-scholar",
            label: "找到肯替你解释的人",
            hint: "和同学来往、请教授示范、和那些做研究的人搭上话。交情两颗星以上。",
            done: { relation: { name: "", minStars: 2 }, anyStats: { charm: 30 } },
          },
        ],
        enter: {
          any: [
            { flag: "ml:curse-of-the-blood:1:diary" },
            { anyStats: { mana: 50, int: 45 } },
          ],
          monthsIn: 2,
        },
        deadlineMonths: 30,
        onEnter: {
          lines: [
            "夏利亚的登记处给你量了三样东西：身高、魔力、以及手掌的温度。第三样他们没有记录表，就写在空白处。",
            "安排你住的那间屋子在没有窗的一侧。也好，发作的时候不必遮。",
            "第一周就有人来找你，说「听说你身上有东西」。他手里拿着纸。",
          ],
          effects: {
            stats: { int: 7, mana: 6, scheme: 3, faith: -2 },
            goal: 5,
            factions: { 魔法大学: 8, 米里斯教团: -3 },
            flag: "ml:curse-of-the-blood:2:file",
          },
          commands: [
            {
              name: "书库与研究室",
              desc: "关于诅咒的文献都压在靠里的一排书架上，借阅记录上只有四个人名。",
              commands: [
                {
                  label: "按日期抄下关于诅咒的记载",
                  category: "学术",
                  cost: 16,
                  hint: "抄的时候把出处一起抄上。没有出处的记载，将来没人信。",
                  lines: [
                    "你抄了满满一本，抄到第六十页发现里面有三处互相矛盾。",
                    "矛盾的地方都被涂过。涂的人手法很一致。",
                  ],
                  effects: { stats: { int: 8, scheme: 5, mana: 3 }, tier: { kind: "magic", gain: 8 }, goal: 4 },
                },
                {
                  label: "让人把你的名字记进研究记录",
                  category: "学术",
                  cost: 12,
                  hint: "记进去以后你就是一份材料，同时也是一份证据。",
                  lines: [
                    "他量了你的脉、你的魔力、你发作的间隔，量得很细。",
                    "写完他抬头问：「能再来一次吗。」你说能。",
                  ],
                  effects: { stats: { int: 5, fame: 4, scheme: 3 }, goal: 3, factions: { 魔法大学: 6 }, notice: "你成了魔法大学一份研究记录里的条目。" },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "研究记录做到第三个月，那位特别生把纸翻过来给你看：同一页上前后两处的结论是相反的。",
            "「不是我写错，」他说，「是这些人只想让人看见一半。」",
            "你把那本册子借出来抄了一份。抄完还回去，借阅记录上多了一行你的名字。",
          ],
          effects: {
            stats: { int: 9, scheme: 6, mana: 5, charm: 4 },
            goal: 6,
            factions: { 魔法大学: 6, 米里斯教团: -4 },
            flag: "ml:curse-of-the-blood:2:scholar",
          },
        },
        event: "ml4-curse-registry",
      },
      {
        id: "curse-3",
        title: "第三章 · 净化",
        premise:
          "教会来函了，措辞很客气：请你在方便的时候回米里希昂一趟，接受一次正式的检视。信里附了一份路费。",
        objective: "去或者不去，都要先弄清楚教会的「净化」到底做什么。",
        guidance: [
          "回米里希昂。大圣堂的侧门比正门矮，进侧门的人比进正门的多。",
          "在教会的档案里翻一翻。同一份册子上有几个被划掉的名字，划掉的日期挨得很近。",
          "和神父交谈。他们知道的事比他们能说的多。",
          "如果你决定不去，就留在夏利亚或者去王都，把这件事变成别人的事。",
          "让身体撑住。这件事最后落在你身上，不落在纸面上。",
        ],
        quests: [
          {
            id: "curse-3-arrive",
            label: "到该到的地方",
            hint: "回米里希昂面对这件事，或者去王都亚尔斯把它交给别人。",
            done: { any: [{ residence: ["米里希昂"] }, { residence: ["王都亚尔斯"] }] },
          },
          {
            id: "curse-3-archive",
            label: "弄清被划掉的那几个名字",
            hint: "翻查教会档案、向神父交谈、打听附近的传闻。密谋到 45 才连得成线。",
            done: { anyStats: { scheme: 45, int: 50 }, flag: "ml:curse-of-the-blood:3:archive" },
          },
          {
            id: "curse-3-body",
            label: "撑过一次发作",
            hint: "在教会静养、在家歇上一个月、练到能自己压住它。健康留在 35 以上。",
            done: { flag: "ml:curse-of-the-blood:3:endured" },
          },
        ],
        enter: {
          any: [
            { flag: "ml:curse-of-the-blood:2:scholar" },
            { anyStats: { mana: 60, int: 55 } },
          ],
          monthsIn: 4,
        },
        deadlineMonths: 36,
        onEnter: {
          lines: [
            "大圣堂的侧门后面是一条长廊，长廊尽头有一间屋子，门开着，里头摆着一张石台。",
            "引路的人让你在石台上坐一会儿，说等的人马上来。",
            "石台是凉的，凉得很干，像专门为这件事准备过。",
          ],
          effects: {
            stats: { faith: 5, scheme: 5, int: 4, health: -4, mana: 3 },
            goal: 6,
            factions: { 米里斯教团: 8, 魔法大学: -3 },
            flag: "ml:curse-of-the-blood:3:archive",
          },
          commands: [
            {
              name: "米里希昂",
              desc: "大圣堂的侧门、长廊、一间摆着石台的屋子。",
              commands: [
                {
                  label: "在石台上坐完那一趟检视",
                  category: "信仰",
                  cost: 10,
                  hint: "检视不清洗。它只记录，记录的方式由他们定。",
                  lines: [
                    "来了三个人，两个人按着你的手腕，第三个人念了很长一段。",
                    "念到一半，你的手开始发烫。念的人没有停。",
                  ],
                  effects: { stats: { faith: 6, mana: 6, int: 4, health: -5 }, goal: 5, factions: { 米里斯教团: 10 }, notice: "教会的档案里，你的名字后面多了一栏。" },
                },
                {
                  label: "在侧门外把教会的旧册子对一遍",
                  category: "隐秘",
                  cost: 14,
                  hint: "被划掉的名字比留下的名字更能说明问题。",
                  lines: [
                    "你把册子上三个被划掉的名字抄了下来，三个人的日期在同一个春天。",
                    "那一栏的注写着同一个词，字迹不一样，词是一样的。",
                  ],
                  effects: { stats: { scheme: 8, int: 6, faith: -3 }, goal: 4 },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "检视做完了，结论写了三行：血脉异常，非恶魔，宜继续观察。",
            "「继续观察」的意思是往后每年都有人来。你被送出门的时候，有人递给你一枚不带标记的木牌。",
            "回去的路上你在客栈里发了一次作。那次很轻，就是把杯子烫裂了。",
          ],
          effects: {
            stats: { faith: 6, scheme: 7, mana: 5, int: 4, health: -3 },
            goal: 7,
            factions: { 米里斯教团: 8, 魔法大学: 4 },
            flag: "ml:curse-of-the-blood:3:endured",
          },
        },
        event: "ml4-curse-purge",
      },
      {
        id: "curse-4",
        title: "第四章 · 用你",
        premise:
          "宫廷的使者先到的，比教会早。他们说的话比教会好听：我们不要你改，我们要你站在我们这边。",
        objective: "在被人使用的过程中，守住哪一部分是自己说了算的。",
        guidance: [
          "去王都亚尔斯。那边的人认名字，也认能拿出来用的东西。",
          "在贵族圈里周旋，同时把底线想清楚——你要的是什么，不能让的是什么。",
          "在书库与研究室里把诅咒拆开看。被解释过的东西，就不再只是别人的说法。",
          "让人看见你。藏起来的人没有议价的资格。",
          "找个能替你说话的人。教会、学者、宫廷，随便哪一边，都得有一个。",
        ],
        quests: [
          {
            id: "curse-4-court",
            label: "走进王都",
            hint: "在王都亚尔斯做本钱上的事、参加宴会、在贵族圈里周旋。声望到 50 才被当成东西看。",
            done: { residence: ["王都亚尔斯"], anyStats: { fame: 50, charm: 35 } },
          },
          {
            id: "curse-4-split",
            label: "把这份血脉拆开看",
            hint: "在书库研读、做实验与验证、抄录不外传的东西。智力到 60 才敢说拆开了。",
            done: { anyStats: { int: 60 }, flag: "ml:curse-of-the-blood:4:split" },
          },
          {
            id: "curse-4-guard",
            label: "守住一样不能让的东西",
            hint: "挑一件不让的，写下来。做完这一步，往后就不会全由别人定。",
            done: { flag: "ml:curse-of-the-blood:4:kept" },
          },
        ],
        enter: {
          any: [
            { flag: "ml:curse-of-the-blood:3:endured" },
            { anyStats: { fame: 50, int: 58 } },
          ],
          monthsIn: 4,
        },
        deadlineMonths: 30,
        onEnter: {
          lines: [
            "使者来的时候带了两样东西：一封请帖，和一枚用来量魔力的旧铜环。",
            "铜环套上你的手腕，指针直接顶到了格子的边上，抖了两下。",
            "使者笑了一下，把铜环收起来。他笑的时候看的是请帖。",
          ],
          effects: {
            stats: { charm: 6, scheme: 7, fame: 6, int: 4, mana: 4 },
            goal: 6,
            factions: { 阿斯拉王国: 10, 米里斯教团: -3 },
            flag: "ml:curse-of-the-blood:4:split",
          },
          commands: [
            {
              name: "王都亚尔斯",
              desc: "请帖、铜环、一间比教会那间暖和得多的屋子。",
              commands: [
                {
                  label: "在宫廷的人面前把话说定",
                  category: "社交",
                  cost: 14,
                  hint: "先把价开出来：你要什么、不给什么。他们习惯了别人先让步。",
                  lines: [
                    "你说完三句话，桌子那一头没有人接。有人把杯子转了半圈。",
                    "「你倒是想得清楚。」对方说。这句话之后，谈的就不再是恩典，是买卖。",
                  ],
                  effects: { stats: { charm: 6, scheme: 8, fame: 6 }, goal: 5, factions: { 阿斯拉王国: 12 } },
                },
                {
                  label: "用一份自己的记录换一份他们的记录",
                  category: "隐秘",
                  cost: 14,
                  hint: "他们手上有你的数据，你手上什么都没有。交换是最好的办法。",
                  lines: [
                    "你把那本册子摊开，指着发作的间隔，说可以给。",
                    "对面的人翻了两页就点头——他们想要的是这个，不是你这个人。",
                  ],
                  effects: { stats: { scheme: 9, int: 7, fame: 3 }, goal: 5, factions: { 阿斯拉王国: 6, 魔法大学: 3 }, notice: "你拿自己的记录，换到了别处的记录。" },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "你在纸上写下不让的那一样：不去教会那间屋子的第二趟。",
            "写完之后你把它折起来，和那本册子放在一起。这本东西现在有两份，一份在夏利亚。",
            "宫廷那边开始按月给你送东西，都是些不写来路的东西。你收下了，也只收下这几样。",
          ],
          effects: {
            stats: { scheme: 8, int: 6, fame: 6, charm: 4, health: -3 },
            goal: 8,
            factions: { 阿斯拉王国: 12, 魔法大学: 6, 米里斯教团: -5 },
            flag: "ml:curse-of-the-blood:4:kept",
          },
        },
        event: "ml4-curse-court",
      },
      {
        id: "curse-5",
        title: "第五章 · 处置",
        premise:
          "三方都给了方案：教会说可以封住它，学者说可以把它从血里剥出来，宫廷说可以给它一个名字然后收进库里。你手上终于有了挑一样的机会。",
        objective: "决定这份东西留在你身上，还是交出去。",
        guidance: [
          "把三份方案摆在桌上比一遍。每一份都写着好处，代价都写在附页。",
          "回夏利亚一趟。只有那里的人能把「剥出来」这件事说清楚到什么地步。",
          "如果你打算留着它，就先练到能自己压住它。压不住的东西不能叫自己的。",
          "如果你打算交出去，就把抄本多留几份。交出去的东西，多半回不来。",
          "把最后一份记录写完。写完这一份，这段血脉的事就有结论了。",
        ],
        quests: [
          {
            id: "curse-5-place",
            label: "把三份方案看齐",
            hint: "回到夏利亚或者拉诺亚，在书库与研究室里把三份方案摆到一起。智力到 65。",
            done: { any: [{ residence: ["魔法都市夏利亚"] }, { residence: ["拉诺亚王国"] }], anyStats: { int: 65 } },
          },
          {
            id: "curse-5-power",
            label: "练到能自己压住它",
            hint: "练一门能收得住的东西，或者干脆练到出手不用开口。压不住就谈不上处置。",
            done: { anySkill: ["mg_chantless", "mg_binding", "mg_disturb", "mg_time_fragment"] },
          },
          {
            id: "curse-5-close",
            label: "把最后一份记录写完",
            hint: "该封的封，该交的交，该烧的烧。写完这一页，这件事才算完。",
            done: { flag: "ml:curse-of-the-blood:5:closed" },
          },
        ],
        enter: {
          any: [
            { flag: "ml:curse-of-the-blood:4:kept" },
            { anyStats: { mana: 75, int: 62 } },
          ],
          monthsIn: 6,
        },
        deadlineMonths: 36,
        onEnter: {
          lines: [
            "三份方案摊在同一张桌上，纸的厚薄都不一样。",
            "教会的篇幅最短，学者的最长，宫廷的那一份写得最客气，讲的其实是要你搬去他们那儿住。",
            "你把三张纸按字数排了一遍，然后按代价重排了一遍。两次的顺序不一样。",
          ],
          effects: {
            stats: { int: 8, scheme: 7, mana: 5, faith: 3, health: -4 },
            goal: 8,
            factions: { 魔法大学: 6, 阿斯拉王国: 5, 米里斯教团: 3 },
            flag: "ml:curse-of-the-blood:5:closed",
          },
          commands: [
            {
              name: "书库与研究室",
              desc: "把诅咒与魔法阵的记载摊在一张桌上，你会看出它们是同一套写法。",
              commands: [
                {
                  label: "按自己的记录把这段东西拆到底",
                  category: "学术",
                  cost: 18,
                  hint: "拆到底之后，它就不再是一个说法，而是一段术式。",
                  lines: [
                    "你把发作的间隔、手掌的温度、魔力的量排成三列，排到第八十行，三列对上了。",
                    "对上的那一刻你没有高兴。原来它一直在按规矩走，只是规矩没人写下来。",
                  ],
                  effects: { stats: { int: 9, mana: 7, scheme: 4 }, tier: { kind: "magic", gain: 16 }, goal: 6 },
                },
                {
                  label: "在自己的身上试一次收束",
                  category: "修炼",
                  cost: 16,
                  hint: "收不住的东西不叫自己的。试的时候别让人在屋里。",
                  lines: [
                    "你把手按在石板上，先让它烫起来，再一寸一寸往回压。",
                    "压到底的那一瞬间，屋子安静得不像话。你的手是凉的。",
                  ],
                  effects: { stats: { mana: 8, health: -6, int: 5, faith: 4 }, learnSkill: "mg_binding", goal: 6 },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "你没有把血交出去。三份方案都收进了箱子，箱子放在你睡得着觉的那间屋子里。",
            "教会的观察还在继续，每年一封，措辞一年比一年客气。学者的记录还在做，你已经不看了。",
            "宫廷那边最后一次来人是三年后，来问你还要不要那份月例。你说不要了。",
            "手上的温度还在。你已经知道它什么时候来，也知道怎么把它按回去。这就够了。",
          ],
          effects: {
            stats: { mana: 10, int: 8, scheme: 6, faith: 4, fame: 5, health: -3 },
            goal: 10,
            lifespan: 1,
            factions: { 魔法大学: 8, 米里斯教团: 5, 阿斯拉王国: -3 },
            flag: "ml:curse-of-the-blood:5:kept",
          },
        },
        event: "ml4-curse-disposal",
      },
    ],
    endings: {
      done:
        "那份东西留在了你身上，也第一次成了你自己的东西。你活过了教会每年一次的观察，活过了学者的记录，也活过了宫廷的月例。代价是往后每一次发作，你都要一个人按回去，没人能替你按。",
      partial:
        "你把它交给了别人，换来几年清静的日子。清静是真的，那种说不清的感觉也是真的——像身体里少了一间屋子，而那间屋子的门一直开着。",
      failed:
        "你在某一次发作里没能压住。屋子烧了半边，人没事，名声没了。后来的年月你在离城很远的地方过，靠一双手和一副从不多说话的性格。",
    },
  },

  /* ================================================================== *
   * 五 · 另一个世界的影子
   * ================================================================== */
  {
    id: "another-worlds-ghost",
    name: "另一个世界的影子",
    theme: "同乡与时间",
    onlyEras: ["鲁迪乌斯时代", "战后时代"],
    tagline: "这个世上有一批人不该在这里，而他们彼此认得出来。",
    fit:
      "这一条线里没有回乡的路，只有一批同样走不掉的人，和他们各自的选择。",
    tags: {
      origins: ["转生者", "被召唤者", "拉诺亚魔法大学学生"],
      talents: ["转生记忆", "召唤术天赋", "语言天赋"],
      places: ["魔法都市夏利亚", "拉诺亚王国"],
      styles: ["人神暗流", "混合模式"],
      eras: ["鲁迪乌斯时代", "战后时代"],
    },
    prologue: [
      "夏利亚的书库里有一个人在抄东西，抄了十年，抄的东西越来越薄。",
      "你第一次听见她说自己的名字，说得很快，像是怕被人记住。",
      "她告诉你：这座城里有几个和你一样的人，谁都不肯先开口。",
      "而书库最里层那排架子上，有一卷残缺的术式，写着这个世界不该有的东西。",
    ],
    stages: [
      {
        id: "ghost-1",
        title: "第一章 · 抄书的人",
        premise:
          "有些话只有对着另一个从别处来的人才说得出口。你要先分清：眼前这个人是不该在这里，还是只是不愿意在这里。",
        objective: "在夏利亚找到一个和你一样的人，并且确认他是不是。",
        guidance: [
          "去魔法都市夏利亚，在书库与研究室里待下去。抄东西的人都在那一层。",
          "留心那些对常识反应不对的人——他们听见某些词的时候会停一下。",
          "去大学的讲堂里坐着。你会看见一个从不记笔记、也从不提问的学生。",
          "把你知道的事压住。第一次见面就说实话的人，在这里活不长。",
          "写下你自己记得的东西。有些细节正在变淡，你已经开始分不清。",
        ],
        quests: [
          {
            id: "ghost-1-arrive",
            label: "在夏利亚待下来",
            hint: "住到魔法都市夏利亚，然后在书库或者大学的讲堂里坐满几个月。",
            done: { residence: ["魔法都市夏利亚"], monthsIn: 3 },
          },
          {
            id: "ghost-1-read",
            label: "把书库最里层那一排翻一遍",
            hint: "在书库研读、翻到书架最里面那一层、抄录不外传的东西。智力到 50 才读得动。",
            done: { anyStats: { int: 50 }, flag: "ml:another-worlds-ghost:1:shelf" },
          },
          {
            id: "ghost-1-meet",
            label: "和人搭上话",
            hint: "和同学来往、和研究员坐到一起。你得有一个愿意听你把话说完的人。",
            done: { relation: { name: "", minStars: 2 }, anyStats: { charm: 28 } },
          },
        ],
        enter: {},
        onEnter: {
          lines: [
            "书库最里层那排架子上有灰，灰是新的——有人常来，只是不借。",
            "你在这里坐了三周，第四周她开口了，问你借不借那本《水系缩短咏唱考》。",
            "你说不借。她说：那就好，我也不借。",
          ],
          effects: {
            stats: { int: 7, mana: 4, scheme: 4, charm: 3 },
            goal: 4,
            factions: { 魔法大学: 5 },
            flag: "ml:another-worlds-ghost:1:shelf",
          },
          commands: [
            {
              name: "书库与研究室",
              desc: "最里层那排书架，十年没有人动过，除了两个人。",
              commands: [
                {
                  label: "在最里层那一排抄一整卷",
                  category: "学术",
                  cost: 16,
                  hint: "抄的东西不是魔术，是别人整理的残篇目录。",
                  lines: [
                    "你抄了整整一卷，抄到一半发现前后两段抄的是同一个术式的不同写法。",
                    "两种写法的差别不在字上，在顺序上。",
                  ],
                  effects: { stats: { int: 8, scheme: 5, mana: 4 }, tier: { kind: "magic", gain: 10 }, goal: 4 },
                },
                {
                  label: "和抄书的人坐到同一张桌上",
                  category: "社交",
                  cost: 10,
                  hint: "不问她从哪儿来。先问她抄到哪一年。",
                  lines: [
                    "她答了一个年份，答得很快。你说那一年你不在。",
                    "她抬起头看了你三秒，然后把桌上的纸收了一半。",
                  ],
                  effects: { stats: { charm: 5, int: 4, scheme: 3 }, goal: 3, starDelta: { match: "", delta: 1, note: "她说了一句不该说的话，你听懂了" } },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "她抄的东西有十年份，一年一本，越往后越薄。",
            "最薄的那一本里只有一句话：找不到回去的路，但找到了留在这儿的理由。",
            "你问她这是谁写的。她说：别人。",
          ],
          effects: {
            stats: { int: 8, charm: 5, scheme: 5, mana: 4 },
            goal: 5,
            factions: { 魔法大学: 5, 魔术公会: 3 },
            flag: "ml:another-worlds-ghost:1:met",
          },
        },
        event: "ml4-ghost-library",
      },
      {
        id: "ghost-2",
        title: "第二章 · 同乡",
        premise:
          "你们一共七个人，在三个地方。有人肯见你，有人不肯。肯见你的那几个人，要的东西都不一样。",
        objective: "把这几个人的来路摸清，然后判断谁的话可以信。",
        guidance: [
          "在拉诺亚王国和魔法都市夏利亚之间来回跑。这几个人分散在两座城里。",
          "留意那些不肯见人的人。不喜欢被打听的人，通常有不想被打听的事。",
          "有人会拿一件东西试探你。你要么认得，要么装不认得。",
          "别提「回去」这两个字。这是这里唯一一句能让所有人闭嘴的话。",
          "把每个人说的话单独记下来。放在一起对，会有一处对不上。",
        ],
        quests: [
          {
            id: "ghost-2-find",
            label: "把同乡一个一个找出来",
            hint: "在拉诺亚王国或夏利亚走动，打听消息、和同学来往、和研究员坐到一起。密谋到 45。",
            done: { anyStats: { scheme: 45, charm: 35 }, flag: "ml:another-worlds-ghost:2:found" },
          },
          {
            id: "ghost-2-lie",
            label: "决定对谁说实话",
            hint: "和几个人分别谈过之后，挑一个把真话说出来。这一步不能回头。",
            done: { flag: "ml:another-worlds-ghost:2:trust" },
          },
          {
            id: "ghost-2-time",
            label: "读懂残篇里的半句",
            hint: "在书库研读、研究时间魔术的残篇。要魔术到上级，智力到 55。",
            // 这一条本来就只认「读懂了」：智力到了，加上魔术阶级，就算数
            done: { anyStats: { int: 55 }, magicTier: "上级" },
          },
        ],
        enter: {
          any: [
            { flag: "ml:another-worlds-ghost:1:met" },
            { anyStats: { int: 55, scheme: 40 } },
          ],
          monthsIn: 4,
        },
        deadlineMonths: 36,
        onEnter: {
          lines: [
            "七个人里你见到了四个。第一个不肯说名字，第二个说的名字是假的，第三个说的是真名但问了你三次。",
            "第四个请你吃了一顿饭，饭桌上什么也没问。",
            "回去的路上你想：四个里面至少有一个在替别人看你。",
          ],
          effects: {
            stats: { scheme: 7, int: 6, charm: 5 },
            goal: 5,
            factions: { 魔法大学: 3 },
            flag: "ml:another-worlds-ghost:2:found",
          },
          commands: [
            {
              name: "拉诺亚王都",
              desc: "王宫与魔术公会共治的城。使节的马车每天都有，没人注意背着旧书的人。",
              commands: [
                {
                  label: "在城里把七个人的名字凑出来",
                  category: "隐秘",
                  cost: 14,
                  hint: "名字、来的时候是几年前、现在住在哪一片。三样凑齐就够了。",
                  lines: [
                    "你跑了两个月，凑出六个名字，第七个只有一条线索：他不住在城里。",
                    "六个名字有三个是对得上的，另外三个说法互相矛盾。",
                  ],
                  effects: { stats: { scheme: 8, int: 5, charm: 3 }, goal: 4, notice: "你凑出了同乡的名单，其中有一处对不上。" },
                },
                {
                  label: "把一件只有你们认得的东西摆出来",
                  category: "社交",
                  cost: 10,
                  hint: "摆出来就会有人认。认得的人不一定想认。",
                  lines: [
                    "你把那件东西放在桌上，装作在看别的。",
                    "一个时辰里有人从桌前走过两次，第二次停了一下。",
                  ],
                  effects: { stats: { charm: 5, scheme: 6, int: 3 }, goal: 4 },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "对不上的那一处在年份上：有一个人说自己来了三年，可他说的事只有七年前的人才说得出来。",
            "你把这一条圈起来，谁也没告诉。",
            "同一个月，七星静香在书库里换了个位置坐，坐到了能看见门的那一侧。",
          ],
          effects: {
            stats: { scheme: 8, int: 7, charm: 4, mana: 3 },
            goal: 6,
            factions: { 魔法大学: 4, 魔术公会: 3 },
            flag: "ml:another-worlds-ghost:2:trust",
          },
        },
        event: "ml4-ghost-fellow",
      },
      {
        id: "ghost-3",
        title: "第三章 · 残篇",
        premise:
          "那卷残篇不是用来穿越时间的。它只做一件小事：把一段已经发生过的事，重新放到你眼前一次。代价从记忆里扣。",
        objective: "把残篇的用法弄明白，并且决定要不要动它。",
        guidance: [
          "在书库与研究室里把残篇的写法校一遍。抄错一个字，代价会换一种方式来收。",
          "找那位抄了十年书的人对一遍。她抄的版本和你手上的有一处不同。",
          "试着用一次，用在小事上：一封信的落款、一句话的顺序。别用在人身上。",
          "用完之后把你记得的东西写下来，立刻写。你会忘掉一段，而且不知道自己忘了什么。",
          "去龙鸣山那种地方听听低音。有些东西不在书里，在山上。",
        ],
        quests: [
          {
            id: "ghost-3-copy",
            label: "把残篇校到能用",
            hint: "研读、抄录不外传的东西、依据文献修正术式。魔术要到上级。",
            done: { magicTier: "上级", anyStats: { int: 60 } },
          },
          {
            id: "ghost-3-use",
            label: "用一次，用在小事上",
            hint: "改一句落款，改一次顺序。用一次就够了，你会知道代价是什么形状。",
            done: { flag: "ml:another-worlds-ghost:3:used" },
          },
          {
            id: "ghost-3-forget",
            label: "把忘掉的那段补回来",
            hint: "靠记录、靠问人、靠自己再想一遍。补不回来也得承认它没了。",
            done: { anyStats: { int: 62, faith: 40 }, monthsIn: 6 },
          },
        ],
        enter: {
          any: [
            { flag: "ml:another-worlds-ghost:2:trust" },
            { anyStats: { int: 60, mana: 60 } },
          ],
          monthsIn: 6,
        },
        deadlineMonths: 48,
        onEnter: {
          lines: [
            "你用残篇改了一句落款，改的是三个月前一封信上的日期。",
            "改完之后你把信翻出来看，日期确实变了。你记得自己写过另一个日期，但想不起来是哪一天。",
            "……原来是这样扣的。",
          ],
          effects: {
            stats: { int: 8, mana: 6, scheme: 5, health: -4 },
            goal: 6,
            lifespan: -1,
            factions: { 魔术公会: -4, 魔法大学: 4 },
            flag: "ml:another-worlds-ghost:3:used",
          },
          commands: [
            {
              name: "书库与研究室",
              desc: "残篇只有十一页，第十一页是空的，空的那一页有折痕。",
              commands: [
                {
                  label: "把残篇按两种写法各抄一遍",
                  category: "学术",
                  cost: 20,
                  hint: "两种写法只有顺序不同。抄完之后你会发现哪一种是别人改过的。",
                  lines: [
                    "两份抄本摆在桌上，你把顺序对了一遍，对出三处差别。",
                    "差别都在收尾。一个是把话说完，一个是把话截断。",
                  ],
                  effects: { stats: { int: 9, mana: 6, scheme: 6 }, tier: { kind: "magic", gain: 14 }, goal: 5 },
                },
                {
                  label: "拿一件小事试第二次",
                  category: "隐秘",
                  cost: 18,
                  hint: "第二次比第一次好使，也比第一次扣得多。",
                  lines: [
                    "你把一件小事的顺序换了过来。换完，屋子里少了一样东西——你想不起来是什么。",
                    "你在纸上写：少了一样。写完接着想，还是想不起来。",
                  ],
                  effects: { stats: { int: 6, mana: 5, scheme: 6 }, lifespan: -2, goal: 5, notice: "你用过一次残篇，并且忘掉了一段。" },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "你在册子上补了一段，补的内容是你猜的：那天你把碗打碎了。",
            "你确定这件事发生过，也确定自己完全不记得。",
            "第十一页的折痕你终于弄明白了：那一页是留着写代价的，前面的人写不下去。",
          ],
          effects: {
            stats: { int: 8, faith: 5, mana: 5, scheme: 4, health: -3 },
            goal: 7,
            lifespan: -1,
            factions: { 魔法大学: 5, 魔术公会: -5 },
            flag: "ml:another-worlds-ghost:3:halfread",
          },
        },
        event: "ml4-ghost-fragment",
      },
      {
        id: "ghost-4",
        title: "第四章 · 对不上的一段",
        premise:
          "有一个人来找你，说他也用过残篇，用得比你多。他说他记得一件事，而这件事你确定没有发生过。两个人的记忆里，至少有一个是假的。",
        objective: "把这一段对不上的记忆查到底，然后决定谁来担它。",
        guidance: [
          "和他把两边的说法一条一条对。对到第三处，你们会同时停住。",
          "去问他提过的地方和人。有些痕迹是能查的，有些查了也没有。",
          "把残篇的用法限制住。用它去查这件事，只会越查越乱。",
          "把你知道的写下来，交一份给信得过的人。将来你会需要有人替你记得。",
          "想清楚最坏的结果：如果有人为了让某件事发生过，已经改过几次了，那你们现在站的这一条，是第几条。",
        ],
        quests: [
          {
            id: "ghost-4-check",
            label: "把两边说法对到底",
            hint: "在书库研读、在城里打听、和同乡坐到一起。智力到 65，密谋到 55。",
            done: { anyStats: { int: 65, scheme: 55 }, flag: "ml:another-worlds-ghost:4:gap" },
          },
          {
            id: "ghost-4-limit",
            label: "给残篇定一条线",
            hint: "写下你不再用它做什么。写下之后要守。",
            done: { flag: "ml:another-worlds-ghost:4:limit" },
          },
          {
            id: "ghost-4-trust",
            label: "把一份抄本交给替你记得的人",
            hint: "和一个人处到三星以上，把抄本交出去。这份东西将来会替你说话。",
            done: { relation: { name: "", minStars: 3 }, anyStats: { charm: 40 } },
          },
        ],
        enter: {
          any: [
            { flag: "ml:another-worlds-ghost:3:halfread" },
            { anyStats: { int: 62, mana: 60 } },
          ],
          monthsIn: 6,
        },
        deadlineMonths: 48,
        onEnter: {
          lines: [
            "他记得的是一间屋子，窗朝东，桌上有两副碗筷。他说这件事发生在你来夏利亚之前。",
            "你确定没有这回事。你住过的第一间屋子窗朝西，而且只有一副碗筷。",
            "你们把两边的说法对了三个上午，对到第三处的时候同时停住了。",
          ],
          effects: {
            stats: { int: 8, scheme: 7, faith: -3, health: -5 },
            goal: 7,
            lifespan: -1,
            flag: "ml:another-worlds-ghost:4:gap",
          },
          commands: [
            {
              name: "书库与研究室",
              desc: "两份抄本、两套说法、一处谁也解释不了的空当。",
              commands: [
                {
                  label: "把两套说法写成一列一列对",
                  category: "学术",
                  cost: 18,
                  hint: "写下来才会看出，空当的位置在两份记录里是同一个。",
                  lines: [
                    "你把两套说法分成两列，中间留一栏写「都说不清」。",
                    "写到第七行，那一栏是空的。第八行开始，那一栏填不下了。",
                  ],
                  effects: { stats: { int: 9, scheme: 7 }, goal: 5, notice: "你写下了两套对不上的记忆，空当在同一处。" },
                },
                {
                  label: "去查他提过的那间屋子",
                  category: "探索",
                  cost: 14,
                  hint: "屋子在不在，比两个人的说法都硬。",
                  lines: [
                    "那一片确实有过房，六十年前的一场火烧掉了半个街区。",
                    "管档案的人说，重建的时候朝东和朝西的屋子换了位置——图纸上写着。",
                  ],
                  effects: { stats: { int: 6, scheme: 6, faith: 4 }, goal: 5 },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "你们谁也没赢。第三种可能你们都不肯说出口：那段记忆是别人放进去的。",
            "你把抄本封了一份，写上一句「如果我不记得了，请照这个念给我听」。",
            "那卷残篇被你们两个人合起来收到了一处更稳当的地方。钥匙分了两半。",
          ],
          effects: {
            stats: { int: 9, scheme: 6, charm: 5, faith: 4, health: -3 },
            goal: 8,
            lifespan: -1,
            factions: { 魔法大学: 4 },
            flag: "ml:another-worlds-ghost:4:limit",
          },
        },
        event: "ml4-ghost-memory",
      },
      {
        id: "ghost-5",
        title: "第五章 · 留下",
        premise:
          "有人找到了路。不是回家的路，是一条能让人不再老、不再变的窄路——走上去的人会永远留在这个世界，也永远不再是原来那个人。",
        objective: "在他们走之前，决定你自己站在哪一边。",
        guidance: [
          "去王都亚尔斯，或者拉诺亚的王宫。要走那条窄路的人，需要一份官面上的东西。",
          "把残篇的下落交代清楚。你不交代，将来会有人替你交代，交代得很难听。",
          "和同乡把话说完。该说的说，说不清的留着，别留成仇。",
          "写一封给另一个世界的信。寄不出去，但总得有人写过。",
          "留在这一边也可以。那就把手上的东西做完，做完之后再想这件事。",
        ],
        quests: [
          {
            id: "ghost-5-court",
            label: "去能办成这件事的地方",
            hint: "王都亚尔斯或者拉诺亚王国。要走窄路的人需要一份能盖章的东西。",
            done: { any: [{ residence: ["王都亚尔斯"] }, { residence: ["拉诺亚王国"] }], anyStats: { fame: 40, scheme: 45 } },
          },
          {
            id: "ghost-5-archive",
            label: "把残篇的下落交代出去",
            hint: "把抄本的存放处写成一份文书，交给一个不会用它的人。做完这一步就没有回头路。",
            done: { flag: "ml:another-worlds-ghost:5:sealed" },
          },
          {
            id: "ghost-5-letter",
            label: "给那个世界写一封信",
            hint: "写完这一封，留下来的事就想清楚了。",
            done: { flag: "ml:another-worlds-ghost:5:letter" },
          },
        ],
        enter: {
          any: [
            { flag: "ml:another-worlds-ghost:4:limit" },
            { anyStats: { int: 68, scheme: 58 } },
          ],
          monthsIn: 6,
        },
        deadlineMonths: 48,
        onEnter: {
          lines: [
            "要来的人一共两个，其中一个你见过四次，每次都坐在能看见门的位置。",
            "他们要的东西很简单：一份文书，写明那卷残篇已经封存，不许再动。",
            "签完字的人可以被记进档案，记进去以后就没人再来问他的来路。",
          ],
          effects: {
            stats: { int: 8, scheme: 8, charm: 5, fame: 6, faith: 3 },
            goal: 8,
            factions: { 阿斯拉王国: 8, 魔术公会: 5, 魔法大学: 4 },
            flag: "ml:another-worlds-ghost:5:sealed",
          },
          commands: [
            {
              name: "王都亚尔斯",
              desc: "这一次谈的不是钱，也不是名字，是一段不该留下的记忆该放在哪儿。",
              commands: [
                {
                  label: "在文书上把残篇的下落写定",
                  category: "隐秘",
                  cost: 14,
                  hint: "写清楚存放处和钥匙。写清楚了，往后就没有人再来找你。",
                  lines: [
                    "你把存放处写成两处，真正的那一处在第二句里。",
                    "签完字，管文书的人把纸吹干，折了三折。",
                  ],
                  effects: { stats: { scheme: 9, int: 6, fame: 5 }, goal: 6, factions: { 阿斯拉王国: 8 } },
                },
                {
                  label: "写给那个世界的最后一封信",
                  category: "家庭",
                  cost: 8,
                  hint: "寄不出去也要写。写完你会知道自己到底想不想回去。",
                  lines: [
                    "你写了一夜，写到天亮才知道自己想说的是什么。",
                    "写完你把纸折好，塞进那本十年的册子最后一页。",
                  ],
                  effects: { stats: { faith: 6, int: 5, charm: 4 }, goal: 6, flag: "ml:another-worlds-ghost:5:letter" },
                },
              ],
            },
          ],
        },
        onComplete: {
          lines: [
            "他们走了。走之前那个坐门边的人跟你说了他的名字，说的是真名。",
            "留下的那个抄书的人在某一天把铺盖搬到了书库那排架子旁边，说这样省得来回走。",
            "你把册子合上，放回最里层那一排。灰落下来的时候，你已经不太在意它是新的还是旧的了。",
          ],
          effects: {
            stats: { int: 9, faith: 7, charm: 6, scheme: 5, fame: 5 },
            goal: 10,
            factions: { 魔法大学: 8, 魔术公会: 4, 阿斯拉王国: 4 },
            flag: "ml:another-worlds-ghost:5:stand",
          },
          rumor: "夏利亚的书库里有一种说法：最里层那排架子上有一本册子，十年加一页，谁也不借。",
        },
        event: "ml4-ghost-leave",
      },
    ],
    endings: {
      done:
        "你留下了，也把那卷残篇按自己的意思封了起来。往后你还是会有一两个瞬间，听见一句话就想起另一个世界的某个下午。你已经不再试着回去，只是每隔几年往那本册子上加一页。代价是你永远得自己记得自己是谁。",
      partial:
        "你把残篇交了出去，也把话跟同乡说完了，却始终没给自己写那封信。往后你住在离书库很远的地方，日子过得下去，只是每到冬天就会想，那一年是不是该走另一条路。",
      failed:
        "你用了第三次。第三次之后你丢掉的不只是一段记忆，还有一个人——你不记得他是谁，只在册子上看见自己写过一句「他今天没来」。那一页之后再没有别的字。",
    },
  },
];

/* ==================================================================== *
 * 主线专属抉择事件
 * ==================================================================== */
export const EVENTS_PACK4: MainlineEventDef[] = [
  /* ---------- 无咏唱的异端 ---------- */
  {
    id: "ml4-heretic-entrance",
    mainlineId: "the-chantless-heretic",
    title: "咏唱熟练度那一栏",
    body: [
      "报名处的表要求填写咏唱熟练度，并按此分班。你的一栏是空的。",
      "柜台后面的人把笔推过来：「随便写一个数也行。写完你就是学生，不写就是一个来旁听的外人。」",
      "后面还排着二十几个人。",
    ],
    when: (s) => s.character.residence === "魔法都市夏利亚",
    weight: 1.5,
    options: [
      {
        id: "blank",
        label: "交白卷，让他们按规矩办",
        risk: "中",
        lines: [
          "你把表交上去，画横线的那一栏朝上。",
          "他看了很久，最后在上面盖了一个章，章的边上写着「待核」。",
          "待核的意思你后来才明白：谁也不打算为这件事负责。",
        ],
        outcome: {
          stats: { int: 6, scheme: 5, fame: -2 },
          goal: 5,
          factions: { 魔法大学: 4, 魔术公会: -3 },
          flag: "ml:the-chantless-heretic:1:blank",
          notice: "你的入学表上留着一条横线，教务处把它归进了「待核」。",
        },
      },
      {
        id: "number",
        label: "填一个不痛不痒的数，先混进去",
        risk: "低",
        lines: [
          "你写了个中等的数字。他扫了一眼，分你去三班。",
          "三班的课很浅。你在课上把课本翻完了两遍，第三遍开始往后自己写。",
          "省了不少事，也少了不少事。",
        ],
        outcome: {
          stats: { int: 5, charm: 4 },
          goal: 4,
          factions: { 魔法大学: 7 },
          flag: "ml:the-chantless-heretic:1:hidden",
        },
      },
      {
        id: "demo",
        label: "当场放一发，什么都不必写",
        risk: "高",
        lines: [
          "你抬起手，掌心里出来一颗火球，不大，但你没开口。",
          "排队的人安静了一瞬。柜台后面的人把笔放下，站起来往后屋走了一趟。",
          "回来时他换了张表给你，表的抬头写着「特别生」。",
        ],
        outcome: {
          stats: { int: 5, mana: 6, fame: 6, scheme: -3 },
          goal: 6,
          tier: { kind: "magic", gain: 12 },
          factions: { 魔法大学: 10, 魔术公会: -6 },
          flag: "ml:the-chantless-heretic:1:seen",
          notice: "报名处有二十几个人看见你没开口就点着了火。",
        },
      },
    ],
  },
  {
    id: "ml4-heretic-experiment",
    mainlineId: "the-chantless-heretic",
    title: "研究室的那一格",
    body: [
      "教授把研究室的钥匙留在了桌上，锁着的那一格他没提。",
      "你打开了。里面是十几页手稿，字迹和他讲义上的不一样，年份是四十年前。",
      "最后一页只有一行：「此术不必教，教了就有人按规矩来审。」",
    ],
    when: (s) => s.flags.includes("ml:the-chantless-heretic:2:lab"),
    weight: 1.5,
    options: [
      {
        id: "copy",
        label: "抄下来，抄完放回去",
        risk: "中",
        lines: [
          "你抄了两夜，抄完把原件按原来的顺序放回，连折角都照着折。",
          "第三天的课上，教授讲到一半停了一下，看了你一眼。",
          "他什么也没说，接着往下讲。",
        ],
        outcome: {
          stats: { int: 9, scheme: 6, mana: 4 },
          goal: 6,
          tier: { kind: "magic", gain: 12 },
          factions: { 魔法大学: -3 },
          flag: "ml:the-chantless-heretic:2:copied",
          notice: "你手上有四十年前那份手稿的抄本。",
        },
      },
      {
        id: "ask",
        label: "把钥匙还回去，当面问他",
        risk: "低",
        lines: [
          "你把钥匙放回桌上，问他为什么锁着。",
          "「因为四十年前有个人拿它换了十年的教学许可。」他说，「然后他什么都没再写出来。」",
          "他把那一格打开了，让你当着他的面看完。",
        ],
        outcome: {
          stats: { int: 7, charm: 5, scheme: 3 },
          goal: 6,
          starDelta: { match: "", delta: 2, note: "他把锁着的那一格打开给你看了" },
          factions: { 魔法大学: 8 },
          flag: "ml:the-chantless-heretic:2:trusted",
        },
      },
      {
        id: "leave",
        label: "合上，不抄，也不问",
        risk: "低",
        lines: [
          "你把那一格重新锁上，钥匙摆回原处。",
          "手稿上的那行字你记住了。往后你每次想教别人之前，都会先想起它。",
          "这两年你写的东西少了一半，写得比从前实。",
        ],
        outcome: {
          stats: { int: 6, scheme: 4, health: 3 },
          goal: 5,
          factions: { 魔法大学: 5 },
          flag: "ml:the-chantless-heretic:2:restraint",
        },
      },
    ],
  },
  {
    id: "ml4-heretic-registry",
    mainlineId: "the-chantless-heretic",
    title: "审查席上的三句话",
    body: [
      "审查在一间没有窗的屋子里进行，桌上摆着你的三页纸和一份回执。",
      "主审问你：「这一手教出去，出了事谁负责。」",
      "旁边有人在记。记的人笔尖很响。",
    ],
    when: (s) => s.flags.includes("ml:the-chantless-heretic:3:filed"),
    weight: 1.5,
    options: [
      {
        id: "honest",
        label: "说实话：谁也负不了",
        risk: "中",
        lines: [
          "你说完，屋子里安静了几息，主审把眼镜摘下来擦了擦。",
          "「那你为什么还要登记。」",
          "「因为我不想它变成一件偷偷传的事。」",
          "回执上写的是「不宜列入教学」。你签了字，签得比平常慢。",
        ],
        outcome: {
          stats: { int: 8, scheme: 5, fame: -4, faith: 3 },
          goal: 6,
          factions: { 魔术公会: -8, 魔法大学: 6 },
          flag: "ml:the-chantless-heretic:3:refused",
        },
      },
      {
        id: "cover",
        label: "把责任推给「术式本身的风险」",
        risk: "低",
        lines: [
          "你照着公会的措辞念了一遍，念得很顺。",
          "主审点了点头，说这样写可以列进「限制教学」。",
          "你把回执拿回来，编号一样，多了一行小字。那行小字比回绝好用。",
        ],
        outcome: {
          stats: { int: 6, scheme: 8, fame: 3 },
          goal: 7,
          factions: { 魔术公会: 8, 魔法大学: 3 },
          flag: "ml:the-chantless-heretic:3:limited",
        },
      },
      {
        id: "copy",
        label: "把三页纸留在桌上，另一份带走",
        risk: "高",
        lines: [
          "你交上去的是一份不那么关键的版本，关键的推导留在了自己身上。",
          "审查照流程走完，回执照流程发下来。",
          "从那天起你身上一直带着一份抄本，到哪里都带着。",
        ],
        outcome: {
          stats: { int: 7, scheme: 10, fame: -2 },
          goal: 6,
          factions: { 魔术公会: -5 },
          flag: "ml:the-chantless-heretic:3:copied",
          notice: "公会档案里那一份，缺了最要紧的推导。",
        },
      },
    ],
  },
  {
    id: "ml4-heretic-signature",
    mainlineId: "the-chantless-heretic",
    title: "共同署名",
    body: [
      "接手的人把一份新表格放在你面前，署名那一栏已经写好了两个字，位置在你前面。",
      "「你可以继续用，也可以教。这一栏只有一个条件。」",
      "他把笔推过来，笔是新的。",
    ],
    when: (s) => s.flags.includes("ml:the-chantless-heretic:4:understood"),
    weight: 1.5,
    options: [
      {
        id: "sign",
        label: "签下去",
        risk: "低",
        lines: [
          "你签了。第二个星期，教学许可就下来了。",
          "许可挂在墙上，两个名字并排，他的字比你的大一点。",
          "你开始有学生。第一堂课讲了半句，你忽然想起手稿上那行字。",
        ],
        outcome: {
          stats: { int: 6, charm: 6, fame: 8, scheme: -6 },
          goal: 8,
          factions: { 魔术公会: 12, 魔法大学: 4 },
          flag: "ml:the-chantless-heretic:4:signed",
        },
      },
      {
        id: "refuse",
        label: "把笔推回去",
        risk: "高",
        lines: [
          "你把表格折起来还给他，说这一手不是你一个人的。",
          "他的脸色没变，把笔收进了袖子。",
          "许可没下来。你回了研究室，那天写到后半夜。",
        ],
        outcome: {
          stats: { int: 8, scheme: 6, fame: -4, faith: 4 },
          goal: 7,
          factions: { 魔术公会: -8, 魔法大学: 5 },
          flag: "ml:the-chantless-heretic:4:alone",
        },
      },
      {
        id: "trade",
        label: "换：署名给他，条件是不许改一个字",
        risk: "中",
        lines: [
          "他答应了，答应得太快。",
          "半年后印出来的册子上，你的推导少了一页，那一页上写的正是最要紧的那一步。",
          "你拿着册子去找他。他不在，去别处讲课了。",
        ],
        outcome: {
          stats: { int: 7, scheme: 9, fame: 6, charm: -3 },
          goal: 7,
          factions: { 魔术公会: 8, 魔法大学: -4 },
          flag: "ml:the-chantless-heretic:4:traded",
          notice: "印出来的册子，比你的原稿少了一页。",
        },
      },
    ],
  },
  {
    id: "ml4-heretic-public",
    mainlineId: "the-chantless-heretic",
    title: "厅里的第三发",
    body: [
      "你放完第三发，厅里安静了一会儿。懂的那三个人里有一个站起来，走到你面前两步的位置。",
      "「这一手你打算怎么办。」",
      "厅角有人在记。你能听见笔尖的声音。",
    ],
    when: (s) => s.flags.includes("ml:the-chantless-heretic:5:patron"),
    weight: 1.5,
    options: [
      {
        id: "publish",
        label: "公开，写清楚每一处推导",
        risk: "中",
        lines: [
          "你把这三年所有的记录一起交了出去，包括被涂掉的那段旧记载的出处。",
          "册子印得很慢，印出来以后，夏利亚的讲堂上多了一门没有编号的课。",
          "有人在课上问你能不能教。你说能，但得先学会不数音节。",
        ],
        outcome: {
          stats: { int: 9, fame: 12, charm: 6, scheme: -4 },
          goal: 10,
          tier: { kind: "magic", gain: 14 },
          factions: { 魔术公会: 10, 魔法大学: 10 },
          flag: "ml:the-chantless-heretic:5:published",
          notice: "你的术式被印成了册子，署你一个人的名字。",
        },
      },
      {
        id: "keep",
        label: "只演示，不交底",
        risk: "低",
        lines: [
          "你说这一手暂时不写下来。厅里有人笑了一声，没有人追问。",
          "往后十年，会这一手的人一共三个，都是你亲手教的。",
          "公会那份档案永远停在「暂缓审定」。",
        ],
        outcome: {
          stats: { scheme: 8, int: 6, fame: 6, charm: 4 },
          goal: 8,
          factions: { 魔术公会: -4, 魔法大学: 5 },
          flag: "ml:the-chantless-heretic:5:kept",
        },
      },
      {
        id: "sell",
        label: "卖给出价最高的那一边",
        risk: "高",
        lines: [
          "阿斯拉王国出的价比公会高得多，条件只有一个：先教他们的人。",
          "你收了钱，也当真去教了。教到第三个月，你发现自己已经不记得当初为什么要登记。",
          "回执还压在公会档案里，编号没变。",
        ],
        outcome: {
          stats: { wealth: 400, fame: 10, scheme: 6, faith: -4, int: 4 },
          goal: 9,
          factions: { 阿斯拉王国: 16, 魔术公会: -10, 魔法大学: -6 },
          flag: "ml:the-chantless-heretic:5:sold",
        },
      },
    ],
  },

  /* ---------- 商会的旗子 ---------- */
  {
    id: "ml4-company-firstcoin",
    mainlineId: "greyrat-and-company",
    title: "掉在路上的那枚铜币",
    body: [
      "你数了三遍，确实少了一枚。路就那一条，走回去还能找。",
      "天已经黑了，明天集市还开着。",
    ],
    when: (s) => s.flags.includes("ml:greyrat-and-company:1:started"),
    weight: 1.6,
    options: [
      {
        id: "back",
        label: "摸黑回去找",
        risk: "低",
        lines: [
          "你沿着来路走了一个来回，在第三个岔口的水沟边摸到了它。",
          "回去的时候脚上多了一脚泥。这一枚铜币后来一直没花，你在上面打了个孔，拴在账本上。",
        ],
        outcome: {
          stats: { scheme: 5, int: 3, health: -2 },
          goal: 4,
          flag: "ml:greyrat-and-company:1:coin",
        },
      },
      {
        id: "count",
        label: "不找了。回去把账重记一遍",
        risk: "低",
        lines: [
          "你把今天每一笔进出都重记了一遍，写到第五行发现自己原来记错了一处。",
          "错的那一处值三枚铜币。这比找回一枚更值。",
        ],
        outcome: {
          stats: { int: 6, scheme: 5, wealth: 20 },
          goal: 5,
          notice: "你从第一本账开始就把每一笔都重记一遍，这个习惯留了一辈子。",
        },
      },
      {
        id: "price",
        label: "明天一早改价，把这枚挣回来",
        risk: "中",
        lines: [
          "第二天你把三样货各涨了一枚铜币，卖得比前一天还快。",
          "隔壁摊主看了你一眼，什么也没说，下午也涨了。",
        ],
        outcome: {
          stats: { wealth: 70, charm: -2, scheme: 6, fame: 2 },
          goal: 4,
          flag: "ml:greyrat-and-company:1:priced",
        },
      },
    ],
  },
  {
    id: "ml4-company-shop",
    mainlineId: "greyrat-and-company",
    title: "同一条街上的六个人",
    body: [
      "下市口的六个铺主请你吃了一顿饭。饭桌上说的是天气和收成，散席前才有人提到价钱。",
      "「大家都不容易。定个数，谁也别压谁。」",
      "桌上有人的手一直放在桌子底下。",
    ],
    when: (s) => s.flags.includes("ml:greyrat-and-company:2:shop"),
    weight: 1.6,
    options: [
      {
        id: "join",
        label: "答应，一起定价",
        risk: "低",
        lines: [
          "你答应了。往后一年，这条街上的价钱像一堵墙。",
          "墙里的日子好过，墙外的人开始在城门口摆摊。",
          "第二年城门口的人比街上多。你去看过一趟，没说什么。",
        ],
        outcome: {
          stats: { wealth: 220, scheme: 6, charm: 4, fame: -3 },
          goal: 6,
          flag: "ml:greyrat-and-company:2:pact",
        },
      },
      {
        id: "refuse",
        label: "不答应，但把这顿饭记在账上",
        risk: "中",
        lines: [
          "你说自己的货来路不同，价钱没法跟他们一样。",
          "散席时没有人送你。三个月后你铺子的门被人泼过一回脏水。",
          "你把请人重刷门面的钱也记进了账，记在「往来」那一栏。",
        ],
        outcome: {
          stats: { wealth: -60, scheme: 9, charm: -3, fame: 4 },
          goal: 6,
          flag: "ml:greyrat-and-company:2:outsider",
        },
      },
      {
        id: "buy",
        label: "答应，同时偷偷买下隔壁那间空铺",
        risk: "高",
        lines: [
          "你在饭桌上点头，第二天用别人的名字买了隔壁。",
          "半年后墙里的价钱被你自己从旁边撬开了一道缝。",
          "没有人查得出是你。查得出的是你，这顿饭桌上的人就再也不会请你。",
        ],
        outcome: {
          stats: { wealth: 260, scheme: 12, fame: 5, charm: -4 },
          goal: 8,
          flag: "ml:greyrat-and-company:2:secret",
        },
      },
    ],
  },
  {
    id: "ml4-company-road",
    mainlineId: "greyrat-and-company",
    title: "第三车草药",
    body: [
      "车队出发前一夜，有人来告诉你前头那段路在修桥，绕道要多走十天。",
      "你那三车草药里有半车撑不过十天。",
      "车队里另外两家催你定。",
    ],
    when: (s) => s.flags.includes("ml:greyrat-and-company:3:caravan"),
    weight: 1.6,
    options: [
      {
        id: "dump",
        label: "在本地把草药先卖掉一半",
        risk: "低",
        lines: [
          "本地价低，你按七成出手，亏了一笔，车轻了。",
          "到地方的时候，剩下那半车的价钱补回了亏的那一笔还多一点。",
          "同行的两家走得比你快，也比你空。",
        ],
        outcome: {
          stats: { wealth: 60, int: 6, scheme: 6 },
          goal: 6,
          flag: "ml:greyrat-and-company:3:dump",
        },
      },
      {
        id: "push",
        label: "押上去，走近路",
        risk: "高",
        lines: [
          "走近路省了八天，路上的泥比你记得的深。",
          "到地方的时候草药坏了三成，卖出去的那七成价钱很好。",
          "这一趟赚的钱够买一辆新车，也够你记一辈子那股味道。",
        ],
        outcome: {
          stats: { wealth: 420, scheme: 5, int: 3, health: -6, fame: 4 },
          goal: 8,
          flag: "ml:greyrat-and-company:3:gamble",
        },
      },
      {
        id: "hire",
        label: "花钱雇当地的车和人先把货送出去",
        risk: "中",
        lines: [
          "你把一半的货交给本地一支车队，付了双倍的运钱。",
          "那支车队走了三天，人和货都没了。你去追的时候只找回了两辆空车。",
          "你把这一笔也记进了损耗栏。这是这一栏里最贵的一行。",
        ],
        outcome: {
          stats: { wealth: -260, scheme: 10, int: 5, fame: -3 },
          goal: 7,
          flag: "ml:greyrat-and-company:3:loss",
          notice: "你雇的那支车队带走了一半的货，再没回来。",
        },
      },
    ],
  },
  {
    id: "ml4-company-patronage",
    mainlineId: "greyrat-and-company",
    title: "空白的四条",
    body: [
      "管事把纸推过来，上面留着四条空白。",
      "「第一年不要你的。后面你自己写。」",
      "窗外有马车过去。屋子里很静。",
    ],
    when: (s) => s.flags.includes("ml:greyrat-and-company:4:patron"),
    weight: 1.6,
    options: [
      {
        id: "three",
        label: "写三成，一次谈定，往后不变",
        risk: "低",
        lines: [
          "你写了三成，注明按季结、不另收。",
          "管事看了很久，笑了：「你这写法像我们账房。」",
          "往后六年，这三成没变过。你每年照付，也每年照看那一栏。",
        ],
        outcome: {
          stats: { wealth: 180, scheme: 8, int: 5, charm: 4 },
          goal: 8,
          factions: { 阿斯拉王国: 12 },
          flag: "ml:greyrat-and-company:4:cut",
        },
      },
      {
        id: "half",
        label: "先写一半，换一条只有你能走的路",
        risk: "中",
        lines: [
          "你在第二条上写了五成，条件是这一段商路只发你一个人的牌子。",
          "管事答应了。这条路第二年就替你挣回了让出去的那一半。",
          "第三年别人也拿到了牌子。你去找管事，他说他换人了。",
        ],
        outcome: {
          stats: { wealth: 320, scheme: 10, fame: 6, charm: -3 },
          goal: 8,
          factions: { 阿斯拉王国: 14, 冒险者公会: -4 },
          flag: "ml:greyrat-and-company:4:exclusive",
        },
      },
      {
        id: "none",
        label: "一条都不写，改送他一笔股本",
        risk: "高",
        lines: [
          "你把四条留空，另外写了一张字据：铺子十二股，给他两股。",
          "管事把两张纸并在一起看了半天，收下了。",
          "从此他不再每季来收钱，而每年来看一次账。这比收钱难受得多。",
        ],
        outcome: {
          stats: { wealth: -150, scheme: 7, int: 8, fame: 4 },
          goal: 9,
          factions: { 阿斯拉王国: 8 },
          flag: "ml:greyrat-and-company:4:shares",
        },
      },
    ],
  },
  {
    id: "ml4-company-signboard",
    mainlineId: "greyrat-and-company",
    title: "招牌底下那一行小字",
    body: [
      "写字的人问你要不要在招牌底下加一行小字，「商会」两个字刻上去就抹不掉。",
      "伙计们站在院子里等着。管事的人也在等。",
      "刻字的手艺人已经把凿子举起来了。",
    ],
    when: (s) => s.flags.includes("ml:greyrat-and-company:5:partner"),
    weight: 1.5,
    options: [
      {
        id: "carve",
        label: "刻上去，把股本分给伙计",
        risk: "中",
        lines: [
          "「商会」两个字刻得很浅，太阳晒了两年才显出来。",
          "伙计里头有两个后来自己出去开了铺子，走的时候把账本留给了你。",
          "往后二十年，这块招牌没有换过。",
        ],
        outcome: {
          stats: { wealth: 320, fame: 10, charm: 8, scheme: 4 },
          goal: 12,
          factions: { 阿斯拉王国: 10, 冒险者公会: 8 },
          flag: "ml:greyrat-and-company:5:charter",
        },
      },
      {
        id: "sell",
        label: "不刻。把招牌和路线一起卖掉",
        risk: "中",
        lines: [
          "买家出了个好价，条件是你三年内不许在同一条路上做生意。",
          "钱到账那天你把伙计一个一个叫进来，把该结的结了，多给了一个月。",
          "出门的时候你回头看了一眼那块旧木头。它看上去比实际值钱。",
        ],
        outcome: {
          stats: { wealth: 900, fame: -4, scheme: 8, charm: 4 },
          goal: 10,
          factions: { 阿斯拉王国: 6, 冒险者公会: -6 },
          flag: "ml:greyrat-and-company:5:sold",
        },
      },
      {
        id: "keep",
        label: "只刻自己的名字，不加商会",
        risk: "低",
        lines: [
          "招牌上还是你一个人的名字。伙计们没有说什么，那个最老的把帽子戴回去了。",
          "往后你的生意做得比谁都稳，也做得比谁都小。",
        ],
        outcome: {
          stats: { wealth: 220, scheme: 6, charm: -3, fame: 5 },
          goal: 9,
          flag: "ml:greyrat-and-company:5:alone",
        },
      },
    ],
  },

  /* ---------- 西隆的旗 ---------- */
  {
    id: "ml4-shirone-firstblood",
    mainlineId: "banner-of-shirone",
    title: "麦地边上的第一具尸体",
    body: [
      "打扫战场的时候你走过去看了一眼。倒着的那个人穿的衣服和你队里发的是一个样式，只是颜色不同。",
      "他手里还攥着半块干饼，饼上沾了泥。",
      "教习在后面喊集合。",
    ],
    when: (s) => s.flags.includes("ml:banner-of-shirone:1:enlisted"),
    weight: 1.7,
    options: [
      {
        id: "search",
        label: "翻他的口袋，找出能认人的东西",
        risk: "低",
        lines: [
          "口袋里有一块木牌，刻着名字和一行「第三年」。",
          "你把木牌收进内衬。集合的时候你迟了半步，教习骂了你一句。",
          "三个月后你把木牌交给了路过的一个收尸队。他们说会记下来。",
        ],
        outcome: {
          stats: { scheme: 5, int: 5, fame: 3, faith: 3 },
          goal: 5,
          flag: "ml:banner-of-shirone:1:tag",
          notice: "你收着的那块木牌，后来交给了收尸队。",
        },
      },
      {
        id: "walk",
        label: "什么也不碰，转身归队",
        risk: "低",
        lines: [
          "你转身走了。饼还攥在他手里。",
          "那一夜你睡不着，第二天照常操练，动作比前一天准。",
        ],
        outcome: {
          stats: { sword: 5, health: -2, scheme: 3 },
          tier: { kind: "sword", gain: 8 },
          goal: 4,
        },
      },
      {
        id: "coin",
        label: "把他身上值钱的东西拿走，回头给队里",
        risk: "中",
        lines: [
          "你收了三样：一把小刀、一枚铜环、几枚铜币。",
          "铜币交给了伙夫，说你在地上捡的。小刀你留着用，一直用到刀柄裂开。",
          "铜环没人要。你后来把它拴在了旗杆上。",
        ],
        outcome: {
          stats: { sword: 4, wealth: 50, scheme: 7, fame: -3 },
          goal: 4,
          flag: "ml:banner-of-shirone:1:ring",
        },
      },
    ],
  },
  {
    id: "ml4-shirone-village",
    mainlineId: "banner-of-shirone",
    title: "井绳是新换的",
    body: [
      "村里的老人跟你说：井绳是新换的，因为上个月有兵来这儿取过水，把旧的磨断了。",
      "「他们说是自己人。」他说，「穿的衣裳和你们差不多。」",
      "你没敢问是哪一边的。",
    ],
    when: (s) => s.flags.includes("ml:banner-of-shirone:2:post"),
    weight: 1.7,
    options: [
      {
        id: "report",
        label: "把这件事报上去",
        risk: "低",
        lines: [
          "你写了半页，交到营部。营部的人看完说，这种事不用报。",
          "你把纸收回来，自己留着。三年后这张纸用上了一次。",
        ],
        outcome: {
          stats: { scheme: 6, int: 6, fame: 2 },
          goal: 5,
          flag: "ml:banner-of-shirone:2:report",
        },
      },
      {
        id: "dig",
        label: "自己把这一段前后的驻地查一遍",
        risk: "中",
        lines: [
          "你跑了两个月的路，查清了上个月路过这一带的只有一支队伍，是你们自己的。",
          "你谁也没说。这件事在你心里放了很多年，放成了一个谁也不知道的疙瘩。",
        ],
        outcome: {
          stats: { scheme: 8, int: 5, faith: -3, health: -3 },
          goal: 6,
          flag: "ml:banner-of-shirone:2:dug",
          notice: "你查清了一件不该查清的事，并且谁也没告诉。",
        },
      },
      {
        id: "rope",
        label: "给村里换一根更结实的井绳",
        risk: "低",
        lines: [
          "你从军需里匀了一段绳子——报账时写成「装备损耗」。",
          "老人收下的时候说了句谢谢，然后问了你的名字。这一带记住你的人只有他一个。",
        ],
        outcome: {
          stats: { charm: 6, fame: 4, scheme: 3, wealth: -30 },
          goal: 5,
          starDelta: { match: "", delta: 1, note: "你替他们家换了一根井绳" },
        },
      },
    ],
  },
  {
    id: "ml4-shirone-payroll",
    mainlineId: "banner-of-shirone",
    title: "抚恤要报到上面去核",
    body: [
      "名单报上去四个月了。有个人的妻子第二趟来，站在营门口不进来。",
      "营部的文书跟你说：名单上少了一个人的死亡确认，补不齐就发不下来。",
      "那一个人死在麦地里，同队的人都看见了。",
    ],
    when: (s) => s.flags.includes("ml:banner-of-shirone:3:lost"),
    weight: 1.7,
    options: [
      {
        id: "sign",
        label: "把自己看见的写下来，按手印",
        risk: "低",
        lines: [
          "你写了半页，写的是他倒下的方向和时辰。按手印的时候文书说，按了就算你的。",
          "你按了。抚恤在两个月后发了下来，发的是那一份。",
          "文书把那张纸归档的时候，把「目击者」三个字写得很大。",
        ],
        outcome: {
          stats: { scheme: 7, fame: 6, faith: 4, int: 4 },
          goal: 7,
          factions: { 冒险者公会: 5 },
          flag: "ml:banner-of-shirone:3:witness",
        },
      },
      {
        id: "push",
        label: "把这件事直接捅到营部上面去",
        risk: "中",
        lines: [
          "你越过了两级，把话说到管钱的人面前。",
          "半个月后名单批了下来，你也被调去了另一队，调令上写着「另有任用」。",
          "新队里的人比旧队凶，也更会打仗。",
        ],
        outcome: {
          stats: { fame: 8, scheme: 5, charm: -3, sword: 4 },
          tier: { kind: "sword", gain: 10 },
          goal: 7,
          factions: { 冒险者公会: 8, 阿斯拉王国: -5 },
          flag: "ml:banner-of-shirone:3:crossed",
        },
      },
      {
        id: "pay",
        label: "自己垫上那十二枚银币",
        risk: "低",
        lines: [
          "你把自己攒的十二枚银币包好，托人交给了营门口那个女人。",
          "她问是谁给的。托的人说不知道。",
          "这笔钱你攒了一年半。往后半年你抽不起烟，也没提过这件事。",
        ],
        outcome: {
          stats: { wealth: -140, charm: 5, faith: 6, fame: 3 },
          goal: 7,
          starDelta: { match: "", delta: 2, note: "你替一个没能回来的人把抚恤垫上了" },
          flag: "ml:banner-of-shirone:3:pocket",
        },
      },
    ],
  },
  {
    id: "ml4-shirone-order",
    mainlineId: "banner-of-shirone",
    title: "两个章的军令",
    body: [
      "命令上盖着两个章。第一个是你认得的营章，第二个你没见过，边上有个很小的记号。",
      "传令的人站在你面前，手按着刀，等你说话。",
      "身后是十个人。前面是一条界石。界石那一边有一个村子，村里有老人、井和一座不转的磨坊。",
    ],
    when: (s) => s.flags.includes("ml:banner-of-shirone:4:hungry"),
    weight: 1.7,
    options: [
      {
        id: "obey",
        label: "照令执行",
        risk: "高",
        lines: [
          "你们过了界石。粮仓里确实有粮，也有几个不肯走的人。",
          "事情做完，你把每一个人的名字记了下来，写了三页。",
          "回营的路上没有人说话。从那以后你不再问命令是谁写的。",
        ],
        outcome: {
          stats: { sword: 6, fame: 8, scheme: 6, faith: -8, health: -5 },
          tier: { kind: "sword", gain: 12 },
          goal: 8,
          factions: { 阿斯拉王国: 10, 冒险者公会: 4 },
          flag: "ml:banner-of-shirone:4:obeyed",
          notice: "你在那一段路上执行了命令，并且把名字都记了下来。",
        },
      },
      {
        id: "stall",
        label: "停在界石这一侧，等一份新地图",
        risk: "中",
        lines: [
          "你把队伍停在界石边上，派人回去要地图。",
          "回话的人第二天带回一张空白的纸。你按着那张纸在原地待了五天。",
          "上头没有追究，也没有再提这件事。你被调走了，调得比谁都远。",
        ],
        outcome: {
          stats: { scheme: 9, int: 7, fame: -4, faith: 5 },
          goal: 7,
          factions: { 阿斯拉王国: -8, 冒险者公会: 5 },
          flag: "ml:banner-of-shirone:4:refused",
        },
      },
      {
        id: "tell",
        label: "当众把命令上的第二个章问出来",
        risk: "高",
        lines: [
          "你问传令的人第二个章是谁的。他没有答，把刀往前推了半寸。",
          "你还是没有动。队伍里有两个老兵站出来，站在了你后面。",
          "那天晚上传令的人自己走了。你带着十个人原路回了营。",
        ],
        outcome: {
          stats: { scheme: 10, charm: 8, fame: 6, faith: 6, health: -4 },
          goal: 8,
          starDelta: { match: "", delta: 2, note: "他们跟着你一起没有动" },
          factions: { 冒险者公会: 10, 阿斯拉王国: -10 },
          flag: "ml:banner-of-shirone:4:stood",
        },
      },
    ],
  },
  {
    id: "ml4-shirone-banner",
    mainlineId: "banner-of-shirone",
    title: "柜子里的那笔钱",
    body: [
      "抚恤第三次发下来，名单上两个名字找不到家人。钱留在了营部的柜子里，记在一个没人会翻的本子上。",
      "管柜子的人把钥匙给你看了一眼，说这事他做不了主。",
      "走廊尽头有人在换地毯。",
    ],
    when: (s) => s.flags.includes("ml:banner-of-shirone:5:camp"),
    weight: 1.7,
    options: [
      {
        id: "leave",
        label: "照规矩留在柜子里，把名单递全",
        risk: "低",
        lines: [
          "你把名单重新抄了一份，连同找不到家人的注记一起递了上去。",
          "钱留在柜子里。你在那本没人翻的本子上多写了一行日期。",
          "往后每年你都去翻一次。七年里有两年那笔钱还在。",
        ],
        outcome: {
          stats: { scheme: 7, fame: 8, faith: 5, int: 4 },
          goal: 9,
          factions: { 冒险者公会: 8, 阿斯拉王国: 5 },
          flag: "ml:banner-of-shirone:5:stand",
        },
      },
      {
        id: "take",
        label: "自己把这笔钱送出去",
        risk: "中",
        lines: [
          "你以「遗留抚恤」的名义把钱分给了三个死者的旧邻，一家一份，记了名字。",
          "有人问你凭什么。你说凭我在麦地里数过他们。",
          "这事上了营里的通报，措辞是「未经授权」。通报之后那笔钱再没进过柜子。",
        ],
        outcome: {
          stats: { charm: 8, fame: 10, scheme: 5, faith: 6, wealth: -60 },
          goal: 10,
          factions: { 冒险者公会: 12, 阿斯拉王国: -5 },
          flag: "ml:banner-of-shirone:5:paidout",
          notice: "你把那笔没人认领的抚恤，自己送了出去。",
        },
      },
      {
        id: "quit",
        label: "把册子留在营地，然后走",
        risk: "中",
        lines: [
          "你把册子交给了最老的那个兵，交代他每年拿出来念一遍。",
          "出营门的时候你没有回头。这份工钱你结清了，这件事你没有结清。",
        ],
        outcome: {
          stats: { scheme: 8, int: 6, health: 5, fame: -5, faith: 4 },
          goal: 8,
          lifespan: 1,
          factions: { 冒险者公会: 4 },
          flag: "ml:banner-of-shirone:5:left",
        },
      },
    ],
  },

  /* ---------- 被诅咒的血脉 ---------- */
  {
    id: "ml4-curse-village",
    mainlineId: "curse-of-the-blood",
    title: "夜里那两头牲口",
    body: [
      "村里的老人把你叫到磨坊后面，说起了你出生那天的事。",
      "「两头牲口，一滴血都没有。那时候没人敢说，现在说了也没人信。」",
      "他从怀里摸出一块旧木牌，上面刻着一个你不认得的记号。",
    ],
    when: (s) => s.flags.includes("ml:curse-of-the-blood:1:noticed"),
    weight: 1.7,
    options: [
      {
        id: "take",
        label: "收下木牌，问清记号是谁刻的",
        risk: "低",
        lines: [
          "他说刻记号的人四十年前来过一趟，穿的是教会的衣服，走的时候带走了村里两个孩子的名字。",
          "木牌你收进内衬。往后每次发作之前，你都会先摸一下它。",
        ],
        outcome: {
          stats: { int: 6, scheme: 5, faith: 4 },
          goal: 5,
          flag: "ml:curse-of-the-blood:1:token",
        },
      },
      {
        id: "burn",
        label: "让他把木牌烧了",
        risk: "低",
        lines: [
          "老人把木牌丢进了灶里。烧的时候有一股很淡的焦味，不像木头。",
          "他坐下来没有再说话。你在他家坐到天亮。",
        ],
        outcome: {
          stats: { faith: 6, int: 4, scheme: 3, health: 3 },
          goal: 5,
          flag: "ml:curse-of-the-blood:1:burned",
        },
      },
      {
        id: "ask",
        label: "追问他那两个孩子的名字",
        risk: "中",
        lines: [
          "他想了很久，说出一个名字，说完自己愣住了：「不对，是另一个。」",
          "他记得有两个孩子，却只记得一个名字，而且那个名字他说不准。",
          "从那天起你开始怀疑：这一带被划掉的名字，可能不止教会那一份册子上有。",
        ],
        outcome: {
          stats: { scheme: 8, int: 7, faith: -3, mana: 3 },
          goal: 6,
          flag: "ml:curse-of-the-blood:1:names",
          notice: "你知道了村里有两个被带走的孩子，名字已经没人说得准。",
        },
      },
    ],
  },
  {
    id: "ml4-curse-registry",
    mainlineId: "curse-of-the-blood",
    title: "借阅记录上的第四个人名",
    body: [
      "关于诅咒的那排书架上，借阅记录只有四个人名，第一个的名字被划掉了。",
      "第四个名字的日期是去年。",
      "登记表上写着：借阅人已迁出夏利亚。",
    ],
    when: (s) => s.flags.includes("ml:curse-of-the-blood:2:file"),
    weight: 1.7,
    options: [
      {
        id: "trace",
        label: "照着这个名字查他迁到哪儿了",
        risk: "中",
        lines: [
          "你查了三个月，查到那个人去了米里斯，用的是另一个名字。",
          "再往后就断了。断得很干净，像是有人替他抹过。",
        ],
        outcome: {
          stats: { scheme: 9, int: 6, faith: -3 },
          goal: 6,
          factions: { 米里斯教团: -4 },
          flag: "ml:curse-of-the-blood:2:traced",
        },
      },
      {
        id: "write",
        label: "把自己写成第五个名字",
        risk: "低",
        lines: [
          "你在登记表上写下名字和日期，用的是真名，写得很清楚。",
          "管理员看了你一眼，什么也没问。",
          "往后再有人来查这排书架，会看到五个名字，其中两个还能找到。",
        ],
        outcome: {
          stats: { scheme: 6, fame: 5, int: 5, faith: 3 },
          goal: 6,
          factions: { 魔法大学: 8 },
          flag: "ml:curse-of-the-blood:2:registered",
          notice: "书架的借阅记录上，第五个名字是你自己写的。",
        },
      },
      {
        id: "erase",
        label: "把被划掉的那个名字尽力恢复出来",
        risk: "高",
        lines: [
          "你对着灯照了三个晚上，认出两个字，第三个字磨得太狠。",
          "你把认出来的两个字记下，谁也没说。",
          "这两个字你后来在别处又见过一次，见的时候你已经不惊讶了。",
        ],
        outcome: {
          stats: { int: 9, scheme: 8, mana: 4 },
          goal: 7,
          tier: { kind: "magic", gain: 10 },
          factions: { 魔法大学: 4, 米里斯教团: -5 },
          flag: "ml:curse-of-the-blood:2:restored",
        },
      },
    ],
  },
  {
    id: "ml4-curse-purge",
    mainlineId: "curse-of-the-blood",
    title: "石台上的那一趟",
    body: [
      "三个人按着你的手腕，第三个人在念。念到一半你的手开始发烫。",
      "念的人没有停。旁边有人在记录，笔尖压得很重。",
      "石台是凉的，凉得很干。",
    ],
    when: (s) => s.flags.includes("ml:curse-of-the-blood:3:archive"),
    weight: 1.7,
    options: [
      {
        id: "endure",
        label: "坐着不动，让它念完",
        risk: "中",
        lines: [
          "念完的时候手心已经烫出了印子，印子半个月才退。",
          "结论写了三行：血脉异常，非恶魔，宜继续观察。",
          "你走出侧门的时候天在下雨。你没撑伞，走了一段才想起来自己有伞。",
        ],
        outcome: {
          stats: { faith: 8, mana: 7, int: 5, health: -8 },
          goal: 7,
          tier: { kind: "magic", gain: 10 },
          factions: { 米里斯教团: 12, 魔法大学: -4 },
          flag: "ml:curse-of-the-blood:3:endured",
        },
      },
      {
        id: "resist",
        label: "在石台上把它压回去",
        risk: "高",
        lines: [
          "你把手往回收，收得很慢，但确实是收回来的。",
          "念的人停了。屋里三个人的表情你记住了两个。",
          "结论上多了一行：被试具有抑制能力。这一行比上一行值钱，也比上一行难听。",
        ],
        outcome: {
          stats: { mana: 10, int: 6, faith: -4, scheme: 6, health: -6 },
          goal: 7,
          factions: { 米里斯教团: -6, 魔法大学: 8, 阿斯拉王国: 5 },
          flag: "ml:curse-of-the-blood:3:resisted",
          notice: "教会那份结论上，把你的名字后面加了一句「具有抑制能力」。",
        },
      },
      {
        id: "ask",
        label: "念完之后问他们要那三个被划掉的名字",
        risk: "中",
        lines: [
          "你把三个名字写出来，推到桌子中间。",
          "记录的人停了笔，念的人笑了：「你查得比我们自己还细。」",
          "他没有回答，但把那张纸收进了袖子。收进袖子这个动作，本身就是一种回答。",
        ],
        outcome: {
          stats: { scheme: 10, int: 7, faith: -2, charm: 4 },
          goal: 8,
          factions: { 米里斯教团: -5 },
          flag: "ml:curse-of-the-blood:3:asked",
        },
      },
    ],
  },
  {
    id: "ml4-curse-court",
    mainlineId: "curse-of-the-blood",
    title: "铜环顶到格子边上的那一下",
    body: [
      "使者把铜环收起来的时候，指针还在抖。",
      "「这东西能做的事，你自己清楚。」他说，「我们要的不多，你只要站在我们这边。」",
      "请帖上已经写好了你的名字，字很好看。",
    ],
    when: (s) => s.flags.includes("ml:curse-of-the-blood:4:split"),
    weight: 1.7,
    options: [
      {
        id: "deal",
        label: "谈条件：站在你们这边，但要写明白写什么、不写什么",
        risk: "中",
        lines: [
          "你写了三条，其中第二条是「不用于教会审判」。",
          "使者看了半天，说第二条要回去问。三天后他回来说可以。",
          "往后每年你替他们做一件事，都不写在纸上。你的名字上过一次宫廷的名册。",
        ],
        outcome: {
          stats: { scheme: 9, int: 7, fame: 8, charm: 5, faith: -3 },
          goal: 9,
          factions: { 阿斯拉王国: 16, 米里斯教团: -6 },
          flag: "ml:curse-of-the-blood:4:deal",
        },
      },
      {
        id: "use",
        label: "先答应，然后用他们的资源把自己的底细查清",
        risk: "高",
        lines: [
          "你进了他们的档案库，翻了两年，翻到了三份关于你这种人的旧报告。",
          "三份报告的结论都不一样，写报告的人有一个是教会的人，一个是大学的人，第三个没署名。",
          "你抄完之后把原件放了回去，位置一丝不差。",
        ],
        outcome: {
          stats: { scheme: 12, int: 9, fame: 5, faith: -4 },
          goal: 9,
          tier: { kind: "magic", gain: 12 },
          factions: { 阿斯拉王国: 8, 魔术公会: -5 },
          flag: "ml:curse-of-the-blood:4:dug",
          notice: "你翻到了三份关于「你这种人」的旧报告，结论互相矛盾。",
        },
      },
      {
        id: "refuse",
        label: "把请帖退回去",
        risk: "高",
        lines: [
          "你把请帖放进信封，封了口，让人送回去。",
          "三个月后你的房租被人抬了两倍，铺子对面的那间屋搬进来一户不与人来往的人家。",
          "你搬去了夏利亚。这里的人问的问题不一样。",
        ],
        outcome: {
          stats: { int: 6, faith: 6, fame: -5, scheme: 5, mana: 4 },
          goal: 8,
          factions: { 阿斯拉王国: -10, 魔法大学: 8, 米里斯教团: 4 },
          flag: "ml:curse-of-the-blood:4:refused",
        },
      },
    ],
  },
  {
    id: "ml4-curse-disposal",
    mainlineId: "curse-of-the-blood",
    title: "三份方案",
    body: [
      "教会的方案最短：可以封住，从此不再发作，代价是你也不再能用它。",
      "学者的方案最长：可以从血里剥出来，代价是要在你身上先开一个口子，成败各半。",
      "宫廷的方案最客气：给它一个名字，收进库里，你每年去签一次字。",
      "三张纸摆在同一张桌上。屋子外面有人在等你回话。",
    ],
    when: (s) => s.flags.includes("ml:curse-of-the-blood:5:closed"),
    weight: 1.7,
    options: [
      {
        id: "keep",
        label: "留着，自己压住它",
        risk: "高",
        lines: [
          "你把三张纸收进箱子，锁上。往后每年发作的时候你一个人按回去。",
          "教会的观察信一年一封，措辞一年比一年客气。学者的记录你不再看了。",
          "手上的温度还在。你已经能提前半个时辰知道它要来。",
        ],
        outcome: {
          stats: { mana: 12, int: 8, scheme: 6, faith: 5, health: -6 },
          goal: 12,
          lifespan: 1,
          factions: { 魔法大学: 8, 米里斯教团: 5, 阿斯拉王国: -4 },
          flag: "ml:curse-of-the-blood:5:kept",
        },
      },
      {
        id: "seal",
        label: "让教会封住它",
        risk: "低",
        lines: [
          "仪式做了两天。第二天下午手上的温度退了，退得很干净，像从来没有过。",
          "往后你搬东西要分两趟，放魔术的时候也要开口。夜里睡觉再也不必把手放在被子外面。",
          "那本册子你留着。翻到某一页的时候，你会怀疑那些字是不是自己写的。",
        ],
        outcome: {
          stats: { faith: 12, health: 10, mana: -12, sword: -4, int: 4 },
          goal: 10,
          lifespan: 1,
          factions: { 米里斯教团: 16, 魔法大学: -6 },
          flag: "ml:curse-of-the-blood:5:sealed",
        },
      },
      {
        id: "cut",
        label: "让他们剥出来",
        risk: "高",
        lines: [
          "口子开在左肋，剥出来的东西装在一个铜匣里，匣子重得不像装着那么点东西。",
          "手术中间你醒过一次。醒着的时候你看清了站在旁边那些人脸上的表情。",
          "那之后你的手是凉的。府上收走了铜匣，你拿到一张收据。",
        ],
        outcome: {
          stats: { mana: -8, int: 12, scheme: 8, faith: -6, health: -12, fame: 6 },
          goal: 12,
          lifespan: -2,
          factions: { 阿斯拉王国: 14, 魔法大学: 10, 米里斯教团: -8 },
          flag: "ml:curse-of-the-blood:5:cut",
          notice: "你身上少了一样东西，它被装进铜匣带走了。",
        },
      },
    ],
  },

  /* ---------- 另一个世界的影子 ---------- */
  {
    id: "ml4-ghost-library",
    mainlineId: "another-worlds-ghost",
    title: "借不借那本《水系缩短咏唱考》",
    body: [
      "她问的是第三排靠里那一本。那本书在这座书库里放了十几年，借阅记录只有三条。",
      "「你不借的话，我也不借。」她说这句话的时候在看自己的手。",
      "书库管理员在另一头整理架子，翻书的声音很规律。",
    ],
    when: (s) => s.flags.includes("ml:another-worlds-ghost:1:shelf"),
    weight: 1.8,
    options: [
      {
        id: "together",
        label: "提议一起看，谁也别登记",
        risk: "中",
        lines: [
          "你们把书搬到最里层的桌上，谁也没有在登记表上写字。",
          "书里夹着一张纸，上面是别人的字迹，抄的是一段和缩咏唱没关系的东西。",
          "她把那张纸对折了一次，放进了自己的袖口。",
        ],
        outcome: {
          stats: { int: 7, scheme: 6, mana: 4 },
          goal: 5,
          starDelta: { match: "", delta: 2, note: "你们一起在书库里看了同一本书" },
          factions: { 魔法大学: 3 },
          flag: "ml:another-worlds-ghost:1:paper",
        },
      },
      {
        id: "register",
        label: "照规矩借，登记自己的名字",
        risk: "低",
        lines: [
          "你在登记表上写下名字。她看了你一眼，转身走了。",
          "书借出来三天，里面没有夹任何东西。",
          "第四天她又在同一个位置坐下，坐得比原来远半张桌子。",
        ],
        outcome: {
          stats: { int: 6, faith: 3, scheme: 3 },
          goal: 5,
          factions: { 魔法大学: 7 },
          flag: "ml:another-worlds-ghost:1:registered",
        },
      },
      {
        id: "leave",
        label: "不借，也不搭话",
        risk: "低",
        lines: [
          "你说自己不借这本，起身去了另一排架子。",
          "半个月后她换了个位置坐，坐到了你能看见的那一侧。",
          "你们谁都没有先开口，但书库最里层从此有了两个人的位置。",
        ],
        outcome: {
          stats: { scheme: 5, int: 4, charm: 2 },
          goal: 4,
          flag: "ml:another-worlds-ghost:1:silent",
        },
      },
    ],
  },
  {
    id: "ml4-ghost-fellow",
    mainlineId: "another-worlds-ghost",
    title: "第七个人没有名字",
    body: [
      "六个人的名字凑齐了，第七个只有一条线索：他不住在城里，而且每两年才来一趟书库。",
      "有人说他是被召唤来的，也有人说他是自己找过来的。",
      "抄书的人告诉你：别去找第七个。这是她第一次主动跟你说一句多余的话。",
    ],
    when: (s) => s.flags.includes("ml:another-worlds-ghost:2:found"),
    weight: 1.8,
    options: [
      {
        id: "wait",
        label: "听她的，不去找",
        risk: "低",
        lines: [
          "你没有去找。那年冬天第七个人没来，第二年也没来。",
          "你把六个人的话整理成了一份东西，整理完发现空的那一处正好是第七个的位置。",
          "你把那份东西收起来，没有给任何人看。",
        ],
        outcome: {
          stats: { scheme: 7, int: 6, faith: 4 },
          goal: 6,
          starDelta: { match: "", delta: 1, note: "你听了她的话" },
          flag: "ml:another-worlds-ghost:2:waited",
        },
      },
      {
        id: "hunt",
        label: "自己去找",
        risk: "高",
        lines: [
          "你跑了三个地方，最后在一处渡口等到了他。",
          "他比你想的年轻，说话很客气，客气得像在念一段背过的话。",
          "你问他从哪儿来。他说了一个地名，那个地名你确定存在过，只是不存在于这个世界。",
        ],
        outcome: {
          stats: { scheme: 10, int: 8, charm: 4, faith: -4 },
          goal: 8,
          flag: "ml:another-worlds-ghost:2:seventh",
          notice: "你见到了第七个人，并且听到了一个不属于这个世界的地名。",
        },
      },
      {
        id: "ask",
        label: "先问清她为什么不愿你去找他",
        risk: "中",
        lines: [
          "她沉默了很久，最后说：「因为他找过路，而且他找到过。」",
          "你问然后呢。她说：然后他就不太像原来那个人了。",
          "这句话你记在了册子上，记的时候手停了一下。",
        ],
        outcome: {
          stats: { int: 8, scheme: 6, faith: 3, mana: 3 },
          goal: 7,
          starDelta: { match: "", delta: 1, note: "她跟你说了不该说的一句" },
          flag: "ml:another-worlds-ghost:2:told",
        },
      },
    ],
  },
  {
    id: "ml4-ghost-fragment",
    mainlineId: "another-worlds-ghost",
    title: "第十一页是空的",
    body: [
      "两份抄本摆在桌上。差别只有三处，都在收尾：一份把话说完，一份把话截断。",
      "第十一页是空的，空的那一页有折痕，折痕很旧。",
      "你已经用过一次了。你还想再用一次。",
    ],
    when: (s) => s.flags.includes("ml:another-worlds-ghost:3:used"),
    weight: 1.8,
    options: [
      {
        id: "again",
        label: "再用一次，用在一件要紧的事上",
        risk: "高",
        lines: [
          "你把那件事的顺序改了。改完，你确定它发生过，也确定自己完全不记得细节。",
          "那天晚上你翻遍册子，找不到自己昨天写了什么。",
          "你在第十一页写下第一个字，笔尖顿了一下。",
        ],
        outcome: {
          stats: { int: 8, mana: 8, scheme: 8, health: -6 },
          goal: 8,
          lifespan: -3,
          flag: "ml:another-worlds-ghost:3:twice",
          notice: "你用了第二次。你确定自己忘掉了一件要紧的事。",
        },
      },
      {
        id: "stop",
        label: "把残篇收起来，先不动",
        risk: "低",
        lines: [
          "你把十一页按顺序叠好，用布包上，放进箱子里。",
          "往后半年你一次都没打开。第七个月你去看了它一眼，布上落了灰。",
          "那天你终于想清楚第十一页是留给谁的。",
        ],
        outcome: {
          stats: { int: 7, faith: 6, scheme: 5, health: 4 },
          goal: 7,
          flag: "ml:another-worlds-ghost:3:sealed",
        },
      },
      {
        id: "give",
        label: "把残篇交给抄书的人保管",
        risk: "中",
        lines: [
          "她把十一页收进了一个铁盒，铁盒外面缠了三道绳。",
          "「你要是哪天来跟我要，我就知道你已经用过了。」她说。",
          "你把这句话抄进了册子，抄在最后一页。",
        ],
        outcome: {
          stats: { scheme: 8, int: 6, faith: 5 },
          goal: 7,
          starDelta: { match: "", delta: 2, note: "你把那卷残篇交给了她保管" },
          flag: "ml:another-worlds-ghost:3:custody",
        },
      },
    ],
  },
  {
    id: "ml4-ghost-memory",
    mainlineId: "another-worlds-ghost",
    title: "窗朝东的那间屋子",
    body: [
      "他记得窗朝东，桌上有两副碗筷。档案里写着，重建的时候朝东和朝西的屋子换过位置。",
      "也就是说，你们都可能是对的。",
      "他问你：那两副碗筷怎么解释。你答不上来。",
    ],
    when: (s) => s.flags.includes("ml:another-worlds-ghost:4:gap"),
    weight: 1.8,
    options: [
      {
        id: "third",
        label: "把第三种可能说出来：那段记忆是别人放进去的",
        risk: "高",
        lines: [
          "你说完，他脸上的表情变了，变得很轻，像卸下了一件东西。",
          "「我一直不敢说这四个字。」他说，「说了就好像是我自己弄丢的。」",
          "你们把两本册子并排放在一起，从那天起各写各的，谁也不改对方的字。",
        ],
        outcome: {
          stats: { int: 10, scheme: 8, faith: 4, health: -5 },
          goal: 9,
          lifespan: -1,
          starDelta: { match: "", delta: 2, note: "你替他说出了那四个字" },
          flag: "ml:another-worlds-ghost:4:third",
        },
      },
      {
        id: "concede",
        label: "认下是自己记错了",
        risk: "低",
        lines: [
          "你说可能是自己记错了。他把这句话接了过去，接得很快。",
          "往后你们不再提这件事。他每年还是会来一趟，坐一会儿就走。",
          "你把两本册子收进同一只箱子，锁上，把钥匙放在了自己的抽屉里。",
        ],
        outcome: {
          stats: { scheme: 6, charm: 5, faith: 3, int: 4 },
          goal: 7,
          flag: "ml:another-worlds-ghost:4:conceded",
        },
      },
      {
        id: "check",
        label: "去查那两副碗筷",
        risk: "中",
        lines: [
          "你查了半年。那一片住过的人家留下来的东西里，确实有几户是两副碗筷。",
          "其中一户姓什么你不知道，只知道那家人后来搬走了，搬走的那一年正好是他说的那一年。",
          "你把这条线记下来，没有告诉他。有些线留着比拉直好。",
        ],
        outcome: {
          stats: { int: 9, scheme: 9, faith: 3 },
          goal: 8,
          flag: "ml:another-worlds-ghost:4:checked",
          notice: "你查到一户搬走的人家，年份和他说的对得上。",
        },
      },
    ],
  },
  {
    id: "ml4-ghost-leave",
    mainlineId: "another-worlds-ghost",
    title: "那份文书上的第二种写法",
    body: [
      "文书有两处可以填：一处写「已封存，不得动用」，另一处写「已封存，交某人保管」。",
      "要走的人跟你要一个明确的答复。留下的人也在等。",
      "你把笔拿起来的时候，窗外天已经黑了。",
    ],
    when: (s) => s.flags.includes("ml:another-worlds-ghost:5:sealed"),
    weight: 1.8,
    options: [
      {
        id: "custody",
        label: "填「交某人保管」，写上抄书人的名字",
        risk: "中",
        lines: [
          "你写下她的名字。管文书的人抬头看了你一眼，说他认得这个名字。",
          "要走的人当天夜里就出发了。走之前他把自己的册子留在了书库最里层那张桌上。",
          "你后来每年去看一次。册子每年多一页，字迹一直没变。",
        ],
        outcome: {
          stats: { int: 9, faith: 8, charm: 7, scheme: 6, fame: 6 },
          goal: 12,
          factions: { 魔法大学: 10, 魔术公会: 4 },
          flag: "ml:another-worlds-ghost:5:stand",
        },
      },
      {
        id: "burn",
        label: "当场把残篇烧掉",
        risk: "高",
        lines: [
          "你把十一页丢进了火里。烧的时候有一声很轻的响，像有人在很远的地方叹气。",
          "要走的两个人里有一个脸色变了，另一个什么也没说，转身走了出去。",
          "往后没有人再提起这条路。你偶尔会想：自己是不是也烧掉了某一段。",
        ],
        outcome: {
          stats: { faith: 10, int: 8, scheme: 8, fame: -5, health: -6 },
          goal: 12,
          lifespan: -1,
          factions: { 魔术公会: 8, 魔法大学: -6, 阿斯拉王国: -4 },
          flag: "ml:another-worlds-ghost:5:burned",
          notice: "你把时间魔术的残篇当场烧掉了。",
        },
      },
      {
        id: "join",
        label: "问一句：那条路还能带几个人",
        risk: "高",
        lines: [
          "对方答得很干脆：两个，其中一个是替另一个留的。",
          "你看了那张纸很久，最后把笔放下了。",
          "出门的时候你听见里面有人在翻册子。你没有回头。",
        ],
        outcome: {
          stats: { int: 7, scheme: 10, faith: -6, charm: 4, health: -4 },
          goal: 10,
          lifespan: -1,
          factions: { 阿斯拉王国: 6, 魔法大学: -4 },
          flag: "ml:another-worlds-ghost:5:asked",
        },
      },
    ],
  },
];

/* ==================================================================== *
 * 章节 → 事件 id / flag 对照表
 * ==================================================================== *
 *
 * the-chantless-heretic 无咏唱的异端
 *   heretic-1 名分      event: ml4-heretic-entrance     flag: ml:the-chantless-heretic:1:sharia / :enrolled
 *                                                            事件内可选 :blank / :hidden / :seen
 *   heretic-2 混成      event: ml4-heretic-experiment    flag: ml:the-chantless-heretic:2:lab / :notes
 *                                                            事件内可选 :copied / :trusted / :restraint
 *   heretic-3 登记      event: ml4-heretic-registry      flag: ml:the-chantless-heretic:3:filed / :refused
 *                                                            事件内可选 :limited / :copied
 *   heretic-4 抄本      event: ml4-heretic-signature     flag: ml:the-chantless-heretic:4:understood / :pressed
 *                                                            事件内可选 :signed / :alone / :traded
 *   heretic-5 公开      event: ml4-heretic-public        flag: ml:the-chantless-heretic:5:patron / :claim
 *                                                            事件内可选 :published / :kept / :sold
 *
 * greyrat-and-company 商会的旗子
 *   greyrat-1 七颗鸡蛋  event: ml4-company-firstcoin    flag: ml:greyrat-and-company:1:started / :ledger
 *                                                            事件内可选 :coin / :priced
 *   greyrat-2 罗亚的铺面 event: ml4-company-shop        flag: ml:greyrat-and-company:2:shop / :route
 *                                                            事件内可选 :pact / :outsider / :secret
 *   greyrat-3 一支商队  event: ml4-company-road         flag: ml:greyrat-and-company:3:caravan / :loss
 *                                                            事件内可选 :dump / :gamble
 *   greyrat-4 庇护的价钱 event: ml4-company-patronage   flag: ml:greyrat-and-company:4:patron / :cut
 *                                                            事件内可选 :exclusive / :shares
 *   greyrat-5 一块招牌  event: ml4-company-signboard    flag: ml:greyrat-and-company:5:partner / :charter
 *                                                            事件内可选 :sold / :alone
 *
 * banner-of-shirone 西隆的旗
 *   shirone-1 编入队列  event: ml4-shirone-firstblood   flag: ml:banner-of-shirone:1:enlisted / :first
 *                                                            事件内可选 :tag / :ring
 *   shirone-2 边村      event: ml4-shirone-village      flag: ml:banner-of-shirone:2:post / :march
 *                                                            事件内可选 :report / :dug
 *   shirone-3 伍长      event: ml4-shirone-payroll      flag: ml:banner-of-shirone:3:line / :lost
 *                                                            事件内可选 :witness / :crossed / :pocket
 *   shirone-4 不该打的仗 event: ml4-shirone-order       flag: ml:banner-of-shirone:4:hungry / :refused / :desert
 *                                                            事件内可选 :obeyed / :stood
 *   shirone-5 抚恤      event: ml4-shirone-banner       flag: ml:banner-of-shirone:5:camp / :roll / :stand
 *                                                            事件内可选 :paidout / :left
 *
 * curse-of-the-blood 被诅咒的血脉
 *   curse-1 说不清的东西 event: ml4-curse-village       flag: ml:curse-of-the-blood:1:noticed / :diary
 *                                                            事件内可选 :token / :burned / :names
 *   curse-2 名册        event: ml4-curse-registry       flag: ml:curse-of-the-blood:2:file / :scholar
 *                                                            事件内可选 :traced / :registered / :restored
 *   curse-3 净化        event: ml4-curse-purge          flag: ml:curse-of-the-blood:3:archive / :endured
 *                                                            事件内可选 :resisted / :asked
 *   curse-4 用你        event: ml4-curse-court          flag: ml:curse-of-the-blood:4:split / :kept
 *                                                            事件内可选 :deal / :dug / :refused
 *   curse-5 处置        event: ml4-curse-disposal       flag: ml:curse-of-the-blood:5:closed / :kept
 *                                                            事件内可选 :sealed / :cut
 *
 * another-worlds-ghost 另一个世界的影子
 *   ghost-1 抄书的人    event: ml4-ghost-library         flag: ml:another-worlds-ghost:1:shelf / :met
 *                                                            事件内可选 :paper / :registered / :silent
 *   ghost-2 同乡        event: ml4-ghost-fellow          flag: ml:another-worlds-ghost:2:found / :trust
 *                                                            事件内可选 :waited / :seventh / :told
 *   ghost-3 残篇        event: ml4-ghost-fragment        flag: ml:another-worlds-ghost:3:used / :halfread
 *                                                            事件内可选 :twice / :sealed / :custody
 *   ghost-4 对不上的一段 event: ml4-ghost-memory         flag: ml:another-worlds-ghost:4:gap / :limit
 *                                                            事件内可选 :third / :conceded / :checked
 *   ghost-5 留下        event: ml4-ghost-leave           flag: ml:another-worlds-ghost:5:sealed / :letter / :stand
 *                                                            事件内可选 :custody / :burned / :asked
 */
