const { app, BrowserWindow, ipcMain, shell, protocol, net } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const APP_ORIGIN = "app://bundle";
// dist 与 electron/ 同处应用根目录，开发（项目根）与打包（resources/app）布局一致
const DIST_DIR = path.join(__dirname, "..", "dist");
// 窗口与任务栏图标：由 scripts/make-icons.mjs 从 public/icon.svg 生成，缺失时交给系统默认值
const WINDOW_ICON = path.join(__dirname, "..", "assets", "icons", "icon-256.png");

// 注册为特权 scheme，使 ES 模块、localStorage 与 fetch 都能正常工作（file:// 不行）
protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

function resolveInsideDist(urlPath) {
  let rel = decodeURIComponent(urlPath);
  if (!rel || rel === "/") rel = "/index.html";
  const filePath = path.normalize(path.join(DIST_DIR, rel));
  if (!filePath.startsWith(DIST_DIR)) return null; // 阻止路径穿越
  return filePath;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: "#080b16",
    title: "无职转生：人生模拟器",
    icon: fs.existsSync(WINDOW_ICON) ? WINDOW_ICON : undefined,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once("ready-to-show", () => win.show());
  win.loadURL(`${APP_ORIGIN}/index.html`);

  // 外部链接交给系统浏览器打开
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });
}

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    protocol.handle("app", (request) => {
      const filePath = resolveInsideDist(new URL(request.url).pathname);
      if (!filePath) return new Response("Not found", { status: 404 });
      return net.fetch(pathToFileURL(filePath).toString());
    });

    // AI 请求经主进程转发：渲染进程受跨域限制，主进程不受
    ipcMain.handle("ai:request", async (_event, payload) => {
      const { url, method, headers, body, timeoutMs } = payload ?? {};
      if (typeof url !== "string" || !/^https?:\/\//i.test(url)) {
        return { ok: false, status: 0, text: "只允许 http/https 接口地址" };
      }
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Math.min(Number(timeoutMs) || 60000, 300000));
      try {
        const res = await net.fetch(url, {
          method: typeof method === "string" && method ? method : "POST",
          headers,
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: controller.signal,
        });
        return { ok: res.ok, status: res.status, text: await res.text() };
      } catch (err) {
        const message = err && err.name === "AbortError" ? "请求超时" : String((err && err.message) || err);
        return { ok: false, status: 0, text: message };
      } finally {
        clearTimeout(timer);
      }
    });

    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}