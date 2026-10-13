import fs from "node:fs";
import assert from "node:assert/strict";
import { connect } from "./port.mjs";
const api = await connect();
const original = JSON.parse(fs.readFileSync("rollback/entity-page.json", "utf8")).page;
const current = (await api("/pages/product_opportunityEntity")).page;
const restore = process.argv.includes("--rollback");
const retire = process.argv.includes("--retire-replaced");
const dryRun = process.argv.includes("--dry-run");
if (dryRun && !restore) throw new Error("--dry-run is supported only with --rollback.");
const locate = page => page.widgets.find(widget => widget.type === "grouper").groups;
const originalOverview = locate(original).find(group => group.title === "Overview");
const widgets = structuredClone(current.widgets);
const groups = widgets.find(widget => widget.type === "grouper").groups;
const overviewIndex = groups.findIndex(group => group.title === "Overview");
const preservedGroups = groups.filter(group => group.title !== "Overview");
if (restore) {
  groups[overviewIndex] = originalOverview;
} else {
  const lastApplied = fs.existsSync("rollback/overview-after.json") ? JSON.parse(fs.readFileSync("rollback/overview-after.json")).widgets : original.widgets;
  assert.deepEqual(current.widgets, lastApplied, "The page has changed since inspection or the last integration. Refusing to overwrite concurrent changes.");
  const dashboard = groups[overviewIndex].widgets.find(widget => widget.type === "dashboard-widget");
  const removed = new Set(["ov-art-requirements", "ov-art-prd-proposal", "ov-art-prd-approved", "ov-art-eng-proposal", "ov-art-eng-approved", "ov-next-step"]);
  if (retire) {
    for (const id of removed) assert.ok(dashboard.widgets.some(widget => widget.id === id), `Expected replaceable widget ${id}`);
    dashboard.widgets = dashboard.widgets.filter(widget => !removed.has(widget.id));
    dashboard.layout = dashboard.layout.flatMap(row => {
      const columns = row.columns.filter(column => !removed.has(column.id));
      if (!columns.length) return [];
      assert.equal(columns.length, row.columns.length, "Unexpected mixed row; layout needs explicit review.");
      return [{ ...row, columns }];
    });
  }
  if (!dashboard.widgets.some(widget => widget.id === "ov-opportunity-lifecycle")) {
    dashboard.widgets.unshift({
      id: "ov-opportunity-lifecycle", type: "custom-widget", pluginId: "product-opportunity-lifecycle",
      title: "Opportunity lifecycle", description: "Live stage, human decision and evidence. Earlier stages are not an approval audit trail.",
      icon: "Bulb", paramValues: {},
    });
    dashboard.layout.unshift({ height: 400, columns: [{ id: "ov-opportunity-lifecycle", size: 12 }] });
  }
  assert.deepEqual(groups.filter(group => group.title !== "Overview"), preservedGroups);
  const layoutIds = dashboard.layout.flatMap(row => row.columns.map(column => column.id));
  assert.deepEqual([...layoutIds].sort(), dashboard.widgets.map(widget => widget.id).sort(), "Widget and layout identifiers must match.");
  fs.writeFileSync("rollback/replaced-widgets.json", JSON.stringify(originalOverview.widgets[0].widgets.filter(widget => removed.has(widget.id)), null, 2));
}
if (dryRun) {
  assert.deepEqual(groups.filter(group => group.title !== "Overview"), preservedGroups);
  assert.deepEqual(groups[overviewIndex], originalOverview);
  console.log("Rollback dry run verified: original Overview reconstructed; all other groups preserved. No Port changes made.");
  process.exit(0);
}
await api("/pages/product_opportunityEntity", "PATCH", { widgets });
const updated = (await api("/pages/product_opportunityEntity")).page;
assert.deepEqual(locate(updated).filter(group => group.title !== "Overview"), preservedGroups, "Non-Overview groups were changed by the server.");
assert.deepEqual(locate(updated).find(group => group.title === "Overview"), groups[overviewIndex], "Overview did not persist exactly.");
fs.writeFileSync("rollback/overview-after.json", JSON.stringify({ widgets: updated.widgets }, null, 2));
fs.writeFileSync("rollback/integration-result.json", JSON.stringify({
  checkedAt: new Date().toISOString(), restored: restore, reviewTabsUnchanged: true,
  pluginId: restore ? null : "product-opportunity-lifecycle",
  replacedWidgetIds: restore || !retire ? [] : ["ov-art-requirements", "ov-art-prd-proposal", "ov-art-prd-approved", "ov-art-eng-proposal", "ov-art-eng-approved", "ov-next-step"],
  redundantWidgetsPreservedUntilNativeVerification: !restore && !retire,
}, null, 2));
console.log(restore ? "Original Overview restored. All other tabs unchanged." : `Lifecycle persisted at the top of Overview. ${retire ? "Six directly replaced widgets removed." : "Existing widgets preserved until signed-in Port rendering is verified."} All other tabs unchanged.`);
