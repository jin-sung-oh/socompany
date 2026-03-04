import { app, BrowserWindow } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { createWidgetWindow } from "./widget.js";
import { createTray } from "./tray.js";
import { registerIpcHandlers } from "./ipc.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const getRendererUrl = (hash: string) => {
  if (process.env.VITE_DEV_SERVER_URL) {
    return `${process.env.VITE_DEV_SERVER_URL}${hash}`;
  }
  const rendererPath = path.join(
    __dirname,
    "..",
    "..",
    "renderer",
    "dist",
    "index.html"
  );
  return `file://${rendererPath}${hash}`;
};

const createDashboardWindow = () => {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  void window.loadURL(getRendererUrl("#dashboard"));
  return window;
};

let widgetWindow: BrowserWindow | null = null;
let dashboardWindow: BrowserWindow | null = null;

const createWindows = () => {
  widgetWindow = createWidgetWindow();
  dashboardWindow = createDashboardWindow();
};

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindows();
  createTray();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindows();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
