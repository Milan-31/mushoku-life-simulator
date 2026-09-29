import { useEffect, useRef, useState } from "react";
import type { Relation } from "../types";
import Modal from "./Modal";

export interface TalkLine {
  who: "player" | "npc";
  text: string;
  mood?: string;
}

interface Props {
  relation: Relation;
  /** AI 不可用时只能查看关系，不能交谈 */
  aiReady: boolean;
  busy: boolean;
  onSend: (line: string) => void;
  /** 结束对话：交回给上层做结算 */
  onEnd: () => void;
  /** 直接关闭，不做结算（一句话都没说时） */
  onClose: () => void;
  lines: TalkLine[];
}

/**
 * 角色对话窗。玩家与某个亲密角色一来一往地说话，
 * 结束对话时由模型判定这段交谈在现实里留下了什么。
 */
export default function TalkPanel({ relation, aiReady, busy, onSend, onEnd, onClose, lines }: Props) {
  const [draft, setDraft] = useState("");
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length, busy]);

  const send = () => {
    const t = draft.trim();
    if (!t || busy) return;
    onSend(t);
    setDraft("");
  };

  const exchanged = lines.some((l) => l.who === "player");

  return (
    <Modal
      title={`与 ${relation.name} 说话`}
      onClose={exchanged ? onEnd : onClose}
      actions={
        <>
          <button type="button" className="btn" onClick={exchanged ? onEnd : onClose} disabled={busy}>
            {exchanged ? "结束对话并结算" : "关闭"}
          </button>
          <button type="button" className="btn btn--primary" onClick={send} disabled={busy || !draft.trim()}>
            {busy ? "对方正在回应…" : "说这句"}
          </button>
        </>
      }
    >
      <div className="talk__head">
        <span className="tag">{relation.bond ?? "熟人"}</span>
        <span className="tag">{relation.role}</span>
        <span className="tag tag--diff">好感 {relation.stars}/5</span>
        {relation.memory && relation.memory.talks > 0 && (
          <span className="tag">谈过 {relation.memory.talks} 次</span>
        )}
      </div>

      {relation.memory?.summary && (
        <p className="talk__memory">他还记得上次：{relation.memory.summary}</p>
      )}

      {!aiReady && (
        <p className="fieldset__note" style={{ color: "var(--gold-2)", marginTop: 10 }}>
          对话需要 AI 推演。当前 AI 未开启或已停止调用，先在「AI 推演设置」里开启再回来。
        </p>
      )}

      <div className="talk__log" ref={boxRef}>
        {lines.length === 0 && (
          <p className="talk__empty">
            他会怎么回应你，取决于他是谁、你和他是什么关系、以及你说了什么。想清楚再开口。
          </p>
        )}
        {lines.map((l, i) => (
          <div className={`talk__line talk__line--${l.who}`} key={i}>
            <div className="talk__who">{l.who === "player" ? "你" : relation.name}</div>
            <div className="talk__text">{l.text}</div>
            {l.mood && <div className="talk__mood">{l.mood}</div>}
          </div>
        ))}
        {busy && <div className="talk__typing">{relation.name} 正在斟酌措辞…</div>}
      </div>

      <div className="actionbox" style={{ marginTop: 12 }}>
        <textarea
          className="textarea"
          value={draft}
          placeholder={`对 ${relation.name} 说些什么…`}
          disabled={!aiReady || busy}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
          }}
        />
      </div>

      <p className="fieldset__note" style={{ marginTop: 10 }}>
        结束对话时，模型会根据你们说了什么判定影响：可能什么都没变，也可能改变好感、声望，甚至留下传闻。
        一次对话占用本月一次行动。
      </p>
    </Modal>
  );
}
