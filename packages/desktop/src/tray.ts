import { Tray, Menu, nativeImage } from "electron";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const createTray = () => {
  const iconPath = path.join(__dirname, "..", "..", "..", "assets", "tray.png");
  const icon = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath)
    : nativeImage.createEmpty();
  const tray = new Tray(icon);

  const menu = Menu.buildFromTemplate([
    { label: "KAFI 열기", click: () => {} },
    { type: "separator" },
    { label: "종료", role: "quit" }
  ]);

  tray.setToolTip("KAFI");
  tray.setContextMenu(menu);

  return tray;
};
