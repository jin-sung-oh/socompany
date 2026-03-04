import fs from "fs";
import path from "path";

const src = path.resolve("src/preload.cjs");
const dest = path.resolve("dist/preload.cjs");

const copyOnce = () => {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
};

if (process.argv.includes("--watch")) {
  copyOnce();
  fs.watch(path.dirname(src), (event, filename) => {
    if (filename === path.basename(src)) {
      copyOnce();
    }
  });
} else {
  copyOnce();
}
