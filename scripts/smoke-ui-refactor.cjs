/**
 * 界面重构的冒烟测试（离屏渲染）。
 *
 * 三件事：
 *   1. 创建角色时把鼠标停在选项上，右侧预览面板要给出「选了会怎样」。
 *   2. 主页左栏是主角自己的信息，右栏每一块都只是纲要 + 一个进详情的按钮。
 *   3. 每一块纲要的按钮都能进它自己的详情页，页里是完整信息，返回能回到人生。
 *
 * 用法（本机 ELECTRON_RUN_AS_NODE=1 会让 electron 退化成 node，先清掉）：
 *   Remove-Item Env:ELECTRON_RUN_AS_NODE
 *   node node_modules/electron/cli.js scripts/smoke-ui-refactor.cjs
 */
const { app, BrowserWindow, protocol, net } = require("electron");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

app.disableHardwareAcceleration();
app.commandLine.appendSwitch("no-sandbox");

const DIST = process.env.SMOKE_DIST
  ? path.resolve(process.env.SMOKE_DIST)
  : path.join(__dirname, "..", "dist");

const errors = [];
const problems = [];

protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

const HELPERS = `
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const btn = (t) => [...document.querySelectorAll("button")].find((b) => (b.textContent || "").includes(t));
  const tile = (t) => [...document.querySelectorAll(".tile")].find((b) => (b.textContent || "").includes(t));
  const waitFor = async (fn, ms) => {
    const until = Date.now() + (ms || 6000);
    while (Date.now() < until) {
      const hit = fn();
      if (hit) return hit;
      await sleep(80);
    }
    return null;
  };
  const hover = (el) => {
    el.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    el.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
  };
  const unhover = (el) => {
    el.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
    el.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
  };
  const setValue = (el, v) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  };
`;

async function run(win, label, script) {
  const result = await win.webContents.executeJavaScript(`(async () => { ${HELPERS} ${script} })()`);
  console.log(`\n== ${label} ==\n${JSON.stringify(result, null, 2)}`);
  return result;
}

const expect = (ok, message) => {
  if (!ok) problems.push(message);
};

