The projects in this folder each use one extension. `integration/vm-state-snapshot.js` loads every `.sb3` under
`test/fixtures`, these included, and compares the loaded VM state, including the project's extension list, against
`tap-snapshots/vm-state-snapshot/`.

Name a new project `[extensionID]-rest-of-file-name.sb3` and generate its snapshot with
`TAP_SNAPSHOT=1 npm run tap:integration`.
