import type { View } from "../types";

interface Props {
  view: View;
  onNavigate: (v: View) => void;
  date?: string;
  hasCharacter: boolean;
  onAchievements?: () => void;
  onSaves?: () => void;
  onAi?: () => void;
  /** 形如「CNY 9.96」，取自 DeepSeek 余额接口的原样返回值；无密钥时不显示 */
  aiBalanceText?: string | null;
  /** 已停止调用时用醒目样式 */
  aiBalanceWarn?: boolean;
  /** 点余额胶囊直接进 AI 推演设置 */
  onOpenAiBalance?: () => void;
}

/** 余额胶囊前的小图标：一张卡，一个点。线性描边，跟着文字颜色走 */
function BalanceIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2.5" y="5.5" width="19" height="13" rx="3.5" />
      <path d="M2.5 10h19" />
      <circle cx="17" cy="14.5" r="1.15" />
    </svg>
  );
}

const NAV: { key: View; label: string; when?: "any" | "game" }[] = [
  { key: "title", label: "起点" },
  { key: "creation", label: "创造角色" },
  { key: "game", label: "入世", when: "game" },
  { key: "rulebook", label: "规则手册" },
];

export default function Topbar({
  view,
  onNavigate,
  date,
  hasCharacter,
  onAchievements,
  onSaves,
  onAi,
  aiBalanceText,
  aiBalanceWarn,
  onOpenAiBalance,
}: Props) {
  return (
    <header className="topbar">
      <div className="topbar__brand">
        <span>✦</span>
        <span>
          无职转生：人生模拟器
          <small>六面世界 · 超高自由度</small>
        </span>
      </div>
      {date && <span className="topbar__date">{date}</span>}
      {aiBalanceText && (
        <button
          type="button"
          className={`topbar__balance${aiBalanceWarn ? " topbar__balance--warn" : ""}`}
          onClick={onOpenAiBalance}
          disabled={!onOpenAiBalance}
          title="DeepSeek 账户余额，原样取自余额接口。点开查看 AI 推演设置"
          aria-label={`AI 余额 ${aiBalanceText}，点开查看 AI 推演设置`}
        >
          <BalanceIcon />
          <span>
            AI 余额 <b>{aiBalanceText}</b>
          </span>
        </button>
      )}
      <nav className="topbar__nav" aria-label="主导航">
        {NAV.filter((n) => n.when !== "game" || hasCharacter).map((n) => (
          <button
            key={n.key}
            type="button"
            aria-current={view === n.key ? "true" : undefined}
            onClick={() => onNavigate(n.key)}
          >
            {n.label}
          </button>
        ))}
        {onAchievements && (
          <button type="button" onClick={onAchievements}>
            成就
          </button>
        )}
        {onSaves && (
          <button type="button" onClick={onSaves}>
            存档
          </button>
        )}
        {onAi && (
          <button type="button" onClick={onAi}>
            AI 推演
          </button>
        )}
      </nav>
    </header>
  );
}