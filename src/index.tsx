import { createRoot } from "react-dom/client";
import { App } from "./App";
const root = document.getElementById("plugin-root");
if (!root) throw new Error("Plugin root is missing.");
createRoot(root).render(<App />);
