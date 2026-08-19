import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./vitest-mocks/server-only.ts"),
    },
    exclude: ["node_modules", "supabase/tests/**"],
  },
});
