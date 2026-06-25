import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

const ignores = [
  ".next/**",
  ".next-stale-*/**",
  "coverage/**",
  "deliverables/**",
  "node_modules/**",
  "out/**",
  "outputs/**",
  "next-env.d.ts",
  "tsconfig.tsbuildinfo"
];

export default [
  { ignores },
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module"
    },
    rules: {
      "no-undef": "off"
    }
  },
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        },
        projectService: false,
        sourceType: "module"
      }
    },
    plugins: {
      "@typescript-eslint": tsPlugin
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      "no-unused-vars": "off"
    }
  },
  nextPlugin.flatConfig.recommended,
  nextPlugin.flatConfig.coreWebVitals,
  {
    rules: {
      "no-undef": "off"
    }
  },
  {
    settings: {
      next: {
        rootDir: "."
      }
    }
  }
];
