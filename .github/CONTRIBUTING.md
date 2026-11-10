# Contributing to ThingBlock Editor

Thanks for helping build ThingBlock, a block-based firmware IDE for Arduino-compatible hardware. This document
covers how to report problems and how to get a change merged. By taking part you agree to follow our
[Code of Conduct](CODE_OF_CONDUCT.md).

## Reporting bugs and suggesting features

- Search [existing issues](https://github.com/ThingEdu/thingblock-editor/issues) before opening a new one.
- For a bug, give steps that reproduce it, what you expected and what happened, and your OS, browser or desktop
  app version, and board.
- For a feature, describe the problem it solves before the solution. Larger changes should be discussed in an
  issue before any code is written.

## Development setup

The repository is an npm workspaces monorepo; see [README.md](../README.md) for what each package does.

```sh
npm ci           # install all workspace dependencies
npm run build    # build every package
npm test         # test every package
```

Per-package commands run from the package folder, or from the root with `--workspace=packages/<name>`.
Board-facing features also need the [ThingBlock Link](https://github.com/ThingEdu/thingblock-link) helper running
locally.

## Making a change

1. Fork the repository and branch from `develop`.
2. Keep the change focused on one issue; don't refactor or restyle code you weren't asked to touch.
3. Follow the conventions of the package you work in (language, bundler, test framework, style). New packages use
   TypeScript, Vite and Vitest.
4. When fixing a bug, start with a test that reproduces it.
5. Make sure `npm run build`, `npm test` and the package's lint pass.
6. Update documentation that your change affects, including `AGENTS.md`.
7. Open a pull request against `develop` and fill in the template.

### English for development

Everything a developer or lesson author types is English: identifiers, keys and values, file and folder names,
comments, commit messages and error messages. Vietnamese is used only for learner-facing content, such as lesson
text and the translations in `src/locales/vi.json`.

### User-visible strings

GUI strings go through `react-intl` with the English text as `defaultMessage`; add the Vietnamese translation to
the package's `src/locales/vi.json`. Don't hardcode English in JSX.

### Commit messages

Commits must follow [Conventional Commits](https://www.conventionalcommits.org/) (for example
`fix(gui): keep the tab strip aligned with the workspace`). A husky hook runs commitlint and rejects commits that
don't conform.

### AI-assisted contributions

You may use AI tools, but you remain responsible for every line you submit. Don't submit code you can't explain
and defend in review.

## Releases

Packages are published only by the CI release pipeline. Never publish manually; `prepublishOnly` blocks it.

## License

By contributing, you agree that your contributions are licensed under the repository's [license](../LICENSE).
