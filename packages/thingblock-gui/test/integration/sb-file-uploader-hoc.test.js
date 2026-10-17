import path from 'path';
import SeleniumHelper from '../helpers/selenium-helper';

const {
    clickText,
    clickXpath,
    findByXpath,
    getDriver,
    loadUri
} = new SeleniumHelper();

const uri = path.resolve(__dirname, '../../build/index.html');

let driver;

const FILE_MENU_XPATH = '//button[contains(@class, "menu-bar_menu-bar-item")]' +
    '[*[contains(@class, "menu-bar_collapsible-label")]//*[text()="File"]]';

describe('Loading scratch gui', () => {
    beforeAll(() => {
        driver = getDriver();
    });

    afterAll(async () => {
        await driver.quit();
    });

    test('Loading a .tb file from computer succeeds and titles the project from the filename', async () => {
        await loadUri(uri);
        await clickXpath(FILE_MENU_XPATH);
        await clickText('Load from your computer');
        const input = await findByXpath('//input[@accept=".tb"]');
        await input.sendKeys(path.resolve(__dirname, '../fixtures/project1.tb'));
        // this test will fail if an alert appears, e.g. in SBFileUploaderHOC's onload() function
        await findByXpath('//input[@value="project1"]');
    });
});
