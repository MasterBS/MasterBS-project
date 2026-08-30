import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    passWithNoTests: true,
    exclude: [".claude/worktrees/**", "node_modules/**", "e2e/**"],
    server: {
      // next-auth/@auth/core는 기본적으로 externalize(네이티브 Node ESM으로 바로 로드)되어
      // 아래 resolve.alias가 적용되지 않는다 - inline으로 돌려 Vite 리졸버를 타게 한다.
      deps: { inline: [/next-auth/, /@auth\/core/] },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // next-auth가 정적으로 import하는 "next/server"는 package.json에 exports map이
      // 없어(Next.js 자체의 알려진 한계) Vite의 ESM 리졸버가 확장자 없이는 못 찾는다.
      // Next.js 빌드(webpack/turbopack)에서는 문제 없이 동작하지만 vitest에서만 필요한 우회.
      "next/server": path.resolve(__dirname, "node_modules/next/server.js"),
    },
  },
});
