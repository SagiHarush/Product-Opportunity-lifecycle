export const ORG = "org_DFaV0HHbGoNV1CV9";
export const TABS = {
  overview: "Overview",
  requirements: "DYNAMIC_GROUP_KEY_requirements",
  prd: "PRD Review",
  engineering: "Engineering Review",
} as const;

export function appOrigin(base: string | null) {
  const referrer = document.referrer && new URL(document.referrer);
  if (referrer && referrer.protocol === "https:" && /(^|\.)(port\.io|getport\.io)$/i.test(referrer.hostname)) return referrer.origin;
  if (base) {
    const api = new URL(base);
    if (/^api\./.test(api.hostname)) return `https://app.${api.hostname.slice(4)}`;
  }
  return "https://app.port.io";
}
export function entityUrl(origin: string, blueprint: string, identifier: string, tab?: string) {
  const url = new URL(`${origin}/${ORG}/${encodeURIComponent(blueprint)}Entity`);
  url.searchParams.set("identifier", identifier);
  if (tab) url.searchParams.set("activeTab", tab);
  return url.toString();
}
