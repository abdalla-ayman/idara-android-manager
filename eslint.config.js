import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'release']),

  // React renderer — browser, ES modules
  {
    files: ['src/**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // The new React-Compiler-era hooks rules flag legitimate patterns here
      // (loading data on mount via IPC, a Date.now() clock, copy-then-mutate
      // Set updaters). Keep them as advisory warnings rather than build errors.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      // App.jsx intentionally co-exports the AppContext + useApp hook.
      'react-refresh/only-export-components': ['warn', { allowExportNames: ['useApp', 'AppContext'] }],
    },
  },

  // Electron main + preload — Node, CommonJS
  {
    files: ['electron/**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.node,
      sourceType: 'commonjs',
    },
  },
])
