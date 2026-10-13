import fs from "node:fs";
import assert from "node:assert/strict";
import { connect } from "./port.mjs";
const api = await connect();
const original = JSON.parse(fs.readFileSync("rollback/entity-page.json")).page;
const current = (await api("/pages/product_opportunityEntity")).page;
const groups = page => page.widgets.find(widget => widget.type === "grouper").groups;
assert.deepEqual(groups(current).filter(group => group.title !== "Overview"), groups(original).filter(group => group.title !== "Overview"));
const dashboard = groups(current).find(group => group.title === "Overview").widgets.find(widget => widget.type === "dashboard-widget");
assert.equal(dashboard.layout[0].columns[0].id, "ov-opportunity-lifecycle");
assert.equal(dashboard.widgets.find(widget => widget.id === "ov-opportunity-lifecycle").pluginId, "product-opportunity-lifecycle");
const baselineEntities = JSON.parse(fs.readFileSync("rollback/opportunities.json")).entities;
const currentEntities = (await api("/blueprints/product_opportunity/entities")).entities;
for (const entity of baselineEntities) {
  const now = currentEntities.find(row => row.identifier === entity.identifier);
  assert.ok(now, "An opportunity disappeared.");
  assert.deepEqual(now.properties, entity.properties, "Opportunity properties changed during development.");
  assert.deepEqual(now.relations, entity.relations, "Opportunity relations changed during development.");
}
for (const workflow of JSON.parse(fs.readFileSync("rollback/workflows.json")).workflows) {
  const baseline = JSON.parse(fs.readFileSync(`rollback/workflow-${workflow.identifier}.json`)).workflow;
  const currentWorkflow = (await api(`/workflows/${workflow.identifier}`)).workflow;
  assert.deepEqual(currentWorkflow, baseline, `${workflow.identifier} changed during development.`);
}
const result = {
  checkedAt: new Date().toISOString(), deployedPlacementVerifiedViaApi: true,
  reviewTabsAndAllOtherTabsUnchanged: true, opportunityDataUnchanged: true, workflowsUnchanged: true,
  opportunityStatuses: currentEntities.map(entity => ({ identifier: entity.identifier, status: entity.properties.status })),
  nativeBrowserVerification: "Unavailable: Port redirects to authentication. Preview uses labelled read-only snapshots, not a signed-in Port session.",
};
fs.writeFileSync("rollback/portal-verification.json", JSON.stringify(result, null, 2));
console.log("Verified via authenticated Port API: top placement, unchanged review tabs, unchanged opportunity data and all 14 workflows.");
