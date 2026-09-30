import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import ja3dan from "@ja3dan/eslint-plugin";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  { ...ja3dan.configs.recommended, files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"] },
  // Vendored interior.dev components (retheme to tokens, but keep their ref-syncing hooks as shipped).
  {
    files: ["components/interior/**/*.tsx"],
    rules: {
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/immutability": "off",
    },
    linterOptions: { reportUnusedDisableDirectives: "off" },
  },
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
