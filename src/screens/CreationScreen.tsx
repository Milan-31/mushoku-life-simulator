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
  MAINLINE_MODES,
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
import { currentSnapshot, previewOption } from "../engine/preview";

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
  "主线引导",
  "确认启程",
];

/** 预览：鼠标停在（或键盘焦点落在）某个取值上时，它对应的是哪个字段的哪个值 */
interface Hover {
  field: keyof CreationDraft;
  value: string | string[];
  desc?: string;
}

/** 一组选项共享的预览行为。传进 TileGrid 之后，每个格子都会自动上报悬停 */
interface PreviewProps {
  field?: keyof CreationDraft;
  onPreview?: (h: Hover) => void;
  onPreviewEnd?: () => void;
}

function Tile({
  option,
  index,
  selected,
  onSelect,
  preview,
  value,
}: {
  option: Option;
  index: number;
  selected: boolean;
  onSelect: () => void;
  preview?: PreviewProps;
  /** 上报给预览的值。多选时传的是「选上之后的那份列表」 */
  value?: string | string[];
}) {
  const report = () => {
    if (!preview?.field || !preview.onPreview) return;
    preview.onPreview({ field: preview.field, value: value ?? option.value, desc: option.desc });
  };
  return (
    <button
      type="button"
      className="tile"
      aria-pressed={selected}
      onClick={onSelect}
      onMouseEnter={report}
      onFocus={report}
      onMouseLeave={preview?.onPreviewEnd}
      onBlur={preview?.onPreviewEnd}
    >
      <span className="tile__idx">{index + 1}</span>
      <span className="tile__label">{option.label}</span>
      {option.desc && <span className="tile__desc">{option.desc}</span>}
    </button>
  );
}

/** 格子网格。列数交给 CSS 按可用宽度自动排，窄了自动减列，不会挤出去压到别的东西 */
type GridSize = "wide" | "mid" | "tight";

function TileGrid({
  options,
  value,
  onSelect,
  size = "mid",
  preview,
}: {
  options: Option[];
  value: string;
  onSelect: (v: string) => void;
  size?: GridSize;
  preview?: PreviewProps;
}) {
  return (
    <div className={`optgrid optgrid--${size}`}>
      {options.map((o, i) => (
        <Tile
          key={o.value}
          option={o}
          index={i}
          selected={value === o.value}
          onSelect={() => onSelect(o.value)}
          preview={preview}
        />
      ))}
    </div>
  );
}

function TileGridMulti({
  options,
  values,
  onToggle,
  size = "mid",
  preview,
}: {
  options: Option[];
  values: string[];
  onToggle: (v: string) => void;
  size?: GridSize;
  preview?: PreviewProps;
}) {
  return (
    <div className={`optgrid optgrid--${size}`}>
      {options.map((o, i) => (
        <Tile
          key={o.value}
          option={o}
          index={i}
          selected={values.includes(o.value)}
          onSelect={() => onToggle(o.value)}
          preview={preview}
        />
      ))}
    </div>
  );
}

/** 一行放两个字段：两列各自都是 minmax(0,1fr)，里面的网格再挤也不会越界 */
function Pair({ children }: { children: React.ReactNode }) {
  return <div className="pairgrid">{children}</div>;
}

/** 一个字段：标签 + 网格（或输入框）。整个创建界面都用它，间距与对齐才有统一口径 */
function Field({ label, children, note }: { label: string; children: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className="fieldset">
      <div className="fieldset__label">{label}</div>
      {children}
      {note && <p className="fieldset__note">{note}</p>}
    </div>
  );
}

/** 文字输入：聚焦时也报一次预览，让「年龄」「名字」这类字段同样看得到后果 */
function Input({
  label,
  value,
  placeholder,
  field,
  onPreview,
  onPreviewEnd,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  field: keyof CreationDraft;
  onPreview?: (h: Hover) => void;
  onPreviewEnd?: () => void;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="fieldlabel">{label}</label>
      <input
        className="input"
        value={value}
        placeholder={placeholder}
        onFocus={() => onPreview?.({ field, value })}
        onBlur={onPreviewEnd}
        onChange={(e) => {
          onChange(e.target.value);
          onPreview?.({ field, value: e.target.value });
        }}
      />
    </div>
  );
}

