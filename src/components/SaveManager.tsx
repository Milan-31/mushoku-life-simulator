import { useState } from "react";
import Modal from "./Modal";
import { SLOT_IDS, SLOT_LABELS, deleteSlot, listSlots, writeSlot } from "../engine/saves";
import type { GameState, SaveSlot } from "../types";

interface Props {
  current: GameState | null;
  onLoad: (state: GameState) => void;
  onNotify: (msg: string) => void;
  onClose: () => void;
}

export default function SaveManager({ current, onLoad, onNotify, onClose }: Props) {
  const [slots, setSlots] = useState<(SaveSlot | null)[]>(() => listSlots());
  const refresh = () => setSlots(listSlots());

  const save = (id: string) => {
    if (!current) {
      onNotify("当前没有可存档的人生。");
      return;
    }
    writeSlot(id, current);
    refresh();
    onNotify(`已写入「${SLOT_LABELS[id]}」。`);
  };

  const load = (slot: SaveSlot) => {
    onLoad(slot.state);
    onNotify(`已读取「${SLOT_LABELS[slot.id]}」。`);
  };

  const remove = (id: string) => {
    deleteSlot(id);
    refresh();
    onNotify(`已删除「${SLOT_LABELS[id]}」。`);
  };

  return (
    <Modal
      title="存档管理"
      onClose={onClose}
      actions={
        <button type="button" className="btn btn--primary" onClick={onClose}>
          关闭
        </button>
      }
    >
      <p className="fieldset__note" style={{ marginBottom: 14 }}>
        自动存档在你每次推进月份时写入。手动槽位适合在重大抉择前留档，随时可以读回。
      </p>

      <div className="slots">
        {SLOT_IDS.map((id, i) => {
          const s = slots[i];
          return (
            <div className={`slot${s ? "" : " slot--empty"}`} key={id}>
              <div className="slot__info">
                <div className="slot__label">
                  {SLOT_LABELS[id]}
                  {s?.deceased && <span className="slot__dead">已故</span>}
                </div>
                {s ? (
                  <div className="slot__desc">
                    <b>{s.name}</b> · {s.era} · {s.dateText}
                    <div className="slot__meta">
                      第 {s.turn} 回合　{s.age} 岁　成就 {s.achievementCount} 项
                    </div>
                    <div className="slot__time">保存于 {new Date(s.savedAt).toLocaleString("zh-CN")}</div>
                  </div>
                ) : (
                  <div className="slot__desc slot__desc--empty">空槽位</div>
                )}
              </div>
              <div className="slot__actions">
                {id !== "auto" && (
                  <button type="button" className="btn btn--sm" onClick={() => save(id)} disabled={!current}>
                    存入
                  </button>
                )}
                <button type="button" className="btn btn--sm btn--primary" onClick={() => s && load(s)} disabled={!s}>
                  读取
                </button>
                {id !== "auto" && s && (
                  <button type="button" className="btn btn--sm btn--ghost" onClick={() => remove(id)}>
                    删除
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}