app.whenReady().then(async () => {
  protocol.handle("app", (request) => {
    let rel = decodeURIComponent(new URL(request.url).pathname);
    if (!rel || rel === "/") rel = "/index.html";
    return net.fetch(pathToFileURL(path.join(DIST, rel)).toString());
  });

  const win = new BrowserWindow({
    show: false,
    width: 1500,
    height: 940,
    webPreferences: { offscreen: true, contextIsolation: true, sandbox: false },
  });

  win.webContents.on("console-message", (...args) => {
    const d = args[1];
    const level = d && typeof d === "object" ? d.level : args[1];
    const message = d && typeof d === "object" ? d.message : args[2];
    if (level === "error" || level === 3) errors.push(String(message));
  });
  win.webContents.on("did-fail-load", (_e, code, desc) => {
    console.error("DID_FAIL_LOAD", code, desc);
    app.exit(1);
  });

  const load = async () => {
    await win.loadURL("app://bundle/index.html");
    await win.webContents.executeJavaScript(
      `new Promise((resolve) => {
         const until = Date.now() + 8000;
         const tick = () => {
           if (document.querySelectorAll("button").length >= 4) return resolve(true);
           if (Date.now() > until) return resolve(false);
           setTimeout(tick, 100);
         };
         tick();
       })`,
    );
  };

  /* ---------- 1. 创建页：悬停看效果 ---------- */
  await load();
  const a = await run(
    win,
    "1 · 创建页悬停预览",
    `
    btn("选择你的起点").click();
    await waitFor(() => tile("平民"), 5000);
    // 第一步「时代」：停在某个时代上
    const eraTile = tile("拉普拉斯战役");
    const eraBefore = document.querySelector(".preview__panel .panel__head").innerText;
    if (eraTile) hover(eraTile);
    await sleep(200);
    const eraShot = {
      面板标题: document.querySelector(".preview__panel .panel__head").innerText,
      说明: (document.querySelector(".preview__desc") || {}).innerText || "",
      变化条数: document.querySelectorAll(".preview__changes li").length,
      变化示例: [...document.querySelectorAll(".preview__changes li")].slice(0, 3).map((li) => li.innerText),
      不变量说明条数: document.querySelectorAll(".preview__notes li").length,
      属性快照格数: document.querySelectorAll(".preview__stat").length,
    };
    if (eraTile) unhover(eraTile);
    await sleep(150);
    const backToSummary = document.querySelector(".preview__panel .panel__head").innerText;

    // 第二步「出身」：停在魔族后裔上，效果应当落在属性、势力与关系网上
    btn("下一步").click();
    await waitFor(() => tile("魔族后裔"), 5000);
    const originTile = tile("魔族后裔");
    if (originTile) hover(originTile);
    await sleep(250);
    const originShot = {
      说明: (document.querySelector(".preview__desc") || {}).innerText || "",
      变化: [...document.querySelectorAll(".preview__changes li")].map((li) => li.innerText).slice(0, 8),
      不变量: [...document.querySelectorAll(".preview__notes li")].map((li) => li.innerText).slice(0, 2),
    };
    return { 起始标题: eraBefore, 时代预览: eraShot, 移开后: backToSummary, 出身预览: originShot };
  `,
  );
  expect(a.时代预览.面板标题.includes("选了会怎样"), `时代预览没切换到效果视图：${a.时代预览.面板标题}`);
  expect(a.时代预览.变化条数 > 0, "时代预览没有任何变化条目");
  expect(a.时代预览.属性快照格数 >= 9, `预览里的属性快照不足：${a.时代预览.属性快照格数}`);
  expect(a.出身预览.变化.length > 0, "出身预览没有任何变化条目");
  expect(a.出身预览.不变量.length > 0, "出身预览没有说明不进数值的部分");

  /* ---------- 1b. 悬停不能让版面动，格子不许钻到预览栏底下 ---------- */
  const layout = await run(
    win,
    "1b · 对齐与不闪动",
    `
    const steps = [];
    const measure = () => {
      const aside = document.querySelector(".preview").getBoundingClientRect();
      const stage = document.querySelector(".creation__stage").getBoundingClientRect();
      const nodes = [...document.querySelectorAll(".creation__stage .tile, .creation__stage .input, .creation__stage .textarea, .creation__stage .chip")];
      const over = nodes.filter((el) => el.getBoundingClientRect().right > aside.left + 0.5);
      return {
        asideLeft: Math.round(aside.left),
        stageRight: Math.round(stage.right),
        元素数: nodes.length,
        越过预览栏的: over.length,
        越界示例: over.slice(0, 3).map((el) => (el.innerText || el.value || "").slice(0, 10)),
        页面横向溢出: Math.round(document.documentElement.scrollWidth - document.documentElement.clientWidth),
      };
    };
    // 从时代那一步一路走到确认启程，每一步都量一遍
    for (let i = 0; i < 11; i += 1) {
      const shot = measure();
      const title = (document.querySelector(".stagehead__title") || {}).innerText || "";
      steps.push({ 步: title || \`第\${i}步\`, ...shot });
      const input = [...document.querySelectorAll("input")].find((el) => (el.placeholder || "").includes("鲁迪乌斯"));
      if (input) setValue(input, "排版测试者");
      const next = btn("下一步");
      if (!next) break;
      next.click();
      await sleep(220);
    }

    // 悬停前后：预览栏与整页的高度必须一模一样，否则就是版在跳
    const before = {
      预览栏高: Math.round(document.querySelector(".preview").getBoundingClientRect().height),
      预览正文高: Math.round(document.querySelector(".preview__body").getBoundingClientRect().height),
      整页高: Math.round(document.documentElement.scrollHeight),
    };
    const grid = [...document.querySelectorAll(".optgrid")].pop();
    const last = grid ? grid.querySelector(".tile") : null;
    if (last) {
      last.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      await sleep(320);
    }
    const after = {
      预览栏高: Math.round(document.querySelector(".preview").getBoundingClientRect().height),
      预览正文高: Math.round(document.querySelector(".preview__body").getBoundingClientRect().height),
      整页高: Math.round(document.documentElement.scrollHeight),
      预览已切换: (document.querySelector(".preview__panel .panel__head") || {}).innerText || "",
      有渐显动画: Boolean(document.querySelector(".preview__body .blur-swap")),
    };
    return { 每一步: steps, 悬停前: before, 悬停后: after };
  `,
  );
  for (const step of layout.每一步) {
    expect(step.越过预览栏的 === 0, `「${step.步}」有 ${step.越过预览栏的} 个元素钻到预览栏底下：${JSON.stringify(step.越界示例)}`);
    expect(step.页面横向溢出 <= 1, `「${step.步}」页面横向溢出了 ${step.页面横向溢出}px`);
  }
  expect(layout.每一步.length >= 10, `走过的创建步骤太少：${layout.每一步.length}`);
  expect(
    layout.每一步[layout.每一步.length - 1].步 === "确认启程",
    `没有走到最后一步：${layout.每一步[layout.每一步.length - 1].步}`,
  );
  expect(
    layout.悬停前.预览栏高 === layout.悬停后.预览栏高,
    `悬停后预览栏高度变了：${layout.悬停前.预览栏高} → ${layout.悬停后.预览栏高}`,
  );
  expect(
    layout.悬停前.整页高 === layout.悬停后.整页高,
    `悬停后整页高度变了（版面在跳）：${layout.悬停前.整页高} → ${layout.悬停后.整页高}`,
  );
  expect(layout.悬停后.有渐显动画, "预览内容切换时没有套上模糊渐显");

  /* ---------- 2. 走完创建流程，进游戏：主页只剩「自己 + 眼前的事」 ---------- */
  const b = await run(
    win,
    "2 · 主页是否够简",
    `
    for (let i = 0; i < 5; i += 1) {
      const input = [...document.querySelectorAll("input")].find((el) => (el.placeholder || "").includes("鲁迪乌斯"));
      if (input) { setValue(input, "精简测试者"); break; }
      const next = btn("下一步");
      if (!next) break;
      next.click();
      await sleep(120);
    }
    await sleep(200);
    let clicked = false;
    for (let i = 0; i < 14; i += 1) {
      const go = btn("开始人生");
      if (go) { go.click(); clicked = true; break; }
      const next = btn("下一步");
      if (!next) break;
      next.click();
      await sleep(120);
    }
    await waitFor(() => document.querySelector(".game"), 8000);
    await sleep(400);

    const nav = document.querySelector(".pagenav");
    const items = [...document.querySelectorAll(".pagenav__item")];
    const navTops = new Set(items.map((el) => Math.round(el.getBoundingClientRect().top)));
    const navStyle = nav ? getComputedStyle(nav) : null;

    // 主页里每一行文字都应当只占一行（横向不换行）
    const oneLine = (sel) => {
      const list = [...document.querySelectorAll(sel)];
      const wrapped = list.filter((el) => el.scrollHeight > el.clientHeight + 1);
      return { 数量: list.length, 折行: wrapped.length };
    };
    // 按钮类元素的高度由内容决定：有谁折了行，它一定比同组里最矮的那个高
    const sameRow = (sel) => {
      const list = [...document.querySelectorAll(sel)];
      const heights = list.map((el) => el.getBoundingClientRect().height);
      const min = Math.min(...heights);
      const max = Math.max(...heights);
      return { 数量: list.length, 最矮: Math.round(min), 最高: Math.round(max), 高度一致: max - min <= 1 };
    };

    const cols = document.querySelectorAll(".game__col");
    const left = cols[0];
    return {
      点到开始人生: clicked,
      进游戏: Boolean(document.querySelector(".game")),
      左栏标题: [...left.querySelectorAll(".panel__head")].map((h) => h.innerText.split("\\n")[0]),
      右栏已删除: cols.length === 1,
      纲要卡已删除: document.querySelectorAll(".outline").length === 0,
      旧式标签页已删除: document.querySelectorAll(".game .tabs").length === 0,
      页面索引条: Boolean(nav),
      索引项: items.map((el) => el.innerText.replace(/\\s+/g, " ").trim()),
      索引条不换行: navStyle ? navStyle.flexWrap === "nowrap" : false,
      索引项同一行: navTops.size === 1,
      索引条里没有存档与AI: !items.some((el) => /^(存档|AI)/.test(el.innerText.trim())),
      左栏有精力与行动: left.innerText.includes("本月精力") && left.innerText.includes("本月行动"),
      九项属性格: document.querySelectorAll(".statgrid__cell").length,
      主角行不折行: oneLine(".selfrow"),
      属性格不折行: oneLine(".statgrid__cell"),
      索引项等高: sameRow(".pagenav__item"),
      行动区宽度: Math.round((document.querySelector(".chronicle") || { getBoundingClientRect: () => ({ width: 0 }) }).getBoundingClientRect().width),
    };
  `,
  );
  const yearCheck = await run(
    win,
    "2b · 纪事切到年度视图",
    `
    const modes = [...document.querySelectorAll(".chronicle__modes button")];
    const y = modes.find((b) => b.textContent.includes("年度"));
    if (y) { y.click(); await sleep(400); }
    const shot = {
      有年度按钮: Boolean(y),
      年鉴渲染: Boolean(document.querySelector(".yearbook")),
      有小结: Boolean(document.querySelector(".yearbook__head")),
      事件条数: document.querySelectorAll(".yearevent").length,
      面板没有外溢: (() => {
        const body = document.querySelector(".chronicle__panel .panel__body");
        return body ? body.scrollHeight <= body.clientHeight + 2 : false;
      })(),
    };
    const m = modes.find((b) => b.textContent.includes("月度"));
    if (m) { m.click(); await sleep(300); }
    return shot;
  `,
  );
  expect(yearCheck.年鉴渲染 && yearCheck.有小结, `年度视图没渲染出来：${JSON.stringify(yearCheck)}`);
  expect(yearCheck.面板没有外溢, "纪事面板内容溢出了边框");
  expect(b.进游戏, "没有进入游戏界面");
  expect(b.右栏已删除, "还留着第三栏");
  expect(b.纲要卡已删除 && b.旧式标签页已删除, "主页还留着纲要卡或旧标签页");
  expect(b.页面索引条 && b.索引条不换行 && b.索引项同一行, `页面索引条不是一行：${b.索引项.length} 项，同一行=${b.索引项同一行}`);
  expect(b.索引项.length >= 8, `页面索引项偏少：${b.索引项.length}`);
  expect(b.索引条里没有存档与AI, `页面索引条里还留着该由顶栏管的入口：${JSON.stringify(b.索引项)}`);
  expect(b.左栏标题.length === 3, `左栏块数不对：${b.左栏标题.join(" / ")}`);
  expect(b.左栏有精力与行动, "左栏看不到精力与行动次数");
  expect(b.九项属性格 === 9, `属性格不是九项：${b.九项属性格}`);
  expect(b.主角行不折行.折行 === 0, `有 ${b.主角行不折行.折行} 行信息折了行`);
  expect(b.属性格不折行.折行 === 0, `有 ${b.属性格不折行.折行} 格属性折了行`);
  expect(b.索引项等高.高度一致, `索引项高度不一致，说明有项折了行：${JSON.stringify(b.索引项等高)}`);
  expect(b.行动区宽度 >= 800, `行动区还是太窄：${b.行动区宽度}px`);

  /* ---------- 3. 逐个进详情页再返回 ---------- */
  const cases = [
    ["主角档案", "主角档案"],
    ["属性与能力", "属性与能力"],
    ["招式与流派", "招式与流派"],
    ["关系网", "关系网"],
    ["势力", "势力"],
    ["线索与设定", "线索与设定"],
    ["成就", "成就"],
    ["主线卷宗", "主线卷宗"],
  ];
  for (const [buttonText, expectedTitle] of cases) {
    const r = await run(
      win,
      `3 · 详情页「${expectedTitle}」`,
      `
      const open = await waitFor(() => btn(${JSON.stringify(buttonText)}), 5000);
      if (!open) return { 找不到入口: ${JSON.stringify(buttonText)} };
      open.click();
      const page = await waitFor(() => document.querySelector(".detailpage"), 8000);
      await sleep(250);
      const title = (document.querySelector(".detailpage__title") || {}).innerText || "";
      const body = (document.querySelector(".detailpage__body") || {}).innerText || "";
      const panels = document.querySelectorAll(".detailpage__body > .panel").length;
      const back = btn("回到人生");
      const shot = { 标题: title, 面板块数: panels, 正文长度: body.length, 有返回按钮: Boolean(back) };
      if (back) back.click();
      await sleep(350);
      shot.已回到人生 = Boolean(document.querySelector(".game")) && !document.querySelector(".detailpage");
      return shot;
    `,
    );
    expect(r.标题 === expectedTitle, `详情页标题不对：期望「${expectedTitle}」，实到「${r.标题}」`);
    expect(r.正文长度 > 40, `详情页「${expectedTitle}」正文太空：${r.正文长度} 字`);
    expect(r.有返回按钮 && r.已回到人生, `详情页「${expectedTitle}」返回不了人生`);
  }

  console.log("");
  if (errors.length > 0) {
    console.error(`渲染进程报了 ${errors.length} 条错误：`);
    for (const e of errors.slice(0, 8)) console.error(`- ${e}`);
  }
  if (problems.length > 0) {
    console.error(`发现 ${problems.length} 个问题：`);
    for (const p of problems) console.error(`- ${p}`);
    app.exit(1);
  }
  console.log("界面重构冒烟测试通过：悬停有预览，主页是纲要 + 按钮，每一块都能进自己的详情页。");
  app.exit(0);
});

setTimeout(() => {
  console.error("TIMEOUT");
  app.exit(2);
}, 180000);
