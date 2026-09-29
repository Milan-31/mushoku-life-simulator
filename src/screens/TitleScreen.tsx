import heroArt from "../assets/hero-keyart.jpg";

interface Props {
  onStart: () => void;
  onRulebook: () => void;
  onContinue: () => void;
  onImport: () => void;
  onAi: () => void;
  /** 原作模式扮演：直接成为鲁迪乌斯 */
  onPlayRudeus: () => void;
  hasSave: boolean;
}

const META = [
  { k: "时代跨度", v: "甲龙历十万年前 — 战后时代" },
  { k: "可选出身", v: "19 种 · 可自定义" },
  { k: "模拟节奏", v: "一回合 = 一个月" },
  { k: "死亡", v: "真实且不可逆" },
];

export default function TitleScreen({ onStart, onRulebook, onContinue, onImport, onAi, onPlayRudeus, hasSave }: Props) {
  return (
    <section className="title">
      <div className="title__art">
        <img src={heroArt} alt="夜色中，一位旅人立于山丘，仰望星空中浮现的世界地图与魔法阵" />
      </div>
      <div className="title__body">
        <div className="title__kicker">六面世界 · 剑与魔法</div>
        <h1 className="title__h1">
          无职转生
          <br />
          人生模拟器
        </h1>
        <p className="title__sub">你不是被选中的那个人</p>
        <p className="title__desc">
          你可以是阿斯拉王国的贵族子弟、布耶纳村的农家孩子、魔大陆的魔族后裔、魔法大学的学生，
          或是冒险者公会里一个 F 级的新人。也可以一辈子不离开出生的村庄。这同样是一种完整人生。
        </p>
        <p className="title__poem">
          人神在暗处拨弄棋局。
          <br />
          龙神在轮回中寻找胜机。
          <br />
          黑暗中有东西在低语。
          <br />
          人神的棋盘上，有一颗棋子空着。
        </p>
        <div className="title__actions">
          <button type="button" className="btn btn--primary" onClick={onStart}>
            选择你的起点
          </button>
          <button type="button" className="btn btn--rudeus" onClick={onPlayRudeus}>
            原作模式扮演 · 鲁迪乌斯
          </button>
          {hasSave && (
            <button type="button" className="btn" onClick={onContinue}>
              继续上一个人生
            </button>
          )}
          <button type="button" className="btn btn--ghost" onClick={onRulebook}>
            阅读规则手册
          </button>
          <button type="button" className="btn btn--ghost" onClick={onAi}>
            AI 推演设置
          </button>
          <button type="button" className="btn btn--ghost" onClick={onImport}>
            导入存档 / 接口
          </button>
        </div>
        <div className="title__meta">
          {META.map((m) => (
            <div key={m.k}>
              {m.k}
              <strong>{m.v}</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}