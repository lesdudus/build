import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    viteSingleFile(),
    {
      name: "offline-shell",
      closeBundle() {
        const file = new URL("./dist/index.html", import.meta.url);
        const revision = createHash("sha256")
          .update(readFileSync(file))
          .digest("hex")
          .slice(0, 16);
        const worker = `const CACHE='build-workout-${revision}';
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(['./','./index.html']))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('build-workout-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.mode==='navigate'&&url.origin===self.location.origin&&url.pathname.startsWith(new URL('./',self.location.href).pathname)){event.respondWith(fetch(event.request).catch(()=>caches.open(CACHE).then(cache=>cache.match('./index.html'))));}});`;
        writeFileSync(new URL("./dist/sw.js", import.meta.url), worker);
      },
    },
  ],
  server: {
    host: "127.0.0.1",
    port: 5206,
    strictPort: true,
    fs: { allow: [".."] },
  },
});
