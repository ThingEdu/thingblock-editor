# Agent Guide: thingblock-editor

## What this is

`thingblock-editor` is an npm workspaces monorepo that turns the Scratch editor into a block-based firmware IDE for Arduino-compatible hardware. Packages use the `@thingblock/` scope, except `task-herder` (`@scratch/`). `thingblock-desktop` builds the editor from a sibling checkout of this repo.

## Layout

```text
apps/                        deployed apps (private workspaces)
├── thingblock/              TypeScript editor app, a port of thingblock-gui
└── thingblock-virtualspace/ web-only virtual robot environment
packages/                    libraries
├── thingblock-gui/          React editor UI
├── thingblock-vm/           VM that runs projects
├── thingblock-blocks/       Blockly-based block editor (has its own AGENTS.md)
├── thingblock-resource/     resource packs: device manifests, peripheral blocks, Arduino codegen
├── thingblock-storage/      asset and project storage
└── task-herder/             async task scheduler
scripts/                     monorepo utility scripts
```

Each package has its own language, bundler and test framework; check its `package.json` and follow what is already there.

## Commands

From the repo root:

```sh
npm ci
npm start           # thingblock-gui dev server
npm run build       # build all workspaces
npm run build:libs  # build the libraries only
npm test            # test all workspaces
```

Per package: `npm test --workspace=packages/<name>`, or run scripts from the package directory. Add a dependency with `npm install <pkg>@<version> --workspace=packages/<name>`.

Build order matters:

- `thingblock-gui` Jest tests resolve `thingblock-vm`'s `dist/` bundle; rebuild the VM (`npx webpack --progress` in `packages/thingblock-vm`) after changing it.
- `apps/thingblock` types the VM from `dist/types`; run `npm run build:libs` before its `tsc`.

After changing GUI messages, run `npm run i18n:src` in `packages/thingblock-gui`.

Commits must follow Conventional Commits; a commitlint hook rejects others. Packages are published by CI only.
