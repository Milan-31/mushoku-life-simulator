import type { SceneGate } from "./scenes";

/**
 * 原作地点表。
 *
 * 这里只放「地方」本身：它是哪一块大陆上的哪座城，原著里在那儿发生过什么，
 * 以及从别处走不走得过去。每个地点对应一个剧情场景（见 scenes.ts 的 place-*），
 * 场景里挂着这个地方专有的行动命令。
 *
 * 两条规矩：
 * - residence 必须与创建界面的所在地选项逐字一致，否则迁居过去以后场景对不上。
 * - unlock 只写数据，不写闭包。走不过去时面板上直接写清缺什么。
 */

export interface PlaceDef {
  id: string;
  /** 与 creation.ts 的 RESIDENCES 完全一致的所在地字符串 */
  residence: string;
  name: string;
  /** 属于哪块大陆、哪个国家 */
  region: string;
  /** 场景面板标题下的一句描述 */
  desc: string;
  /** 原作里的位置说明，写在迁居面板上 */
  canon: string;
  /** 对应的剧情场景 id */
  sceneId: string;
  /** 场景出现的门槛。不填就是「人在此地就出现」 */
  sceneGate?: SceneGate;
  /** 迁居门槛。不填表示随时可以去 */
  unlock?: SceneGate;
}

