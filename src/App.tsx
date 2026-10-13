import { useEffect, useState } from "react";
import { usePortPluginData } from "@port-labs/plugins-sdk/react";
import { useOpportunity } from "./useOpportunity";
import { LifecyclePanel } from "./LifecyclePanel";
import { appOrigin } from "./navigation";
import { opportunityIdentifier } from "./model";
import { loadFonts } from "./fonts";

export function App() {
  const sdk = usePortPluginData();
  const [fontError, setFontError] = useState(false);
  useEffect(() => {
    let disposed = false;
    void loadFonts().catch(() => { if (!disposed) setFontError(true); });
    return () => { disposed = true; };
  }, []);
  useEffect(() => {
    sdk.applyThemeCss();
    const root = document.documentElement;
    if (sdk.theme?.mode === "light" || sdk.theme?.mode === "dark") {
      root.dataset.theme = sdk.theme.mode;
    } else {
      delete root.dataset.theme;
    }
    return () => { delete root.dataset.theme; };
  }, [sdk.applyThemeCss, sdk.theme?.mode]);
  const entity = sdk.entity;
  const identifier = opportunityIdentifier(entity);
  const contextVersion = JSON.stringify({ properties: entity?.properties, relations: entity?.relations });
  const query = useOpportunity(sdk.portApiBaseUrl, sdk.portToken, identifier, contextVersion);
  if (window.parent === window) return <div className="empty"><h2>Opportunity lifecycle</h2><p>Add this plugin as a custom widget to a Product Opportunity entity page in Port.</p><p>For a clearly labelled local demonstration, open <a href="/preview">the preview host</a>.</p></div>;
  if (sdk.portApiBaseUrl && !identifier) return <div className="empty"><h2>Entity context unavailable</h2><p>This panel requires a Product Opportunity entity page.</p></div>;
  if (!query.data) return <div className="empty" role={query.error ? "alert" : "status"}>
    <h2>{query.error ? "Opportunity could not be loaded" : "Loading opportunity lifecycle"}</h2>
    <p>{query.error || (!sdk.portToken ? "Waiting for the authenticated Port context..." : "Reading the latest opportunity and customer evidence...")}</p>
    <button className="text-button" onClick={query.retry}>Retry</button>
  </div>;
  return <main>
    {fontError && <p className="error" role="alert">Fonts unavailable. Using the system font.</p>}
    <div className="freshness" role="status" aria-live="polite">
      <span>{query.error ? "Refresh failed - showing older data." : query.refreshing ? "Refreshing - showing previous data." : `Updated ${new Date(query.fetchedAt!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}</span>
      <button className="text-button" onClick={query.retry} disabled={query.refreshing}>{query.refreshing ? "Refreshing..." : query.error ? "Retry" : "Refresh"}</button>
    </div>
    {query.error && <p className="error" role="alert">{query.error}</p>}
    <LifecyclePanel key={`${sdk.portApiBaseUrl}:${identifier}`} data={query.data} origin={appOrigin(sdk.portApiBaseUrl)} reviewDisabled={query.refreshing || !!query.error} />
    {!!query.data.relatedErrors.length && <details className="error"><summary>Some related evidence could not be read ({query.data.relatedErrors.length})</summary><ul>{query.data.relatedErrors.map(message => <li key={message}>{message}</li>)}</ul><button className="text-button" onClick={query.retry}>Retry evidence</button></details>}
  </main>;
}
