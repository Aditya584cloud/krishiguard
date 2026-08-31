import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Capacitor loads the bundle from a local https://localhost origin on the
  // device, not a real server — relative asset paths keep the build portable.
  base: "./",
  build: {
    outDir: "dist",
  },
});
