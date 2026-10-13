const { JSDOM, VirtualConsole } = require("jsdom");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const html = fs.readFileSync("dist/index.html", "utf8");

async function verify(failedFamilies, expectedStatus) {
  const registered = [];
  const errors = [];
  const console = new VirtualConsole();
  console.on("error", (...args) => errors.push(args.join(" ")));
  const dom = new JSDOM(html, {
    url: "http://127.0.0.1:9000/plugin", runScripts: "dangerously",
    pretendToBeVisual: true, virtualConsole: console,
    beforeParse(window) {
      window.FontFace = class {
        constructor(family, bytes) {
          assert.ok(bytes instanceof window.Uint8Array);
          this.family = family;
        }
        async load() {
          if (failedFamilies.includes(this.family)) throw new Error("Simulated font decoding failure");
          return this;
        }
      };
      Object.defineProperty(window.document, "fonts", { value: { add(face) { registered.push(face.family); } } });
    },
  });
  try {
    for (let i = 0; i < 80 && !dom.window.document.documentElement.dataset.fontStatus; i++) {
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    assert.equal(dom.window.document.documentElement.dataset.fontStatus, expectedStatus);
    const css = dom.window.document.querySelector("style").textContent;
    assert.match(css, /font-family:\s*"?DM Sans"?,\s*"?Inter"?/, "DM Sans matches native Port.");
    assert.match(css, /font-weight:\s*400/);
    assert.match(css, /font-variation-settings:\s*["']opsz["']\s*9/);
    assert.match(css, /font-synthesis:\s*none/);
    assert.deepEqual(registered.sort(), ["DM Sans", "Inter"].filter(family => !failedFamilies.includes(family)));
    assert.equal(errors.length, failedFamilies.length, "Font failures are explicitly logged.");
  } finally { dom.window.close(); }
}
(async () => {
  await verify([], "dm-sans");
  await verify(["Inter"], "dm-sans");
  await verify(["DM Sans"], "inter");
  await verify(["Inter", "DM Sans"], "unavailable");
  console.log("PASS: native DM Sans registration, Inter fallback, explicit all-font failure.");
})().catch(error => { console.error(error); process.exitCode = 1; });
