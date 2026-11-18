import { eslintConfigScratch } from 'eslint-config-scratch'
import { globalIgnores } from 'eslint/config'
import globals from 'globals'

export default eslintConfigScratch.defineConfig(
  eslintConfigScratch.recommended,
  {
    files: ['src/**'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // Config and build/deploy scripts run in Node, outside the src TS project.
    files: ['*', 'scripts/**'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['**/*.{ts,mts}'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  globalIgnores(['coverage/**', 'dist/**', 'node_modules/**', 'src/**/libs/**']),
)
