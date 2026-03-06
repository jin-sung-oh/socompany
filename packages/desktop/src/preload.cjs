const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("kafi", {
  getSettings: () => ipcRenderer.invoke("kafi:get-settings"),
  setSettings: (payload) => ipcRenderer.invoke("kafi:set-settings", payload),
  getAgents: () => ipcRenderer.invoke("kafi:get-agents"),
  subscribeAgents: (callback) => {
    const listener = (_event, agents) => callback(agents);
    ipcRenderer.on("kafi:agents-updated", listener);
    ipcRenderer.send("kafi:subscribe-agents");
    return () => {
      ipcRenderer.removeListener("kafi:agents-updated", listener);
      ipcRenderer.send("kafi:unsubscribe-agents");
    };
  },
  subscribeLogs: (callback) => {
    const listener = (_event, line) => callback(line);
    ipcRenderer.on("kafi:log-line", listener);
    ipcRenderer.send("kafi:subscribe-logs");
    return () => {
      ipcRenderer.removeListener("kafi:log-line", listener);
      ipcRenderer.send("kafi:unsubscribe-logs");
    };
  },
  ollamaChat: (payload) => ipcRenderer.invoke("kafi:ollama-chat", payload),
  getOllamaModels: () => ipcRenderer.invoke("kafi:get-ollama-models"),
  ollamaCheck: () => ipcRenderer.invoke("kafi:ollama-check")
});
