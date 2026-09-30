/**
 * 主线功能的界面冒烟测试（离屏渲染，不需要显示器）。
 *
 * 两条路都走一遍：
 *   A. 原作模式：点一次就进游戏，看主线卷宗有没有把「原作主线」摊开。
 *   B. 普通创建：走完创建流程点「开始人生」，看有没有随机抽到一条主线并把它写进纪事。
 *
 * 用法（注意本机环境变量 ELECTRON_RUN_AS_NODE 会让 electron 退化成 node）：
 *   Remove-Item Env:ELECTRON_RUN_AS_NODE; node node_modules/electron/cli.js scripts/smoke-mainline-ui.cjs
 */
const { app, BrowserWindow, protocol, net } = require("electron");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

app.disableHardwareAcceleration();
app.commandLine.appendSwitch("no-sandbox");

// 默认测开发构建的 dist/；打包之后可以把 SMOKE_DIST 指向 release 里的 app/dist 再测一遍
const DIST = process.env.SMOKE_DIST
  ? path.resolve(process.env.SMOKE_DIST)
  : path.join(__dirname, "..", "dist");
const errors = [];

protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

/** 渲染进程里跑的辅助脚本：点按钮、填输入框、等 React 重渲染 */
const HELPERS = `
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const btn = (t) => [...document.querySelectorAll("button")].find((b) => (b.textContent || "").includes(t));
  const waitFor = async (fn, ms) => {
    const until = Date.now() + (ms || 5000);
    while (Date.now() < until) {
      const hit = fn();
      if (hit) return hit;
      await sleep(100);
    }
    return null;
  };
  const setValue = (el, v) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  };
  const clickUntil = async (target, stepText, tries) => {
    for (let i = 0; i < tries; i += 1) {
      const hit = btn(target);
      if (hit) { hit.click(); return true; }
      const next = btn(stepText);
      if (!next) return false;
      next.click();
      await sleep(120);
    }
    return false;
  };
`;

async function run(win, label, script) {
  const result = await win.webContents.executeJavaScript(`(async () => { ${HELPERS} ${script} })()`);
  console.log(`\n== ${label} ==\n${JSON.stringify(result, null, 2)}`);
  return result;
}

