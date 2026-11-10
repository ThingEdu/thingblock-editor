// Copy the bundled example projects (src/examples/<device>/*.tb) into the served pack and emit one
// examples/index.json the editor fetches to list them. Each device folder carries its own index.json;
// the merged index prefixes every `file` with the device folder so it resolves against the examples
// base. Run after vite build, before zip.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Copy every device's examples and write the merged index.
 * @param {string} src The source examples folder (holding one folder per device).
 * @param {string} out The served examples folder.
 * @returns {{groups: string[], examples: object[]}} The merged index.
 */
export function copyExamples(src, out) {
  const merged = { groups: [], examples: [] }
  if (!existsSync(src)) return merged
  for (const device of readdirSync(src, { withFileTypes: true })) {
    if (!device.isDirectory()) continue
    const index = JSON.parse(readFileSync(join(src, device.name, 'index.json'), 'utf8'))
    mkdirSync(join(out, device.name), { recursive: true })
    for (const example of index.examples) {
      cpSync(join(src, device.name, example.file), join(out, device.name, example.file))
      merged.examples.push({ ...example, file: `${device.name}/${example.file}` })
    }
    for (const group of index.groups) if (!merged.groups.includes(group)) merged.groups.push(group)
  }
  writeFileSync(join(out, 'index.json'), `${JSON.stringify(merged, null, 2)}\n`)
  return merged
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  copyExamples(join('src', 'examples'), join('dist', 'thingblock-resource', 'examples'))
}
