const path = require('path');
const tap = require('tap');
const {test} = tap;
const fs = require('fs');
const readFileToBuffer = require('../fixtures/readProjectFile').readFileToBuffer;
const VirtualMachine = require('../../src/index');

test('Load external extensions', async t => {
    const vm = new VirtualMachine();
    const testFiles = fs.readdirSync('./test/fixtures/load-extensions/confirm-load/');

    // Test each example extension file
    for (const file of testFiles) {
        const ext = file.split('-')[0];
        const uri = path.resolve(__dirname, `../fixtures/load-extensions/confirm-load/${file}`);
        const project = readFileToBuffer(uri);

        await t.test('Confirm expected extension is installed in example projects', extTest => {
            vm.loadProject(project)
                .then(() => {
                    extTest.ok(vm.extensionManager.isExtensionLoaded(ext));
                    extTest.end();
                });
        });
    }

    vm.quit();
    t.end();
});
