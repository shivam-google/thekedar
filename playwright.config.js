import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/browser',
  timeout: 30000,
  workers: 2,
  use: { baseURL: 'http://127.0.0.1:5179', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run dev --prefix frontend -- --host 127.0.0.1 --port 5179 --strictPort',
    url: 'http://127.0.0.1:5179', reuseExistingServer: false,
    env: { VITE_SUPABASE_URL: 'https://test-project.supabase.co', VITE_SUPABASE_ANON_KEY: 'test-only-public-key', VITE_API_URL: '' },
  },
})
