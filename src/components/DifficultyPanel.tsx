import Modal from "./Modal";
import { DIFFICULTIES } from "../data/difficulty";
import type { Difficulty } from "../types";

interface Props {
  value: Difficulty;
  onChange: (d: Difficulty) => void;
  onClose: () => void;
}

export default function DifficultyPanel({ value, onChange, onClose }: Props) {
  return (
    <Modal
      title="难度调节"
      onClose={onClose}
      actions={
        <button type="button" className="btn btn--primary" onClick={onClose}>
          关闭
        </button>
      }
    >
      <p className="fieldset__note" style={{ marginBottom: 14 }}>
        难度随时可以调整。它改变的是往后的演化规则：寿命、收入、健康衰减、事件频率与抉择代价。已经发生的事不会改写。
      </p>
      <div className="diffs">
        {DIFFICULTIES.map((d) => {
          const on = d.id === value;
          return (
            <button
              key={d.id}
              type="button"
              className={`diff${on ? " diff--on" : ""}`}
              aria-pressed={on}
              onClick={() => onChange(d.id)}
            >
              <div className="diff__top">
                <span className="diff__name">{d.label}</span>
                {on && <span className="diff__now">当前</span>}
              </div>
              <div className="diff__desc">{d.desc}</div>
              <div className="diff__hints">
                {d.hints.map((h) => (
                  <span className="diff__hint" key={h}>
                    {h}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}