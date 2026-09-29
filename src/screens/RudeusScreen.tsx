import { useState } from "react";
import {
  RUDEUS_ANCHORS,
  RUDEUS_NAME,
  RUDEUS_PROFILE,
  RUDEUS_RELATIONS,
  RUDEUS_START_AGE,
  RUDEUS_START_YEAR,
  RUDEUS_TIMELINE,
} from "../data/rudeus";
import { formatYear } from "../engine/world";

interface Props {
  onBegin: () => void;
  onExit: () => void;
}

type Tab = "person" | "family" | "life";

/**
 * 原作模式扮演 · 角色档案。
 *
 * 上来不直接开局，而是先把这个人是谁、身边有谁、这一生会怎么走摊开给玩家看。
 * 三条边界必须写在开始之前：哪些是改不了的，哪些是能选的。
 */
export default function RudeusScreen({ onBegin, onExit }: Props) {
  const [tab, setTab] = useState<Tab>("person");

  return (
    <section className="rudeus">
      <div className="rudeus__head">
        <div className="rudeus__kicker">原作模式扮演</div>
        <h1 className="rudeus__name">{RUDEUS_NAME}</h1>
        <p className="rudeus__sub">{RUDEUS_PROFILE.headline}</p>
        <div className="rudeus__meta">
          <span className="tag">起点 · {formatYear(RUDEUS_START_YEAR)}</span>
          <span className="tag">{RUDEUS_START_AGE} 岁</span>
          <span className="tag">布耶纳村</span>
          <span className="tag">转生者</span>
        </div>
      </div>

      <div className="tabs rudeus__tabs" role="tablist">
        <button type="button" aria-current={tab === "person"} onClick={() => setTab("person")}>
          这个人
        </button>
        <button type="button" aria-current={tab === "family"} onClick={() => setTab("family")}>
          关系网 · {RUDEUS_RELATIONS.length}
        </button>
        <button type="button" aria-current={tab === "life"} onClick={() => setTab("life")}>
          一生 · {RUDEUS_TIMELINE.length}
        </button>
      </div>

      {tab === "person" && (
        <div className="rudeus__body">
          <div className="panel">
            <div className="panel__body">
              <p className="rudeus__p">{RUDEUS_PROFILE.intro}</p>
              <p className="rudeus__p">{RUDEUS_PROFILE.reborn}</p>
              <div className="divider" />
              <div className="kv"><span className="kv__k">身体</span><span className="kv__v">{RUDEUS_PROFILE.body}</span></div>
              <div className="kv"><span className="kv__k">魔术</span><span className="kv__v">{RUDEUS_PROFILE.magic}</span></div>
              <div className="kv"><span className="kv__k">剑术</span><span className="kv__v">{RUDEUS_PROFILE.sword}</span></div>
              <div className="divider" />
              <div className="rudeus__label">他是个什么样的人</div>
              <p className="rudeus__p">{RUDEUS_PROFILE.mind}</p>
            </div>
          </div>

          <div className="panel rudeus__anchorbox">
            <div className="panel__head">这一条人生线上，改不了的部分与要走上去才会发生的部分</div>
            <div className="panel__body">
              <ul className="rudeus__anchors">
                {RUDEUS_ANCHORS.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
              <p className="fieldset__note" style={{ marginTop: 10 }}>
                前两条是写死了的：转移事件会来，拉普拉斯会回来。中间两条带前提——
                你不下到迷宫最底层，保罗就活着；你不接人神的线，洛琪希就活着。
                你能改的始终是自己在其中的位置：你在不在场、护住了谁、带走了什么。
              </p>
            </div>
          </div>
        </div>
      )}

      {tab === "family" && (
        <div className="rudeus__body">
          <div className="panel">
            <div className="panel__head">开始这一年，他身边是这些人</div>
            <div className="panel__body">
              {RUDEUS_RELATIONS.map((r) => (
                <div className="rudeus__rel" key={r.name}>
                  <div className="rel__top">
                    <span className="rel__name">{r.name}</span>
                    <span className="rel__role">{r.bond} · {r.role}</span>
                  </div>
                  <div className="rel__stars">
                    {"★".repeat(r.stars)}
                    {"☆".repeat(Math.max(0, 5 - r.stars))}
                  </div>
                  <div className="rel__note">{r.note}</div>
                  {r.lore && <div className="rel__lore">原作 · {r.lore}</div>}
                </div>
              ))}
              <p className="fieldset__note" style={{ marginTop: 12 }}>
                其余的人会在该出现的时候出现：艾莉丝在罗亚，基列奴会来教你，瑞杰路德在魔大陆等着，
                希露菲会在多年之后的夏利亚被你认出来。遇合跟着地点与年份走。
              </p>
            </div>
          </div>
        </div>
      )}

      {tab === "life" && (
        <div className="rudeus__body">
          <div className="panel">
            <div className="panel__head">他这一生会走过的地方</div>
            <div className="panel__body">
              <div className="rudeus__timeline">
                {RUDEUS_TIMELINE.map((m) => (
                  <div className={`rudeus__mile${m.anchor ? " rudeus__mile--anchor" : ""}`} key={`${m.year}-${m.title}`}>
                    <div className="rudeus__milehead">
                      <span className="rudeus__mileyear">{formatYear(m.year)}</span>
                      <span className="rudeus__mileage">{m.age} 岁</span>
                      <span className="rudeus__miletitles">{m.title}</span>
                      {m.anchor && <span className="rudeus__anchor">锚点</span>}
                    </div>
                    <p className="rudeus__miletext">{m.text}</p>
                  </div>
                ))}
              </div>
              <p className="fieldset__note" style={{ marginTop: 12 }}>
                这是原作里他走过的路线，不是你必须在的位置。标了「锚点」的几件事里，转移与拉普拉斯复活无法改变，
                保罗与洛琪希两条要看你怎么走，其余全看你自己。你也可以哪里都不去。
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="rudeus__actions">
        <button type="button" className="btn btn--primary" onClick={onBegin}>
          以鲁迪乌斯开始人生
        </button>
        <button type="button" className="btn" onClick={onExit}>
          返回首页
        </button>
      </div>
    </section>
  );
}