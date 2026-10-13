import fs from "node:fs";

export async function connect() {
  const configPath = process.env.PORT_CONFIG_PATH;
  if (!configPath) throw new Error("Set PORT_CONFIG_PATH to an existing Port CLI config (never copy credentials into this project).");
  const config = Object.fromEntries(fs.readFileSync(configPath, "utf8").split(/\r?\n/).flatMap(line => {
    const match = line.match(/^\s*([\w_]+)\s*[:=]\s*(.*?)\s*$/);
    return match ? [[match[1], match[2].replace(/^['"]|['"]$/g, "")]] : [];
  }));
  const base = config.port_api_base_url.replace(/\/$/, "");
  const auth = await fetch(`${base}/v1/auth/access_token`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId: config.client_id, clientSecret: config.client_secret }),
  });
  if (!auth.ok) throw new Error(`Port authentication failed: ${auth.status}`);
  const { accessToken } = await auth.json();
  if (!accessToken) throw new Error("Port did not issue a token.");
  return async function api(path, method = "GET", body) {
    const response = await fetch(`${base}/v1${path}`, {
      method, headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${text}`);
    return JSON.parse(text);
  };
}
