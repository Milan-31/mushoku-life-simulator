// 临时冒烟测试：无显示器环境下用离屏渲染验证 app:// 能正确加载应用
const { app, BrowserWindow, protocol, net } = require("electron");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

app.disableHardwareAcceleration();
app.commandLine.appendSwitch("no-sandbox");

const DIST = path.join(__dirname, "..", "dist");

protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

app.whenReady().then(async () => {
  protocol.handle("app", (request) => {
    let rel = decodeURIComponent(new URL(request.url).pathname);
    if (!rel || rel === "/") rel = "/index.html";
    return net.fetch(pathToFileURL(path.join(DIST, rel)).toString());
  });

  const win = new BrowserWindow({
    show: false,
    width: 1280,
    height: 860,
    webPreferences: { offscreen: true, contextIsolation: true, sandbox: false },
  });

  win.webContents.on("console-message", (...args) => {
    const d = args[1];
    if (d && typeof d === "object") console.log(`[renderer/${d.level}]`, d.message);
    else console.log(`[renderer/${args[1]}]`, args[2]);
  });
  win.webContents.on("did-fail-load", (_e, code, desc) => {
    console.error("DID_FAIL_LOAD", code, desc);
    app.exit(1);
  });
  win.webContents.on("did-finish-load", async () => {
    const info = await win.webContents.executeJavaScript(
      `JSON.stringify({
        title: document.title,
        rootChildren: document.getElementById('root').childElementCount,
        text: document.body.innerText.slice(0, 120),
        api: typeof window.MushokuLifeSim,
      })`,
    );
    console.log("LOADED", info);
    app.exit(0);
  });

  await win.loadURL("app://bundle/index.html");
});

setTimeout(() => {
  console.error("TIMEOUT");
  app.exit(2);
}, 40000);