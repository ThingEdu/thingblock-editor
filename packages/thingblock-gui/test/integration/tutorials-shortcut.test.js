import path from 'path';
import SeleniumHelper from '../helpers/selenium-helper';

const {
    clickText,
    findByXpath,
    getDriver,
    loadUri
} = new SeleniumHelper();

const uri = path.resolve(__dirname, '../../build/index.html?tutorial=all');
const uriPrefix = path.resolve(__dirname, '../../build/index.html?tutorial=');

let driver;

describe('Working with shortcut to Tutorials library', () => {
    beforeAll(() => {
        driver = getDriver();
    });

    afterAll(async () => {
        await driver.quit();
    });

    test('opens with the Tutorial Library showing', async () => {
        await loadUri(uri);
        await clickText('Getting Started with ThingBot');
        await findByXpath('//img[contains(@class, "step-image")]');

        // Make sure the background is still interactable
        await clickText('Code');
    });

    test('can open a tutorial directly by urlId', async () => {
        await loadUri(`${uriPrefix}thingbot-getting-started`);
        // should open the tutorial card immediately
        await findByXpath('//img[contains(@class, "step-image")]');
    });
    // @todo navigating cards, etc.
});
