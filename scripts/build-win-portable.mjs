/**
 * 把已构建的 Web 应用封装成 Windows x64 便携版（免安装，双击 exe 即可运行）。
 *
 * 做法：下载官方 Electron 的 win32-x64 运行时，把 dist/ 与 electron/ 放进
 * resources/app/，重命名主程序，替换掉 Electron 默认图标，最后打成 zip。
 *
 * 用法：npm run dist:win   （会先执行 vite build）
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { NtExecutable, NtExecutableResource, Resource, Data } from "resedit";
import { renderIcons } from "./make-icons.mjs";

const require = createRequire(import.meta.url);
const AdmZip = require("adm-zip");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP_NAME = "无职转生人生模拟器";
const TARGET = "win32-x64";

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));

function electronVersion() {
  if (process.env.ELECTRON_VERSION) return process.env.ELECTRON_VERSION;
  try {
    return require("electron/package.json").version;
  } catch {
    throw new Error("未找到 electron 依赖，请先运行 npm install。");
  }
}

function download(url, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
    console.log(`· 复用已下载的运行时缓存：${path.relative(ROOT, dest)}`);
    return;
  }
  console.log(`· 下载 Electron 运行时：${url}`);
  // curl 会遵循 http(s)_proxy 环境变量，适合受限网络
  execFileSync("curl", ["-L", "--fail", "--retry", "3", "--progress-bar", "-o", dest, url], {
    stdio: "inherit",
  });
}

const version = electronVersion();
const zipUrl = `https://github.com/electron/electron/releases/download/v${version}/electron-v${version}-${TARGET}.zip`;
const cacheFile = path.join(ROOT, ".cache", `electron-v${version}-${TARGET}.zip`);

download(zipUrl, cacheFile);

/**
 * 清空输出目录。上一次打包出的 exe 若刚被运行过，系统可能仍占着它，
 * 这时整个目录删不掉，退而求其次：逐个删子项，清不掉的跳过。
 */
function resetDir(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    if (fs.existsSync(dir)) {
      for (const entry of fs.readdirSync(dir)) {
        try {
          fs.rmSync(path.join(dir, entry), { recursive: true, force: true });
        } catch {
          console.log(`· 跳过被占用的 ${entry}`);
        }
      }
    }
  }
  fs.mkdirSync(dir, { recursive: true });
}

const releaseDir = path.join(ROOT, "release");
const appDir = path.join(releaseDir, `${APP_NAME}-${TARGET}`);
resetDir(appDir);

console.log("· 解压运行时");
new AdmZip(cacheFile).extractAllTo(appDir, true);

const distDir = path.join(ROOT, "dist");
if (!fs.existsSync(path.join(distDir, "index.html"))) {
  throw new Error("缺少 dist/index.html，请先执行 npm run build。");
}

console.log("· 写入应用文件");
const resApp = path.join(appDir, "resources", "app");
fs.mkdirSync(resApp, { recursive: true });
fs.cpSync(path.join(ROOT, "electron"), path.join(resApp, "electron"), { recursive: true });
fs.cpSync(distDir, path.join(resApp, "dist"), { recursive: true });
// 图标：运行时窗口图标从这里读，exe 资源也用它
const icons = renderIcons();
const iconsDir = path.join(resApp, "assets", "icons");
fs.mkdirSync(iconsDir, { recursive: true });
for (const icon of icons) fs.writeFileSync(path.join(iconsDir, path.basename(icon.file)), icon.png);
fs.writeFileSync(
  path.join(resApp, "package.json"),
  JSON.stringify({ name: "mushoku-life-simulator", version: pkg.version, main: "electron/main.cjs" }, null, 2),
);

// 移除 Electron 自带的示例应用，避免混淆
fs.rmSync(path.join(appDir, "resources", "default_app.asar"), { force: true });

const exeFrom = path.join(appDir, "electron.exe");
const exeTo = path.join(appDir, `${APP_NAME}.exe`);
let exePath = fs.existsSync(exeFrom) ? exeFrom : exeTo;
if (fs.existsSync(exeFrom)) {
  try {
    fs.rmSync(exeTo, { force: true });
    fs.renameSync(exeFrom, exeTo);
    exePath = exeTo;
  } catch {
    // 同名 exe 仍被系统占用。它与本次解压的是同一个 Electron 二进制，保留即可
    console.log("· 目标 exe 仍被占用，沿用已存在的运行时文件");
    fs.rmSync(exeFrom, { force: true });
    exePath = exeTo;
  }
}

/**
 * 把主程序的默认 Electron 图标换成游戏图标。
 * 图标以 PNG 形式直接写进 exe 的图标资源组，Windows Vista 以后都支持。
 * 若 exe 正被占用（上一次运行没关），跳过并保留原图标，不影响其余打包步骤。
 */
function patchExeIcon(target) {
  if (!fs.existsSync(target)) return false;
  const exe = NtExecutable.from(fs.readFileSync(target), { ignoreCert: true });
  const res = NtExecutableResource.from(exe);
  Resource.IconGroupEntry.replaceIconsForResource(
    res.entries,
    1,
    1033,
    icons.map((icon) => new Data.RawIconItem(icon.png, icon.size, icon.size, 32)),
  );
  res.outputResource(exe);
  fs.writeFileSync(target, Buffer.from(exe.generate()));
  return true;
}

try {
  if (patchExeIcon(exePath)) {
    console.log(`· 已替换主程序图标（${icons.length} 个尺寸）`);
  }
} catch (err) {
  console.log(`· 图标替换失败，保留原图标继续打包：${err.message}`);
}

// 附一份说明放到压缩包内
fs.writeFileSync(
  path.join(appDir, "使用说明.txt"),
  [
    `${APP_NAME}`,
    "",
    "免安装便携版：解压后双击「" + APP_NAME + ".exe」即可开始游戏。",
    "存档保存在本机浏览器环境中（localStorage），换机器时请用游戏内的「导出存档 / 接口导入」迁移。",
    "",
    `Electron 运行时版本：${version}`,
    "首次启动若无网络，将回退到本机字体；联网时会加载 Noto 字体。",
  ].join("\r\n"),
  "utf8",
);

const outZip = path.join(releaseDir, `${pkg.name}-${pkg.version}-${TARGET}.zip`);
fs.rmSync(outZip, { force: true });
console.log("· 打包 zip");
const archive = new AdmZip();
archive.addLocalFolder(appDir, `${APP_NAME}`);
archive.writeZip(outZip);

const sizeMb = (fs.statSync(outZip).size / 1024 / 1024).toFixed(1);
console.log(`\n完成：`);
console.log(`  便携目录  ${path.relative(ROOT, appDir)}`);
console.log(`  分发压缩包 ${path.relative(ROOT, outZip)}  (${sizeMb} MB)`);