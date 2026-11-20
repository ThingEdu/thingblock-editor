# Agent Guide: thingblock-blocks

## What this is

`thingblock-blocks` is a TypeScript library that extends Blockly (an npm dependency, not a fork) with Scratch-style blocks, fields, rendering, events and an Arduino code generator. Its build (`dist/main.mjs`) is consumed by `thingblock-gui`.

Never edit `node_modules/blockly/`; extend or override from `src/`.

## Layout

```text
src/
├── blocks/        block definitions per category
├── events/        custom Blockly events
├── fields/        custom Blockly fields
├── generators/    Arduino C++ code generator
├── renderer/      custom renderer
└── index.ts       entry point; registers everything with Blockly
```

## Commands

```sh
npm run build        # dist/main.mjs
npm run format
npm run test:lint
npm run test         # unit + browser tests
npm run test:unit
npm run test:browser
```
