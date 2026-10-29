import path from 'path';
import SeleniumHelper from '../helpers/selenium-helper';

const {
    clickButton,
    clickText,
    findByXpath,
    getDriver,
    getLogs,
    loadUri
} = new SeleniumHelper();

let driver;

describe('blocks example', () => {
    const uri = path.resolve(__dirname, '../../build/blocks-only.html');

    beforeAll(() => {
        driver = getDriver();
    });

    afterAll(async () => {
        await driver.quit();
    });

    // skipping per https://github.com/LLK/scratch-gui/issues/4902 until we have better approach
    test.skip('Change categories', async () => {
        await loadUri(`${uri}`);
        await clickText('Looks');
        await clickText('Sound');
        await clickText('Events');
        await clickText('Control');
        await clickText('Sensing');
        await clickText('Operators');
        await clickText('Variables');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for scroll animation
        await clickText('Make a Variable');
        let el = await findByXpath("//input[@name='New variable name:']");
        await el.sendKeys('score');
        await clickButton('OK');
        await clickText('Make a Variable');
        el = await findByXpath("//input[@name='New variable name:']");
        await el.sendKeys('second variable');
        await clickButton('OK');
        const logs = await getLogs();
        await expect(logs).toEqual([]);
    });
});
