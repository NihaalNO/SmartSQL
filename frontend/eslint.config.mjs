import pluginNext from "@next/eslint-plugin-next"
import js from "@eslint/js"
import globals from "globals"

export default [
  js.configs.recommended,
  {
    plugins: { "@next/next": pluginNext },
    rules: {
      ...pluginNext.configs.recommended.rules,
      ...pluginNext.configs["core-web-vitals"].rules,
    },
  },
  {
    files: ["**/*.config.*", "**/*.config.*"],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    ignores: [".next/**", "node_modules/**"],
  },
]
