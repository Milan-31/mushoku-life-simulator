import { useMemo } from "react";
import type { DetailKind, GameState } from "../types";
import AchievementPanel from "../components/AchievementPanel";
import MainlineDossier from "../components/MainlineDossier";
import RelationModal from "../components/RelationModal";
import { groupSkillsBySchool, skillById } from "../data/skills";
import { difficultyOf } from "../data/difficulty";
import { mainlineView } from "../engine/mainline";

interface Props {
  kind: DetailKind;
  state: GameState;
  busy: boolean;
  aiReady: boolean;
  onBack: () => void;
  onInteract: (name: string, actionId: string) => void;
  onCompanion: (name: string, on: boolean) => void;
  onTalk: (name: string) => void;
}

const TIER_ORDER = ["未觉醒", "初级", "中级", "上级", "圣级", "王级", "帝级", "神级"];
const RANK_ORDER = ["未注册", "F", "E", "D", "C", "B", "A", "S"];

function nextOf(order: string[], cur: string, prefix = ""): string {
  const i = order.indexOf(cur);
  if (i < 0 || i >= order.length - 1) return "已达顶端";
  return `${prefix}${order[i + 1]}`;
}

/** 寿命只给区间：确切数字连开局界面都不显示 */
function lifespanBand(years: number): string {
  if (years < 55) return "偏短";
  if (years < 70) return "中等";
  if (years < 82) return "偏长";
  return "很长";
}

function lifeStage(age: number): string {
  if (age < 3) return "幼儿";
  if (age < 12) return "孩童";
  if (age < 18) return "少年";
  if (age < 30) return "青年";
  if (age < 45) return "壮年";
  if (age < 60) return "中年";
  if (age < 75) return "老年";
  return "耄耋";
}

const TITLE: Record<DetailKind, { title: string; sub: string }> = {
  profile: { title: "主角档案", sub: "这个人是谁：出身、身体、性格与他身上的旧账" },
  stats: { title: "属性与能力", sub: "九项属性、三个阶级，以及它们各自离下一阶还有多远" },
  skills: { title: "招式与流派", sub: "已经学到手的东西。招式越全，战斗结算越不容易翻车" },
  relations: { title: "关系网", sub: "谁在跟前、谁留在原地，以及他们各自记得你什么" },
  mainline: { title: "主线卷宗", sub: "这一局抽到的那条线：走在第几章、这一章要做什么、还有多少余地" },
  factions: { title: "势力", sub: "六方力量对你的态度。差值只代表态度，不代表你已进入其中" },
  threads: { title: "线索与设定", sub: "人神与龙神那两条线、AI 为这一局发明的设定，以及系统记下的事" },
  achievements: { title: "成就", sub: "这一段人生里解锁过什么" },
};

/**
 * 详情页。
 *
 * 主页只放纲要，完整信息在这里；每一块纲要卡片上都有一个按钮通到这儿。
 * 关系网与成就直接复用原来的组件（inline 模式），其余几块本来就是只读的，就地铺开。
 */
