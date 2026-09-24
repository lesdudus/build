import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./style.css";
import "./layouts.css";
try {
  localStorage.removeItem("build-interval-settings");
  localStorage.removeItem("build-interval-run");
} catch {}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch((error) => {
    console.warn("Offline shell unavailable", error);
    window.dispatchEvent(new CustomEvent("offline-shell-error"));
  });
}
