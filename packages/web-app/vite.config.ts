import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { copyFileSync, mkdirSync, existsSync } from 'fs'

// Copia el WASM de web-ifc al directorio public para que sea servido correctamente
function copyWebIfcWasm() {
  return {
    name: 'copy-web-ifc-wasm',
    buildStart() {
      const wasmSrc = resolve(__dirname, 'node_modules/web-ifc/web-ifc.wasm')
      const wasmDest = resolve(__dirname, 'public/web-ifc/web-ifc.wasm')
      const destDir = resolve(__dirname, 'public/web-ifc')
      if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true })
      if (existsSync(wasmSrc)) copyFileSync(wasmSrc, wasmDest)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), copyWebIfcWasm()],
  resolve: {
    // Ensure workspace packages are resolved correctly
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5173,
    open: true,
    headers: {
      // Required for SharedArrayBuffer (used by web-ifc multithreading)
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  optimizeDeps: {
    exclude: ['web-ifc'],
  },
  assetsInclude: ['**/*.wasm'],
})

