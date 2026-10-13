import fs from "node:fs";
import { connect } from "./port.mjs";
const api = await connect();
const workflows = JSON.parse(fs.readFileSync("rollback/workflows.json")).workflows;
await Promise.all(workflows.map(async workflow => {
  const result = await api(`/workflows/${encodeURIComponent(workflow.identifier)}`);
  fs.writeFileSync(`rollback/workflow-${workflow.identifier}.json`, JSON.stringify(result, null, 2));
  console.log(workflow.identifier, "saved");
}));
