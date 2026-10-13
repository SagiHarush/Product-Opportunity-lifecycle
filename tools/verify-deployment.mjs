import fs from "node:fs";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
const cwd = process.env.PORT_CLI_CONFIG_DIR;
if (!cwd) throw new Error("Set PORT_CLI_CONFIG_DIR to the folder containing the existing .port config.");
const output = execFileSync(process.env.ComSpec, ["/d", "/s", "/c", "port-plugins.cmd get-url product-opportunity-lifecycle"], { cwd, encoding: "utf8" });
const url = output.match(/https:\/\/\S+/)?.[0];
if (!url) throw new Error("The CLI did not return a plugin URL.");
const response = await fetch(url);
if (!response.ok) throw new Error(`Uploaded plugin download failed: ${response.status}`);
const deployed = Buffer.from(await response.arrayBuffer());
const local = fs.readFileSync("dist/index.html");
const hash = value => crypto.createHash("sha256").update(value).digest("hex");
if (hash(deployed) !== hash(local)) throw new Error("Deployed plugin differs from the tested build.");
fs.writeFileSync("rollback/deployment-result.json", JSON.stringify({
  checkedAt: new Date().toISOString(), pluginId: "product-opportunity-lifecycle",
  deployedSha256: hash(deployed), localSha256: hash(local), bytes: local.length, identical: true,
}, null, 2));
console.log("Uploaded plugin is byte-identical to the tested build:", hash(local));
