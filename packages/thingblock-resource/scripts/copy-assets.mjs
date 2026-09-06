// Copy raw pack assets that are not compiled JS — vendored `libs/` C++ sources, prebuilt `firmware/`
// images, and board icons — from each pack's source folder into its served dist folder, mirroring the
// path layout the Vite build produces (dist/thingblock-resource/extensions/<group>/<pack>/…). Run
// after `vite build`.
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'

const EXTENSIONS_SRC = join('src', 'extensions')
const PACK_ROOT_OUT = join('dist', 'thingblock-resource', 'extensions')
const PACK_GROUPS = ['devices', 'peripheral']

for (const group of PACK_GROUPS) {
  const groupDir = join(EXTENSIONS_SRC, group)
  if (!existsSync(groupDir)) continue

  for (const pack of readdirSync(groupDir, { withFileTypes: true })) {
    if (!pack.isDirectory()) continue
    const packSrc = join(groupDir, pack.name)
    const packOut = join(PACK_ROOT_OUT, group, pack.name)
    mkdirSync(packOut, { recursive: true })

    copyRawAssets(packSrc, packSrc, packOut)
  }
}

// Walk the pack recursively so a nested `extension/` can carry its own icons: copy `libs/` and
// `firmware/` wholesale, and SVG/PNG files at any depth, preserving each file's path relative to the
// pack root.
export function copyRawAssets(root, dir, out) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const source = join(dir, entry.name)
    const target = join(out, relative(root, source))
    if (entry.isDirectory()) {
      // `libs/` and `firmware/` are copied whole: their contents are opaque payloads (C++ sources,
      // ESP image sets) whose file extensions carry no meaning to this script.
      if (entry.name === 'libs' || entry.name === 'firmware') {
        mkdirSync(dirname(target), { recursive: true })
        cpSync(source, target, { recursive: true })
      } else {
        copyRawAssets(root, source, out)
      }
      continue
    }
    if (entry.name.endsWith('.svg') || entry.name.endsWith('.png')) {
      mkdirSync(dirname(target), { recursive: true })
      cpSync(source, target)
    }
  }
}
