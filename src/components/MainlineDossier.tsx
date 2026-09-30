import type { MainlineView } from "../types";

/**
 * 主线卷宗正文。
 *
 * 弹窗（主页上的「主线卷宗」按钮）与详情页读的是同一份——
 * 免得同一条主线在两处长得不一样。
 */
export default function MainlineDossier({ view }: { view: MainlineView }) {
  const stage = view.stage;
  const quests = stage?.quests ?? [];
  const doneCount = quests.filter((q) => q.done).length;

  return (
    <div className="dossier">
      <div className="dossier__head">
        <div>
          <div className="dossier__theme">{view.theme}</div>
          <h3 className="dossier__name">{view.name}</h3>
          <p className="dossier__tagline">{view.tagline}</p>
        </div>
        <div className="dossier__meta">
          <div className="kv">
            <span className="kv__k">进度</span>
            <span className="kv__v">
              {view.progress}%（第 {view.stageIndex + 1} / {view.stageCount} 章）
            </span>
          </div>
          {view.deadlineLeft !== null && (
            <div className="kv">
              <span className="kv__k">本章期限</span>
              <span className="kv__v">还剩 {view.deadlineLeft} 个月</span>
            </div>
          )}
          {view.outcome && (
            <div className="kv">
              <span className="kv__k">结果</span>
              <span className="kv__v">
                {view.outcome}
                {view.endedYear ? ` · ${view.endedYear} 年` : ""}
              </span>
            </div>
          )}
        </div>
      </div>

      <p className="dossier__fit">这条线本来为谁而写：{view.fit}</p>

      {stage && (
        <div className="dossier__block">
          <div className="dossier__blockhead">
            {stage.title}
            <span className="dossier__count">
              任务 {doneCount} / {quests.length}
            </span>
          </div>
          <p className="dossier__premise">{stage.premise}</p>
          <p className="dossier__objective">本章目标 · {stage.objective}</p>

          <div className="dossier__label">怎么做</div>
          <ol className="guide">
            {stage.guidance.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ol>

          <div className="dossier__label">任务</div>
          <ul className="quests quests--wide">
            {quests.map((q) => (
              <li key={q.id} className={`quest${q.done ? " quest--done" : ""}`}>
                <span className="quest__mark">{q.done ? "✓" : "○"}</span>
                <span className="quest__body">
                  <span className="quest__label">{q.label}</span>
                  <span className="quest__why">{q.done ? q.hint : q.reason || q.hint}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {view.next && (
        <p className="dossier__next">
          下一章 · {view.next.title}
          <span className="mainline__nextwhy">{view.next.reason}</span>
        </p>
      )}

      <div className="dossier__label">这条路怎么走的</div>
      <ol className="chapters">
        {view.chapters.map((c) => (
          <li
            key={c.id}
            className={`chapter chapter--${
              c.status === "已完成" ? "done" : c.status === "拖过" ? "over" : c.status === "进行中" ? "now" : "locked"
            }`}
          >
            <span className="chapter__status">{c.status}</span>
            <span className="chapter__title">{c.title}</span>
            {c.note && <span className="chapter__note">{c.note}</span>}
          </li>
        ))}
      </ol>

      {view.tune && (
        <>
          <div className="dossier__label">导演注记 · {view.tune.year} 年</div>
          <p className="dossier__tune">{view.tune.note}</p>
        </>
      )}

      {view.notes.length > 0 && (
        <>
          <div className="dossier__label">这一路留下的</div>
          <ul className="notes">
            {view.notes
              .slice()
              .reverse()
              .map((n, i) => (
                <li key={i}>{n}</li>
              ))}
          </ul>
        </>
      )}

      <p className="fieldset__note" style={{ marginTop: 14 }}>
        主线只给方向与目标，不替你做决定。章与章之间的门槛会写在这儿；
        每年年末，接进来的 AI 会看这一年你实际做了什么，再决定这条线往哪偏。
      </p>
    </div>
  );
}
