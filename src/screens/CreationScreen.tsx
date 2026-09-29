import { useMemo, useState } from "react";
import type { CreationDraft, Option } from "../types";
import {
  ADVENTURER_RANKS,
  AGE_PRESETS,
  BIRTH_IDENTITIES,
  BLOOD_STATES,
  COLLEGE_TENDENCIES,
  CONTRACT_STATES,
  CORRUPTION_STATES,
  EMOTIONS,
  ERAS,
  FAITHS,
  MAGIC_TIERS,
  ORIGINS,
  POLITICAL_LEANS,
  RESIDENCES,
  SIM_STYLES,
  STATUSES,
  SWORD_SCHOOLS,
  SWORD_TIERS,
  TALENTS,
  TALENT_LIMIT,
  toggleTalent,
} from "../data/creation";
import { DIFFICULTY_OPTIONS } from "../data/difficulty";

interface Props {
  draft: CreationDraft;
  /** 传对象直接合并；传函数可基于最新草稿计算，适合连续点击的多选控件 */
  onChange: (patch: Partial<CreationDraft> | ((d: CreationDraft) => Partial<CreationDraft>)) => void;
  onBegin: () => void;
  onExit: () => void;
}

const STEPS = [
  "时代",
  "出身",
  "出生身份",
  "基本信息",
  "能力与状态",
  "学院与政治",
  "性格与目标",
  "模拟风格",
  "难度",
  "确认启程",
];

function Tile({
  option,
  index,
  selected,
  onSelect,
}: {
  option: Option;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button type="button" className="tile" aria-pressed={selected} onClick={onSelect}>
      <span className="tile__idx">{index + 1}</span>
      <span className="tile__label">{option.label}</span>
      {option.desc && <span className="tile__desc">{option.desc}</span>}
    </button>
  );
}

function TileGrid({
  options,
  value,
  onSelect,
  columns = 2,
}: {
  options: Option[];
  value: string;
  onSelect: (v: string) => void;
  columns?: 2 | 3 | 4;
}) {
  return (
    <div className={`optgrid optgrid--${columns}`}>
      {options.map((o, i) => (
        <Tile
          key={o.value}
          option={o}
          index={i}
          selected={value === o.value}
          onSelect={() => onSelect(o.value)}
        />
      ))}
    </div>
  );
}

