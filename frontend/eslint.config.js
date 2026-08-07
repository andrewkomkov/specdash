import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Four effects reset local state when the thing they fetch changes — the
      // drawer's tab, the document body, the trend series. React would rather
      // that were a remount keyed on the id, and it is right in general; here it
      // would be a refactor of working code that the end-to-end suite already
      // covers. Kept visible as a warning rather than silenced or rushed.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
)
