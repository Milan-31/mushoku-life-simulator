/**
 * 主线数据验收：用 vite 把 scripts/mainline-check-entry.ts 打包成单文件再跑。
 *
 * 直接让 node 跑 .ts 是不行的——这个项目里的 import 都不写扩展名，Node 的 ESM
 * 解析不了。交给 vite 打成一个 bundle，就等于按游戏里同一套模块解析规则去验。
 *
 *   node scripts/check-mainlines.mjs
 */
import { build } from "vite";
import { pathToFileURL } from "node:url";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const outDir = mkdtempSync(path.join(tmpdir(), "mushoku-mainline-check-"));
const entry = path.resolve("scripts/mainline-check-entry.ts");

try {
  await build({
    configFile: false,
    logLevel: "warn",
    build: {
      ssr: entry,
      outDir,
      emptyOutDir: true,
      minify: false,
      rollupOptions: { output: { entryFileNames: "check.mjs" } },
    },
  });
  await import(pathToFileURL(path.join(outDir, "check.mjs")).href);
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
