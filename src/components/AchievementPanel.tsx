import Modal from "./Modal";
import { ACHIEVEMENTS, ACHIEVEMENT_TOTAL } from "../data/achievements";
import type { AchievementCategory } from "../types";

const ORDER: AchievementCategory[] = ["出身", "成长", "情感", "世界", "生存", "抉择"];

interface Props {
  unlocked: string[];
  onClose: () => void;
}

export default function AchievementPanel({ unlocked, onClose }: Props) {
  const set = new Set(unlocked);
  const pct = Math.round((set.size / ACHIEVEMENT_TOTAL) * 100);

  return (
    <Modal
      title="成就"
      onClose={onClose}
      actions={
        <button type="button" className="btn btn--primary" onClick={onClose}>
          关闭
        </button>
      }
    >
      <div className="ach__head">
        <span className="ach__count">
          已解锁 <b>{set.size}</b> / {ACHIEVEMENT_TOTAL}
        </span>
        <span className="ach__pct">{pct}%</span>
      </div>
      <div className="bar__track" style={{ marginBottom: 18 }}>
        <div className="bar__fill" style={{ width: `${pct}%` }} />
      </div>

      {ORDER.map((cat) => {
        const list = ACHIEVEMENTS.filter((a) => a.category === cat);
        const on = list.filter((a) => set.has(a.id)).length;
        return (
          <div className="ach__group" key={cat}>
            <div className="ach__cat">
              {cat}
              <span>
                {on} / {list.length}
              </span>
            </div>
            <div className="ach__grid">
              {list.map((a) => {
                const got = set.has(a.id);
                return (
                  <div className={`ach__item${got ? " ach__item--on" : ""}`} key={a.id}>
                    <span className="ach__mark">{got ? "✦" : "○"}</span>
                    <div>
                      <div className="ach__name">{a.name}</div>
                      <div className="ach__desc">{a.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </Modal>
  );
}