import type { GameState } from "../types";
import { achievementById } from "../data/achievements";
import { ACHIEVEMENT_TOTAL } from "../data/achievements";
import { formatDate } from "../engine/world";

interface Props {
  state: GameState;
  onReplay: () => void;
  onAchievements: () => void;
  onRestart: () => void;
  onTitle: () => void;
}

export default function EndingScreen({ state, onReplay, onAchievements, onRestart, onTitle }: Props) {
  const c = state.character;
  const ending = state.ending;
  const stat = (key: string) => state.stats.find((s) => s.key === key)?.value ?? 0;
  const unlocked = state.achievements.map((id) => achievementById(id)).filter(Boolean);

  return (
    <section className="ending">
      <div className="ending__box">
        <div className="ending__kicker">终章</div>
        <h1 className="ending__title">{c.name}的一生</h1>
        <p className="ending__cause">{state.deathCause ?? "这一段人生走到了尽头。"}</p>

        <div className="ending__stats">
          <div className="ending__stat"><span>享年</span><b>{c.age} 岁</b></div>
          <div className="ending__stat"><span>停止于</span><b>{formatDate(state.year, state.month)}</b></div>
          <div className="ending__stat"><span>出身</span><b>{c.origin}</b></div>
          <div className="ending__stat"><span>最后所在地</span><b>{c.residence}</b></div>
          <div className="ending__stat"><span>魔术</span><b>{c.magicTier}</b></div>
          <div className="ending__stat"><span>剑术</span><b>{c.swordTier}</b></div>
          <div className="ending__stat"><span>冒险者等级</span><b>{c.adventurerRank}</b></div>
          <div className="ending__stat"><span>生涯回合</span><b>{state.turn} 个月</b></div>
          <div className="ending__stat"><span>难度</span><b>{state.difficulty}</b></div>
          <div className="ending__stat"><span>财富 / 声望</span><b>{stat("wealth")} / {stat("fame")}</b></div>
          <div className="ending__stat"><span>目标完成度</span><b>{Math.round(state.goalProgress)}%</b></div>
        </div>

        <div className="ending__epi">
          {(ending?.epilogue ?? []).map((l, i) => (
            <p key={i}>{l}</p>
          ))}
        </div>

        <div className="ending__ach">
          <div className="ending__ach-head">
            解锁成就 <b>{state.achievements.length}</b> / {ACHIEVEMENT_TOTAL}
          </div>
          {unlocked.length > 0 ? (
            <div className="ending__ach-list">
              {unlocked.map((a) => (
                <span className="tag" key={a!.id}>
                  ✦ {a!.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="fieldset__note">这一段人生没有留下任何成就记录。世界照常运转。</p>
          )}
        </div>

        <div className="ending__actions">
          <button type="button" className="btn btn--primary" onClick={onRestart}>
            开始新的一生
          </button>
          <button type="button" className="btn" onClick={onReplay}>
            回看完整纪事
          </button>
          <button type="button" className="btn" onClick={onAchievements}>
            查看成就
          </button>
          <button type="button" className="btn btn--ghost" onClick={onTitle}>
            回到起点
          </button>
        </div>
      </div>
    </section>
  );
}