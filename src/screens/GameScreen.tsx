import { useMemo, useState } from "react";
import type { DetailKind, GameState } from "../types";
import Chronicle from "../components/Chronicle";
import Modal from "../components/Modal";
import ScenePanel from "../components/ScenePanel";
import { skillById } from "../data/skills";
import { defaultSceneId } from "../data/scenes";
import { difficultyOf } from "../data/difficulty";
import { relocationOptions } from "../engine/world";
import { mainlineView } from "../engine/mainline";

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
  /** 打开关系网 */
  onOpenRelations: () => void;
  /** 打开某一块的详情页 */
  onOpenDetail: (kind: DetailKind) => void;
  /** 应下羁绊角色的主动沟通 */
  onAcceptTalk: () => void;
  /** 这次主动沟通改日再说 */
  onDismissTalk: () => void;
  onRestore: (text: string) => void;
  onExport: () => string;
  onRestart: () => void;
  onOpenSaves: () => void;
  onOpenDifficulty: () => void;
  onOpenApi: () => void;
  onOpenAi: () => void;
  onViewEnding: () => void;
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

/** 主页只做三件事：看清自己、回应眼前的事、动手。其余信息都在各自的详情页里 */
const PAGES: { kind: DetailKind; label: string }[] = [
  { kind: "profile", label: "主角档案" },
  { kind: "stats", label: "属性与能力" },
  { kind: "skills", label: "招式与流派" },
  { kind: "relations", label: "关系网" },
  { kind: "factions", label: "势力" },
  { kind: "threads", label: "线索与设定" },
  { kind: "achievements", label: "成就" },
  { kind: "mainline", label: "主线卷宗" },
];

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
  onOpenDetail,
  onAcceptTalk,
  onDismissTalk,
  onRestore,
  onExport,
  onRestart,
  onOpenSaves,
  onOpenDifficulty,
  onOpenApi,
  onOpenAi,
  onViewEnding,
}: Props) {
  const [text, setText] = useState("");
  const [sceneId, setSceneId] = useState<string>(() => defaultSceneId(state));
  const [modal, setModal] = useState<null | "export" | "import" | "restart" | "free" | "travel">(null);
  const [importText, setImportText] = useState("");

  const c = state.character;
  const travelOptions = useMemo(() => relocationOptions(state), [state]);
  const mainline = useMemo(() => mainlineView(state), [state]);
  const combatPower = useMemo(
    () => state.skills.reduce((sum, id) => sum + (skillById(id)?.power ?? 0), 0),
    [state.skills],
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

  /** 页面索引：一行装完，不换行 */
  const pageNav = (
    <nav className="pagenav" aria-label="信息页面">
      <span className="pagenav__label">详情</span>
      {PAGES.map((p) => (
        <button
          key={p.kind}
          type="button"
          className="pagenav__item"
          onClick={() => onOpenDetail(p.kind)}
          title={`打开「${p.label}」页`}
        >
          {p.label}
          {p.kind === "relations" && <b>{state.relations.length}</b>}
          {p.kind === "achievements" && <b>{state.achievements.length}</b>}
          {p.kind === "skills" && <b>{state.skills.length}</b>}
        </button>
      ))}
      <span className="pagenav__gap" />
      <button type="button" className="pagenav__item" onClick={onOpenSaves}>
        存档
      </button>
      <button type="button" className="pagenav__item" onClick={onOpenDifficulty}>
        难度 · {state.difficulty}
      </button>
      <button
        type="button"
        className={`pagenav__item${aiEnabled ? " pagenav__item--on" : ""}`}
        onClick={onOpenAi}
      >
        {aiExhausted ? "AI 已停" : aiEnabled ? "AI 已开" : "AI 未开"}
      </button>
      <button type="button" className="pagenav__item" onClick={onOpenApi}>
        接口
      </button>
      <button type="button" className="pagenav__item" onClick={() => setModal("export")}>
        导出
      </button>
      <button type="button" className="pagenav__item" onClick={() => setModal("import")}>
        恢复
      </button>
      <button type="button" className="pagenav__item pagenav__item--ghost" onClick={() => setModal("restart")}>
        重开
      </button>
    </nav>
  );

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

      {pageNav}

      <div className="game__grid">
        {/* 左：只放「现在是什么状态」，够做决定就行 */}
        <div className="game__col game__self">
          <div className="panel">
            <div className="panel__head">
              <span>主角</span>
              <span className="panel__count">{c.status}</span>
            </div>
            <div className="panel__body">
              <div className="player__id">
                <strong>{c.name}</strong>
                <span>
                  {c.age} 岁 · {lifeStage(c.age)} · {c.gender} · {c.era}
                </span>
              </div>
              <div className="selfrow">
                <span className="selfrow__k">所在地</span>
                <span className="selfrow__v">{c.residence}</span>
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
                  <span className={`bar__val${actionsLeft <= 0 ? " bar__val--warn" : ""}`}>
                    {state.actionsUsed} / {actionLimit}
                  </span>
                </div>
                <div className="bar__track">
                  <div
                    className="bar__fill bar__fill--crimson"
                    style={{ width: `${(state.actionsUsed / actionLimit) * 100}%` }}
                  />
                </div>
              </div>
              <div className="bar" style={{ marginBottom: 0 }}>
                <div className="bar__top">
                  <span className="bar__name">人生目标</span>
                  <span className="bar__val">{Math.round(state.goalProgress)}%</span>
                </div>
                <div className="bar__track">
                  <div className="bar__fill" style={{ width: `${state.goalProgress}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel__head">
              <span>属性</span>
              <span className="panel__tools">
                <button type="button" className="btn btn--xs" onClick={() => onOpenDetail("stats")}>
                  详情 →
                </button>
              </span>
            </div>
            <div className="panel__body">
              <div className="statgrid">
                {state.stats.map((s) => (
                  <div className="statgrid__cell" key={s.key} title={`${s.label} ${s.value} / ${s.max}`}>
                    <span className="statgrid__k">{s.label}</span>
                    <span className="statgrid__v">{s.value}</span>
                  </div>
                ))}
              </div>
              <div className="divider" />
              <div className="selfrow">
                <span className="selfrow__k">魔术</span>
                <span className="selfrow__v">{c.magicTier}</span>
              </div>
              <div className="selfrow">
                <span className="selfrow__k">剑术</span>
                <span className="selfrow__v">
                  {c.swordTier}
                  {c.swordSchool !== "无" ? `（${c.swordSchool}）` : ""}
                </span>
              </div>
              <div className="selfrow">
                <span className="selfrow__k">冒险者</span>
                <span className="selfrow__v">{c.adventurerRank}</span>
              </div>
              <div className="selfrow selfrow--muted">
                <span className="selfrow__k">招式</span>
                <span className="selfrow__v">
                  {state.skills.length} 项 · 战力 {combatPower}
                </span>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel__head">
              <span>主线</span>
              <span className="panel__tools">
                <button type="button" className="btn btn--xs" onClick={() => onOpenDetail("mainline")}>
                  卷宗 →
                </button>
              </span>
            </div>
            <div className="panel__body">
              {mainline ? (
                <>
                  <div className="selfrow">
                    <span className="selfrow__k">
                      {mainline.stageIndex + 1}/{mainline.stageCount}
                    </span>
                    <span className="selfrow__v" title={mainline.name}>
                      {mainline.stage?.title ?? mainline.name}
                    </span>
                  </div>
                  <div className="selfrow">
                    <span className="selfrow__k">目标</span>
                    <span className="selfrow__v" title={mainline.stage?.objective}>
                      {mainline.stage?.objective ?? "——"}
                    </span>
                  </div>
                  <div className="selfrow selfrow--muted">
                    <span className="selfrow__k">任务</span>
                    <span className="selfrow__v">
                      {mainline.stage
                        ? `${mainline.stage.quests.filter((q) => q.done).length} / ${mainline.stage.quests.length} 完成`
                        : mainline.outcome ?? "——"}
                      {mainline.deadlineLeft !== null ? ` · 期限还剩 ${mainline.deadlineLeft} 月` : ""}
                    </span>
                  </div>
                </>
              ) : (
                <p className="fieldset__note">这一局没有主线。自由地活。</p>
              )}
            </div>
          </div>
        </div>

        {/* 中：眼前的事 + 纪事 + 能做的事。屏幕剩下来的宽度全给这里 */}
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
                className="btn btn--sm btn--ghost"
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
