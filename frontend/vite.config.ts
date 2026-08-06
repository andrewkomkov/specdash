import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vendor code is split by how it is reached, not by size: the markdown stack is
// only needed once a document is opened, the icon set only grows, and React and
// Mantine move on their own release cycles. Splitting them keeps the entry chunk
// to the board itself and lets the rest be cached independently across releases.
const VENDOR_CHUNKS: [string, RegExp][] = [
  [
    'markdown',
    /node_modules\/(react-markdown|remark|rehype|micromark|mdast|hast|unified|unist|vfile|decode-named|character-entities|property-information|space-separated|comma-separated|html-url-attributes|trim-lines|bail|trough|zwitch|longest-streak|ccount|markdown-table|devlop|extend|estree|style-to-js|style-to-object|inline-style-parser)/,
  ],
  ['icons', /node_modules\/@tabler\//],
  ['mantine', /node_modules\/(@mantine|clsx|react-remove-scroll|react-style-singleton|use-sidecar|use-callback-ref|get-nonce|react-number-format|type-fest)/],
  ['react', /node_modules\/(react|react-dom|scheduler|use-sync-external-store)\//],
]

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8420',
      '/ws': { target: 'ws://localhost:8420', ws: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 400,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          const normalised = id.replace(/\\/g, '/')
          for (const [name, pattern] of VENDOR_CHUNKS) {
            if (pattern.test(normalised)) return name
          }
          return 'vendor'
        },
      },
    },
  },
})
