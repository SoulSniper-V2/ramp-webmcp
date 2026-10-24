import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const webmcpHeaders = {
  "Origin-Agent-Cluster": "?1",
  "Permissions-Policy": "tools=(self)",
};

export default defineConfig({
  plugins: [react()],
  // Preserve Vite 7's human-only browser baseline during the Vite 8 upgrade.
  build: { target: ["chrome107", "edge107", "firefox104", "safari16"] },
  server: {
    headers: webmcpHeaders,
  },
  preview: {
    headers: webmcpHeaders,
  },
});
