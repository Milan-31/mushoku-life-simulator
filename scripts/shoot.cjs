/**
 * 截图脚本：把几个关键界面存成 PNG，用来肉眼检查排版。
 *
 * 用法：
 *   Remove-Item Env:ELECTRON_RUN_AS_NODE
 *   node node_modules/electron/cli.js scripts/shoot.cjs [输出目录]
 */
const { app, BrowserWindow, protocol, net } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { pathToFileURL } = require("node:url");

app.disableHardwareAcceleration();
app.commandLine.appendSwitch("no-sandbox");

const DIST = process.env.SMOKE_DIST
  ? path.resolve(process.env.SMOKE_DIST)
  : path.join(__dirname, "..", "dist");
const OUT = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, "..", ".cache", "shots");

protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

const HELPERS = `
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const btn = (t) => [...document.querySelectorAll("button")].find((b) => (b.textContent || "").includes(t));
  const tile = (t) => [...document.querySelectorAll(".tile")].find((b) => (b.textContent || "").includes(t));
  const waitFor = async (fn, ms) => {
    const until = Date.now() + (ms || 8000);
    while (Date.now() < until) {
      const hit = fn();
      if (hit) return hit;
      await sleep(100);
    }
    return null;
  };
  const hover = (el) => el.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
`;

app.whenReady().then(async () => {
  protocol.handle("app", (request) => {
    let rel = decodeURIComponent(new URL(request.url).pathname);
    if (!rel || rel === "/") rel = "/index.html";
    return net.fetch(pathToFileURL(path.join(DIST, rel)).toString());
  });

  fs.mkdirSync(OUT, { recursive: true });

  const win = new BrowserWindow({
    show: false,
    width: 1600,
    height: 950,
    webPreferences: { offscreen: true, contextIsolation: true, sandbox: false },
  });

  const shoot = async (name) => {
    const img = await win.webContents.capturePage();
    const file = path.join(OUT, `${name}.png`);
    fs.writeFileSync(file, img.toPNG());
    console.log("· " + file);
  };

  const load = async () => {
    await win.loadURL("app://bundle/index.html");
    await win.webContents.executeJavaScript(
      `new Promise((resolve) => { const t = () => (document.querySelectorAll("button").length >= 4 ? resolve(true) : setTimeout(t, 100)); t(); })`,
    );
  };

  // 创建页：停在「出身」上，右侧是效果预览
  await load();
  await win.webContents.executeJavaScript(`(async () => { ${HELPERS}
    btn("选择你的起点").click();
    await waitFor(() => tile("平民"));
    btn("下一步").click();
    await waitFor(() => tile("魔族后裔"));
    hover(tile("魔族后裔"));
    await sleep(400);
    return true;
  })()`);
  await shoot("creation-hover");

  // 创建页：能力与状态那一步（字段最多的一步，看对齐）
  await win.webContents.executeJavaScript(`(async () => { ${HELPERS}
    for (let i = 0; i < 6; i += 1) {
      const title = (document.querySelector(".stagehead__title") || {}).innerText || "";
      if (title.includes("能力与状态")) break;
      const input = [...document.querySelectorAll("input")].find((el) => (el.placeholder || "").includes("鲁迪乌斯"));
      if (input) {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, "排版测试者");
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
      const next = btn("下一步");
      if (!next) break;
      next.click();
      await sleep(200);
    }
    await sleep(400);
    return true;
  })()`);
  await shoot("creation-abilities");

  // 入世主页：原作模式一条路进去
  await load();
  await win.webContents.executeJavaScript(`(async () => { ${HELPERS}
    btn("原作模式").click();
    await waitFor(() => btn("以鲁迪乌斯开始人生"));
    btn("以鲁迪乌斯开始人生").click();
    await waitFor(() => document.querySelector(".game__self"));
    await sleep(600);
    return true;
  })()`);
  await shoot("game-home");

  // 回应掉开局那个抉择之后的样子（这才是日常的一屏）
  await win.webContents.executeJavaScript(`(async () => { ${HELPERS}
    const opt = document.querySelector(".eventcard__opt");
    if (opt) opt.click();
    await sleep(900);
    return true;
  })()`);
  await shoot("game-after-choice");

  // 一个详情页
  await win.webContents.executeJavaScript(`(async () => { ${HELPERS}
    btn("属性与能力").click();
    await waitFor(() => document.querySelector(".detailpage"));
    await sleep(400);
    return true;
  })()`);
  await shoot("detail-stats");

  console.log("截图完成：" + OUT);
  app.exit(0);
});

setTimeout(() => {
  console.error("TIMEOUT");
  app.exit(2);
}, 120000);
