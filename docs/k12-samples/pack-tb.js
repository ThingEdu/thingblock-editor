/**
 * Packages a project.json into a .tb (sb3-shaped) zip — a zip with a single `project.json` entry,
 * DEFLATE level 6, matching what VirtualMachine#saveProjectSb3() writes and what the open path
 * (scratch-parser) expects to read back.
 *
 * Unlike the earlier build/package-sb3.js, this reads the JSON path it is given instead of
 * re-requiring one hardcoded project module.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const JSZip = require('/Users/tuanln/Ai-Code/thingblock-editor/node_modules/jszip');

const inPath = process.argv[2];
const outPath = process.argv[3];
if (!inPath || !outPath) throw new Error('usage: node pack-tb.js <project.json> <out.tb>');

const project = JSON.parse(fs.readFileSync(inPath, 'utf8'));
const zip = new JSZip();
zip.file('project.json', JSON.stringify(project));

zip
  .generateAsync({
    type: 'nodebuffer',
    mimeType: 'application/x.scratch.sb3',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })
  .then((buf) => {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, buf);
    console.log(`${path.basename(outPath).padEnd(34)} ${String(buf.length).padStart(6)} bytes`);
  });
