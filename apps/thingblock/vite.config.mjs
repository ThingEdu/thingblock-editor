import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

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
  plugins: [
    // Files loaded at runtime by path rather than imported: Blockly's media (`getBlocksMediaPath`) and MediaPipe's
    // wasm (`hand-tracker.ts`). `stripBase` drops a source's folders, which the copy would otherwise keep.
    viteStaticCopy({
      targets: [
        {
          src: '../../packages/thingblock-blocks/media/**/*',
          dest: 'static/blocks-media/default',
          rename: { stripBase: 3 },
        },
        {
          src: '../../packages/thingblock-blocks/media/**/*',
          dest: 'static/blocks-media/high-contrast',
          rename: { stripBase: 3 },
        },
        // A later target overwrites an earlier one, so the high-contrast media replace some of the default ones
        {
          src: 'src/lib/settings/color-mode/high-contrast/blocks-media/**/*',
          dest: 'static/blocks-media/high-contrast',
          rename: { stripBase: 6 },
        },
        {
          src: '../../node_modules/@mediapipe/tasks-vision/wasm/*',
          dest: 'static/mediapipe/wasm',
          rename: { stripBase: 4 },
        },
      ],
    }),
  ],
})
