import { defineConfig } from '@playwright/test'
import base from './playwright.config'

// The README's pictures, taken against the same fixture workspace the suite uses —
// never against a real root, which would publish whatever projects happen to sit in it.
//   npm run screenshots
export default defineConfig({
  ...base,
  testDir: './screenshots',
  retries: 0,
  reporter: [['list']],
  use: {
    ...base.use,
    viewport: { width: 1920, height: 1048 },
    deviceScaleFactor: 1,
    colorScheme: 'dark',
    trace: 'off',
    video: 'off',
  },
  projects: undefined,
})
