import path from "node:path";
import { defineConfig } from "vitest/config";

// Mirrors the "@/*" -> "./src/*" path in tsconfig.json so tests can import
// source files the same way app code does.
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
