import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiUrl = env.VITE_API_URL ?? "http://localhost:3001";
  const devPort = parseInt(env.VITE_DEV_PORT ?? "5173", 10);

  return {
    plugins: [react()],
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
    },
    server: {
      port: devPort,
      // Fail loudly instead of drifting to the next free port: the API's CORS
      // allowlist is exactly CLIENT_URL/ADMIN_URL, so a client that quietly
      // lands on 5180 gets its requests rejected with no obvious cause.
      strictPort: true,
      proxy: {
        "/api": {
          target: apiUrl,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
