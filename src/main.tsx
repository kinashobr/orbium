import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Purge any stale service worker registrations and caches from prior builds
if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const r of registrations) {
      r.unregister();
    }
  }).catch(() => {});
}

// Clean internal preview auth token from browser URL address bar to avoid confusion
if (typeof window !== "undefined" && window.location.search) {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has("__aistudio_auth_token")) {
      params.delete("__aistudio_auth_token");
      const qs = params.toString();
      const cleanUrl = window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
      window.history.replaceState(null, "", cleanUrl);
    }
  } catch (err) {
    console.warn("Could not clean URL params:", err);
  }
}

createRoot(document.getElementById("root")!).render(<App />);

