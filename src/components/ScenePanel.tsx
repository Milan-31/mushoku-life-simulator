import { useMemo } from "react";
import type { GameState } from "../types";
import { checkCommand, defaultSceneId, groupByCategory, visibleScenes } from "../data/scenes";

interface Props {
  state: GameState;
  sceneId: string;
  /** 本月行动次数已用尽或正在等待推演 */
  blocked: boolean;
  onSceneChange: (id: string) => void;
  onCommand: (commandId: string) => void;
}

/**
 * 场景操作面板。
 *
 * 展示的不是一张写死的表，而是「过了剧情门槛的内置场景 + 这一份存档自己长出来的场景与指令」
 * 的合并结果：剧情走到新的处境，这里就会多出一块新的地方；模型也可以按剧情给存档添场景。
 * 所有这些指令都由本地引擎即时结算，不消耗 AI 额度。
 */
export default function ScenePanel({ state, sceneId, blocked, onSceneChange, onCommand }: Props) {
  const scenes = useMemo(() => visibleScenes(state), [state]);
  // 选中的场景可能已经不在列表里（迁居换了地方、剧情门槛关上了），那就退到你此刻所处的地方
  const scene = useMemo(() => {
    const fallbackId = defaultSceneId(state);
    return scenes.find((s) => s.id === sceneId) ?? scenes.find((s) => s.id === fallbackId) ?? scenes[0];
  }, [scenes, sceneId, state]);
  const groups = useMemo(() => groupByCategory(scene?.commands ?? []), [scene]);
  const gates = useMemo(() => {
    const map = new Map<string, { ok: boolean; reason: string }>();
    for (const c of scene?.commands ?? []) map.set(c.id, checkCommand(state, c));
    return map;
  }, [scene, state]);

  if (!scene) return null;

  return (
    <div className="scene">
      <div className="scene__tabs" role="tablist" aria-label="场景">
        {scenes.map((s) => (
          <button
            key={s.id}
            type="button"
            className="scene__tab"
            aria-current={s.id === scene.id}
            onClick={() => onSceneChange(s.id)}
          >
            {s.name}
          </button>
        ))}
      </div>

      <p className="scene__desc">{scene.desc}</p>

      {groups.map((g) => (
        <div className="scene__group" key={g.category}>
          <div className="scene__groupname">{g.category}</div>
          <div className="scene__cmds">
            {g.items.map((c) => {
              const gate = gates.get(c.id) ?? { ok: true, reason: "" };
              const locked = !gate.ok;
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`scenecmd${locked ? " scenecmd--locked" : ""}`}
                  disabled={blocked || locked}
                  onClick={() => onCommand(c.id)}
                  title={locked ? `暂不可执行：${gate.reason}` : c.hint}
                >
                  <span className="scenecmd__label">{c.label}</span>
                  <span className={`scenecmd__cost${c.cost < 0 ? " scenecmd__cost--gain" : ""}`}>
                    {c.cost < 0 ? `恢复 ${-c.cost}` : `精力 ${c.cost}`}
                  </span>
                  {locked && !blocked && <span className="scenecmd__lock">条件不足 · {gate.reason}</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <p className="fieldset__note" style={{ marginTop: 10 }}>
        以上都是预设指令，由本地引擎即时结算，不消耗 AI 额度。灰掉的指令你现在还做不了，条件写在按钮上。
        有些指令的结果会跟着剧情分岔：同一条指令，走到不同的处境会开出不同的戏，偶尔还会把一件特殊的事掀到台面上。
        最前面那一格是你此刻所在的地方；集市、公会、大学、道场这些场合也跟着所在地走——人不在那儿，那一格就不出现。
        要换地方，用底栏的「迁居」。想做出预设里没有的事，用下面的自由行动。
      </p>
    </div>
  );
}