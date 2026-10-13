import { test } from "node:test";
import assert from "node:assert/strict";
import { lifecycle, opportunityIdentifier, type RecordEntity } from "../src/model.ts";
const fixture = (status: unknown, properties: Record<string, unknown> = {}, relations: Record<string, unknown> = {}): RecordEntity => ({
  blueprint: "product_opportunity", identifier: "test-only", title: "TEST FIXTURE",
  properties: { status, ...properties }, relations,
});
test("Requirements Review: distinct signals, empty later artifacts, unresolved questions are not blockers", () => {
  const result = lifecycle(fixture("Requirements Review", { open_questions: ["Retention?"] }, { signals: ["a", "b", "c", "a"] }));
  assert.equal(result.title, "Requirements review");
  assert.equal(result.explanation, "Review the requirements, acceptance criteria and unresolved questions before moving to PRD preparation.");
  assert.equal(result.index, 1);
  assert.deepEqual(result.signalIds, ["a", "b", "c"]);
  assert.deepEqual(result.states, ["Previous stage", "Current", "Upcoming", "Upcoming", "Upcoming"]);
  assert.equal(result.artifacts.prdDraft, false);
  assert.equal(result.artifacts.engineeringField, false);
  assert.equal(result.warnings.length, 0);
  assert.equal(result.questions.length, 1);
});
test("PRD Review: working proposal is not an approved artifact", () => {
  const result = lifecycle(fixture("PRD Review", { prd_proposal: "# Draft" }));
  assert.equal(result.index, 2);
  assert.equal(result.artifacts.prdDraft, true);
  assert.equal(result.artifacts.prdField, false);
  assert.equal(result.handoffCompleted, false);
});
test("Engineering Review: product context is available, engineering proposal remains a draft", () => {
  const result = lifecycle(fixture("Engineering Review", { prd: "# Product context", engineering_plan_proposal: "# Working plan" }));
  assert.equal(result.index, 3);
  assert.equal(result.artifacts.prdField, true);
  assert.equal(result.artifacts.engineeringDraft, true);
  assert.equal(result.artifacts.engineeringField, false);
  assert.deepEqual(result.warnings, []);
});
test("Ready for Engineering without a created item: current handoff, not completed", () => {
  const result = lifecycle(fixture("Ready for Engineering", { prd: "PRD", engineering_plan: "Plan" }));
  assert.equal(result.index, 4);
  assert.equal(result.states[4], "Current");
  assert.equal(result.title, "Engineering handoff pending");
  assert.equal(result.handoffCompleted, false);
  assert.deepEqual(result.adoIds, []);
});
test("Adjacent ADO relation never proves handoff, including Approved", () => {
  for (const status of ["Requirements Review", "Ready for Engineering", "Approved"]) {
    const result = lifecycle(fixture(status, {}, { ado_work_items: ["11"] }));
    assert.deepEqual(result.adoIds, ["11"]);
    assert.equal(result.handoffCompleted, false);
  }
});
test("Rejected does not invent a rejection stage", () => {
  const result = lifecycle(fixture("Rejected"));
  assert.equal(result.rejected, true);
  assert.equal(result.index, null);
  assert.match(result.explanation, /does not identify which stage/);
  assert.ok(result.states.every(state => state === "Decision required"));
});
test("Unknown, missing and prototype names are Stage unavailable", () => {
  for (const status of [null, undefined, "", "New stage", "toString", "__proto__", 42]) {
    const result = lifecycle(fixture(status));
    assert.equal(result.index, null);
    assert.equal(result.title, "Stage unavailable");
    assert.equal(result.handoffCompleted, false);
  }
});
test("Approved is undefined in inspected workflows, not a completed phase", () => {
  const result = lifecycle(fixture("Approved", { prd: "PRD", engineering_plan: "Plan" }));
  assert.equal(result.index, null);
  assert.match(result.explanation, /No inspected workflow assigns this status/);
});
test("Artifacts ahead of status produce consistency warnings, not stage promotion", () => {
  const result = lifecycle(fixture("Requirements Review", { prd: "PRD", engineering_plan_proposal: "Plan" }));
  assert.equal(result.index, 1);
  assert.equal(result.warnings.length, 2);
  assert.equal(result.states[3], "Upcoming");
});
test("Review with approved field and advanced status with missing fields are inconsistent", () => {
  assert.equal(lifecycle(fixture("PRD Review", { prd: "PRD" })).warnings.length, 1);
  assert.equal(lifecycle(fixture("Engineering Review", { prd: "PRD", engineering_plan: "Plan" })).warnings.length, 1);
  assert.equal(lifecycle(fixture("Ready for Engineering")).warnings.length, 2);
});
test("Early statuses map only to discovery and whitespace is not an artifact", () => {
  for (const status of ["Proposed", "Product Review"]) assert.equal(lifecycle(fixture(status)).index, 0);
  assert.equal(lifecycle(fixture("PRD Review", { prd: "   " })).artifacts.prdField, false);
});
test("Resolve only opportunities from supported host-payload variants", () => {
  for (const value of [
    { identifier: "one", blueprint: "product_opportunity" },
    { identifier: "one", blueprintIdentifier: "product_opportunity" },
    { identifier: "one", properties: { $blueprint: "product_opportunity" } },
  ]) assert.equal(opportunityIdentifier(value), "one");
  for (const value of [null, {}, { identifier: "one", blueprint: "signal" }, { identifier: "", blueprint: "product_opportunity" }]) assert.equal(opportunityIdentifier(value), undefined);
});
