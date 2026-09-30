import { useEffect, useMemo, useRef, useState } from "react";
import type { GameState, YearView } from "../types";
import { MONTH_NAMES, buildYearView, formatDate, formatYear, yearOptions } from "../engine/world";

interface Props {
  state: GameState;
}

const KIND_LABEL: Record<string, string> = {
  world: "世界",
  action: "行动",
  choice: "抉择",
  achievement: "成就",
  ending: "终章",
  rumor: "传闻",
  mainline: "主线",
};

/** 一年的总结。数字来自年鉴里那几条事件 */
function headline(view: YearView): string {
  const count = (kind: string) => view.events.filter((e) => e.kind === kind).length;
  const parts: string[] = [];
  if (count("mainline") > 0) parts.push(`${count("mainline")} 段主线`);
  if (count("choice") > 0) parts.push(`${count("choice")} 次抉择`);
  if (count("achievement") > 0) parts.push(`${count("achievement")} 项成就`);
  if (count("action") > 0) parts.push(`${count("action")} 件自己做的事`);
  if (count("ending") > 0) parts.push("一段人生走到尽头");
  const what = view.events.length > 0 ? `留下 ${view.events.length} 件事` : "什么也没留下";
  return `${formatYear(view.year)}，你 ${view.age} 岁，${what}${parts.length > 0 ? `：${parts.join(" · ")}` : ""}。`;
}

/**
 * 纪事。两种看法：
 * - 月度：一次只展开一条，默认停在最新一条（当前行为的结果），滚轮逐条翻阅。
 * - 年度：按年回看，把这一年的几件大事排成一列，往年读存档里的年鉴，本年现算。
 */
