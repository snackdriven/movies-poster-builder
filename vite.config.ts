import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  root: "client",
  base: process.env.PAGES_BASE_PATH || "/",
  plugins: [tailwindcss()],
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rolldownOptions: {
      onwarn(warning, warn) {
        // React Query's server-component directive has no effect in this browser-only bundle.
        if (warning.code !== "MODULE_LEVEL_DIRECTIVE") warn(warning);
      },
    },
  },
});
