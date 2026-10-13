import fs from "node:fs";
import { connect } from "./port.mjs";
const api = await connect();
fs.mkdirSync("rollback", { recursive: true });
if (fs.existsSync("rollback/entity-page.json")) throw new Error("The original page backup already exists. Refusing to overwrite rollback configuration.");
for (const [name, path] of [
  ["opportunity-blueprint", "/blueprints/product_opportunity"],
  ["signal-blueprint", "/blueprints/signal"],
  ["opportunities", "/blueprints/product_opportunity/entities"],
  ["entity-page", "/pages/product_opportunityEntity"],
  ["actions", "/actions"],
]) {
  try {
    const result = await api(path);
    fs.writeFileSync(`rollback/${name}.json`, JSON.stringify(result, null, 2));
    console.log(`${name}: saved; keys ${Object.keys(result).join(", ")}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
