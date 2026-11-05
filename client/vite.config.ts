import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The browser only ever talks to the Express API over HTTP, through this proxy.
const apiTarget = process.env.VITE_API_TARGET ?? "https://emman-reading-room.onrender.com";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": { target: apiTarget, changeOrigin: true } }
  }
});