export const PLACES: PlaceDef[] = [
  {
    id: "buena",
    residence: "布耶纳村",
    name: "布耶纳村",
    region: "阿斯拉王国 · 菲托亚领",
    desc: "麦田、牲口、驻在骑士的院子。这里的事没人记，也没人停。",
    canon: "菲托亚领东北部的农业村庄。保罗·格雷拉特在这里当驻在骑士，鲁迪乌斯出生在这里。甲龙历 417 年，整个领地在转移事件中消失。",
    sceneId: "place-buena",
    // 转移之后，村子还在原地，但已经不是原来那个村子了
    sceneGate: { residence: ["布耶纳村"], notFlag: "transferSurvived" },
  },
  {
    id: "roa",
    residence: "罗亚町",
    name: "罗亚町",
    region: "阿斯拉王国 · 菲托亚领首府",
    desc: "城墙、宅邸的尖顶、公会的委托板，还有几条不必让人看见的巷子。",
    canon: "四大上级贵族之首伯雷亚斯·格雷拉特家的居城。艾莉丝在这里长大，鲁迪乌斯十岁那年被请来给她当家教。",
    sceneId: "place-roa",
    sceneGate: { residence: ["罗亚町"], notFlag: "transferSurvived" },
  },
  {
    id: "ars",
    residence: "王都亚尔斯",
    name: "王都亚尔斯",
    region: "阿斯拉王国 · 王都",
    desc: "石板路、马车、穿制服的门房。每句话都压着第二层，而真的那层从不出口。",
    canon: "人族最古老政权的首都，世界第一大国的中心。第一王子派、第二王子派与第二王女爱丽儿派在此角力。",
    sceneId: "place-ars",
    unlock: {
      any: [{ origin: ["阿斯拉王国贵族子弟"] }, { anyStats: { fame: 25, charm: 35 } }],
    },
  },
  {
    id: "sharia",
    residence: "魔法都市夏利亚",
    name: "魔法都市夏利亚",
    region: "拉诺亚王国 · 魔术公会总部",
    desc: "公会的塔、大学的讲堂、整夜亮着的窗。这里的钱是拿脑子换的。",
    canon: "魔术公会总部与拉诺亚魔法大学所在地，世界最大的魔术中心。鲁迪乌斯在这里入了学，也在这里重逢了希露菲。",
    sceneId: "place-sharia",
    unlock: {
      any: [
        { anyStats: { mana: 45, int: 45 } },
        { origin: ["拉诺亚魔法大学学生"] },
        { flag: "transferSurvived" },
      ],
    },
  },
  {
    id: "mirees",
    residence: "米里希昂",
    name: "米里希昂",
    region: "米里斯神圣国",
    desc: "大圣堂的钟、石板地、神殿骑士团的马。米里斯看着每一个人，也看着不说实话的人。",
    canon: "政教合一的神圣国首都。一夫一妻是国策，对魔族与异族的排斥写在布告上。塞妮丝出身于这一带的上级贵族拉托雷亚家。",
    sceneId: "place-mirees",
    unlock: {
      any: [
        { faith: ["米里斯教团"] },
        { origin: ["米里斯教徒"] },
        { anyStats: { faith: 35, fame: 40 } },
      ],
    },
  },
  {
    id: "migurd",
    residence: "米格路德族之村",
    name: "米格路德族之村",
    region: "魔大陆",
    desc: "会走路的房子、不长高的人、长得不像话的夜。",
    canon: "洛琪希的故乡。米格路德族七岁以后不再长高，也因此比人族长寿。村外是大沙海。",
    sceneId: "place-migurd",
    unlock: {
      any: [
        { origin: ["魔族后裔", "魔王之裔", "迷宫探索者"] },
        { flag: "transferSurvived" },
        { anyStats: { fame: 60 } },
      ],
    },
  },
  {
    id: "lapan",
    residence: "迷宫都市拉潘",
    name: "迷宫都市拉潘",
    region: "贝卡利特大陆",
    desc: "沙、石阶、公会分部的灯。有人正为几枚金币押上性命。",
    canon: "贝卡利特大陆上的迷宫都市，大部分被沙漠覆盖，地下有大量古代迷宫。塞妮丝被困的转移迷宫就在这一带的地底。",
    sceneId: "place-lapan",
    unlock: {
      any: [{ adventurerRank: "D" }, { anyStats: { fame: 35 } }, { flag: "transferSurvived" }],
    },
  },
  {
    id: "shillon",
    residence: "西隆王国",
    name: "西隆王国",
    region: "中央大陆 · 内陆王国",
    desc: "王宫的墙很厚，街上的人很少抬头。",
    canon: "王龙王国的属国。国王帕克斯，第三王子扎诺巴·西隆。甲龙历 435 年，这里发生了一场政变。",
    sceneId: "place-shillon",
    unlock: {
      any: [{ origin: ["西隆王国贵族"] }, { anyStats: { fame: 45, scheme: 40 } }],
    },
  },
  {
    id: "ranoah",
    residence: "拉诺亚王国",
    name: "拉诺亚王都",
    region: "拉诺亚王国",
    desc: "王宫与魔术公会共治的城。使节的马车每天都有。",
    canon: "魔法三大国之一，与内里斯公国、巴舍兰特公国结盟。国王与魔术公会共同治理，夏利亚是它最重要的城市。",
    sceneId: "place-ranoah",
    unlock: {
      any: [
        { anyStats: { int: 40, mana: 40 } },
        { anyStats: { fame: 30 } },
        { origin: ["拉诺亚魔法大学学生"] },
      ],
    },
  },
  {
    id: "sanctuary",
    residence: "剑之圣地",
    name: "剑之圣地",
    region: "中央大陆 · 剑神流总本山",
    desc: "木地板的响声、汗味，同一个动作被重复一万遍也不吭声。",
    canon: "剑神流的总本山。剑神加尔·法利昂、水神蕾伊达·莉亚、北神卡尔曼的名字都留在这里。艾莉丝在这条路上走到了圣级。",
    sceneId: "place-sanctuary",
    unlock: {
      any: [
        { swordSchool: ["剑神流"] },
        { origin: ["剑之圣地学徒"] },
        { anyStats: { sword: 45 } },
      ],
    },
  },
  {
    id: "sky",
    residence: "天空之城",
    name: "天空之城",
    region: "中央大陆 · 上空",
    desc: "云在脚下。风从来不歇，城墙比任何一座王都都白。",
    canon: "甲龙王佩尔基乌斯·多拉的浮空城。五龙将随侍在侧，石碑旁的那支龙笛是唯一能把你叫上去的东西。",
    sceneId: "place-sky",
    unlock: {
      any: [
        { anyStats: { fame: 60 } },
        { flag: "underDragonGod" },
        { seenEvent: "canon-perugius" },
      ],
    },
  },
  {
    id: "ryumei",
    residence: "龙鸣山",
    name: "龙鸣山",
    region: "中央大陆 · 赤龙山脉",
    desc: "世界最高的灵山。山风里有一层低音，像有什么在下面呼吸。",
    canon: "龙神孔迷宫的所在，与「地狱」「魔神窟」并称的凶地。龙神奥尔斯帝德的名字就取自这座山。",
    sceneId: "place-ryumei",
    unlock: {
      any: [{ flag: "underDragonGod" }, { anyStats: { sword: 70, mana: 80 } }],
    },
  },
];

/** 地点 id → 地点 */
const PLACE_BY_ID = new Map(PLACES.map((p) => [p.id, p]));

export function placeById(id: string): PlaceDef | undefined {
  return PLACE_BY_ID.get(id);
}

/** 所在地字符串 → 地点。找不到说明这是个自定义所在地 */
export function placeOfResidence(residence: string): PlaceDef | undefined {
  return PLACES.find((p) => p.residence === residence);
}