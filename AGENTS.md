# Agent Guide: scratch-editor

## AI-assisted development policy

See [CONTRIBUTING.AI.md](https://github.com/scratchfoundation/.github/blob/main/CONTRIBUTING.AI.md) for Scratch's
org-wide policy on AI-assisted contributions. The short version: human developers remain responsible for all code
they submit. Do not submit code you cannot explain and defend in a review.

## Agent defaults

Use these defaults unless the user asks otherwise:

1. Keep changes minimal and scoped to the user request. Do not refactor surrounding code, add features, or clean up
   style in areas you weren't asked to touch.
2. Do not preserve backward compatibility when it isn't required. When all callers are internal to a package,
   rename or restructure freely. All packages in this repo are published to npm and consumed externally, so treat
   each package's public exports as a contract and preserve compatibility unless explicitly told otherwise.
3. Write comments that explain the current code, not its history. Do not reference prior implementations,
   intermediate states, or what the code "used to do." If an approach seems counterintuitive, explain why it is
   correct now — not why it changed.
4. Prefer fixing root causes over adding surface-level workarounds or assertions.
5. When fixing a bug, start by adding one or more failing tests that reproduce it, then implement the fix. Iterate
   until all tests pass, including but not limited to the new tests. Use the test framework already in use in that
   package — see "Packages at a glance" below.
6. When adding runtime guards for states that should never happen, log actionable context (function name, relevant
   IDs, key flags) rather than failing silently. Use `console.warn` for recoverable states and `console.error` for
   invalid required data.
7. Preserve failure semantics when refactoring. An implicit crash (null dereference, `!` assertion) should become
   an explicit `throw` with a useful message — not silent failure. Code that previously wouldn't crash still
   shouldn't, but consider whether a warning is warranted. Replacing a potential null dereference with
   `if (!foo) return` could make a bug harder to find; `if (!foo) throw new Error(...)` surfaces it.
8. Do not add error handling, fallbacks, or validation for scenarios that cannot happen. Trust internal code and
   framework guarantees. Only validate at system boundaries (user input, external APIs).

## What this repository is

`scratch-editor` is an npm workspaces monorepo that extends the Scratch visual programming environment into a
drag-and-drop firmware development IDE for Arduino-compatible hardware. Users program physical devices —
motors, sensors, servos, LEDs — using Scratch blocks, with the extension architecture designed to support any
Arduino-compatible device without changes to the core editor.

The longer-term directions include educational hardware programming (making physical computing accessible to
beginners through Scratch's block metaphor) and a general-purpose hardware extension platform reusable for
future device integrations.

Packages use the `@thingblock/` npm scope, except `task-herder`, which keeps its upstream `@scratch/` name. The
desktop shell (`thingblock-desktop`) builds `thingblock-gui` from a sibling checkout of this repo.

## Build and lint

Run workspace-wide commands from the repo root:

```sh
npm run build    # Build all packages (production)
npm test         # Test all packages
npm run clean    # Clean all packages
```

Run per-package commands from the package directory, or from the root with `--workspace`:

```sh
cd packages/thingblock-vm && npm test
# or equivalently:
npm test --workspace=packages/thingblock-vm
```

Each package defines its own `test` and `build` scripts; see "Packages at a glance" for specifics.

**Commit messages are enforced.** Husky + commitlint validate every commit against the
[Conventional Commits](https://www.conventionalcommits.org/) format. A commit that doesn't conform will be
rejected by the pre-commit hook.

## Repository layout

```text
apps/
├── thingblock/               Editor web app (bare scaffold, not used yet)
└── thingblock-virtualspace/  Web-only virtual robot environment (private, never published)
packages/
├── thingblock-gui/         React-based editor UI
├── thingblock-vm/          Virtual machine that runs Scratch projects
├── thingblock-blocks/      Blockly-based block editor (workspace fork)
├── thingblock-storage/     Asset and project file storage layer
├── thingblock-ui/          UI components shared by ThingBlock apps (private, source-only)
└── task-herder/            Async task scheduler with rate limiting
scripts/                    Monorepo-level utility scripts
```

`apps/` holds deployed applications; they are private workspaces, not npm packages. `packages/` holds the
libraries.

## Packages at a glance

| Package | Language | Bundler | Tests |
| - | - | - | - |
| `thingblock-gui` | JavaScript / JSX (some TypeScript) | webpack | Jest |
| `thingblock-vm` | JavaScript (migrating to TypeScript) | webpack | Tap |
| `thingblock-blocks` | TypeScript | webpack | Vitest |
| `thingblock-storage` | JavaScript | webpack | Jest |
| `task-herder` | TypeScript | Vite | Vitest |
| `thingblock-ui` | TypeScript | none (consumers bundle its source) | Vitest |
| `thingblock` (app) | TypeScript | Vite | Vitest |
| `thingblock-virtualspace` (app) | TypeScript | Vite | Vitest |

`task-herder` represents the target stack for new packages (TypeScript + Vite + Vitest). `thingblock-blocks` uses
the same test framework (Vitest) but retains webpack as its bundler. The remaining packages reflect the legacy
stack and are being migrated incrementally.

## Technology conventions by package

**For existing packages**: follow the conventions already in use in that package — language, bundler, test
framework, and style. Do not introduce TypeScript into a JavaScript package, or Vitest into a Jest package,
unless that migration is the explicit goal of the task.

**For new packages**: follow the org defaults — TypeScript, Vite, Vitest, `eslint-config-scratch`.

All packages use ESLint 9 flat config (`eslint.config.mjs`) with `eslint-config-scratch`. If a package also uses
Prettier (currently `task-herder`), run `npm run format` in addition to lint.

### thingblock-gui specifics

- React functional components with hooks for new code; class components exist in older code.
- Keep components presentational where possible; connect to Redux only in container files.
- Use `react-intl` / `FormattedMessage` for all user-visible strings. Do not hardcode English in JSX.
- After adding or changing messages, run `npm run i18n:src` to update the translation source file.
- ThingBlock's own GUI strings are not in `scratch-l10n`: English is each message's `defaultMessage`, Vietnamese
  goes in `src/locales/vi.json` (keyed by message id, edited by hand) and is merged over scratch-l10n's `vi` in
  `reducers/locales.js`.
- Integration tests (`test/integration/`) require a browser environment via Jest + jsdom; they are slow and
  should not be run unnecessarily. Smoke tests (`test/smoke/`) require a live server.
- **Sprite UI is removed.** The right panel (formerly stage + sprite selector) is `components/side-panel`. With a
  board selected it shows `CodeView` and `containers/board-monitor.jsx` (board serial, baud rate); with none it
  shows only `containers/host-monitor.jsx` (block print output, "ask and wait"). Each pane can be hidden from the
  panel's menu. Both monitors own their state and render `components/monitor-view`. While a lesson is open,
  `components/left-panel` sits left of the editor and holds the lesson panel, so the editor's tab strip moves with
  the workspace. With a board selected, the panel also shows `containers/sim-panel.jsx` above the code view:
  a headerless card whose Run/Pause, Step, Reset and Mute are an `ActionMenu` FAB like the monitor's. The VM still runs one implicit device target, but no sprite
  UI renders.
- `thingblock-gui`'s webpack build (and dev server) compiles `@thingblock/thingblock-vm` from source through its
  `webpack` export condition; the GUI's `webpack.config.js` adds the ts-loader rule for the VM's `.ts` files. Jest instead
  resolves the gitignored `dist/` bundle, so a fresh checkout — or any change to `thingblock-vm` source — needs
  `npx webpack --progress` in `packages/thingblock-vm` before `thingblock-gui` tests see it; otherwise they silently
  run against a stale bundle.
- The simulator worker is shared through `src/lib/sim/sim-client.js` (worker built by `sim-worker-factory.js`). The
  lesson panel (`containers/lesson-panel.jsx`, reducer `lesson`) sends it `watch` rules and renders its `check`
  verdicts. The Scratch tutorial decks and cards are gone; the Lessons menu opens `containers/lesson-library.jsx`,
  fed by the pack's `tutorials/index.json`.

### thingblock-ui specifics

- React 18 components in TSX, exported from `src/index.ts` and consumed from source; the consumer's bundler
  compiles them. `react` is a peer dependency.
- Styles are CSS modules named `*.module.css`, with camelCase class names so `styles.fooBar` works in both
  webpack and Vite. They use the `$variable` tokens in `css/` (`colors`, `units`, `z-index`, exported as
  `@thingblock/thingblock-ui/css/*`), so a consumer needs `postcss-import` and `postcss-simple-vars`.
- `thingblock-gui` still has its own copies of these components and tokens; nothing consumes `thingblock-ui` yet.

### thingblock-blocks specifics

- Block definitions live in `src/blocks/`. Each file registers blocks via `Blockly.Blocks.<block_id> = { init() }`.
- `src/index.ts` imports all block files and exports the configured Blockly instance.
- Uses TypeScript throughout; follow the existing patterns when adding or removing block definitions.

### thingblock-vm specifics

- Extension entry points live in `src/extensions/`. Each extension exports a class with `getInfo()` and block
  implementation methods. New and converted extensions are TypeScript and implement `Extension` from
  `src/extensions/extension.ts`; because they compile to ES modules, `extension-manager.js` must require them
  with `.default`. `npm run typecheck` (part of `npm test`) is what checks them — eslint alone does not.
- TS unit tests are `test/unit/*.ts`. Tap runs them through ts-node with `tsconfig.test.json` (CommonJS output),
  which the tap scripts select via `TS_NODE_PROJECT`. JS code that `require`s a TS module takes its `.default` (or
  a named export), since TS compiles to ES modules.
- The engine (`src/engine/`) is TypeScript. Every event goes through one untyped `EventBus` per VM
  (`src/event/event-bus.ts`), shared as `vm.events` and `runtime.events`, with names grouped by the code that emits
  them in `src/event/event-name.ts`. The GUI subscribes on `vm.events`.
- `VirtualMachine` (`src/virtual-machine/index.ts`) keeps only lifecycle and setup methods flat; the rest lives
  in owned parts: `vm.workspace` (Blockly events, editing target, workspace rendering), `vm.project` (load,
  save), `vm.devices` (boards, resource packs, peripherals) and `vm.link` (board operations). Each part is built
  from the runtime, an `emit` function and the sibling parts it uses, never the VM itself; add new behavior to
  the part it belongs to. The runtime holds the only copy of the editing target.
- Firmware device manifests live in `src/extensions/devices/`. Board-selection icons belong in each device's
  `assets/icon.svg` and are exposed through `vm.devices.getDeviceList()` as `iconURL`; do not add GUI-side icon
  maps for VM devices.
- i18n is manual: the editor ships English and Vietnamese only. English lives inline as each `formatMessage`
  call's `default`; Vietnamese belongs in `src/locales/vi.json`, keyed by message id, and reaches the runtime
  through `vm.setLocale()`. There is no extraction step — add and remove ids in `vi.json` by hand.
- The target model is firmware-only: a project is a stage plus one device, each an `engine/target.ts` `Target`
  hosting blocks, variables and comments — no sprites, clones, costumes, sounds, rendering or motion.
  Projects are `.tb` files in sb3 format (`serialization/sb3.js`), persisting blocks/variables plus the firmware
  `board` field; saves carry a placeholder costume and an empty sounds list only because scratch-parser requires
  them. Scratch 1/2 projects (`.sb`/`.sb2`) are not supported, and saved projects no longer round-trip through
  stock Scratch.
- Resource packs are served by the link helper (`LinkController.resourceOrigin` → the helper backend's `/resources` route) unless the
  host supplies its own base through `globalThis.__THINGBLOCK_RESOURCE_BASE__`, read once in `link-controller.ts`
  and passed to the helper backend as `resourceBase`. That global is the seam for a host that ships the packs itself —
  the Tauri desktop shell does, because Chromium blocks the editor's cross-address-space HTTP calls into
  loopback. Keep the editor host-agnostic: no shell-specific assets or paths belong in its build.
- A peripheral pack's manifest `id` must equal the opcode prefix its `blocks.ts` registers (pack `serial` owns
  `serial_*`). The sb3 deserializer derives a saved project's extension ids from opcode prefixes, and project load
  skips any id `DeviceManager.isDeviceExtension` owns before asking `ExtensionManager`, so a pack whose id differs
  cannot be recognized as a device extension. `test/packIds.test.ts` enforces this across every pack.
- Lessons live in `packages/thingblock-resource/src/tutorials/<id>/lesson.<lang>.md` (see that folder's README).
  Everything authors and developers type there is English (front matter, `> hint:`, `check:`, `point at:`, file
  names); only learner-facing text is Vietnamese. `scripts/build-lessons.mjs` compiles them to
  `dist/thingblock-resource/tutorials/` with an index; a bad rule, missing image or unknown tour anchor fails the
  pack build. `test/lessons/lessons.test.ts` grades each lesson's
  `solutions/*.tb` the way the editor grades a learner, so every shipped lesson is proven solvable. Rule grammar and
  grading are in `packages/thingblock-sim/src/checker/` (package export `./checker`); `rules.ts` must stay
  import-free because the Node build script loads it through type stripping. `vm.devices.getTutorialsOrigin()` gives
  the GUI the base for fetching lessons.
- `virtual-machine/resource-pack-manager.ts` is a placeholder recording the direction for resource packs as the
  general feature unit (not only devices/peripherals); read its header before adding a new pack kind.

## npm workflow

Use `npm ci` from the repo root to install all workspace dependencies from `package-lock.json`.

When adding or updating a dependency in a specific package:

```sh
npm install some-package@version --workspace=packages/thingblock-vm
```

This updates both `package.json` in the target package and the root `package-lock.json`.

Keep each section of a package's `package.json` (`dependencies`, `devDependencies`, `scripts`) in alphabetical
order. The same applies to the root `package.json`.

**Do not publish packages manually.** Every package has a `prepublishOnly` script that will error if you try.
Publishing is handled exclusively by the CI release pipeline.

## Before submitting changes

Review all changes and confirm:

- **Scope**: Changes are confined to the user request; nothing extra was added or modified.
- **Correctness**: Logic is sound and edge cases were considered.
- **Comments**: Comments are necessary, short, and clear; self-explanatory code has none.
- **Simplicity**: Implementation is as simple as possible; no speculative abstractions remain.
- **Documentation**: Update `AGENTS.md` and any other documentation files whose content is affected by the change
  (commands, repo structure, conventions, etc.). The "Packages at a glance" table is particularly prone to going
  stale when a package migrates its tooling.
- **Commit format**: Commit message follows Conventional Commits — the husky hook will reject it otherwise.
- **Build passes**: `npm run build` (or `npm run build` in the affected package) completes successfully.
- **Tests pass**: `npm test` (or `npm test` in the affected package) completes with no failures.
- **No lint errors**: `npm run test:lint` (or `npm run lint`) passes in the affected package.