export default function Chronicle({ state }: Props) {
  const [mode, setMode] = useState<"month" | "year">("month");
  const [index, setIndex] = useState(0);
  const [seenNewest, setSeenNewest] = useState(state.log[0]?.id ?? "");
  const [year, setYear] = useState(state.year);
  const boxRef = useRef<HTMLDivElement | null>(null);
  /** 面板本身。新纪事出现时把它滚回顶部 */
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const lastStep = useRef(0);

  const entries = state.log;
  const max = Math.max(0, entries.length - 1);
  const newestId = entries[0]?.id ?? "";

  // 产生新纪事时回到最新一条，让当前行为的结果始终优先出现在眼前。
  // 在渲染期直接调整 state，避免先闪一帧旧内容。
  if (seenNewest !== newestId) {
    setSeenNewest(newestId);
    setIndex(0);
  }

  const cursor = Math.min(index, max);

  const years = useMemo(() => yearOptions(state), [state]);
  // 刚跨年时年份列表会多一项，选中项跟着走
  if (!years.includes(year) && year !== state.year) setYear(state.year);
  const cursorYear = years.includes(year) ? year : state.year;
  const view = useMemo(() => buildYearView(state, cursorYear), [state, cursorYear]);
  const yearIndex = Math.max(0, years.indexOf(cursorYear));

  // 滚轮逐条切换。用非 passive 监听以便拦下页面滚动
  useEffect(() => {
    const el = boxRef.current;
    if (!el || mode !== "month") return;
    const onWheel = (e: WheelEvent) => {
      if (max === 0) return;
      // 正文自己可以滚动时（世界动态那一类长条目）就别抢滚轮
      const target = e.target as HTMLElement | null;
      const scroller = target?.closest?.(".chronicle__entryscroll") as HTMLElement | null;
      if (scroller && scroller.scrollHeight > scroller.clientHeight + 2) return;
      e.preventDefault();
      const now = Date.now();
      if (now - lastStep.current < 130) return; // 抑制触控板的连续抖动
      const dir = e.deltaY > 0 ? 1 : -1; // 下滚翻到更早，上滚回到更近
      const next = Math.min(max, Math.max(0, cursor + dir));
      if (next !== cursor) {
        lastStep.current = now;
        setIndex(next);
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [cursor, max, mode]);

  // 翻条、切视图、换年份、来了新纪事，都回到顶部。
  // 内容可能是十几行的一整条，停在上一处滚动位置会让人以为它被截断了。
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [cursor, mode, cursorYear, newestId]);

  const step = (dir: number) => setIndex(Math.min(max, Math.max(0, cursor + dir)));
  const entry = entries[cursor];

  return (
    <div className="panel chronicle__panel">
      <div className="panel__head">
        <span>{mode === "month" ? "月度纪事" : "年度纪事"}</span>
        <div className="chronicle__modes" role="tablist" aria-label="纪事视图">
          <button type="button" aria-current={mode === "month"} onClick={() => setMode("month")}>
            月度
          </button>
          <button type="button" aria-current={mode === "year"} onClick={() => setMode("year")}>
            年度
          </button>
        </div>
      </div>

      <div className="panel__body" ref={bodyRef}>
        {mode === "month" ? (
          !entry ? (
            <p className="fieldset__note">纪事尚未开始。时间还没有往前走。</p>
          ) : (
            <div className="chronicle__body" ref={boxRef}>
              <div className="timeline">
                <input
                  className="timeline__range"
                  type="range"
                  min={0}
                  max={max}
                  // 时间轴左端为最早、右端为最新，与阅读方向一致
                  value={max - cursor}
                  onChange={(e) => setIndex(max - Number(e.target.value))}
                  aria-label="按时间跳转纪事"
                />
                <div className="timeline__meta">
                  <span>{formatDate(entry.year, entry.month)}</span>
                  <span className="timeline__pos">
                    第 {state.turn - cursor} 回合 · {cursor === 0 ? "最新" : `回溯第 ${cursor} 条`} / 共 {entries.length} 条
                  </span>
                </div>
              </div>

              {/* 正文单独一层滚动容器：时间轴与翻页按钮留在原位，长条目在这里面滚 */}
              <div className="chronicle__entryscroll">
                <article className="entry entry--solo" key={entry.id}>
                  <span className={`entry__dot entry__dot--${entry.kind}`} />
                  <div className="entry__head">
                    <span className={`entry__kind entry__kind--${entry.kind}`}>
                      {KIND_LABEL[entry.kind] ?? "纪事"}
                    </span>
                  </div>
                  <div className="entry__title">{entry.title}</div>
                  <div className="entry__lines">
                    {entry.lines.map((l, i) => (
                      <p key={i}>{l}</p>
                    ))}
                    {entry.rumor && (
                      <p>
                        <em>【可获知的传闻】</em>
                        {entry.rumor}
                      </p>
                    )}
                  </div>
                </article>
              </div>

              <div className="chronicle__nav">
                <button type="button" className="btn btn--sm" onClick={() => step(-1)} disabled={cursor === 0}>
                  更新一条 ⌃
                </button>
                <button type="button" className="btn btn--sm" onClick={() => step(1)} disabled={cursor >= max}>
                  更早一条 ⌄
                </button>
                <button
                  type="button"
                  className="btn btn--sm btn--ghost"
                  onClick={() => setIndex(0)}
                  disabled={cursor === 0}
                >
                  回到最新
                </button>
              </div>
              <p className="chronicle__hint">滚轮逐条翻阅 · 拖动时间轴按时间跳跃</p>
            </div>
          )
        ) : (
          <div className="chronicle__body yearbook">
            <div className="timeline">
              <input
                className="timeline__range"
                type="range"
                min={0}
                max={Math.max(0, years.length - 1)}
                value={yearIndex}
                onChange={(e) => setYear(years[Number(e.target.value)] ?? state.year)}
                aria-label="按年份跳转年鉴"
              />
              <div className="timeline__meta">
                <span>{formatYear(view.year)}</span>
                <span className="timeline__pos">
                  {view.archived ? "年鉴" : "本年度 · 仍在继续"} · 第 {yearIndex + 1} / {years.length} 年
                </span>
              </div>
            </div>

            <div className="yearbook__head">{headline(view)}</div>

            {view.events.length === 0 ? (
              <p className="fieldset__note">这一年没有留下值得记的事。</p>
            ) : (
              <div className="yearbook__events">
                {view.events.map((e, i) => (
                  <div className={`yearevent yearevent--${e.kind}`} key={`${e.month}-${i}`}>
                    <span className="yearevent__month">{MONTH_NAMES[(e.month - 1) % 12]}</span>
                    <span className="yearevent__kind">{KIND_LABEL[e.kind] ?? "纪事"}</span>
                    <span className="yearevent__title">{e.title}</span>
                    {e.text && <span className="yearevent__text">{e.text}</span>}
                  </div>
                ))}
              </div>
            )}

            {view.world.length > 0 && (
              <details className="yearbook__world">
                <summary>世界这一年（{view.world.length} 条）</summary>
                <div className="yearbook__worldbody">
                  {view.world.map((w, i) => (
                    <p key={i}>{w}</p>
                  ))}
                </div>
              </details>
            )}

            <div className="chronicle__nav">
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => setYear(years[yearIndex - 1] ?? cursorYear)}
                disabled={yearIndex <= 0}
              >
                上一年 ⌃
              </button>
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => setYear(years[yearIndex + 1] ?? cursorYear)}
                disabled={yearIndex >= years.length - 1}
              >
                下一年 ⌄
              </button>
              <button
                type="button"
                className="btn btn--sm btn--ghost"
                onClick={() => setYear(state.year)}
                disabled={cursorYear === state.year}
              >
                回到今年
              </button>
            </div>
            <p className="chronicle__hint">拖动时间轴按年份跳转 · 往年读的是年末封存的年鉴</p>
          </div>
        )}
      </div>
    </div>
  );
}
