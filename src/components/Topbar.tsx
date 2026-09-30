import { useEffect, useRef, useState } from "react";
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

/** 设置图标：三根滑杆，与「设置」二字的含义对得上 */
function GearIcon() {
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
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </svg>
  );
}

/** when：这条导航什么时候出现。缺省是任何时候 */
const NAV: { key: View; label: string; when?: "any" | "game" | "noCharacter" }[] = [
  { key: "title", label: "起点" },
  { key: "creation", label: "创造角色", when: "noCharacter" },
  { key: "game", label: "入世", when: "game" },
];

/**
 * 手里的角色与这位导航项对不上时，就把它收起来。
 *
 * - 已经有人生在走（game 有值）：「创造角色」不再出现，免得正在过的那一局被随手另起一局。
 *   但停在创建页本身时仍要留着，那样才知道自己站在哪一步。
 * - 还没有角色：「入世」不出现。
 */
function navVisible(item: (typeof NAV)[number], hasCharacter: boolean, view: View) {
  if (item.when === "game") return hasCharacter;
  if (item.when === "noCharacter") return !hasCharacter || view === "creation";
  return true;
}

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
  /** 设置菜单的开合。规则手册与 AI 推演都收在这里 */
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 点菜单外面、或按 Esc 就收起来；开着的时候才挂监听
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const go = (key: View) => {
    setMenuOpen(false);
    onNavigate(key);
  };

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
        {NAV.filter((n) => navVisible(n, hasCharacter, view)).map((n) => (
          <button
            key={n.key}
            type="button"
            aria-current={view === n.key ? "true" : undefined}
            onClick={() => go(n.key)}
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
        <div className="topbar__menu" ref={menuRef}>
          <button
            type="button"
            className="topbar__menuBtn"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            /* 规则手册收在设置里，进这一页时让设置保持高亮，免得看不出自己在哪 */
            aria-current={view === "rulebook" ? "true" : undefined}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <GearIcon />
            设置
          </button>
          {menuOpen && (
            <div className="topbar__menuPanel" role="menu">
              <button type="button" role="menuitem" onClick={() => go("rulebook")}>
                规则手册
              </button>
              {onAi && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onAi();
                  }}
                >
                  AI 推演
                </button>
              )}
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
