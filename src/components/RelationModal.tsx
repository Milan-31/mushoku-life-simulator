import { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts/core";
import { GraphChart } from "echarts/charts";
import { LegendComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsOption } from "echarts";
import type { GameState, Relation, RelationBond } from "../types";
import Modal from "./Modal";
import { RELATION_ACTIONS } from "../data/acquaintances";
import { canonById, canonByName, tieText } from "../data/characters";
import { memoryLine } from "../engine/memory";
import { ageText } from "../engine/age";
import { childAge, childStage } from "../engine/family";
import { canToggleCompanion, isCompanion, reachable, whereabouts } from "../engine/presence";

echarts.use([GraphChart, LegendComponent, TooltipComponent, CanvasRenderer]);

/** 有没有值得显示的长期记忆 */
function hasMemory(r: Relation): boolean {
  const m = r.memory;
  return Boolean(m && (m.talks > 0 || m.summary || m.facts.length > 0));
}

/**
 * 这个人在玩家家里是什么位置，写成一行。
 * 子女要说清几岁、到什么阶段，因为孩子会一年年长大。
 */
function familyLine(r: Relation, year: number): string | null {
  const f = r.family;
  if (!f) return null;
  if (f.kind === "子女") {
    const age = childAge(r, year);
    if (age === null) return "你的孩子";
    return `你的${r.role} · ${age} 岁（${childStage(age)}）`;
  }
  if (f.kind === "配偶") return "你的配偶";
  return `你的${f.kind}`;
}

interface Props {
  state: GameState;
  busy: boolean;
  aiReady: boolean;
  onTalk: (name: string) => void;
  onInteract: (name: string, actionId: string) => void;
  /** 手动开关同行：只在他此刻就在跟前时才问得出口 */
  onCompanion: (name: string, on: boolean) => void;
  onClose: () => void;
}

/**
 * 这个人现在在哪儿，写成关系条目上的一小行字。
 * 「在XXX」意味着此刻说不上话——要当面谈，得回到那边去。
 */
function whereText(s: GameState, r: Relation): string {
  const w = whereabouts(s, r);
  if (w.presence === "here") return isCompanion(r) ? "与你随行" : "就在此地";
  if (w.presence === "away") return `人在${w.place}`;
  return "";
}

/** 关系性质对应的颜色，图例、节点、连线共用同一套 */
const BOND_COLOR: Record<RelationBond, string> = {
  血亲: "#d4a24c",
  师门: "#5fb4a8",
  挚友: "#6fa8dc",
  同僚: "#8f9bb3",
  恋情: "#d97a9a",
  宿敌: "#b5544d",
  熟人: "#6c7684",
};

const BOND_ORDER: RelationBond[] = ["血亲", "恋情", "挚友", "师门", "同僚", "熟人", "宿敌"];

/** 人物之间那条线：金色虚线，和玩家自己的关系区分开 */
const TIE_COLOR = "#c9a961";

/**
 * 名册按亲疏排好再铺到同心圆上：
 * 交情深的在内圈，泛泛之交在外圈，同一类关系的排在一起，
 * 这样一眼看过去就能认出「谁是家人、谁是同门、谁是敌人」。
 */
function layoutNodes(list: Relation[]): { rel: Relation; x: number; y: number; band: number }[] {
  const sorted = [...list].sort((a, b) => {
    const bo = BOND_ORDER.indexOf(a.bond ?? "熟人") - BOND_ORDER.indexOf(b.bond ?? "熟人");
    if (bo !== 0) return bo;
    return b.stars - a.stars;
  });
  const bands: { items: Relation[]; r1: number; r2: number }[] = [
    { items: [], r1: 170, r2: 224 },
    { items: [], r1: 268, r2: 326 },
    { items: [], r1: 372, r2: 442 },
  ];
  for (const rel of sorted) bands[rel.stars >= 4 ? 0 : rel.stars === 3 ? 1 : 2].items.push(rel);

  return bands.flatMap((band, bi) => {
    const n = band.items.length;
    // 人一多就分两圈错开，否则标签会叠在一起
    const two = n > 15;
    return band.items.map((rel, i) => {
      const slot = two ? Math.floor(i / 2) : i;
      const count = two ? Math.ceil(n / 2) : Math.max(1, n);
      const angle = -Math.PI / 2 + (slot / count) * Math.PI * 2;
      const radius = two ? (i % 2 === 0 ? band.r2 : band.r1) : band.r1;
      return { rel, x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, band: bi };
    });
  });
}

/**
 * 关系网。玩家在正中，宁外按亲疏铺开；人物之间还有一层原作关系，用金色虚线画出来。
 * 除了看，这里也是动手的地方：点节点或列表里的按钮都能推进这段关系。
 */
export default function RelationModal({ state, busy, aiReady, onTalk, onInteract, onCompanion, onClose }: Props) {
  const holder = useRef<HTMLDivElement | null>(null);
  const chart = useRef<echarts.ECharts | null>(null);
  const [filter, setFilter] = useState<RelationBond | "全部">("全部");
  // 选中的人。点节点或点卡片都把他展开在上面，先看清是谁，再决定要不要说话
  const [selected, setSelected] = useState<string | null>(null);

  const placed = useMemo(() => layoutNodes(state.relations), [state.relations]);
  const visible = useMemo(
    () =>
      [...state.relations].sort((a, b) => b.stars - a.stars || a.name.localeCompare(b.name, "zh")),
    [state.relations],
  );
  const selectedRel = useMemo(
    () => (selected ? (state.relations.find((r) => r.name === selected) ?? null) : null),
    [selected, state.relations],
  );
  /** 选中的人此刻在哪儿。不在跟前时，说话与互动都做不了 */
  const selectedWhere = selectedRel ? whereabouts(state, selectedRel) : null;
  const selectedHere = selectedWhere?.presence !== "away";
  /** 点同一个人两次就收起来 */
  const toggle = (name: string) => setSelected((cur) => (cur === name ? null : name));

  const option = useMemo<EChartsOption>(() => {
    const byName = new Map<string, (typeof placed)[number]>();
    for (const p of placed) {
      byName.set(p.rel.name, p);
      if (p.rel.canonId) byName.set(p.rel.canonId, p);
    }

    // 人物之间的关系：两边都在画面上才画得出来
    const seen = new Set<string>();
    const tieLinks: Record<string, unknown>[] = [];
    const pushTie = (a: string, b: string, kind: string) => {
      const key = [a, b].sort().join("|");
      if (seen.has(key)) return;
      seen.add(key);
      tieLinks.push({
        source: a,
        target: b,
        value: `${a} 与 ${b}：${kind}`,
        lineStyle: { color: TIE_COLOR, type: "dashed", width: 1, opacity: 0.45, curveness: 0.08 },
      });
    };
    for (const p of placed) {
      const source = (p.rel.canonId ? canonById(p.rel.canonId) : undefined) ?? canonByName(p.rel.name);
      for (const tie of source?.ties ?? []) {
        const other = byName.get(tie.with) ?? byName.get(canonByName(tie.with)?.id ?? "");
        if (other) pushTie(p.rel.name, other.rel.name, tie.kind);
      }
    }

    const nodes = [
      {
        id: state.character.name,
        name: state.character.name,
        x: 0,
        y: 0,
        symbolSize: 52,
        category: 0,
        label: { show: true, color: "#1a1408", fontSize: 12, fontWeight: 600 },
        itemStyle: { color: "#e8c67c", borderColor: "#fff6dd", borderWidth: 1.6 },
        value: `${state.character.age} 岁 · ${state.character.origin}`,
      },
      ...placed.map((p) => {
        const bond = p.rel.bond ?? "熟人";
        return {
          id: p.rel.name,
          name: p.rel.name,
          x: p.x,
          y: p.y,
          symbolSize: 11 + p.rel.stars * 3,
          category: BOND_ORDER.indexOf(bond) + 1,
          label: { show: p.band < 2, fontSize: 10.5, color: "#c9cfdb", position: "right" as const },
          itemStyle: {
            color: BOND_COLOR[bond],
            borderColor: BOND_COLOR[bond],
            borderWidth: 1.2,
            opacity: p.band === 2 ? 0.7 : 1,
          },
          value: [p.rel.role, ageText(p.rel, state.year), `好感 ${p.rel.stars}/5`].filter(Boolean).join(" · "),
        };
      }),
    ];

    const links = [
      ...placed.map((p) => ({
        source: state.character.name,
        target: p.rel.name,
        lineStyle: {
          color: BOND_COLOR[p.rel.bond ?? "熟人"],
          width: 1 + p.rel.stars * 0.8,
          opacity: 0.22 + p.rel.stars * 0.11,
        },
      })),
      ...tieLinks,
    ];

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "item",
        backgroundColor: "rgba(12,17,40,0.94)",
        borderColor: "rgba(212,162,76,0.4)",
        textStyle: { color: "#e8eaf2", fontSize: 12 },
        formatter: (params: unknown) => {
          const p = params as { dataType?: string; data?: Record<string, unknown> };
          if (p.dataType === "edge") return String(p.data?.value ?? "");
          const d = p.data as { id?: string; name?: string; value?: string } | undefined;
          if (!d?.name) return "";
          if (d.id === state.character.name) return `<b>${d.name}</b><br/>你自己<br/>${d.value ?? ""}`;
          const rel = state.relations.find((r) => r.name === d.name);
          if (!rel) return d.name;
          const ties = tieText(rel.ties);
          const kin = familyLine(rel, state.year);
          const age = ageText(rel, state.year);
          const where = whereText(state, rel);
          return [
            `<b>${rel.name}</b>　${rel.bond ?? "熟人"} · ${rel.role}${age ? ` · ${age}` : ""}`,
            `好感 ${rel.stars}/5${rel.metAt ? `　结识于${rel.metAt}` : ""}${where ? `　<span style="color:${where.startsWith("人在") ? "#c98a8a" : "#8f9bb3"}">${where}</span>` : ""}${kin ? `　<span style="color:#e8c67c">${kin}</span>` : ""}`,
            rel.note,
            ties ? `<span style="color:${TIE_COLOR}">原作关系 · ${ties}</span>` : "",
            rel.secret ? `秘密：${rel.secret}` : "",
            hasMemory(rel) ? `<span style="color:#8fbde6">他记得的 · ${memoryLine(state, rel)}</span>` : "",
          ]
            .filter(Boolean)
            .join("<br/>");
        },
      },
      legend: [{ data: ["你自己", ...BOND_ORDER], bottom: 0, textStyle: { color: "#8f9bb3", fontSize: 11 } }],
      series: [
        {
          type: "graph",
          layout: "none",
          roam: true,
          draggable: true,
          scaleLimit: { min: 0.4, max: 3 },
          categories: [
            { name: "你自己", itemStyle: { color: "#e8c67c" } },
            ...BOND_ORDER.map((b) => ({ name: b, itemStyle: { color: BOND_COLOR[b] } })),
          ],
          label: { show: false },
          emphasis: { focus: "adjacency", label: { show: true, fontSize: 12, color: "#f4e3bd" } },
          blur: { itemStyle: { opacity: 0.16 }, lineStyle: { opacity: 0.05 } },
          lineStyle: { color: "source", curveness: 0 },
          edgeSymbol: ["none", "none"],
          data: nodes,
          links,
        },
      ],
    };
  }, [placed, state]);

  // 图表的生命周期跟着弹窗走：关掉就销毁，免得留下定时器与监听
  useEffect(() => {
    if (!holder.current) return;
    const inst = echarts.init(holder.current, undefined, { renderer: "canvas" });
    chart.current = inst;
    const onResize = () => inst.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      inst.dispose();
      chart.current = null;
    };
  }, []);

  // 用增量合并而不是整份替换：玩家拖动、缩放过的视角不会因为一次互动被重置
  useEffect(() => {
    chart.current?.setOption(option);
  }, [option]);

  // 点节点：选中他，把基本信息展开在看板上。说话是看板上的事，不在图上直接触发
  useEffect(() => {
    const inst = chart.current;
    if (!inst) return;
    const handler = (params: unknown) => {
      const p = params as { dataType?: string; data?: { id?: string; name?: string } | null };
      if (p.dataType !== "node") return;
      const name = p.data?.name;
      if (!name || name === state.character.name) return;
      toggle(name);
    };
    inst.on("click", handler);
    return () => {
      inst.off("click", handler);
    };
  }, [state.character.name]);

  const shown = filter === "全部" ? visible : visible.filter((r) => (r.bond ?? "熟人") === filter);

  return (
    <Modal
      title={`关系网 · ${state.relations.length} 位相识`}
      wide
      onClose={onClose}
      actions={
        <button type="button" className="btn btn--primary" onClick={onClose}>
          关闭
        </button>
      }
    >
      <div className="relmap">
        <div className="relmap__chart">
          <div ref={holder} className="relmap__canvas" />
          <p className="fieldset__note" style={{ textAlign: "center" }}>
            滚轮缩放、拖动平移。金色虚线是原作里人物彼此的关系。点一个人看他的底细，说话要按看板上的按钮。
          </p>
        </div>

        <div className="relmap__side">
          <div className="chiprow">
            {(["全部", ...BOND_ORDER] as (RelationBond | "全部")[]).map((b) => {
              const count =
                b === "全部"
                  ? state.relations.length
                  : state.relations.filter((r) => (r.bond ?? "熟人") === b).length;
              if (count === 0) return null;
              return (
                <button
                  key={b}
                  type="button"
                  className="chip"
                  aria-pressed={filter === b}
                  onClick={() => setFilter(b)}
                >
                  {b} {count}
                </button>
              );
            })}
          </div>

          {selectedRel && (
            <div className="relmap__detail">
              <div className="relmap__detailhead">
                <span className="relmap__detailname">{selectedRel.name}</span>
                <button
                  type="button"
                  className="relmap__detailclose"
                  onClick={() => setSelected(null)}
                  aria-label="收起"
                >
                  ×
                </button>
              </div>
              <div className="relmap__detailrole">
                {selectedRel.bond ?? "熟人"} · {selectedRel.role}
                {ageText(selectedRel, state.year) && ` · ${ageText(selectedRel, state.year)}`}
              </div>
              <div className={`relmap__detailwhere${selectedHere ? "" : " relmap__detailwhere--away"}`}>
                {selectedWhere?.presence === "away" ? selectedWhere.reason : whereText(state, selectedRel)}
              </div>
              {canToggleCompanion(selectedRel) && (
                <div className="relmap__detailfollow">
                  <button
                    type="button"
                    className={`btn btn--xs${isCompanion(selectedRel) ? " btn--primary" : ""}`}
                    disabled={busy || !selectedHere}
                    title={
                      selectedHere
                        ? isCompanion(selectedRel)
                          ? "不带他走了。往后你搬到别处，他留在原地。"
                          : "带着他一起走。往后你搬到哪儿，他都还在跟前。"
                        : selectedWhere?.reason
                    }
                    onClick={() => onCompanion(selectedRel.name, !isCompanion(selectedRel))}
                  >
                    {isCompanion(selectedRel) ? "让他留在此地" : "带着他一起走"}
                  </button>
                  <span className="relmap__detailfollownote">
                    {isCompanion(selectedRel)
                      ? "他与你随行：你搬到哪儿，都还能说上话。"
                      : `他留在${selectedRel.place ?? "原地"}：你搬走之后就见不到了。`}
                  </span>
                </div>
              )}
              <div className="relmap__detailmeta">
                <span>好感 {selectedRel.stars}/5</span>
                {selectedRel.metAt && <span>结识于{selectedRel.metAt}</span>}
                {familyLine(selectedRel, state.year) && (
                  <span className="relmap__detailkin">{familyLine(selectedRel, state.year)}</span>
                )}
              </div>
              <div className="relmap__detailnote">{selectedRel.note}</div>
              {tieText(selectedRel.ties) && (
                <div className="rel__ties">原作关系 · {tieText(selectedRel.ties)}</div>
              )}
              {selectedRel.lore && <div className="rel__lore">原作 · {selectedRel.lore}</div>}
              {selectedRel.secret && <div className="rel__secret">秘密：{selectedRel.secret}</div>}
              {hasMemory(selectedRel) && (
                <div className="rel__memory">
                  <div className="rel__memoryhead">
                    他记得的{memoryLine(state, selectedRel) ? ` · ${memoryLine(state, selectedRel)}` : ""}
                  </div>
                  {selectedRel.memory?.summary && <div className="rel__memorysum">「{selectedRel.memory.summary}」</div>}
                  {selectedRel.memory && selectedRel.memory.facts.length > 0 && (
                    <ul className="rel__memoryfacts">
                      {selectedRel.memory.facts.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <div className="rel__acts">
                {RELATION_ACTIONS.filter((a) => selectedRel.stars >= a.minStars).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className="btn btn--sm"
                    disabled={busy || !selectedHere}
                    title={selectedHere ? a.detail : selectedWhere?.reason}
                    onClick={() => onInteract(selectedRel.name, a.id)}
                  >
                    {a.label}
                  </button>
                ))}
                <button
                  type="button"
                  className="btn btn--sm btn--primary"
                  disabled={busy || !selectedHere}
                  title={selectedHere ? undefined : selectedWhere?.reason}
                  onClick={() => onTalk(selectedRel.name)}
                >
                  {aiReady ? "与他说话" : "说话 · 需开启 AI"}
                </button>
              </div>
            </div>
          )}

          <div className="relmap__list">
            {shown.map((r) => {
              const here = reachable(state, r);
              return (
                <div className="rel" key={r.name}>
                  <button
                    type="button"
                    className="rel__top rel__head"
                    aria-pressed={selected === r.name}
                    onClick={() => toggle(r.name)}
                  >
                    <span className="rel__name">{r.name}</span>
                    <span className="rel__role">
                      {r.bond ?? "熟人"} · {r.role}
                      {ageText(r, state.year) && ` · ${ageText(r, state.year)}`}
                    </span>
                  </button>
                  <div className="rel__stars">
                    {"★".repeat(r.stars)}
                    {"☆".repeat(Math.max(0, 5 - r.stars))}
                    <span className="rel__starsnum">{r.stars}/5</span>
                    {r.metAt && <span className="rel__starsnum">结识于{r.metAt}</span>}
                    {whereText(state, r) && (
                      <span className={`rel__starsnum rel__where${here ? "" : " rel__where--away"}`}>
                        {whereText(state, r)}
                      </span>
                    )}
                    {familyLine(r, state.year) && (
                      <span className="rel__starsnum rel__starsnum--kin">{familyLine(r, state.year)}</span>
                    )}
                  </div>
                  <div className="rel__note">{r.note}</div>
                  {tieText(r.ties) && <div className="rel__ties">原作关系 · {tieText(r.ties)}</div>}
                  {r.lore && <div className="rel__lore">原作 · {r.lore}</div>}
                  {r.secret && <div className="rel__secret">秘密：{r.secret}</div>}
                  {hasMemory(r) && (
                    <div className="rel__memory">
                      <div className="rel__memoryhead">
                        他记得的{memoryLine(state, r) ? ` · ${memoryLine(state, r)}` : ""}
                      </div>
                      {r.memory?.summary && <div className="rel__memorysum">「{r.memory.summary}」</div>}
                      {r.memory && r.memory.facts.length > 0 && (
                        <ul className="rel__memoryfacts">
                          {r.memory.facts.map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  <div className="rel__acts">
                    {RELATION_ACTIONS.filter((a) => r.stars >= a.minStars).map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        className="btn btn--sm"
                        disabled={busy || !here}
                        title={here ? a.detail : whereabouts(state, r).reason}
                        onClick={() => onInteract(r.name, a.id)}
                      >
                        {a.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="btn btn--sm btn--primary"
                      disabled={busy || !here}
                      title={here ? undefined : whereabouts(state, r).reason}
                      onClick={() => onTalk(r.name)}
                    >
                      {aiReady ? "与他说话" : "说话 · 需开启 AI"}
                    </button>
                  </div>
                  {!here ? (
                    <div className="rel__hint rel__hint--away">
                      人不在跟前。想当面说上话，得回到{whereabouts(state, r).place}去。
                    </div>
                  ) : (
                    r.stars < 4 && (
                      <div className="rel__hint">交情还浅。多来往几次，「请他帮个忙」才开得了口。</div>
                    )
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
