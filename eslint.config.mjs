import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Enforce the backend layering so `lib/*` internals cannot be reached
    // from UI code or from the proxy (which must stay dependency-light).
    files: ["app/**/*.{ts,tsx}", "components/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/server/*", "@/server"],
              message:
                "Import the public API from '@/lib/*' instead of reaching into '@/server/*'.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["proxy.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/server/*", "@/lib/auth", "@/lib/db"],
              message:
                "proxy.ts runs before rendering and must not pull in the database or Node built-ins.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