export default function CreationScreen({ draft, onChange, onBegin, onExit }: Props) {
  const [step, setStep] = useState(0);
  const [hint, setHint] = useState<string | null>(null);
  /** 鼠标停着的那个选项。它决定右侧预览面板显示什么 */
  const [hover, setHover] = useState<Hover | null>(null);

  const eraLabel = useMemo(() => ERAS.find((e) => e.value === draft.era)?.label ?? draft.era, [draft.era]);
  const preview = useMemo(
    () => (hover ? previewOption(draft, hover.field, hover.value, hover.desc) : null),
    [draft, hover],
  );
  const now = useMemo(() => currentSnapshot(draft), [draft]);

  const previewOf = (field?: keyof CreationDraft): PreviewProps => ({
    field,
    onPreview: setHover,
    onPreviewEnd: () => setHover(null),
  });

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
        <p className="creation__hint">
          系统不替你决定人生，只决定你从哪里开始。把鼠标停在任何一个选项上，右边会告诉你选了它会变成什么样。
        </p>
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
              <Field label="时代">
                <TileGrid options={ERAS} value={draft.era} onSelect={(v) => onChange({ era: v })} size="wide" preview={previewOf("era")} />
              </Field>
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
              <Field label="出身">
                <TileGrid options={ORIGINS} value={draft.origin} onSelect={(v) => onChange({ origin: v })} size="wide" preview={previewOf("origin")} />
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              <div className="stagehead">
                <h2 className="stagehead__title">选择出生身份</h2>
                <p className="stagehead__desc">你睁开眼时，第一眼看到的是什么地方。</p>
              </div>
              <Field label="出生身份">
                <TileGrid
                  options={BIRTH_IDENTITIES}
                  value={draft.birthIdentity}
                  onSelect={(v) => onChange({ birthIdentity: v })}
                  size="mid"
                  preview={previewOf("birthIdentity")}
                />
              </Field>
            </>
          )}

          {step === 3 && (
            <>
              <div className="stagehead">
                <h2 className="stagehead__title">基本信息</h2>
                <p className="stagehead__desc">姓名、年龄、性别、所在地与家庭。除姓名外都可以留白，由系统生成。</p>
              </div>
              <Pair>
                <Input
                  label="姓名"
                  value={draft.name}
                  placeholder="例如：鲁迪乌斯"
                  field="name"
                  onPreview={setHover}
                  onPreviewEnd={() => setHover(null)}
                  onChange={(v) => onChange({ name: v })}
                />
                <Input
                  label="性别"
                  value={draft.gender}
                  placeholder="男 / 女 / 其他"
                  field="gender"
                  onPreview={setHover}
                  onPreviewEnd={() => setHover(null)}
                  onChange={(v) => onChange({ gender: v })}
                />
              </Pair>
              <Field
                label="年龄"
                note="年龄决定出生年份，也决定开局时哪些事还没发生。"
              >
                <div className="agerow">
                  <input
                    className="input"
                    value={draft.age}
                    placeholder="7 岁 / 14 岁 / 成年"
                    onFocus={() => setHover({ field: "age", value: draft.age })}
                    onBlur={() => setHover(null)}
                    onChange={(e) => {
                      onChange({ age: e.target.value });
                      setHover({ field: "age", value: e.target.value });
                    }}
                  />
                  <div className="chiprow">
                    {AGE_PRESETS.map((a) => (
                      <button
                        key={a}
                        type="button"
                        className="chip"
                        aria-pressed={draft.age === a}
                        onMouseEnter={() => setHover({ field: "age", value: a })}
                        onFocus={() => setHover({ field: "age", value: a })}
                        onMouseLeave={() => setHover(null)}
                        onBlur={() => setHover(null)}
                        onClick={() => onChange({ age: a })}
                        title="点一下用这个年龄"
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              </Field>
              <Field label="出生地 / 居住地">
                <TileGrid
                  options={RESIDENCES}
                  value={draft.residence}
                  onSelect={(v) => onChange({ residence: v })}
                  size="wide"
                  preview={previewOf("residence")}
                />
              </Field>
              <Field label="信仰">
                <TileGrid options={FAITHS} value={draft.faith} onSelect={(v) => onChange({ faith: v })} size="mid" preview={previewOf("faith")} />
              </Field>
              <div className="fieldset">
                <div className="fieldset__label">家庭状况</div>
                <textarea
                  className="textarea"
                  value={draft.family}
                  placeholder="可留白，由系统按出身生成。例如：父亲是退役的剑士，母亲体弱。家里还有一个妹妹。"
                  onChange={(e) => onChange({ family: e.target.value })}
                />
              </div>
              {hint && <p className="fieldset__note fieldset__note--warn">{hint}</p>}
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
              <Field
                label={`特殊天赋　已选 ${draft.talents.filter((t) => t !== "无").length} / ${TALENT_LIMIT}`}
                note={
                  <>
                    天赋可以叠加，同时拥有多项意味着更高起点，也意味着更多会被世界盯上的理由。
                    「无」与「随机」是独占项，与其它天赋互斥。{talentFull && " 已达上限，想换一项请先取消已选的。"}
                  </>
                }
              >
                <TileGridMulti
                  options={TALENTS}
                  values={draft.talents}
                  size="tight"
                  onToggle={toggleTalentPick}
                  preview={{
                    field: "talents",
                    onPreview: (h) => setHover({ ...h, value: toggleTalent(draft.talents, String(h.value)) }),
                    onPreviewEnd: () => setHover(null),
                  }}
                />
              </Field>
              <Field label="初始地位">
                <TileGrid options={STATUSES} value={draft.status} onSelect={(v) => onChange({ status: v })} size="mid" preview={previewOf("status")} />
              </Field>
              <Field label="魔术阶级">
                <TileGrid
                  options={MAGIC_TIERS}
                  value={draft.magicTier}
                  onSelect={(v) => onChange({ magicTier: v })}
                  size="tight"
                  preview={previewOf("magicTier")}
                />
              </Field>
              <Field label="剑术阶级">
                <TileGrid
                  options={SWORD_TIERS}
                  value={draft.swordTier}
                  onSelect={(v) => onChange({ swordTier: v })}
                  size="tight"
                  preview={previewOf("swordTier")}
                />
              </Field>
              <Field label="剑术流派">
                <TileGrid
                  options={SWORD_SCHOOLS}
                  value={draft.swordSchool}
                  onSelect={(v) => onChange({ swordSchool: v })}
                  size="mid"
                  preview={previewOf("swordSchool")}
                />
              </Field>
              <Field label="冒险者等级">
                <TileGrid
                  options={ADVENTURER_RANKS}
                  value={draft.adventurerRank}
                  onSelect={(v) => onChange({ adventurerRank: v })}
                  size="tight"
                  preview={previewOf("adventurerRank")}
                />
              </Field>
              <Pair>
                <Field label="血脉状态">
                  <TileGrid
                    options={BLOOD_STATES}
                    value={draft.blood}
                    onSelect={(v) => onChange({ blood: v })}
                    size="mid"
                    preview={previewOf("blood")}
                  />
                </Field>
                <Field label="契约状态">
                  <TileGrid
                    options={CONTRACT_STATES}
                    value={draft.contract}
                    onSelect={(v) => onChange({ contract: v })}
                    size="mid"
                    preview={previewOf("contract")}
                  />
                </Field>
              </Pair>
              <Field label="腐化状态">
                <TileGrid
                  options={CORRUPTION_STATES}
                  value={draft.corruption}
                  onSelect={(v) => onChange({ corruption: v })}
                  size="mid"
                  preview={previewOf("corruption")}
                />
              </Field>
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
              <Field label="学院倾向">
                <TileGrid
                  options={COLLEGE_TENDENCIES}
                  value={draft.college}
                  onSelect={(v) => onChange({ college: v })}
                  size="mid"
                  preview={previewOf("college")}
                />
              </Field>
              <Field label="初始政治倾向">
                <TileGrid
                  options={POLITICAL_LEANS}
                  value={draft.politics}
                  onSelect={(v) => onChange({ politics: v })}
                  size="mid"
                  preview={previewOf("politics")}
                />
              </Field>
            </>
          )}

          {step === 6 && (
            <>
              <div className="stagehead">
                <h2 className="stagehead__title">性格与目标</h2>
                <p className="stagehead__desc">系统会记住这些。它们决定你在关键时刻会犹豫，还是一口气走到底。</p>
              </div>
              <Pair>
                <Input
                  label="性格关键词 一"
                  value={draft.trait1}
                  placeholder="例如：执拗"
                  field="trait1"
                  onPreview={setHover}
                  onPreviewEnd={() => setHover(null)}
                  onChange={(v) => onChange({ trait1: v })}
                />
                <Input
                  label="性格关键词 二"
                  value={draft.trait2}
                  placeholder="例如：心软"
                  field="trait2"
                  onPreview={setHover}
                  onPreviewEnd={() => setHover(null)}
                  onChange={(v) => onChange({ trait2: v })}
                />
              </Pair>
              <Pair>
                <Input
                  label="性格关键词 三"
                  value={draft.trait3}
                  placeholder="例如：记仇"
                  field="trait3"
                  onPreview={setHover}
                  onPreviewEnd={() => setHover(null)}
                  onChange={(v) => onChange({ trait3: v })}
                />
                <Input
                  label="初始人生目标（一句话）"
                  value={draft.goal}
                  placeholder="例如：让家里人过上好日子。"
                  field="goal"
                  onPreview={setHover}
                  onPreviewEnd={() => setHover(null)}
                  onChange={(v) => onChange({ goal: v })}
                />
              </Pair>
              <Field label="情感倾向">
                <TileGrid
                  options={EMOTIONS}
                  value={draft.emotion}
                  onSelect={(v) => onChange({ emotion: v })}
                  size="mid"
                  preview={previewOf("emotion")}
                />
              </Field>
              <Pair>
                <div className="fieldset">
                  <div className="fieldset__label">最珍贵记忆</div>
                  <textarea
                    className="textarea"
                    value={draft.precious}
                    placeholder="一句话。例如：母亲在灯下替我缝好衣角的那一夜。"
                    onChange={(e) => onChange({ precious: e.target.value })}
                  />
                </div>
                <div className="fieldset">
                  <div className="fieldset__label">最痛苦记忆</div>
                  <textarea
                    className="textarea"
                    value={draft.painful}
                    placeholder="一句话。例如：我没能赶上见她最后一面。"
                    onChange={(e) => onChange({ painful: e.target.value })}
                  />
                </div>
              </Pair>
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
              <Field label="模拟风格">
                <TileGrid options={SIM_STYLES} value={draft.style} onSelect={(v) => onChange({ style: v })} size="wide" preview={previewOf("style")} />
              </Field>
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
              <Field label="难度">
                <TileGrid
                  options={DIFFICULTY_OPTIONS}
                  value={draft.difficulty}
                  onSelect={(v) => onChange({ difficulty: v as CreationDraft["difficulty"] })}
                  size="wide"
                  preview={previewOf("difficulty")}
                />
              </Field>
            </>
          )}

          {step === 9 && (
            <>
              <div className="stagehead">
                <h2 className="stagehead__title">主线引导</h2>
                <p className="stagehead__desc">
                  二十条主线，每条都是一条完整的故事线：四到六章，每章有目标、任务与指引。
                  抽到哪一条由命运决定，抽完之后接进来的 AI 会按你这个人的出身、时代与性格把它重写一遍，
                  往后每年再按你实际做过的事微调一次。
                </p>
              </div>
              <Field label="主线引导">
                <TileGrid
                  options={MAINLINE_MODES}
                  value={draft.mainlineMode}
                  onSelect={(v) => onChange({ mainlineMode: v as CreationDraft["mainlineMode"] })}
                  size="wide"
                  preview={previewOf("mainlineMode")}
                />
              </Field>
              <p className="fieldset__note">
                主线只给方向，不替你走路。没有主线也照样能玩：行动、抉择事件、原作人物的遇合都照旧。
              </p>
            </>
          )}

          {step === 10 && (
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
                  <div className="kv">
                    <span className="kv__k">主线</span>
                    <span className="kv__v">
                      {draft.mainlineMode === "随机" ? "创建时随机抽取一条（推荐）" : "不介入，自由地活"}
                    </span>
                  </div>
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

          <div className={`panel preview__panel${preview ? " preview__panel--hover" : ""}`}>
            <div className="panel__head">
              {preview ? "选了会怎样" : "效果预览"}
              <span className="preview__badge">{preview ? preview.fieldLabel : "鼠标停在选项上"}</span>
            </div>
            {/* 面板高度固定、内容自己滚：悬停切换时页面不会跟着变高变矮。
                key 让内容每次换一份就重播一次模糊渐显 */}
            <div className="panel__body preview__body" key={preview ? `${hover?.field}-${preview.fieldLabel}` : "summary"}>
              {preview ? (
                <div className="blur-swap">
                  {preview.desc && <p className="preview__desc">{preview.desc}</p>}
                  <div className="preview__label">数值与处境</div>
                  {preview.changes.length === 0 ? (
                    <p className="preview__none">这一项不改动任何数字。</p>
                  ) : (
                    <ul className="preview__changes">
                      {preview.changes.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  )}
                  {preview.narrative.length > 0 && (
                    <>
                      <div className="preview__label">不进数值的部分</div>
                      <ul className="preview__notes">
                        {preview.narrative.map((n, i) => (
                          <li key={i}>{n}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  <div className="divider" />
                  <div className="preview__label">选上之后的他</div>
                  <div className="preview__stats">
                    {preview.stats.map((s) => (
                      <div className="preview__stat" key={s.key}>
                        <span className="preview__statname">{s.label}</span>
                        <span className="preview__statval">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="blur-swap">
                  <div className="statchips">
                    <span className="tag">{draft.era}</span>
                    <span className="tag">{draft.status}</span>
                    <span className="tag tag--diff">难度 · {draft.difficulty}</span>
                  </div>
                  <div className="kv"><span className="kv__k">开局</span><span className="kv__v">{now.year}</span></div>
                  <div className="kv"><span className="kv__k">出身</span><span className="kv__v">{draft.origin}</span></div>
                  <div className="kv"><span className="kv__k">天赋</span><span className="kv__v">{talentLabel}</span></div>
                  <div className="kv"><span className="kv__k">所在地</span><span className="kv__v">{draft.residence}</span></div>
                  <div className="kv"><span className="kv__k">寿命倾向</span><span className="kv__v">{now.lifespan}</span></div>
                  <div className="kv"><span className="kv__k">每月进项</span><span className="kv__v">{now.income}</span></div>
                  <div className="divider" />
                  <div className="preview__stats">
                    {now.stats.map((s) => (
                      <div className="preview__stat" key={s.key}>
                        <span className="preview__statname">{s.label}</span>
                        <span className="preview__statval">{s.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="divider" />
                  <p className="fieldset__note">
                    出身不是命运。平民可以成为 S 级冒险者，魔族可以成为英雄，人神使徒可以背叛人神。
                    把鼠标放在上面任何一格，这里会换成那一格的效果。
                  </p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
