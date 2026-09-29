import { useState } from "react";
import Modal from "./Modal";
import type { GameState } from "../types";
import { API_VERSION, buildImportUrl, decodeImportPayload } from "../engine/api";

interface Props {
  state: GameState | null;
  onImport: (text: string) => void;
  onNotify: (msg: string) => void;
  onClose: () => void;
}

const API_DOC = [
  ["MushokuLifeSim.import(x)", "导入存档：JSON 文本、对象、base64 或完整 URL"],
  ["MushokuLifeSim.export()", "导出当前人生为 JSON 文本"],
  ["MushokuLifeSim.state()", "读取当前游戏状态对象"],
  ["MushokuLifeSim.loadSlot(id)", "读取槽位：auto / 1 / 2 / 3"],
  ["MushokuLifeSim.shareUrl()", "生成可分享的导入链接"],
  ["MushokuLifeSim.help()", "查看接口说明"],
];

export default function ApiPanel({ state, onImport, onNotify, onClose }: Props) {
  const [text, setText] = useState("");
  const [shareUrl, setShareUrl] = useState("");

  const importNow = () => {
    const raw = text.trim();
    if (!raw) {
      onNotify("请先粘贴存档内容或导入链接。");
      return;
    }
    onImport(decodeImportPayload(raw));
    setText("");
  };

  const makeShare = () => {
    if (!state) {
      onNotify("当前没有可分享的人生。");
      return;
    }
    const url = buildImportUrl(window.location.origin + window.location.pathname, state);
    setShareUrl(url);
    void navigator.clipboard?.writeText(url);
    onNotify("分享链接已生成，已尝试复制到剪贴板。");
  };

  const copy = (value: string, tip: string) => {
    void navigator.clipboard?.writeText(value);
    onNotify(tip);
  };

  return (
    <Modal
      title="导入接口"
      onClose={onClose}
      actions={
        <button type="button" className="btn btn--primary" onClick={onClose}>
          关闭
        </button>
      }
    >
      <p className="fieldset__note" style={{ marginBottom: 14 }}>
        支持两种导入方式：粘贴存档/链接，或通过浏览器控制台调用接口。接口版本 v{API_VERSION}。
      </p>

      <div className="fieldset">
        <div className="fieldset__label">粘贴存档或导入链接</div>
        <textarea
          className="textarea"
          value={text}
          placeholder='{"version":1,"state":{...}} 或 https://.../index.html?save=...'
          onChange={(e) => setText(e.target.value)}
          style={{ minHeight: 130, fontSize: 12 }}
        />
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <button type="button" className="btn btn--primary btn--sm" onClick={importNow} disabled={!text.trim()}>
            载入
          </button>
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => setText("")}
            disabled={!text}
          >
            清空
          </button>
        </div>
      </div>

      <div className="fieldset">
        <div className="fieldset__label">分享链接</div>
        <p className="fieldset__note" style={{ marginBottom: 8 }}>
          生成一条链接，任何人在浏览器里打开它，就会载入这份人生存档。
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="btn btn--sm btn--primary" onClick={makeShare} disabled={!state}>
            生成并复制
          </button>
          {shareUrl && (
            <button type="button" className="btn btn--sm" onClick={() => copy(shareUrl, "链接已复制。")}>
              再次复制
            </button>
          )}
        </div>
        {shareUrl && (
          <textarea
            className="textarea"
            readOnly
            value={shareUrl}
            style={{ marginTop: 10, minHeight: 70, fontSize: 11 }}
          />
        )}
      </div>

      <div className="fieldset">
        <div className="fieldset__label">浏览器接口</div>
        <p className="fieldset__note" style={{ marginBottom: 8 }}>
          打开开发者工具（F12），在控制台里直接调用：
        </p>
        <div className="apilist">
          {API_DOC.map(([sig, desc]) => (
            <div className="apilist__row" key={sig}>
              <code className="apilist__sig">{sig}</code>
              <span className="apilist__desc">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}