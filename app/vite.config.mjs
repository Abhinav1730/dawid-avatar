import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { createApi } from "./server/api.mjs";
import { makeTavus } from "./server/tavus.mjs";

export default defineConfig(({ mode }) => ({
  build: {
    outDir: "dist/client",
  },
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    host: "127.0.0.1",
    allowedHosts: ["terminal.local"],
    watch: { ignored: ['**/.private/**'] },
    fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/.private/**', '**/server/**'] },
    warmup: {
      clientFiles: ["./src/main.jsx"],
    },
  },
  plugins: [react(), {
    name: 'dawid-api',
    configureServer(server) {
      const env = { ...process.env, ...loadEnv(mode, process.cwd(), '') };
      const api = createApi({ tavus: makeTavus({ env }) });
      server.middlewares.use('/api', api);
      server.httpServer?.once('close', () => { void api.close(); });
    },
  }],
}));
