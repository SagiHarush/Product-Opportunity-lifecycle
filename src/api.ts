import { relationIds, type RecordEntity } from "./model";

export class PortError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function parseEntity(value: unknown): RecordEntity {
  if (!value || typeof value !== "object") throw new Error("Port returned an invalid entity.");
  const row = value as Record<string, unknown>;
  if (typeof row.identifier !== "string" || typeof row.blueprint !== "string" || !row.properties || typeof row.properties !== "object") throw new Error("Port returned an entity without its required fields.");
  return {
    identifier: row.identifier, blueprint: row.blueprint,
    title: typeof row.title === "string" ? row.title : row.identifier,
    properties: row.properties as Record<string, unknown>,
    relations: row.relations && typeof row.relations === "object" ? row.relations as Record<string, unknown> : {},
  };
}
export function validateApiBase(base: string) {
  const url = new URL(base);
  if (url.protocol !== "https:" || !/^api\.([a-z0-9-]+\.)*(port\.io|getport\.io)$/i.test(url.hostname) || url.username || url.password || url.search || url.hash || !["", "/", "/v1", "/v1/"].includes(url.pathname)) throw new Error("The host did not provide a trusted Port API URL.");
  return base.replace(/\/$/, "").replace(/\/v1$/, "");
}
export async function readOpportunity(base: string, token: string, identifier: string, signal: AbortSignal) {
  const root = validateApiBase(base);
  async function get(blueprint: string, id: string) {
    const response = await fetch(`${root}/v1/blueprints/${encodeURIComponent(blueprint)}/entities/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${token}` }, signal,
    });
    if (!response.ok) throw new PortError(response.status, response.status === 401 || response.status === 403 ? "You do not have access to this Port data, or your session has expired." : `Port could not load this record (HTTP ${response.status}).`);
    const body: unknown = await response.json();
    if (!body || typeof body !== "object" || !("entity" in body)) throw new Error("Port returned an unexpected entity response.");
    const entity = parseEntity(body.entity);
    if (entity.identifier !== id || entity.blueprint !== blueprint) throw new Error("Port returned a different record; it was not displayed.");
    return entity;
  }
  const entity = await get("product_opportunity", identifier);
  const relatedErrors: string[] = [];
  const resolve = async (blueprint: string, id: string) => {
    try { return await get(blueprint, id); }
    catch (error) {
      if (signal.aborted) throw error;
      console.error("[opportunity-lifecycle] Related record could not be read", blueprint, id, error);
      relatedErrors.push(`${blueprint === "signal" ? "Signal" : "Related work item"} ${id}: ${error instanceof Error ? error.message : "Read failed"}`);
      return null;
    }
  };
  const [signals, workItems] = await Promise.all([
    Promise.all(relationIds(entity.relations.signals).map(id => resolve("signal", id))),
    Promise.all(relationIds(entity.relations.ado_work_items).map(id => resolve("azureDevopsWorkItem", id))),
  ]);
  return { entity, signals: signals.filter((row): row is RecordEntity => row !== null),
    workItems: workItems.filter((row): row is RecordEntity => row !== null), relatedErrors };
}
export type OpportunityData = Awaited<ReturnType<typeof readOpportunity>>;
