import js from "@eslint/js";

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

// TypeScript and TSX validation runs through Next build. The local dependency
// tree has a broken transitive @typescript-eslint parser path that can hang
// release checks, so ESLint is kept to deterministic JS/config linting here.
export default [
  { ignores },
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module"
    },
    rules: {
      "no-undef": "off"
    }
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module"
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-undef": "off"
    }
  }
];
