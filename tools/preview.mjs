import http from "node:http";
import fs from "node:fs";
const live = process.argv.includes("--live");
const source = live ? "preview-live/snapshot.json" : "test/fixtures.json";
const snapshot = JSON.parse(fs.readFileSync(source, "utf8"));
const entities = snapshot.entities;
const opportunities = entities.filter(entity => entity.blueprint === "product_opportunity");
const html = fs.readFileSync("tools/preview.html", "utf8")
  .replace("__MODE__", live ? `READ-ONLY LIVE SNAPSHOT captured ${snapshot.capturedAt} - not an authenticated Port session` : "LOCAL TEST FIXTURES - not live Port data")
  .replace("__OPTIONS__", opportunities.map(entity => `<option value="${encodeURIComponent(entity.identifier)}">${entity.title.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;")}</option>`).join(""));
const port = Number(process.env.PREVIEW_PORT || 9000);
const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://127.0.0.1:${port}`);
  response.setHeader("Cache-Control", "no-store");
  if (url.pathname === "/preview" || url.pathname === "/") {
    response.setHeader("Content-Type", "text/html"); response.end(html);
  } else if (url.pathname === "/plugin") {
    response.setHeader("Content-Type", "text/html"); response.end(fs.readFileSync("dist/index.html"));
  } else if (url.pathname === "/record") {
    const entity = entities.find(entity => entity.blueprint === url.searchParams.get("blueprint") && entity.identifier === url.searchParams.get("identifier"));
    response.setHeader("Content-Type", "application/json");
    response.statusCode = entity ? 200 : 404; response.end(JSON.stringify(entity ? { entity } : { error: "Preview record not found" }));
  } else { response.statusCode = 404; response.end("Not found"); }
});
server.listen(port, "127.0.0.1", () => console.log(`Preview: http://127.0.0.1:${port}/preview (${live ? "read-only captured data" : "test fixtures"})`));
