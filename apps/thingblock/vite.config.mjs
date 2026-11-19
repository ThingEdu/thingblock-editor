import { defineConfig } from 'vite'

export default defineConfig({
  css: {
    // Components read their classes as `styles.camelCase`, and as `styles[level]` for kebab-case names like `info-blue`
    modules: { localsConvention: 'camelCase' },
  },
  optimizeDeps: {
    // The VM's browser bundle is UMD, and the dev server converts CommonJS only in the dependencies it pre-bundles,
    // which leave out linked workspace packages unless named here
    include: ['@thingblock/thingblock-vm'],
  },
})
