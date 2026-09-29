/**
 * 把 public/icon.svg 栅格化成打包要用的 PNG 尺寸。
 *
 * 打包脚本会用这些 PNG 替换 Electron 主程序 exe 里的默认图标，
 * 运行时窗口图标也取其中最大的一张。source 只有 public/icon.svg 一份。
 *
 * 用法：node scripts/make-icons.mjs   （由 npm run dist:win 自动调用）
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SVG_FILE = path.join(ROOT, "public", "icon.svg");
const OUT_DIR = path.join(ROOT, "assets", "icons");

/** Windows 图标资源的常用尺寸。小尺寸留给资源管理器列表，大尺寸留给任务栏与磁贴 */
export const ICON_SIZES = [16, 24, 32, 48, 64, 128, 256];

export function renderIcons() {
  const svg = fs.readFileSync(SVG_FILE, "utf8");
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const rendered = [];
  for (const size of ICON_SIZES) {
    const png = new Resvg(svg, {
      fitTo: { mode: "width", value: size },
      // 图标自带圆角底板，透明区域要保留
      background: undefined,
      logLevel: "error",
    })
      .render()
      .asPng();
    const file = path.join(OUT_DIR, `icon-${size}.png`);
    fs.writeFileSync(file, png);
    rendered.push({ size, file, png });
  }
  return rendered;
}

/** 最大的那张，运行时窗口图标用它 */
export function largestIconFile() {
  return path.join(OUT_DIR, `icon-${ICON_SIZES[ICON_SIZES.length - 1]}.png`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const rendered = renderIcons();
  console.log(`· 已从 public/icon.svg 生成 ${rendered.length} 张图标：`);
  for (const r of rendered) {
    console.log(`  assets/icons/icon-${r.size}.png  ${(r.png.length / 1024).toFixed(1)} KB`);
  }
}
