import { BrowserWindow } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

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

export const createWidgetWindow = () => {
  const window = new BrowserWindow({
    width: 250,
    height: 250,
    transparent: true,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    x: 100,
    y: 100,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  void window.loadURL(getRendererUrl("#widget"));

  // 개발 중에는 DevTools 열기
  if (process.env.VITE_DEV_SERVER_URL) {
    window.webContents.openDevTools({ mode: 'detach' });
  }

  return window;
};