app.whenReady().then(async () => {
  protocol.handle("app", (request) => {
    let rel = decodeURIComponent(new URL(request.url).pathname);
    if (!rel || rel === "/") rel = "/index.html";
    return net.fetch(pathToFileURL(path.join(DIST, rel)).toString());
  });

  const win = new BrowserWindow({
    show: false,
    width: 1440,
    height: 900,
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

  const problems = [];
  const load = async () => {
    await win.loadURL("app://bundle/index.html");
    // 等 React 真正挂上：标题页那几个按钮出现为止
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

  // A. 原作模式：先看他的档案页，再「以鲁迪乌斯开始人生」
  await load();
  const a = await run(
    win,
    "A · 原作模式",
    `
    const enter = await waitFor(() => btn("原作模式"), 5000);
    if (!enter) return { 找不到入口: [...document.querySelectorAll("button")].map((b) => b.innerText) };
    enter.click();
    await waitFor(() => btn("以鲁迪乌斯开始人生"), 5000);
    const go = btn("以鲁迪乌斯开始人生");
    if (go) go.click();
    await waitFor(() => document.querySelector(".game__self"), 8000);
    await sleep(400);
    const text = document.body.innerText;
    const self = document.querySelector(".game__self");
    const heads = [...self.querySelectorAll(".panel__head")].map((h) => h.innerText.split("\\n")[0]);
    const rows = [...self.querySelectorAll(".selfrow")].map((r) => r.innerText.replace(/\\n/g, " "));
    const mainlineRows = rows.filter((r) => r.includes("目标") || /^\\d+\\/\\d+/.test(r) || r.includes("任务"));
    return {
      进入游戏界面: Boolean(document.querySelector(".game")),
      左栏三块: heads,
      有主线块: heads.includes("主线"),
      主线摘要行: mainlineRows,
      主线页入口: Boolean(btn("主线卷宗")),
      纪事里有主线: text.includes("主线 ·"),
    };
  `,
  );
  for (const k of ["进入游戏界面", "有主线块", "主线页入口", "纪事里有主线"]) {
    if (!a[k]) problems.push(`A · ${k} 不成立：${JSON.stringify(a[k])}`);
  }
  if (!a.主线摘要行.some((r) => /\d+\/\d+/.test(r))) problems.push(`A · 主页没有显示第几章：${JSON.stringify(a.主线摘要行)}`);
  if (!a.主线摘要行.some((r) => r.includes("目标"))) problems.push("A · 主页没有显示本章目标");

  // 从主页进主线卷宗页，看全部指引与章节目录在不在
  const a2 = await run(
    win,
    "A · 主线卷宗页",
    `
    const open = await waitFor(() => btn("主线卷宗"), 5000);
    if (open) { open.click(); await waitFor(() => document.querySelector(".dossier"), 6000); }
    await sleep(200);
    const back = btn("回到人生");
    const shot = {
      卷宗页打开: Boolean(document.querySelector(".detailpage")) && Boolean(document.querySelector(".dossier")),
      页面标题: (document.querySelector(".detailpage__title") || {}).innerText || "",
      指引条数: document.querySelectorAll(".dossier .guide li").length,
      章节目录条数: document.querySelectorAll(".dossier .chapter").length,
      任务条数: document.querySelectorAll(".dossier .quest").length,
    };
    if (back) back.click();
    await sleep(300);
    shot.已回到人生 = Boolean(document.querySelector(".game__self"));
    return shot;
  `,
  );
  if (!a2.卷宗页打开) problems.push("A · 主线卷宗页没有打开");
  if (a2.页面标题 !== "主线卷宗") problems.push(`A · 卷宗页标题不对：${a2.页面标题}`);
  if (a2.指引条数 < 3) problems.push(`A · 指引条数偏少：${a2.指引条数}`);
  if (a2.章节目录条数 !== 6) problems.push(`A · 原作主线的章节目录应当是 6 章，实到 ${a2.章节目录条数}`);
  if (!a2.已回到人生) problems.push("A · 从主线卷宗页回不到人生");

  // B. 普通创建：走完流程 → 开始人生 → 抽到一条主线
  await load();
  const b = await run(
    win,
    "B · 普通创建并抽取主线",
    `
    const start = await waitFor(() => btn("选择你的起点"), 5000);
    if (!start) return { 找不到入口: [...document.querySelectorAll("button")].map((x) => x.innerText) };
    start.click();
    await waitFor(() => btn("下一步"), 5000);
    // 第三步要填名字，先走到那一步再填
    for (let i = 0; i < 5; i += 1) {
      const input = [...document.querySelectorAll("input")].find((el) => (el.placeholder || "").includes("鲁迪乌斯"));
      if (input) { setValue(input, "斯梅拉"); break; }
      const next = btn("下一步");
      if (!next) break;
      next.click();
      await sleep(120);
    }
    await sleep(200);
    const started = await clickUntil("开始人生", "下一步", 12);
    await sleep(800);
    const text = document.body.innerText;
    const self = document.querySelector(".game__self");
    const rows = self ? [...self.querySelectorAll(".selfrow")].map((r) => r.innerText.replace(/\\n/g, " ")) : [];
    const chapterRow = rows.find((r) => /^\\d+\\/\\d+/.test(r)) || "";
    const toast = document.querySelector(".toast");
    return {
      点到了开始人生: started,
      进入游戏界面: Boolean(document.querySelector(".game")),
      有主线块: Boolean(self) && [...self.querySelectorAll(".panel__head")].some((h) => h.innerText.includes("主线")),
      主线摘要行: chapterRow,
      纪事里有主线开场: text.includes("主线 ·"),
      抽到的主线有名有姓: chapterRow.split(" ").slice(1).join(" ").trim().length > 0,
      提示条: toast ? toast.innerText.slice(0, 60) : "（没有提示条）",
    };
  `,
  );
  const mustB = ["点到了开始人生", "进入游戏界面", "有主线块", "纪事里有主线开场", "抽到的主线有名有姓"];
  for (const k of mustB) if (!b[k]) problems.push(`B · ${k} 不成立：${JSON.stringify(b[k])}`);
  if (!/^\d+\/\d+/.test(b.主线摘要行)) problems.push(`B · 主页没有显示第几章：${JSON.stringify(b.主线摘要行)}`);

  console.log("");
  if (errors.length > 0) {
    console.error(`渲染进程报了 ${errors.length} 条错误：`);
    for (const e of errors.slice(0, 8)) console.error(`- ${e}`);
    app.exit(1);
  }
  if (problems.length > 0) {
    console.error(`发现 ${problems.length} 个问题：`);
    for (const p of problems) console.error(`- ${p}`);
    app.exit(1);
  }
  console.log("主线界面冒烟测试通过：两条入口都能进游戏，主线卷宗与纪事都正常。");
  app.exit(0);
});

setTimeout(() => {
  console.error("TIMEOUT");
  app.exit(2);
}, 90000);
