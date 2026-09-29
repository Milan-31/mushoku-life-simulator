import { useMemo, useState } from "react";
import type { GameState } from "../types";
import Chronicle from "../components/Chronicle";
import Modal from "../components/Modal";
import ScenePanel from "../components/ScenePanel";
import { groupSkillsBySchool, skillById } from "../data/skills";
import { defaultSceneId } from "../data/scenes";
import { difficultyOf } from "../data/difficulty";
import { relocationOptions } from "../engine/world";

interface Props {
  state: GameState;
  /** 正在等待 AI 推演返回 */
  busy: boolean;
  aiEnabled: boolean;
  aiExhausted: boolean;
  /** 本月是否已经用自由行动触发过 AI 剧情 */
  aiMonthActive: boolean;
  onAdvance: () => void;
  /** 预设指令：完全本地结算 */
  onPreset: (commandId: string) => void;
  /** 自由行动：会触发 AI 剧情，消耗额度 */
  onAction: (text: string) => void;
  /** 迁居：换一个地方生活，花掉这一整个月的行动次数 */
  onRelocate: (placeId: string) => void;
  onResolveEvent: (optionId: string) => void;
  /** 打开关系网弹窗 */
  onOpenRelations: () => void;
  /** 应下羁绊角色的主动沟通 */
  onAcceptTalk: () => void;
  /** 这次主动沟通改日再说 */
  onDismissTalk: () => void;
  onRestore: (text: string) => void;
  onExport: () => string;
  onRestart: () => void;
  onOpenSaves: () => void;
  onOpenAchievements: () => void;
  onOpenDifficulty: () => void;
  onOpenApi: () => void;
  onOpenAi: () => void;
  onViewEnding: () => void;
}

const TIER_ORDER = ["未觉醒", "初级", "中级", "上级", "圣级", "王级", "帝级", "神级"];
const RANK_ORDER = ["未注册", "F", "E", "D", "C", "B", "A", "S"];

