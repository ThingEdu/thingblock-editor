import {getProjectTitleFromFilename} from '../../../src/lib/sb-file-uploader-utils';

describe('getProjectTitleFromFilename', () => {
    test('correctly sets title with .tb filename', () => {
        const projectName = getProjectTitleFromFilename('my project is great.tb');
        expect(projectName).toBe('my project is great');
    });

    test('sets blank title for Scratch project files, which do not load', () => {
        expect(getProjectTitleFromFilename('my project is great.sb3')).toBe('');
        expect(getProjectTitleFromFilename('my project is great.sb2')).toBe('');
    });

    test('sets blank title with filename with no extension', () => {
        const projectName = getProjectTitleFromFilename('my project is great');
        expect(projectName).toBe('');
    });
});
