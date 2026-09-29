const { contextBridge, ipcRenderer } = require("electron");

// 只暴露一个受控通道：渲染进程把请求交给主进程发出，避开浏览器的跨域限制
contextBridge.exposeInMainWorld("mushokuAi", {
  request: (payload) => ipcRenderer.invoke("ai:request", payload),
});