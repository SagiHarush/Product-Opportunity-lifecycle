import fs from "node:fs";
import { connect } from "./port.mjs";
const api = await connect();
const { entities } = await api("/blueprints/product_opportunity/entities");
const keys = new Map(entities.map(entity => [`${entity.blueprint}:${entity.identifier}`, entity]));
await Promise.all(entities.flatMap(entity => [
  ...new Set(entity.relations.signals ?? []),
].map(id => ["signal", id]).concat([...new Set(entity.relations.ado_work_items ?? [])].map(id => ["azureDevopsWorkItem", id]))).map(async ([blueprint, id]) => {
  const { entity } = await api(`/blueprints/${blueprint}/entities/${encodeURIComponent(id)}`);
  keys.set(`${blueprint}:${id}`, entity);
}));
fs.mkdirSync("preview-live", { recursive: true });
fs.writeFileSync("preview-live/snapshot.json", JSON.stringify({ capturedAt: new Date().toISOString(), entities: [...keys.values()] }, null, 2));
console.log(`Captured read-only data for ${entities.length} opportunities and ${keys.size - entities.length} related records. No credentials stored.`);
