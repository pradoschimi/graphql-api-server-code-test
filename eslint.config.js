import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.js"],
    ignores: ["node_modules/**", "coverage/**"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        console: "readonly",
        fetch: "readonly",
        process: "readonly",
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
    rules: {
      "eqeqeq": ["error", "always"],
      "no-eval": "error",
      "no-new-func": "error",
      "no-undef": "error",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-var": "error",
      "prefer-const": "error",
    },
  },
]);
