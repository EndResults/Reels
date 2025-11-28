import fs from "fs";
import path from "path";

const projectRoot = process.cwd(); 
const srcRoot = path.join(projectRoot, "src", "shared", "locales");
const destRoot = path.join(projectRoot, "src", "client", "src", "locales");

console.log("[copy-locales] Project root:", projectRoot);
console.log("[copy-locales] Source root:", srcRoot);
console.log("[copy-locales] Dest root:", destRoot);

function copyLocales() {
  const languages = ["nl", "en"];

  for (const lang of languages) {
    const srcFile = path.join(srcRoot, lang, "common.json");
    const destDir = path.join(destRoot, lang);
    const destFile = path.join(destDir, "common.json");

    if (!fs.existsSync(srcFile)) {
      console.log(`[copy-locales] Source missing: ${srcFile}`);
      continue;
    }

    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(srcFile, destFile);

    console.log(`[copy-locales] Copied: ${srcFile} -> ${destFile}`);
  }
}

copyLocales();
