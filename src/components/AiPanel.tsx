import { useState } from "react";
import Modal from "./Modal";
import type { AiBalance, AiBudget, AiConfig } from "../engine/ai";
import {
  DEEPSEEK_MODELS,
  isAiReady,
  loadBalanceCache,
  loadBudget,
  refreshBalance,
  remainingBudget,
  resetBudget,
  testConnection,
} from "../engine/ai";

interface Props {
  config: AiConfig;
  budget: AiBudget;
  onSave: (config: AiConfig) => void;
  onLedgerChange: (budget: AiBudget, balance: AiBalance | null) => void;
  onNotify: (msg: string) => void;
  onClose: () => void;
}

export default function AiPanel({ config, budget, onSave, onLedgerChange, onNotify, onClose }: Props) {
  const [draft, setDraft] = useState<AiConfig>(config);
  const [balance, setBalance] = useState<AiBalance | null>(() => loadBalanceCache());
  const [busy, setBusy] = useState<null | "test" | "balance">(null);

  const patch = (p: Partial<AiConfig>) => setDraft((d) => ({ ...d, ...p }));

  /** 换模型时把单价换成该模型的官方公布价，玩家仍可再改 */
  const pickModel = (value: string) => {
    const model = DEEPSEEK_MODELS.find((m) => m.value === value);
    if (!model) {
      patch({ model: value });
      return;
    }
    patch({ model: model.value, priceHit: model.priceHit, priceMiss: model.priceMiss, priceOut: model.priceOut });
  };

  const ready = isAiReady(draft);
  const unlimited = draft.budget <= 0;
  const remaining = remainingBudget(draft, budget);
  const yuan = (n: number) => `¥${n.toFixed(4)}`;
  const balanceAge = balance ? Math.max(0, Math.round((Date.now() - new Date(balance.fetchedAt).getTime()) / 60000)) : null;

  const runTest = async () => {
    setBusy("test");
    const result = await testConnection(draft);
    setBusy(null);
    onLedgerChange(loadBudget(), loadBalanceCache());
    onNotify(result.message);
  };

  const fetchBalance = async () => {
    setBusy("balance");
    const result = await refreshBalance(draft);
    setBusy(null);
    setBalance(result.balance);
    onLedgerChange(loadBudget(), result.balance);
    onNotify(result.message);
  };

  const save = () => {
    if (draft.enabled && !ready) {
      onNotify("请填写 API Key 并选择模型，才能开启 AI 推演。");
      return;
    }
    onSave({
      ...draft,
      apiKey: draft.apiKey.trim(),
      budget: Math.max(0, draft.budget),
      priceHit: Math.max(0, draft.priceHit),
      priceMiss: Math.max(0, draft.priceMiss),
      priceOut: Math.max(0, draft.priceOut),
    });
    onNotify(draft.enabled ? "已保存。之后的月份推进、行动结算与终章都将由 DeepSeek 实时推演。" : "已保存。当前由本地引擎推演剧情。");
    onClose();
  };

  return (
    <Modal
      title="AI 推演设置"
      onClose={onClose}
      actions={
        <>
          <button type="button" className="btn" onClick={onClose}>
            取消
          </button>
          <button type="button" className="btn btn--primary" onClick={save}>
            保存
          </button>
        </>
      }
    >
      <p className="fieldset__note" style={{ marginBottom: 14 }}>
        本作只对接 DeepSeek。开启后，每个月的世界动态、每次行动的判定与叙述、临时抉择事件，以及死亡时的终章，
        都由 DeepSeek 实时生成；调用失败或余额不足时自动回退到本地引擎，人生不会中断。数值仍由游戏引擎校验落账。
      </p>

      <div className="fieldset">
        <div className="fieldset__label">推演开关</div>
        <div className="chiprow">
          <button
            type="button"
            className="chip"
            aria-pressed={draft.enabled}
            onClick={() => patch({ enabled: !draft.enabled })}
          >
            {draft.enabled ? "DeepSeek 实时推演 · 已开启" : "DeepSeek 实时推演 · 已关闭（本地引擎）"}
          </button>
        </div>
      </div>

      <div className="fieldset">
        <div className="fieldset__label">账户与密钥</div>
        <div className="fieldrow">
          <div>
            <label className="fieldlabel">DeepSeek API Key</label>
            <input
              className="input"
              type="password"
              value={draft.apiKey}
              placeholder="sk-..."
              autoComplete="off"
              onChange={(e) => patch({ apiKey: e.target.value })}
            />
          </div>
          <div>
            <label className="fieldlabel">模型</label>
            <select className="select" value={draft.model} onChange={(e) => pickModel(e.target.value)}>
              {DEEPSEEK_MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="statchips" style={{ marginTop: 10 }}>
          <span className="tag">
            {balance ? `账户余额 ${balance.currency} ${balance.totalText}` : "账户余额 · 尚未查询"}
          </span>
          {balance && <span className="tag">赠送 {balance.grantedText} · 充值 {balance.toppedUpText}</span>}
          {balance && <span className="tag tag--diff">{balanceAge === 0 ? "刚刚更新" : `${balanceAge} 分钟前更新`}</span>}
        </div>
        {balance && (
          <p className="fieldset__note" style={{ marginTop: 8 }}>
            以上金额为 DeepSeek 余额接口的原样返回值，未做四舍五入或换算。
          </p>
        )}
        {balance && !balance.isAvailable && (
          <p className="fieldset__note" style={{ color: "var(--gold-2)", marginTop: 8 }}>
            DeepSeek 返回账户余额不足，调用会被拒绝。充值后点一次「刷新余额」即可恢复。
          </p>
        )}
        <div className="chiprow" style={{ marginTop: 10 }}>
          <button type="button" className="btn btn--sm btn--primary" onClick={fetchBalance} disabled={busy !== null || !draft.apiKey.trim()}>
            {busy === "balance" ? "查询中…" : "刷新余额"}
          </button>
          <button type="button" className="btn btn--sm" onClick={runTest} disabled={busy !== null || !draft.apiKey.trim()}>
            {busy === "test" ? "测试中…" : "测试连通"}
          </button>
        </div>
        <p className="fieldset__note" style={{ marginTop: 8 }}>
          余额来自 DeepSeek 的账户接口，每次推演后会自动刷新（最快 20 秒一次）。密钥只保存在本机，不会写进存档，也不会随分享链接导出。
        </p>
      </div>

      <div className="fieldset">
        <div className="fieldset__label">本机计价</div>
        <p className="fieldset__note" style={{ marginBottom: 10 }}>
          单价用于把 token 用量换算成金额，默认值是 DeepSeek 公布的人民币价，若官方调价请自行更新。缓存命中的输入价通常远低于未命中。
        </p>
        <div className="fieldrow fieldrow--3">
          <div>
            <label className="fieldlabel">输入价 · 缓存命中</label>
            <input
              className="input"
              type="number"
              min={0}
              step={0.005}
              value={draft.priceHit}
              onChange={(e) => patch({ priceHit: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="fieldlabel">输入价 · 缓存未命中</label>
            <input
              className="input"
              type="number"
              min={0}
              step={0.1}
              value={draft.priceMiss}
              onChange={(e) => patch({ priceMiss: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="fieldlabel">输出价</label>
            <input
              className="input"
              type="number"
              min={0}
              step={0.1}
              value={draft.priceOut}
              onChange={(e) => patch({ priceOut: Number(e.target.value) })}
            />
          </div>
        </div>
        <p className="fieldset__note" style={{ marginTop: 8 }}>
          单位：元 / 百万 token。
        </p>
      </div>

      <div className="fieldset">
        <div className="fieldset__label">本机消耗与硬上限</div>
        <div className="fieldrow">
          <div>
            <label className="fieldlabel">本机硬上限（元，0 = 不限额）</label>
            <input
              className="input"
              type="number"
              min={0}
              step={1}
              value={draft.budget}
              onChange={(e) => patch({ budget: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="fieldlabel">清零</label>
            <button
              type="button"
              className="btn"
              onClick={() => {
                const fresh = resetBudget();
                onLedgerChange(fresh, balance);
                onNotify("本机消耗已清零，硬上限保持不变。");
              }}
              disabled={budget.spent === 0 && budget.calls === 0}
            >
              清零本机消耗
            </button>
          </div>
        </div>
        <div className="statchips" style={{ marginTop: 10 }}>
          <span className="tag">已调用 {budget.calls} 次</span>
          <span className="tag">本机估算已用 {yuan(budget.spent)}</span>
          <span className="tag tag--diff">
            {unlimited ? "未设硬上限" : `剩余 ${yuan(remaining)} / ${yuan(draft.budget)}`}
          </span>
        </div>
        {budget.usageMissing && (
          <p className="fieldset__note" style={{ color: "var(--gold-2)", marginTop: 8 }}>
            有调用未返回 token 用量，本机估算可能偏低。
          </p>
        )}
      </div>

      <div className="fieldset">
        <div className="fieldset__label">自撰剧情</div>
        <div className="chiprow">
          <button
            type="button"
            className="chip"
            aria-pressed={draft.inventPlot}
            onClick={() => patch({ inventPlot: !draft.inventPlot })}
          >
            {draft.inventPlot ? "允许自撰新剧情 · 已开启" : "只演绎原作设定 · 已关闭"}
          </button>
        </div>
        <p className="fieldset__note">
          开启后，模型可以基于原作设定自行发明人物、地点、组织与伏线，并把需要长期记住的部分写进存档的「自撰设定集」；
          它也可以在处境真的变了的时候，给「你的行动」面板添一个新的场景或几条本地预设做法。
          这些内容只随存档保存，不会写进游戏本体的任何内容文件，也不会影响其它存档。
        </p>
      </div>

      <div className="fieldset">
        <div className="fieldset__label">推演参数</div>
        <div className="fieldrow">
          <div>
            <label className="fieldlabel">温度（{draft.temperature.toFixed(2)}）</label>
            <input
              className="input"
              type="number"
              min={0}
              max={2}
              step={0.05}
              value={draft.temperature}
              onChange={(e) => patch({ temperature: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="fieldlabel">超时（毫秒）</label>
            <input
              className="input"
              type="number"
              min={5000}
              max={300000}
              step={1000}
              value={draft.timeoutMs}
              onChange={(e) => patch({ timeoutMs: Number(e.target.value) })}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}