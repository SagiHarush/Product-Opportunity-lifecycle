import { build, transform } from "esbuild";
import fs from "node:fs";
const css = (await transform(fs.readFileSync("src/App.css", "utf8"), { loader: "css", minify: true })).code;
const result = await build({
  entryPoints: ["src/index.tsx"], bundle: true, minify: true, write: false,
  format: "iife", target: ["es2020"], jsx: "automatic", charset: "ascii",
  legalComments: "none", define: { "process.env.NODE_ENV": '"production"' },
  loader: { ".woff2": "binary" },
  alias: { react: "preact/compat", "react-dom": "preact/compat", "react-dom/client": "preact/compat/client", "react/jsx-runtime": "preact/jsx-runtime" },
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
fs.mkdirSync("dist", { recursive: true });
const licenses = ["inter", "dm-sans"].map(name => `${name} font:\n${fs.readFileSync(`node_modules/@fontsource-variable/${name}/LICENSE`, "utf8")}`).join("\n\n").replaceAll("--", "- -");
fs.writeFileSync("dist/index.html", `<!doctype html><!-- Bundled font licenses:\n${licenses}\n--><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Opportunity lifecycle</title><style>${css}</style></head><body><div id="plugin-root"></div><script>${js}</script></body></html>`);
console.log(`Built dist/index.html (${(fs.statSync("dist/index.html").size / 1024).toFixed(1)} KiB)`);
