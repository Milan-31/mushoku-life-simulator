import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rulebook from "../content/rulebook.md?raw";

interface Props {
  onBack: () => void;
}

/** 规则手册：把官方 markdown 原文按羊皮纸装帧呈现 */
export default function RulebookScreen({ onBack }: Props) {
  return (
    <section className="rulebook">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, color: "#f2e9d5" }}>规则手册</h1>
          <p className="creation__hint" style={{ textAlign: "left", marginTop: 4 }}>
            纯文本语言角色扮演 · 世界模拟系统运行协议
          </p>
        </div>
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          返回
        </button>
      </div>
      <div className="rulebook__inner">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]}>
          {rulebook}
        </ReactMarkdown>
      </div>
    </section>
  );
}