export default function DetailScreen({
  kind,
  state,
  busy,
  aiReady,
  onBack,
  onInteract,
  onCompanion,
  onTalk,
}: Props) {
  const c = state.character;
  const skillGroups = useMemo(() => groupSkillsBySchool(state.skills), [state.skills]);
  const mainline = useMemo(() => mainlineView(state), [state]);
  const meta = TITLE[kind];

  const tierBars = [
    { label: "魔术阶级", tier: c.magicTier, progress: state.tierProgress.magic, next: nextOf(TIER_ORDER, c.magicTier) },
    { label: "剑术等级", tier: c.swordTier, progress: state.tierProgress.sword, next: nextOf(TIER_ORDER, c.swordTier) },
    { label: "冒险者等级", tier: c.adventurerRank, progress: state.tierProgress.adventure, next: nextOf(RANK_ORDER, c.adventurerRank) },
  ];
  const combatPower = state.skills.reduce((sum, id) => sum + (skillById(id)?.power ?? 0), 0);

  return (
    <section className="detailpage">
      <div className="detailpage__head">
        <div>
          <h1 className="detailpage__title">{meta.title}</h1>
          <p className="detailpage__sub">{meta.sub}</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={onBack}>
          ← 回到人生
        </button>
      </div>

      <div className={`detailpage__body${kind === "relations" ? " detailpage__body--wide" : ""}`}>
        {kind === "profile" && (
          <>
            <div className="panel">
              <div className="panel__head">基本资料</div>
              <div className="panel__body">
                <div className="player__id">
                  <strong>{c.name}</strong>
                  <span>
                    {c.age} 岁 · {lifeStage(c.age)} · {c.gender}
                  </span>
                </div>
                <div className="statchips">
                  <span className="tag">{c.status}</span>
                  <span className="tag">{c.era}</span>
                  <span className="tag tag--diff">难度 · {state.difficulty}</span>
                  <span className="tag">成就 {state.achievements.length}</span>
                  <span className="tag">第 {state.turn} 回合</span>
                </div>
                <div className="divider" />
                <div className="kv"><span className="kv__k">出身</span><span className="kv__v">{c.origin}</span></div>
                <div className="kv"><span className="kv__k">出生身份</span><span className="kv__v">{c.birthIdentity}</span></div>
                <div className="kv"><span className="kv__k">家庭</span><span className="kv__v">{c.family || "由系统按出身生成"}</span></div>
                <div className="kv"><span className="kv__k">出生年份</span><span className="kv__v">甲龙历 {state.birthYear} 年</span></div>
                <div className="kv"><span className="kv__k">所在地</span><span className="kv__v">{c.residence}</span></div>
                <div className="kv"><span className="kv__k">寿命倾向</span><span className="kv__v">{lifespanBand(state.lifespan)}</span></div>
                <div className="kv"><span className="kv__k">信仰</span><span className="kv__v">{c.faith}</span></div>
                <div className="kv"><span className="kv__k">政治倾向</span><span className="kv__v">{c.politics}</span></div>
                <div className="kv"><span className="kv__k">学院倾向</span><span className="kv__v">{c.college}</span></div>
                <div className="kv"><span className="kv__k">冒险者等级</span><span className="kv__v">{c.adventurerRank}</span></div>
              </div>
            </div>

            <div className="panel">
              <div className="panel__head">身体与来历</div>
              <div className="panel__body">
                <div className="kv"><span className="kv__k">特殊天赋</span><span className="kv__v">{c.talents.filter((t) => t !== "无").join(" · ") || "无"}</span></div>
                <div className="kv"><span className="kv__k">剑术流派</span><span className="kv__v">{c.swordSchool}</span></div>
                <div className="kv"><span className="kv__k">血脉状态</span><span className="kv__v">{c.blood}</span></div>
                <div className="kv"><span className="kv__k">契约状态</span><span className="kv__v">{c.contract}</span></div>
                <div className="kv"><span className="kv__k">腐化状态</span><span className="kv__v">{c.corruption}</span></div>
                <div className="divider" />
                <div className="kv"><span className="kv__k">性格</span><span className="kv__v">{c.traits.join(" · ") || "未定"}</span></div>
                <div className="kv"><span className="kv__k">人生目标</span><span className="kv__v">{c.goal}</span></div>
                <div className="kv"><span className="kv__k">目标进度</span><span className="kv__v">{Math.round(state.goalProgress)}%</span></div>
                <div className="kv"><span className="kv__k">情感倾向</span><span className="kv__v">{c.emotion}</span></div>
                <div className="kv"><span className="kv__k">模拟风格</span><span className="kv__v">{c.style}</span></div>
              </div>
            </div>

            <div className="panel">
              <div className="panel__head">情感记忆</div>
              <div className="panel__body">
                <div className="thread"><span className="thread__label">最珍贵</span><span className="thread__val">{state.threads.treasureMemory}</span></div>
                <div className="thread"><span className="thread__label">最痛苦</span><span className="thread__val">{state.threads.painMemory}</span></div>
                <div className="thread"><span className="thread__label">内心挣扎</span><span className="thread__val">{state.threads.innerStruggle}</span></div>
                <div className="divider" />
                <p className="fieldset__note">
                  这三句话不会被任何事件改写。它们是这个人的底色，也是 AI 每一次扮演他时最先读到的三行。
                </p>
              </div>
            </div>
          </>
        )}

        {kind === "stats" && (
          <>
            <div className="panel">
              <div className="panel__head">属性</div>
              <div className="panel__body">
                {state.stats.map((s) => (
                  <div className="bar" key={s.key}>
                    <div className="bar__top">
                      <span className="bar__name">{s.label}</span>
                      <span className="bar__val">
                        {s.value}
                        {s.unit && ` ${s.unit}`} / {s.max}
                      </span>
                    </div>
                    <div className="bar__track">
                      <div
                        className={`bar__fill${s.tone === "teal" ? " bar__fill--teal" : ""}${s.tone === "crimson" ? " bar__fill--crimson" : ""}`}
                        style={{ width: `${Math.min(100, (s.value / s.max) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel">
              <div className="panel__head">阶级</div>
              <div className="panel__body">
                {tierBars.map((b) => (
                  <div className="bar" key={b.label}>
                    <div className="bar__top">
                      <span className="bar__name">{b.label}</span>
                      <span className="bar__val">{b.tier}</span>
                    </div>
                    <div className="bar__track">
                      <div className="bar__fill" style={{ width: `${Math.round(b.progress)}%` }} />
                    </div>
                    <div className="bar__top" style={{ marginTop: 4 }}>
                      <span className="bar__name" style={{ fontSize: 11 }}>距「{b.next}」</span>
                      <span className="bar__val" style={{ fontSize: 11 }}>{Math.round(b.progress)} / 100</span>
                    </div>
                  </div>
                ))}
                <div className="divider" />
                <p className="fieldset__note">
                  阶级靠行动与事件一点点推。王级以上为秘匿级别；圣级被称为天才；帝级以上为世界有数的实力者。
                  已学招式的战力权重合计 <b>{combatPower}</b>，战斗类指令用它把胜负推向有利的一侧。
                </p>
              </div>
            </div>

            <div className="panel">
              <div className="panel__head">身体与来历</div>
              <div className="panel__body">
                <div className="kv"><span className="kv__k">剑术流派</span><span className="kv__v">{c.swordSchool}</span></div>
                <div className="kv"><span className="kv__k">血脉状态</span><span className="kv__v">{c.blood}</span></div>
                <div className="kv"><span className="kv__k">契约状态</span><span className="kv__v">{c.contract}</span></div>
                <div className="kv"><span className="kv__k">腐化状态</span><span className="kv__v">{c.corruption}</span></div>
                <div className="kv"><span className="kv__k">特殊天赋</span><span className="kv__v">{c.talents.filter((t) => t !== "无").join(" · ") || "无"}</span></div>
                <div className="kv"><span className="kv__k">难度</span><span className="kv__v">{difficultyOf(state.difficulty).label}</span></div>
                <div className="divider" />
                <p className="fieldset__note">
                  难度会改变寿命、收入、健康衰减、行动次数与抉择代价。切换难度随时可以做，但已经发生的事不会被改写。
                </p>
              </div>
            </div>
          </>
        )}

        {kind === "skills" && (
          <div className="panel">
            <div className="panel__head">
              已学招式
              <span className="panel__tools">
                <span className="panel__count">战力权重合计 {combatPower}</span>
              </span>
            </div>
            <div className="panel__body">
              {skillGroups.length === 0 ? (
                <p className="fieldset__note">
                  还没有掌握任何成体系的招式。靠修炼类指令长期积累能领悟普通招式；
                  高级招式只能靠特殊事件或强大角色亲自授予——剑神流奥义要剑神级人物亲传，混成魔术要有人示范原理。
                </p>
              ) : (
                skillGroups.map((g) => (
                  <div className="skillgroup" key={g.school}>
                    <div className="skillgroup__head">{g.school}</div>
                    {g.items.map((sk) => (
                      <div className="skill" key={sk.id}>
                        <div className="skill__top">
                          <span className="skill__name">{sk.name}</span>
                          <span className={`skill__grade skill__grade--${sk.grade === "高级" ? "high" : "normal"}`}>
                            {sk.grade}
                          </span>
                        </div>
                        <div className="skill__desc">{sk.desc}</div>
                        <div className="skill__power">战力权重 {sk.power}</div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {kind === "relations" && (
          <RelationModal
            state={state}
            busy={busy}
            aiReady={aiReady}
            inline
            onTalk={onTalk}
            onInteract={onInteract}
            onCompanion={onCompanion}
            onClose={onBack}
          />
        )}

        {kind === "mainline" &&
          (mainline ? (
            <div className="panel">
              <div className="panel__body">
                <MainlineDossier view={mainline} />
              </div>
            </div>
          ) : (
            <div className="panel">
              <div className="panel__body">
                <p className="fieldset__note">
                  这一段人生没有主线。创建角色时选了「不要主线」，或者这份存档来自还没有主线系统的旧版本。
                  行动、抉择事件与原作人物的遇合都照旧。
                </p>
              </div>
            </div>
          ))}

        {kind === "factions" && (
          <div className="panel">
            <div className="panel__head">六方力量</div>
            <div className="panel__body">
              {state.factions.map((f) => (
                <div className="faction" key={f.name}>
                  <span className="faction__n">{f.name}</span>
                  <span className={`faction__v ${f.value >= 0 ? "faction__v--pos" : "faction__v--neg"}`}>
                    {f.value >= 0 ? `+${f.value}` : f.value}
                  </span>
                </div>
              ))}
              <div className="divider" />
              <div className="bar" />
              {state.factions.map((f) => (
                <div className="bar" key={`${f.name}-bar`}>
                  <div className="bar__top">
                    <span className="bar__name">{f.name}</span>
                    <span className="bar__val">{f.value >= 0 ? `+${f.value}` : f.value} / ±100</span>
                  </div>
                  <div className="bar__track">
                    <div
                      className={`bar__fill${f.value < 0 ? " bar__fill--crimson" : ""}`}
                      style={{ width: `${Math.min(100, Math.abs(f.value))}%` }}
                    />
                  </div>
                </div>
              ))}
              <p className="fieldset__note">
                声望差值只代表该势力对你的态度，不代表你已进入其中。
                救过教团的人、得罪过公会、被大学记过名，都会落到这里。
              </p>
            </div>
          </div>
        )}

        {kind === "threads" && (
          <>
            <div className="panel">
              <div className="panel__head">两条线</div>
              <div className="panel__body">
                <div className="thread"><span className="thread__label">人神</span><span className="thread__val">{state.threads.humanGod}</span></div>
                <div className="thread"><span className="thread__label">龙神</span><span className="thread__val">{state.threads.dragonGod}</span></div>
                <div className="thread"><span className="thread__label">内心挣扎</span><span className="thread__val">{state.threads.innerStruggle}</span></div>
                <p className="fieldset__note">
                  人神只能诱导，无法强制。龙神的接触通常直接而简短。世界信息不会主动剧透，
                  必须靠调查、推理、社交与观察。
                </p>
              </div>
            </div>

            <div className="panel">
              <div className="panel__head">
                AI 自撰设定
                <span className="panel__tools">
                  <span className="panel__count">{state.canon.length} 条</span>
                </span>
              </div>
              <div className="panel__body">
                {state.canon.length === 0 ? (
                  <p className="fieldset__note">
                    还没有。开启「自撰剧情」之后，模型可以基于原作设定发明需要长期记住的人、地、组织与伏线，
                    它们会记在这里，并一直回到提示词里。
                  </p>
                ) : (
                  state.canon.map((line, i) => (
                    <div className="thread" key={i}>
                      <span className="thread__val">{line}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="panel">
              <div className="panel__head">
                系统记录
                <span className="panel__tools">
                  <span className="panel__count">{state.notices.length} 条</span>
                </span>
              </div>
              <div className="panel__body">
                {state.notices.length === 0 ? (
                  <p className="fieldset__note">还没有记下什么。</p>
                ) : (
                  <ul className="noticelist">
                    {state.notices
                      .slice()
                      .reverse()
                      .map((n, i) => (
                        <li key={i}>{n}</li>
                      ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}

        {kind === "achievements" && (
          <div className="panel">
            <div className="panel__body">
              <AchievementPanel inline unlocked={state.achievements} onClose={onBack} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
