const { JSDOM } = require("jsdom");
const fs = require("node:fs");
const assert = require("node:assert/strict");
const html = fs.readFileSync("dist/index.html", "utf8");
const fixture = JSON.parse(fs.readFileSync("test/fixtures.json", "utf8"));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(condition, label) {
  for (let attempt = 0; attempt < 80; attempt++) {
    if (condition()) return;
    await wait(25);
  }
  assert.fail(`Timed out waiting for ${label}`);
}
const dom = new JSDOM('<!doctype html><iframe id="plugin"></iframe>', {
  runScripts: "dangerously", pretendToBeVisual: true,
  url: "https://app.port.io/org_DFaV0HHbGoNV1CV9/product_opportunityEntity",
});
const w = dom.window.document.querySelector("iframe").contentWindow;
const messages = [], runtimeErrors = [];
dom.window.addEventListener("message", event => messages.push(event.data));
w.addEventListener("error", event => runtimeErrors.push(event.message));
w.FontFace = class {
  constructor(family, bytes, descriptors) {
    assert.ok(bytes instanceof w.Uint8Array && bytes.length > 1000, "font bytes bundled locally");
    assert.equal(descriptors.weight, "100 900");
    this.family = family;
  }
  async load() { return this; }
};
Object.defineProperty(w.document, "fonts", { value: { add() {} } });
let mode = "success", pending, delay = false;
let calls = 0, poll, clearedTimers = 0;
w.setInterval = callback => { poll = callback; return 123; };
w.clearInterval = () => { clearedTimers++; };
const response = entity => ({ ok: true, status: 200, json: async () => ({ entity }) });
w.fetch = async (input, init) => {
  calls++;
  assert.equal(init.method, undefined, "production runtime does not write data");
  assert.equal(init.headers.Authorization, "Bearer test-host-token");
  if (mode === "denied") return { ok: false, status: 403 };
  const parts = new URL(input).pathname.split("/");
  const entity = fixture.entities.find(entity => entity.blueprint === parts[3] && entity.identifier === decodeURIComponent(parts[5]));
  if (!entity) return { ok: false, status: 404 };
  if (delay) { delay = false; return new Promise(resolve => { pending = () => resolve(response(entity)); }); }
  return response(entity);
};
const host = data => w.dispatchEvent(new w.MessageEvent("message", { data, origin: "https://app.port.io", source: w.parent }));
function context(identifier) {
  host({ type: "PLUGIN_DATA", baseUrl: "https://api.port.io", entity: fixture.entities.find(entity => entity.identifier === identifier), params: {},
    theme: { mode: "light", css: ":root {--text-high:#172c40;}" } });
}
const clickStage = async index => { w.document.querySelectorAll(".stage")[index].click(); await wait(60); };
const contains = text => w.document.getElementById("plugin-root").textContent.includes(text);
const closeDetails = async () => { w.document.querySelector(".detail-heading button").click(); await wait(60); };
const approvalButton = () => [...w.document.querySelectorAll(".decision-action button")]
  .find(button => button.textContent.includes("Review & Approve Requirements"));

