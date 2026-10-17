Tests in this folder are run in scratch by integration/load-extensions.js to determine whether an extension can load properly. The test projects in this folder are examples of non-core extensions usage. Read `integration/load-extensions.js` for more.

### Adding new extensions

When extending Scratch with non-core extensions, save an example project to this the appropiate subdirectory based on which test in `load-extensions.js` will be using that test file. The file should use the following naming convention:

`[extensionID]-rest-of-file-name.[file type sb3 or sb2]`

The load-extensions.js test will automatically test this new project file since it gets a list of all files in its repsective subdirectories for testing and extracts the extension id from the first section of the file same separated by a dash.

Each of the `[extensionID]-simple-project` test files have been made as the simplest possible cases for loading the extension. This means that only one block has been added to the project and that block is from the relevant extension.

### Adding more example projects

Sometimes we need to test more complex projects to catch cases and contexts where an extension should load and doesn't, even though its `[extensionID]-simple-project` files pass. We can save those project files using the convention [extensionID]-project-name.
