import type { GameState } from "../types";
import { parseSaveText } from "./world";
import { SLOT_IDS, readSlot } from "./saves";

export const API_VERSION = "1.0.0";

/** URL 导入使用的参数名 */
export const IMPORT_PARAMS = ["save", "load", "import"] as const;

interface Handlers {
  getState: () => GameState | null;
  applyState: (state: GameState) => void;
}

let handlers: Handlers | null = null;

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): string | null {
  try {
    const b64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "===".slice((b64.length + 3) % 4);
    const bin = atob(padded);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

/** 把 URL 参数或文本还原成存档 JSON 文本。支持 URL 编码的 JSON 与 base64url。 */
export function decodeImportPayload(raw: string): string {
  let value = raw.trim();
  try {
    value = decodeURIComponent(value);
  } catch {
    /* 保持原样 */
  }
  if (value.startsWith("{")) return value;
  const decoded = fromBase64Url(value);
  if (decoded && decoded.trim().startsWith("{")) return decoded;
  return value;
}

/** 从 location.search 中读取导入参数，返回存档文本或 null */
export function readUrlImport(search: string): string | null {
  const params = new URLSearchParams(search);
  for (const key of IMPORT_PARAMS) {
    const raw = params.get(key);
    if (raw) return decodeImportPayload(raw);
  }
  return null;
}

/** 依据给定地址生成一份可分享的导入链接 */
export function buildImportUrl(baseUrl: string, state: GameState): string {
  const payload = JSON.stringify({ version: 1, state });
  const url = new URL(baseUrl);
  for (const key of IMPORT_PARAMS) url.searchParams.delete(key);
  url.searchParams.set("save", toBase64Url(payload));
  return url.toString();
}

function importSave(input: string | object): boolean {
  if (!handlers) return false;
  const text = typeof input === "string" ? decodeImportPayload(input) : JSON.stringify(input);
  const state = parseSaveText(text);
  if (!state) return false;
  handlers.applyState(state);
  return true;
}

function exportSave(): string | null {
  const state = handlers?.getState();
  if (!state) return null;
  return JSON.stringify({ version: 1, savedAt: new Date().toISOString(), state });
}

function loadSaveSlot(id: string): boolean {
  if (!handlers) return false;
  const slot = readSlot(id);
  if (!slot) return false;
  handlers.applyState(slot.state);
  return true;
}

export interface MushokuGlobalApi {
  version: string;
  slots: readonly string[];
  /** 导入一份存档：接受存档 JSON 文本、对象、base64 串或含参数的完整 URL */
  import: (input: string | object) => boolean;
  /** 导出当前人生为存档 JSON 文本 */
  export: () => string | null;
  /** 读取当前内存中的游戏状态 */
  state: () => GameState | null;
  /** 按槽位 id 读取存档（"auto" / "1" / "2" / "3"） */
  loadSlot: (id: string) => boolean;
  /** 生成一份包含当前人生的分享链接 */
  shareUrl: () => string | null;
  help: () => string;
}

const HELP = [
  "window.MushokuLifeSim 可用方法：",
  "  .import(textOrObject)  导入存档（JSON 文本 / 对象 / base64 / 完整 URL）",
  "  .export()              导出当前人生为 JSON 文本",
  "  .state()               读取当前游戏状态对象",
  "  .loadSlot('1'|'2'|'3'|'auto')  读取指定槽位",
  "  .shareUrl()            生成可分享的导入链接",
  "URL 导入：在地址后追加 ?save=<base64 或 JSON>，例如",
  "  index.html?save=%7B%22version%22%3A1%2C...%7D",
].join("\n");

function buildApi(): MushokuGlobalApi {
  return {
    version: API_VERSION,
    slots: SLOT_IDS,
    import: importSave,
    export: exportSave,
    state: () => handlers?.getState() ?? null,
    loadSlot: loadSaveSlot,
    shareUrl: () => {
      const state = handlers?.getState();
      if (!state) return null;
      return buildImportUrl(window.location.origin + window.location.pathname, state);
    },
    help: () => HELP,
  };
}

/** 由 App 注册导入/导出所需的读写回调，并把接口挂到 window 上 */
export function installApi(h: Handlers): MushokuGlobalApi {
  handlers = h;
  const api = buildApi();
  (window as unknown as Record<string, unknown>).MushokuLifeSim = api;
  return api;
}