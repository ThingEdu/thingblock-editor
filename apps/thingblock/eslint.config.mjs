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
    // A reducer's action type lists only the actions it handles, but Redux passes every dispatched action to every
    // reducer, so the `default` branch is reachable even though the types say it isn't.
    files: ['src/reducers/**'],
    rules: {
      '@typescript-eslint/no-unnecessary-condition': 'off',
    },
  },
  {
    files: ['*'], // files in the root of the package (not subdirectories)
    languageOptions: {
      globals: globals.node,
    },
  },
  globalIgnores(['coverage/**', 'dist/**', 'node_modules/**']),
)
