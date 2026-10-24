import { eslintConfigScratch } from 'eslint-config-scratch'
import { globalIgnores } from 'eslint/config'
import globals from 'globals'

// The lesson test is excluded from tsconfig.json (see its header), so it is linted as a default-project file.
// Every typed block shares this setting: typescript-eslint builds one project service for the whole run.
const projectService = { allowDefaultProject: ['test/lessons/lessons.test.ts'] }

export default eslintConfigScratch.defineConfig(
  eslintConfigScratch.recommended,
  {
    files: ['src/**'],
    languageOptions: {
      parserOptions: {
        projectService,
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
      parserOptions: { projectService, tsconfigRootDir: import.meta.dirname },
    },
  },
  globalIgnores(['coverage/**', 'dist/**', 'node_modules/**', 'src/**/libs/**']),
)