(async () => {
  try {
    w.document.open(); w.document.write(html); w.document.close(); await wait(100);
    assert.ok(contains("Loading opportunity lifecycle"), "clear initial loading");
    assert.equal(approvalButton(), undefined, "no approval action before entity data loads");
    delay = true;
    context("fixture-requirements"); host({ type: "PORT_TOKEN", token: "test-host-token" });
    await until(() => !!pending, "initial entity request");
    assert.equal(approvalButton(), undefined, "no approval action during initial loading");
    pending(); await until(() => !!approvalButton() && !approvalButton().disabled, "loaded requirements");
    assert.ok(contains("Requirements review"));
    assert.equal(w.document.querySelectorAll(".stage").length, 5);
    assert.equal(w.document.querySelector('[aria-current="step"]').textContent.includes("Requirements"), true);
    assert.ok(w.document.querySelector("#port-plugin-theme"));
    assert.equal(w.document.documentElement.dataset.theme, "light");
    for (const theme of [
      { mode: "dark", css: ":root {--text-high:#eef4fc;}" },
      { mode: "light", css: "" },
      undefined,
    ]) {
      host({ type: "PLUGIN_DATA", baseUrl: "https://api.port.io", entity: fixture.entities[0], params: {}, theme });
      await wait(80);
      assert.equal(w.document.documentElement.dataset.theme, theme?.mode);
    }
    context("fixture-requirements"); await wait(80);
    const before = calls;
    await clickStage(0);
    assert.ok(contains("3 distinct customer signals"));
    assert.ok(contains("Agent interpretation"));
    assert.equal(calls, before, "stage inspection has no write or read side effects");
    w.document.querySelector(".stage-details details summary").click(); await wait(30);
    assert.ok(contains("Can we schedule audit exports?"));
    await clickStage(4);
    assert.ok(contains("Adjacent audit metadata context"));
    assert.ok(contains("Related context only"));
    assert.ok(!contains("Handoff completed"));
    await closeDetails();
    w.document.querySelector("a.primary").click(); await wait(50);
    assert.ok(messages.some(message => message.type === "OPEN_URL" && message.data.url.includes("activeTab=DYNAMIC_GROUP_KEY_requirements")));
    assert.ok(!messages.some(message => message.type === "SHOW_RUN_WORKFLOW_DIALOG"));
    console.log("PASS: reference semantics, stage inspection, original evidence, adjacent ADO, supported navigation");

    const opportunity = fixture.entities.find(entity => entity.identifier === "fixture-requirements");
    const originalRequirements = opportunity.properties.requirements;
    // The fetched record, not potentially older host context, supplies the Markdown.
    host({ type: "PLUGIN_DATA", baseUrl: "https://api.port.io",
      entity: { ...opportunity, properties: { ...opportunity.properties, requirements: "Outdated host requirements" } },
      params: {}, theme: { mode: "light", css: "" } });
    await wait(80);
    await until(() => !!approvalButton() && !approvalButton().disabled, "fresh API requirements");
    const beforeDialogCalls = calls, beforeDialogMessages = messages.length;
    const beforeDialogEntity = JSON.stringify(opportunity);
    approvalButton().click(); await wait(50);
    assert.equal(approvalButton().className, "primary", "existing button styling reused");
    assert.deepEqual(JSON.parse(JSON.stringify(messages.slice(beforeDialogMessages))), [{
      type: "SHOW_RUN_WORKFLOW_DIALOG",
      data: {
        workflowIdentifier: "review_approve_requirements", triggerIdentifier: "trigger",
        initialData: { product_opportunity: opportunity.identifier, requirements: originalRequirements },
      },
    }], "native workflow dialog receives the current identifier and exact API Markdown");
    assert.equal(calls, beforeDialogCalls, "opening the dialog does not issue API requests");
    assert.equal(JSON.stringify(opportunity), beforeDialogEntity, "opening without submitting leaves data unchanged");
    assert.equal(opportunity.properties.status, "Requirements Review", "plugin does not advance status");
    assert.ok(!contains("successfully"), "dialog request is not reported as execution success");

    for (const missingRequirements of [undefined, "", " \n ", 42]) {
      opportunity.properties.requirements = missingRequirements;
      w.document.querySelector(".freshness button").click(); await wait(80);
      await until(() => !!approvalButton()?.disabled && contains("Requirements are unavailable"), "missing requirements guard");
      const beforeBlockedClick = messages.length;
      approvalButton().click(); await wait(30);
      assert.equal(messages.length, beforeBlockedClick, "invalid or empty requirements never open a dialog");
    }
    opportunity.properties.requirements = `\n${originalRequirements}\n`;
    w.document.querySelector(".freshness button").click(); await wait(80);
    await until(() => !!approvalButton() && !approvalButton().disabled, "restored Markdown");
    approvalButton().click(); await wait(30);
    assert.equal(messages.at(-1).data.initialData.requirements, opportunity.properties.requirements, "Markdown whitespace is preserved");
    opportunity.properties.requirements = originalRequirements;

    for (const status of ["PRD Review", "Engineering Review", "Engineering Ready", "Ready for Engineering",
      "Proposed", "Product Review", "Approved", "Rejected", "Requirements Review ", ""]) {
      opportunity.properties.status = status;
      poll();
      await until(() => w.document.querySelector(".status-pill")?.textContent === (status.trim() || "Status missing")
        && !w.document.querySelector(".freshness button").disabled, `refreshed ${status || "missing status"}`);
      assert.equal(approvalButton(), undefined, `approval button hidden for ${JSON.stringify(status)}`);
      if (status === "PRD Review") {
        assert.ok(contains("PRD review"), "polling reflects the workflow's next status");
        assert.ok(w.document.querySelector("a.primary").href.includes("activeTab=PRD+Review"), "existing PRD Review navigation retained");
      }
    }
    opportunity.properties.status = "Requirements Review";
    context("fixture-requirements");
    await until(() => !!approvalButton() && !approvalButton().disabled, "requirements review restored");
    console.log("PASS: exact status visibility, current-entity Markdown prefill, missing-data guards, dialog-only behavior, status-transition refresh");

    mode = "denied"; w.document.querySelector(".freshness button").click();
    await until(() => contains("Refresh failed - showing older data"), "visible permission failure");
    assert.ok(contains("Refresh failed - showing older data"));
    assert.ok(contains("Requirements review"), "same entity preserves last successful state");
    assert.ok(contains("do not have access"), "permission error is visible");
    assert.equal(approvalButton().disabled, true, "approval disabled after refresh failure");
    const beforeFailedClick = messages.length;
    approvalButton().click(); await wait(30);
    assert.equal(messages.length, beforeFailedClick, "stale requirements cannot open a dialog");
    mode = "success"; w.document.querySelector(".freshness button").click();
    await until(() => !contains("Refresh failed") && !w.document.querySelector(".freshness button")?.disabled, "successful retry");
    assert.ok(!contains("Refresh failed"));
    delay = true; w.document.querySelector(".freshness button").click();
    await until(() => contains("Refreshing - showing previous data") && !!pending, "in-progress refresh");
    assert.ok(contains("Refreshing - showing previous data"));
    assert.equal(approvalButton().disabled, true, "approval disabled while data is refreshing");
    const beforeLoadingClick = messages.length;
    approvalButton().click(); await wait(30);
    assert.equal(messages.length, beforeLoadingClick, "refreshing requirements cannot open a dialog");
    pending(); await until(() => !w.document.querySelector(".freshness button").disabled, "completed refresh");
    assert.equal(approvalButton().disabled, false, "approval enabled after successful refresh");
    console.log("PASS: permission failure, stale state, explicit refresh, retry");

    delay = true; pending = undefined; w.document.querySelector(".freshness button").click();
    await until(() => !!pending, "delayed old request");
    const resolveOld = pending;
    context("fixture-engineering"); await until(() => contains("Engineering-plan review"), "new entity");
    assert.ok(contains("Engineering-plan review"));
    assert.equal(approvalButton(), undefined, "engineering review has no requirements approval button");
    assert.ok(!contains("Adjacent audit metadata context"), "no cross-entity relation leakage");
    assert.ok(!contains("Which destinations should be supported?"), "no cross-entity questions");
    resolveOld(); await wait(120);
    assert.ok(contains("Engineering-plan review"), "late old response cannot overwrite new context");
    await clickStage(2); w.document.querySelector("a.primary").click(); await wait(50);
    assert.ok(messages.some(message => message.type === "OPEN_URL" && message.data.url.includes("activeTab=PRD+Review")));
    await clickStage(3); w.document.querySelector("a.primary").click(); await wait(50);
    assert.ok(messages.some(message => message.type === "OPEN_URL" && message.data.url.includes("activeTab=Engineering+Review")));
    assert.ok(clearedTimers > 0, "polling timers cleaned up on context switch");
    console.log("PASS: cross-entity isolation, abort races, unchanged review tab navigation");

    context("fixture-ready"); await wait(120);
    assert.ok(contains("Engineering handoff pending"));
    assert.equal(approvalButton(), undefined, "engineering readiness has no requirements approval button");
    w.document.querySelector(".primary").click(); await wait(50);
    const dialog = messages.find(message => message.type === "SHOW_RUN_WORKFLOW_DIALOG" && message.data.workflowIdentifier === "create_engineering_work_item");
    assert.deepEqual(JSON.parse(JSON.stringify(dialog.data)), {
      workflowIdentifier: "create_engineering_work_item", triggerIdentifier: "trigger",
      initialData: { product_opportunity: "fixture-ready" },
    });
    assert.ok(messages.every(message => ["REQUEST_PORT_TOKEN", "OPEN_URL", "SHOW_RUN_WORKFLOW_DIALOG"].includes(message.type)), "only supported navigation/dialog messages; no execution");
    console.log("PASS: Ready is pending; verified handoff dialog only, no business execution");

    const entity = fixture.entities.find(entity => entity.identifier === "fixture-engineering");
    entity.properties.prd = '<script>window.hacked=true</script>\n[unsafe](javascript:alert(1))\n![remote](https://tracker.invalid/image.png)';
    context("fixture-engineering"); await wait(120); await clickStage(2);
    assert.ok(!w.hacked);
    assert.equal(w.document.querySelectorAll(".markdown script,.markdown img,.markdown a[href^='javascript:']").length, 0);
    assert.ok(contains("[Image: remote]"));
    const beforePoll = calls; poll(); await wait(120); assert.ok(calls > beforePoll);
    host({ type: "PORT_TOKEN", token: null }); await wait(80);
    assert.ok(!w.document.querySelector(".panel"), "revoked token hides prior data");
    assert.deepEqual(runtimeErrors, []);
    console.log("PASS: safe markdown, polling fallback, token revocation, no runtime errors");
  } finally { dom.window.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