function nextOf(order: string[], cur: string, prefix = ""): string {
  const i = order.indexOf(cur);
  if (i < 0 || i >= order.length - 1) return "已达顶端";
  return `${prefix}${order[i + 1]}`;
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

const QUICK_FALLBACK = "什么都不做，只是生活";

type TabKey = "tier" | "skill" | "faction" | "thread";

export default function GameScreen({
  state,
  busy,
  aiEnabled,
  aiExhausted,
  aiMonthActive,
  onAdvance,
  onPreset,
  onAction,
  onRelocate,
  onResolveEvent,
  onOpenRelations,
  onAcceptTalk,
  onDismissTalk,
  onRestore,
  onExport,
  onRestart,
  onOpenSaves,
  onOpenAchievements,
  onOpenDifficulty,
  onOpenApi,
  onOpenAi,
  onViewEnding,
}: Props) {
  const [tab, setTab] = useState<TabKey>("tier");
  const [text, setText] = useState("");
  const [sceneId, setSceneId] = useState<string>(() => defaultSceneId(state));
  const [modal, setModal] = useState<null | "export" | "import" | "restart" | "free" | "travel">(null);
  const [importText, setImportText] = useState("");

  const c = state.character;
  const wealth = state.stats.find((s) => s.key === "wealth");
  const fame = state.stats.find((s) => s.key === "fame");
  const skillGroups = useMemo(() => groupSkillsBySchool(state.skills), [state.skills]);
  const travelOptions = useMemo(() => relocationOptions(state), [state]);

  const tierBars = useMemo(
    () => [
      { label: "魔术阶级", tier: c.magicTier, progress: state.tierProgress.magic, next: nextOf(TIER_ORDER, c.magicTier), tone: "gold" as const },
      { label: "剑术等级", tier: c.swordTier, progress: state.tierProgress.sword, next: nextOf(TIER_ORDER, c.swordTier), tone: "teal" as const },
      { label: "冒险者等级", tier: c.adventurerRank, progress: state.tierProgress.adventure, next: nextOf(RANK_ORDER, c.adventurerRank, ""), tone: "gold" as const },
    ],
    [c.magicTier, c.swordTier, c.adventurerRank, state.tierProgress],
  );

  const actionLimit = difficultyOf(state.difficulty).actionsPerMonth;
  const actionsLeft = Math.max(0, actionLimit - state.actionsUsed);
  const blocked = state.deceased || Boolean(state.pendingEvent);
  const actionsBlocked = state.deceased || busy || actionsLeft <= 0 || Boolean(state.pendingEvent);

  const submit = () => {
    const t = text.trim();
    if (!t || actionsBlocked) return;
    onAction(t);
    setText("");
  };

  return (
    <section className="game">
      {state.deceased && (
        <div className="endbanner">
          <div>
            <b>这一段人生已经结束。</b>
            <span>{state.deathCause}</span>
          </div>
          <button type="button" className="btn btn--primary btn--sm" onClick={onViewEnding}>
            查看终章
          </button>
        </div>
      )}

      <div className="game__grid">
        {/* 左：玩家 */}
        <div className="game__col">
          <div className="panel">
            <div className="panel__head">玩家状态</div>
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
              </div>

              <div className="bar">
                <div className="bar__top">
                  <span className="bar__name">本月精力</span>
                  <span className="bar__val">{Math.round(state.energy)} / 100</span>
                </div>
                <div className="bar__track">
                  <div className="bar__fill bar__fill--teal" style={{ width: `${state.energy}%` }} />
                </div>
              </div>
              <div className="bar">
                <div className="bar__top">
                  <span className="bar__name">本月行动</span>
                  <span className="bar__val">{state.actionsUsed} / {actionLimit}</span>
                </div>
                <div className="bar__track">
                  <div
                    className="bar__fill bar__fill--crimson"
                    style={{ width: `${(state.actionsUsed / actionLimit) * 100}%` }}
                  />
                </div>
              </div>
              <div className="bar">
                <div className="bar__top">
                  <span className="bar__name">人生目标进度</span>
                  <span className="bar__val">{Math.round(state.goalProgress)}%</span>
                </div>
                <div className="bar__track">
                  <div className="bar__fill" style={{ width: `${state.goalProgress}%` }} />
                </div>
              </div>

              <div className="divider" />
              <div className="kv"><span className="kv__k">身份</span><span className="kv__v">{c.origin}</span></div>
              <div className="kv"><span className="kv__k">所在地</span><span className="kv__v">{c.residence}</span></div>
              <div className="kv"><span className="kv__k">信仰</span><span className="kv__v">{c.faith}</span></div>
              <div className="kv"><span className="kv__k">政治倾向</span><span className="kv__v">{c.politics}</span></div>
              <div className="kv"><span className="kv__k">特殊天赋</span><span className="kv__v">{c.talents.filter((t) => t !== "无").join(" · ") || "无"}</span></div>
              <div className="kv"><span className="kv__k">财富</span><span className="kv__v">{wealth?.value ?? 0} 金币</span></div>
              <div className="kv"><span className="kv__k">声望</span><span className="kv__v">{fame?.value ?? 0}</span></div>
              <div className="divider" />
              <div className="kv"><span className="kv__k">当前目标</span><span className="kv__v">{c.goal}</span></div>
              <div className="kv"><span className="kv__k">情感倾向</span><span className="kv__v">{c.emotion}</span></div>
              {c.traits.length > 0 && (
                <div className="kv"><span className="kv__k">性格</span><span className="kv__v">{c.traits.join(" · ")}</span></div>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel__head">情感记忆</div>
            <div className="panel__body">
              <div className="thread"><span className="thread__label">最珍贵</span><span className="thread__val">{state.threads.treasureMemory}</span></div>
              <div className="thread"><span className="thread__label">最痛苦</span><span className="thread__val">{state.threads.painMemory}</span></div>
              <div className="thread"><span className="thread__label">内心挣扎</span><span className="thread__val">{state.threads.innerStruggle}</span></div>
            </div>
          </div>
        </div>

        {/* 中：刚发生的事常驻在上，场景指令在中间滚，行动底栏常驻在下 */}
        <div className="chronicle">
          {state.pendingTalk && (
            <div className="talkcard">
              <div className="talkcard__kicker">有人来找你 · 拖久了这段关系会淡</div>
              <h3 className="talkcard__title">{state.pendingTalk.name}</h3>
              <p className="talkcard__line">{state.pendingTalk.line}</p>
              <div className="talkcard__acts">
                <button type="button" className="btn btn--primary btn--sm" disabled={busy} onClick={onAcceptTalk}>
                  与他说话
                </button>
                <button type="button" className="btn btn--sm" disabled={busy} onClick={onDismissTalk}>
                  改日再说
                </button>
              </div>
            </div>
          )}

          {state.pendingEvent && (
            <div className="eventcard">
              <div className="eventcard__kicker">抉择 · 必须回应</div>
              <h3 className="eventcard__title">{state.pendingEvent.title}</h3>
              <div className="eventcard__body">
                {state.pendingEvent.body.map((l, i) => (
                  <p key={i}>{l}</p>
                ))}
              </div>
              <div className="eventcard__options">
                {state.pendingEvent.options.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    className="eventcard__opt"
                    disabled={busy}
                    onClick={() => onResolveEvent(o.id)}
                  >
                    <span className="eventcard__opt-label">
                      {o.label}
                      {o.risk && <span className={`risk risk--${o.risk}`}>风险 {o.risk}</span>}
                    </span>
                    {o.detail && <span className="eventcard__opt-detail">{o.detail}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Chronicle state={state} />

          <div className="chronicle__scroll">
            <div className="panel">
              <div className="panel__head">
                <span>你的行动</span>
                <span className="panel__tools">
                  <span
                    className={`panel__count${actionsLeft <= 0 ? " panel__count--warn" : ""}`}
                    title={actionsLeft <= 0 ? "本月的行动次数已经用完，推进一个月继续" : undefined}
                  >
                    本月 {state.actionsUsed} / {actionLimit} 次
                  </span>
                  <button
                    type="button"
                    className="btn btn--xs"
                    onClick={() => setModal("travel")}
                    disabled={actionsBlocked}
                    title={`你现在在${c.residence}。迁居会花掉这一整个月，之后要点推进一个月`}
                  >
                    迁居 · {c.residence}
                  </button>
                </span>
              </div>
              <div className="panel__body">
                <ScenePanel
                  state={state}
                  sceneId={sceneId}
                  blocked={actionsBlocked}
                  onSceneChange={setSceneId}
                  onCommand={onPreset}
                />

                <div className="divider" />
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button type="button" className="btn" onClick={onOpenSaves}>
                    存档管理
                  </button>
                  <button type="button" className="btn" onClick={onOpenAchievements}>
                    成就
                  </button>
                  <button type="button" className="btn" onClick={onOpenDifficulty}>
                    难度
                  </button>
                  <button type="button" className={aiEnabled ? "btn btn--primary" : "btn"} onClick={onOpenAi}>
                    {aiExhausted ? "AI 推演 · 已停止调用" : aiEnabled ? "AI 推演 · 已开启" : "AI 推演 · 未开启"}
                  </button>
                  <button type="button" className="btn" onClick={onOpenApi}>
                    接口导入
                  </button>
                  <button type="button" className="btn" onClick={() => setModal("export")}>
                    导出存档
                  </button>
                  <button type="button" className="btn" onClick={() => setModal("import")}>
                    恢复存档
                  </button>
                  <button type="button" className="btn btn--ghost" onClick={() => setModal("restart")}>
                    重新开始
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="chronicle__bar">
            <div className="quickrow">
              <button
                type="button"
                className="btn btn--primary chronicle__advance"
                onClick={onAdvance}
                disabled={blocked || busy}
                title={state.pendingEvent ? "先回应本月的抉择" : actionsLeft <= 0 ? "本月的行动次数已经用完，推进一个月继续" : undefined}
              >
                {busy ? "推演中…" : "推进一个月 ▸"}
              </button>
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => setModal("free")}
                disabled={actionsBlocked}
                title="预设指令之外的事，用自然语言写"
              >
                自由行动{aiEnabled ? " · AI" : ""}
              </button>
              <button
                type="button"
                className="chip"
                onClick={() => onAction(QUICK_FALLBACK)}
                disabled={actionsBlocked}
                title="让时间往前走，这个月什么都不做"
              >
                什么都不做
              </button>
              <button
                type="button"
                className="btn btn--sm"
                onClick={onOpenRelations}
                title={`打开关系网，现有 ${state.relations.length} 人`}
              >
                关系网 · {state.relations.length}
              </button>
            </div>
          </div>
        </div>

        {/* 右：面板 */}
        <div className="game__col">
          <div className="panel">
            <div className="panel__head">状态面板</div>
          <div className="panel__body">
            <div className="tabs" role="tablist">
              <button type="button" aria-current={tab === "tier"} onClick={() => setTab("tier")}>阶级</button>
              <button type="button" aria-current={tab === "skill"} onClick={() => setTab("skill")}>
                技能{state.skills.length > 0 ? ` ${state.skills.length}` : ""}
              </button>
              <button type="button" aria-current={tab === "faction"} onClick={() => setTab("faction")}>势力</button>
              <button type="button" aria-current={tab === "thread"} onClick={() => setTab("thread")}>线索</button>
            </div>

            {tab === "tier" && (
              <>
                {tierBars.map((b) => (
                  <div className="bar" key={b.label}>
                    <div className="bar__top">
                      <span className="bar__name">{b.label}</span>
                      <span className="bar__val">{b.tier}</span>
                    </div>
                    <div className="bar__track">
                      <div
                        className={`bar__fill${b.tone === "teal" ? " bar__fill--teal" : ""}`}
                        style={{ width: `${Math.round(b.progress)}%` }}
                      />
                    </div>
                    <div className="bar__top" style={{ marginTop: 4 }}>
                      <span className="bar__name" style={{ fontSize: 11 }}>距「{b.next}」</span>
                      <span className="bar__val" style={{ fontSize: 11 }}>{Math.round(b.progress)} / 100</span>
                    </div>
                  </div>
                ))}
                <div className="divider" />
                <div className="kv"><span className="kv__k">剑术流派</span><span className="kv__v">{c.swordSchool}</span></div>
                <div className="kv"><span className="kv__k">血脉</span><span className="kv__v">{c.blood}</span></div>
                <div className="kv"><span className="kv__k">契约</span><span className="kv__v">{c.contract}</span></div>
                <div className="kv"><span className="kv__k">腐化</span><span className="kv__v">{c.corruption}</span></div>
                <div className="divider" />
                {state.stats.map((s) => (
                  <div className="bar" key={s.key}>
                    <div className="bar__top">
                      <span className="bar__name">{s.label}</span>
                      <span className="bar__val">{s.value}{s.unit && ` ${s.unit}`} / {s.max}</span>
                    </div>
                    <div className="bar__track">
                      <div
                        className={`bar__fill${s.tone === "teal" ? " bar__fill--teal" : ""}${s.tone === "crimson" ? " bar__fill--crimson" : ""}`}
                        style={{ width: `${Math.min(100, (s.value / s.max) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </>
            )}

            {tab === "skill" && (
              <>
                {skillGroups.length === 0 ? (
                  <p className="fieldset__note">
                    还没有掌握任何成体系的招式。靠修炼类指令长期积累能领悟普通招式；
                    高级招式只能靠特殊事件或强大角色亲自授予。
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
                {state.skills.length > 0 && (
                  <>
                    <div className="divider" />
                    <p className="fieldset__note">
                      已学招式的战力权重之和为{" "}
                      <b>{state.skills.reduce((sum, id) => sum + (skillById(id)?.power ?? 0), 0)}</b>
                      ，战斗类指令会用它把胜负推向有利的一侧。
                    </p>
                  </>
                )}
              </>
            )}

            {tab === "faction" && (
              <>
                {state.factions.map((f) => (
                  <div className="faction" key={f.name}>
                    <span className="faction__n">{f.name}</span>
                    <span className={`faction__v ${f.value >= 0 ? "faction__v--pos" : "faction__v--neg"}`}>
                      {f.value >= 0 ? `+${f.value}` : f.value}
                    </span>
                  </div>
                ))}
                <p className="fieldset__note" style={{ marginTop: 10 }}>
                  声望差值只代表该势力对你的态度，不代表你已进入其中。
                </p>
              </>
            )}

            {tab === "thread" && (
              <>
                <div className="thread">
                  <span className="thread__label">人神</span>
                  <span className="thread__val">{state.threads.humanGod}</span>
                </div>
                <div className="thread">
                  <span className="thread__label">龙神</span>
                  <span className="thread__val">{state.threads.dragonGod}</span>
                </div>
                {state.canon.length > 0 && (
                  <>
                    <div className="divider" />
                    <div className="panel__head" style={{ border: "none", padding: "4px 0", fontSize: 13 }}>
                      AI 自撰设定
                    </div>
                    {state.canon.map((line, i) => (
                      <div className="thread" key={i}>
                        <span className="thread__val">{line}</span>
                      </div>
                    ))}
                    <p className="fieldset__note" style={{ marginTop: 8 }}>
                      这些是模型自行发明并被记进存档的设定，只属于这一段人生。
                    </p>
                  </>
                )}
                <div className="divider" />
                <p className="fieldset__note">
                  人神只能诱导，无法强制。龙神的接触通常直接而简短。世界信息不会主动剧透，必须靠调查、推理、社交与观察。
                </p>
              </>
            )}

            {state.notices.length > 0 && (
              <>
                <div className="divider" />
                <div className="panel__head" style={{ border: "none", padding: "4px 0", fontSize: 13 }}>系统记录</div>
                {state.notices.slice(-3).map((n, i) => (
                  <div className="thread" key={i}>
                    <span className="thread__val">{n}</span>
                  </div>
                ))}
              </>
            )}
          </div>
          </div>
        </div>
      </div>

      {modal === "free" && (
        <Modal
          title="自由行动"
          onClose={() => setModal(null)}
          actions={
            <>
              <button type="button" className="btn" onClick={() => setModal(null)}>
                关闭
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  submit();
                  setModal(null);
                }}
                disabled={!text.trim() || actionsBlocked}
              >
                执行
              </button>
            </>
          }
        >
          <div className="freebox__head">
            预设指令之外的事
            <span className={`tag ${aiMonthActive ? "tag--diff" : ""}`}>
              {aiMonthActive ? "本月已由 AI 推演" : aiEnabled ? "会触发 AI 剧情" : "AI 未开启，走本地引擎"}
            </span>
          </div>
          <p className="fieldset__note" style={{ margin: "10px 0" }}>
            {aiEnabled
              ? "用自然语言把想做的事写下来。这会把这个月交给模型推演，按所选模型计费；只用预设指令的月份不会产生任何调用。"
              : "AI 未开启，这次行动仍由本地引擎结算，只按规则判定结果。"}
          </p>
          <textarea
            className="textarea"
            value={text}
            autoFocus
            placeholder="例如：我想在下个月的集市上摆个摊，卖母亲教我做的腌菜。"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                submit();
                setModal(null);
              }
            }}
            style={{ minHeight: 160 }}
          />
          <p className="fieldset__note" style={{ marginTop: 10 }}>
            一次自由行动占本月一次行动。Ctrl / ⌘ + Enter 直接执行。
          </p>
        </Modal>
      )}

      {modal === "travel" && (
        <Modal
          title="迁居"
          onClose={() => setModal(null)}
          actions={
            <button type="button" className="btn" onClick={() => setModal(null)}>
              关闭
            </button>
          }
        >
          <div className="freebox__head">
            换一个地方生活
            <span className="tag tag--diff">代价：本月全部行动</span>
          </div>
          <p className="fieldset__note" style={{ margin: "10px 0" }}>
            路上要花掉整整一个月，所以迁居会一次用尽本月的行动次数，之后需要推进一个月才能再做事。
            所在地决定「你的行动」面板里能做什么，也决定哪些原作事件会在对应的时间点找上你。
          </p>
          <div className="travel">
            {travelOptions.map((o) => (
              <div className={`travel__item${o.here ? " travel__item--here" : ""}`} key={o.place.id}>
                <div className="travel__top">
                  <span className="travel__name">{o.place.name}</span>
                  <span className="travel__region">{o.place.region}</span>
                </div>
                <p className="travel__desc">{o.place.desc}</p>
                <p className="travel__canon">原作 · {o.place.canon}</p>
                <div className="travel__acts">
                  {o.here ? (
                    <span className="fieldset__note">你现在就在这儿。</span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      disabled={!o.ok || actionsBlocked}
                      title={o.ok ? "花掉本月全部行动，搬过去" : `暂不可迁居：${o.reason}`}
                      onClick={() => {
                        onRelocate(o.place.id);
                        setModal(null);
                      }}
                    >
                      迁居
                    </button>
                  )}
                  {!o.here && !o.ok && <span className="travel__lock">条件不足 · {o.reason}</span>}
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {modal === "export" && (
        <Modal
          title="导出存档"
          onClose={() => setModal(null)}
          actions={
            <>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  void navigator.clipboard?.writeText(onExport());
                }}
              >
                复制
              </button>
              <button type="button" className="btn btn--primary" onClick={() => setModal(null)}>关闭</button>
            </>
          }
        >
          <p className="fieldset__note" style={{ marginBottom: 10 }}>
            这是完整的人生存档，包含角色、世界、NPC、历史与情感状态。保存它，随时可以接续。
          </p>
          <textarea className="textarea" readOnly value={onExport()} style={{ minHeight: 220, fontSize: 12 }} />
        </Modal>
      )}

      {modal === "import" && (
        <Modal
          title="恢复存档"
          onClose={() => setModal(null)}
          actions={
            <>
              <button type="button" className="btn" onClick={() => setModal(null)}>取消</button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  onRestore(importText);
                  setImportText("");
                  setModal(null);
                }}
                disabled={!importText.trim()}
              >
                载入
              </button>
            </>
          }
        >
          <p className="fieldset__note" style={{ marginBottom: 10 }}>
            粘贴完整存档。系统会恢复世界状态、玩家状态、NPC 状态、历史状态、魔术状态与情感状态。
          </p>
          <textarea
            className="textarea"
            value={importText}
            placeholder='{"version":1,"state":{...}}'
            onChange={(e) => setImportText(e.target.value)}
            style={{ minHeight: 220, fontSize: 12 }}
          />
        </Modal>
      )}

      {modal === "restart" && (
        <Modal
          title="重新开始"
          onClose={() => setModal(null)}
          actions={
            <>
              <button type="button" className="btn" onClick={() => setModal(null)}>取消</button>
              <button type="button" className="btn btn--primary" onClick={() => { onRestart(); setModal(null); }}>
                确认重开
              </button>
            </>
          }
        >
          <p className="fieldset__note">
            死亡默认真实且不可逆。重新开始会让这一段人生终止，回到起点选择界面。若想保留现在的人生，请先导出存档或存入槽位。
          </p>
        </Modal>
      )}
    </section>
  );
}