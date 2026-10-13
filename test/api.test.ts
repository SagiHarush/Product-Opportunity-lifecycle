import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEntity, validateApiBase, readOpportunity, PortError } from "../src/api.ts";
test("Only a trusted HTTPS API host receives the token", () => {
  assert.equal(validateApiBase("https://api.port.io/"), "https://api.port.io");
  assert.equal(validateApiBase("https://api.getport.io/v1"), "https://api.getport.io");
  for (const value of ["https://port.io.evil.test", "http://api.port.io", "https://evil.test"]) assert.throws(() => validateApiBase(value));
});
test("Malformed entities fail explicitly", () => {
  for (const value of [null, {}, { identifier: "a", blueprint: "product_opportunity" }]) assert.throws(() => parseEntity(value));
});
test("Read uses host token, deduplicates requests, and surfaces partial evidence errors", async () => {
  const original = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input); calls.push(url);
    assert.equal((init?.headers as Record<string, string>).Authorization, "Bearer test-host-token");
    assert.equal(init?.method, undefined);
    if (url.includes("/signal/")) return new Response("denied", { status: 403 });
    return Response.json({ entity: { identifier: "opportunity", blueprint: "product_opportunity", title: "TEST FIXTURE", properties: { status: "Requirements Review" }, relations: { signals: ["one", "one"] } } });
  };
  try {
    const data = await readOpportunity("https://api.port.io", "test-host-token", "opportunity", new AbortController().signal);
    assert.equal(calls.length, 2);
    assert.equal(data.relatedErrors.length, 1);
    assert.equal(data.signals.length, 0);
  } finally { globalThis.fetch = original; }
});
test("Permission denial is not success-shaped", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response("denied", { status: 403 });
  try { await assert.rejects(readOpportunity("https://api.port.io", "test", "a", new AbortController().signal), (error: unknown) => error instanceof PortError && error.status === 403); }
  finally { globalThis.fetch = original; }
});
test("Mismatched opportunity cannot be displayed", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ entity: { identifier: "wrong", blueprint: "product_opportunity", properties: {}, relations: {} } });
  try { await assert.rejects(readOpportunity("https://api.port.io", "test", "expected", new AbortController().signal), /different record/); }
  finally { globalThis.fetch = original; }
});