function TileGridMulti({
  options,
  values,
  onToggle,
  columns = 3,
}: {
  options: Option[];
  values: string[];
  onToggle: (v: string) => void;
  columns?: 2 | 3 | 4;
}) {
  return (
    <div className={`optgrid optgrid--${columns}`}>
      {options.map((o, i) => (
        <Tile
          key={o.value}
          option={o}
          index={i}
          selected={values.includes(o.value)}
          onSelect={() => onToggle(o.value)}
        />
      ))}
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="fieldlabel">{label}</label>
      <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function CreationScreen({ draft, onChange, onBegin, onExit }: Props) {
  const [step, setStep] = useState(0);
  const [hint, setHint] = useState<string | null>(null);

  const eraLabel = useMemo(() => ERAS.find((e) => e.value === draft.era)?.label ?? draft.era, [draft.era]);

  const canAdvance = () => {
    if (step === 3 && !draft.name.trim()) {
      setHint("请为这个即将诞生的人取一个名字。");
      return false;
    }
    setHint(null);
    return true;
  };

  const next = () => {
    if (!canAdvance()) return;
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };
  const prev = () => {
    setHint(null);
    setStep((s) => Math.max(0, s - 1));
  };

  const traitFilled = [draft.trait1, draft.trait2, draft.trait3].filter((t) => t.trim()).length;

  /** 天赋多选：基于最新的草稿做增删，连续点击不会互相覆盖 */
  const toggleTalentPick = (value: string) => {
    onChange((d) => ({ talents: toggleTalent(d.talents, value) }));
  };

  const talentLabel = draft.talents.filter((t) => t !== "无").join(" · ") || "无";
  const talentFull = draft.talents.filter((t) => t !== "无").length >= TALENT_LIMIT;

  return (
    <section className="creation">
      <div className="creation__top">
        <h1 className="creation__title">角色创建</h1>
        <p className="creation__hint">系统不替你决定人生，只决定你从哪里开始。</p>
      </div>

      <div className="creation__grid">
        <nav className="steprail" aria-label="创建步骤">
          {STEPS.map((label, i) => (
            <button
              key={label}
              type="button"
              className={`steprail__item${i < step ? " steprail__item--done" : ""}`}
              aria-current={i === step ? "true" : undefined}
              onClick={() => {
                if (i <= step) setStep(i);
                else if (canAdvance()) setStep(i);
              }}
            >
              <span className="steprail__num">{i < step ? "✓" : i + 1}</span>
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="creation__stage">
          {step === 0 && (
            <>
              <div className="stagehead">
                <h2 className="stagehead__title">选择时代</h2>
                <p className="stagehead__desc">
                  世界在你出生前已运转数万年。你所处的时代决定了历史会如何推进，以及你能听见哪些传闻。
                </p>
              </div>
              <TileGrid options={ERAS} value={draft.era} onSelect={(v) => onChange({ era: v })} columns={2} />
            </>
          )}

          {step === 1 && (
            <>
              <div className="stagehead">
                <h2 className="stagehead__title">选择出身</h2>
                <p className="stagehead__desc">
                  出身主要影响家庭资源、法律身份、教育机会、社会偏见、人脉网络与初始魔力。它不等于命运。
                </p>
              </div>
              <TileGrid options={ORIGINS} value={draft.origin} onSelect={(v) => onChange({ origin: v })} columns={2} />
            </>
          )}

          {step === 2 && (
            <>
              <div className="stagehead">
                <h2 className="stagehead__title">选择出生身份</h2>
                <p className="stagehead__desc">你睁开眼时，第一眼看到的是什么地方。</p>
              </div>
              <TileGrid
                options={BIRTH_IDENTITIES}
                value={draft.birthIdentity}
                onSelect={(v) => onChange({ birthIdentity: v })}
                columns={3}
              />
            </>
          )}

          {step === 3 && (
            <>
              <div className="stagehead">
                <h2 className="stagehead__title">基本信息</h2>
                <p className="stagehead__desc">姓名、年龄、性别、所在地与家庭。除姓名外都可以留白，由系统生成。</p>
              </div>
              <div className="fieldrow fieldrow--3">
                <div>
                  <label className="fieldlabel">姓名</label>
                  <input
                    className="input"
                    value={draft.name}
                    placeholder="例如：鲁迪乌斯"
                    onChange={(e) => onChange({ name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="fieldlabel">性别</label>
                  <input
                    className="input"
                    value={draft.gender}
                    placeholder="男 / 女 / 其他"
                    onChange={(e) => onChange({ gender: e.target.value })}
                  />
                </div>
                <div>
                  <label className="fieldlabel">年龄</label>
                  <input
                    className="input"
                    value={draft.age}
                    placeholder="7 岁 / 14 岁 / 成年"
                    onChange={(e) => onChange({ age: e.target.value })}
                  />
                  <div className="chiprow" style={{ marginTop: 8 }}>
                    {AGE_PRESETS.map((a) => (
                      <button
                        key={a}
                        type="button"
                        className="chip"
                        aria-pressed={draft.age === a}
                        onClick={() => onChange({ age: a })}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="fieldrow">
                <Select
                  label="出生地 / 居住地"
                  value={draft.residence}
                  options={RESIDENCES}
                  onChange={(v) => onChange({ residence: v })}
                />
                <Select label="信仰" value={draft.faith} options={FAITHS} onChange={(v) => onChange({ faith: v })} />
              </div>
              <div>
                <label className="fieldlabel">家庭状况（可留白，由系统按出身生成）</label>
                <textarea
                  className="textarea"
                  value={draft.family}
                  placeholder="例如：父亲是退役的剑士，母亲体弱。家里还有一个妹妹。"
                  onChange={(e) => onChange({ family: e.target.value })}
                />
              </div>
              {hint && <p className="fieldset__note" style={{ color: "var(--crimson)" }}>{hint}</p>}
            </>
          )}

          {step === 4 && (
            <>
              <div className="stagehead">
                <h2 className="stagehead__title">能力与状态</h2>
                <p className="stagehead__desc">
                  阶级不是天赋的保证。王级以上为秘匿级别；圣级被称为天才；帝级以上为世界有数的实力者。
                </p>
              </div>
              <div className="fieldset">
                <div className="fieldset__label">特殊天赋（最多 {TALENT_LIMIT} 项）</div>
                <TileGridMulti options={TALENTS} values={draft.talents} onToggle={toggleTalentPick} columns={3} />
                <p className="fieldset__note">
                  已选 {draft.talents.filter((t) => t !== "无").length} / {TALENT_LIMIT}。天赋可以叠加，同时拥有多项意味着更高起点，
                  也意味着更多会被世界盯上的理由。「无」与「随机」是独占项，与其它天赋互斥。
                  {talentFull && "已达到上限，想换一项请先取消已选的。"}
                </p>
              </div>
              <div className="fieldrow">
                <Select
                  label="初始地位"
                  value={draft.status}
                  options={STATUSES}
                  onChange={(v) => onChange({ status: v })}
                />
                <Select
                  label="腐化状态"
                  value={draft.corruption}
                  options={CORRUPTION_STATES}
                  onChange={(v) => onChange({ corruption: v })}
                />
              </div>
              <div className="fieldrow fieldrow--3">
                <Select
                  label="魔术阶级"
                  value={draft.magicTier}
                  options={MAGIC_TIERS}
                  onChange={(v) => onChange({ magicTier: v })}
                />
                <Select
                  label="剑术阶级"
                  value={draft.swordTier}
                  options={SWORD_TIERS}
                  onChange={(v) => onChange({ swordTier: v })}
                />
                <Select
                  label="剑术流派"
                  value={draft.swordSchool}
                  options={SWORD_SCHOOLS}
                  onChange={(v) => onChange({ swordSchool: v })}
                />
              </div>
              <div className="fieldrow fieldrow--3">
                <Select
                  label="冒险者等级"
                  value={draft.adventurerRank}
                  options={ADVENTURER_RANKS}
                  onChange={(v) => onChange({ adventurerRank: v })}
                />
                <Select label="血脉状态" value={draft.blood} options={BLOOD_STATES} onChange={(v) => onChange({ blood: v })} />
                <Select
                  label="契约状态"
                  value={draft.contract}
                  options={CONTRACT_STATES}
                  onChange={(v) => onChange({ contract: v })}
                />
              </div>
              {hint && <p className="fieldset__note" style={{ color: "var(--gold-2)" }}>{hint}</p>}
            </>
          )}

          {step === 5 && (
            <>
              <div className="stagehead">
                <h2 className="stagehead__title">学院与政治</h2>
                <p className="stagehead__desc">
                  五种力量彼此制衡：王权与贵族、魔术公会与魔法大学、米里斯教团、冒险者公会、七大列强。
                </p>
              </div>
              <div className="fieldset">
                <div className="fieldset__label">学院倾向</div>
                <TileGrid
                  options={COLLEGE_TENDENCIES}
                  value={draft.college}
                  onSelect={(v) => onChange({ college: v })}
                  columns={4}
                />
              </div>
              <div className="fieldset">
                <div className="fieldset__label">初始政治倾向</div>
                <TileGrid
                  options={POLITICAL_LEANS}
                  value={draft.politics}
                  onSelect={(v) => onChange({ politics: v })}
                  columns={3}
                />
              </div>
            </>
          )}

          {step === 6 && (
            <>
              <div className="stagehead">
                <h2 className="stagehead__title">性格与目标</h2>
                <p className="stagehead__desc">
                  系统会记住这些。它们决定你在关键时刻会犹豫，还是一口气走到底。
                </p>
              </div>
              <div className="fieldrow fieldrow--3">
                <div>
                  <label className="fieldlabel">性格关键词 一</label>
                  <input className="input" value={draft.trait1} placeholder="例如：执拗" onChange={(e) => onChange({ trait1: e.target.value })} />
                </div>
                <div>
                  <label className="fieldlabel">性格关键词 二</label>
                  <input className="input" value={draft.trait2} placeholder="例如：心软" onChange={(e) => onChange({ trait2: e.target.value })} />
                </div>
                <div>
                  <label className="fieldlabel">性格关键词 三</label>
                  <input className="input" value={draft.trait3} placeholder="例如：记仇" onChange={(e) => onChange({ trait3: e.target.value })} />
                </div>
              </div>
              <div className="fieldrow">
                <div>
                  <label className="fieldlabel">初始人生目标（一句话）</label>
                  <input
                    className="input"
                    value={draft.goal}
                    placeholder="例如：让家里人过上好日子。"
                    onChange={(e) => onChange({ goal: e.target.value })}
                  />
                </div>
                <Select label="情感倾向" value={draft.emotion} options={EMOTIONS} onChange={(v) => onChange({ emotion: v })} />
              </div>
              <div className="fieldrow">
                <div>
                  <label className="fieldlabel">最珍贵记忆</label>
                  <textarea
                    className="textarea"
                    value={draft.precious}
                    placeholder="一句话。例如：母亲在灯下替我缝好衣角的那一夜。"
                    onChange={(e) => onChange({ precious: e.target.value })}
                  />
                </div>
                <div>
                  <label className="fieldlabel">最痛苦记忆</label>
                  <textarea
                    className="textarea"
                    value={draft.painful}
                    placeholder="一句话。例如：我没能赶上见她最后一面。"
                    onChange={(e) => onChange({ painful: e.target.value })}
                  />
                </div>
              </div>
              <p className="fieldset__note">已填写性格关键词 {traitFilled} / 3。留空的部分由系统在开局时补齐。</p>
            </>
          )}

          {step === 7 && (
            <>
              <div className="stagehead">
                <h2 className="stagehead__title">模拟风格</h2>
                <p className="stagehead__desc">
                  风格影响每回合世界动态的取材。六面世界绝大多数时候是安静的，风格只决定它偏重哪一面。
                </p>
              </div>
              <TileGrid options={SIM_STYLES} value={draft.style} onSelect={(v) => onChange({ style: v })} columns={2} />
            </>
          )}

          {step === 8 && (
            <>
              <div className="stagehead">
                <h2 className="stagehead__title">选择难度</h2>
                <p className="stagehead__desc">
                  难度决定这个世界对你有多宽容。它影响寿命、收入、健康衰减、事件频率与抉择代价。进游戏后仍可随时调整。
                </p>
              </div>
              <TileGrid
                options={DIFFICULTY_OPTIONS}
                value={draft.difficulty}
                onSelect={(v) => onChange({ difficulty: v as CreationDraft["difficulty"] })}
                columns={2}
              />
            </>
          )}

          {step === 9 && (
            <>
              <div className="stagehead">
                <h2 className="stagehead__title">确认启程</h2>
                <p className="stagehead__desc">
                  再检查一次。踏上之后，历史会按它自己的顺序推进，你能改的只是「缝隙」里的东西。
                </p>
              </div>
              <div className="panel">
                <div className="panel__head">人生摘要</div>
                <div className="panel__body">
                  <div className="kv"><span className="kv__k">时代</span><span className="kv__v">{eraLabel}</span></div>
                  <div className="kv"><span className="kv__k">出身</span><span className="kv__v">{draft.origin}　·　{draft.birthIdentity}</span></div>
                  <div className="kv"><span className="kv__k">姓名</span><span className="kv__v">{draft.name.trim() || "无名者"}　{draft.age}　{draft.gender}</span></div>
                  <div className="kv"><span className="kv__k">所在地</span><span className="kv__v">{draft.residence}</span></div>
                  <div className="kv"><span className="kv__k">信仰 / 政治</span><span className="kv__v">{draft.faith}　·　{draft.politics}</span></div>
                  <div className="kv"><span className="kv__k">天赋 / 地位</span><span className="kv__v">{talentLabel}　·　{draft.status}</span></div>
                  <div className="divider" />
                  <div className="kv"><span className="kv__k">魔术 / 剑术</span><span className="kv__v">{draft.magicTier}　·　{draft.swordTier}（{draft.swordSchool}）</span></div>
                  <div className="kv"><span className="kv__k">冒险者 / 学院</span><span className="kv__v">{draft.adventurerRank}　·　{draft.college}</span></div>
                  <div className="kv"><span className="kv__k">血脉 / 契约 / 腐化</span><span className="kv__v">{draft.blood}　·　{draft.contract}　·　{draft.corruption}</span></div>
                  <div className="divider" />
                  <div className="kv"><span className="kv__k">性格</span><span className="kv__v">{[draft.trait1, draft.trait2, draft.trait3].filter((t) => t.trim()).join(" · ") || "由系统生成"}</span></div>
                  <div className="kv"><span className="kv__k">人生目标</span><span className="kv__v">{draft.goal.trim() || "由系统生成"}</span></div>
                  <div className="kv"><span className="kv__k">情感倾向</span><span className="kv__v">{draft.emotion}</span></div>
                  <div className="kv"><span className="kv__k">最珍贵记忆</span><span className="kv__v">{draft.precious.trim() || "由系统生成"}</span></div>
                  <div className="kv"><span className="kv__k">最痛苦记忆</span><span className="kv__v">{draft.painful.trim() || "由系统生成"}</span></div>
                  <div className="divider" />
                  <div className="kv"><span className="kv__k">模拟风格</span><span className="kv__v">{draft.style}</span></div>
                  <div className="kv"><span className="kv__k">难度</span><span className="kv__v">{draft.difficulty}</span></div>
                </div>
              </div>
            </>
          )}

          <div className="creation__foot">
            <div className="creation__progress">
              第 {step + 1} / {STEPS.length} 步 · {STEPS[step]}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {step === 0 ? (
                <button type="button" className="btn btn--ghost" onClick={onExit}>
                  返回
                </button>
              ) : (
                <button type="button" className="btn" onClick={prev}>
                  上一步
                </button>
              )}
              {step < STEPS.length - 1 ? (
                <button type="button" className="btn btn--primary" onClick={next}>
                  下一步
                </button>
              ) : (
                <button type="button" className="btn btn--primary" onClick={onBegin}>
                  开始人生
                </button>
              )}
            </div>
          </div>
        </div>

        <aside className="preview">
          <div className="preview__id">
            <strong>{draft.name.trim() || "尚未命名"}</strong>
            <span>
              {draft.origin} · {draft.age}
            </span>
          </div>
          <div className="panel">
            <div className="panel__body">
              <div className="statchips">
                <span className="tag">{draft.era}</span>
                <span className="tag">{draft.status}</span>
                <span className="tag tag--diff">难度 · {draft.difficulty}</span>
              </div>
              <div className="kv"><span className="kv__k">出身</span><span className="kv__v">{draft.origin}</span></div>
              <div className="kv"><span className="kv__k">天赋</span><span className="kv__v">{talentLabel}</span></div>
              <div className="kv"><span className="kv__k">年龄</span><span className="kv__v">{draft.age}</span></div>
              <div className="kv"><span className="kv__k">所在地</span><span className="kv__v">{draft.residence}</span></div>
              <div className="kv"><span className="kv__k">魔术</span><span className="kv__v">{draft.magicTier}</span></div>
              <div className="kv"><span className="kv__k">剑术</span><span className="kv__v">{draft.swordTier}</span></div>
              <div className="kv"><span className="kv__k">冒险者</span><span className="kv__v">{draft.adventurerRank}</span></div>
              <div className="divider" />
              <p className="fieldset__note">
                出身不是命运。平民可以成为 S 级冒险者，魔族可以成为英雄，人神使徒可以背叛人神。
              </p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}