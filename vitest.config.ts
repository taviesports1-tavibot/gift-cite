import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({ test: { environment: "node", include: ["tests/**/*.test.ts"] }, resolve: { alias: { "@gift-chaos/shared": fileURLToPath(new URL("./packages/shared/src/index.ts", import.meta.url)), "@gift-chaos/game-engine": fileURLToPath(new URL("./packages/game-engine/src/index.ts", import.meta.url)) } } });
