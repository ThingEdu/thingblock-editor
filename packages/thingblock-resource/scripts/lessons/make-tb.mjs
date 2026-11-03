// Wrap a project.json into the .tb (sb3 zip) the editor saves, for lesson test fixtures:
//   node scripts/lessons/make-tb.mjs in.project.json out.tb
import { readFileSync, writeFileSync } from 'node:fs'
import JSZip from 'jszip'

const [, , input, output] = process.argv
const zip = new JSZip()
zip.file('project.json', readFileSync(input, 'utf8'))
writeFileSync(output, await zip.generateAsync({ type: 'nodebuffer' }))
