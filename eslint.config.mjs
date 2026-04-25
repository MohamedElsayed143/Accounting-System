import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [".next/", "next-env.d.ts"],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Downgrade to warn — pervasive usage, safe to fix incrementally post-launch
      "@typescript-eslint/no-explicit-any": "warn",
      // Downgrade unused vars to warn
      "@typescript-eslint/no-unused-vars": "warn",
      // Downgrade react-hooks exhaustive-deps to warn
      "react-hooks/exhaustive-deps": "warn",
      // Downgrade img element warning (print views use <img> intentionally)
      "@next/next/no-img-element": "warn",
      // Downgrade react entity errors
      "react/no-unescaped-entities": "warn",
      "react/jsx-no-comment-textnodes": "warn",
    },
  },
];

export default eslintConfig;
