import React from 'react';
import {render} from '@testing-library/react';
import {IntlProvider} from 'react-intl';
import {Provider} from 'react-redux';
import configureStore from 'redux-mock-store';
import TitledHOC from '../../../src/lib/titled-hoc.jsx';
import viMessages from '../../../src/locales/vi.json';
import {withThingBlockMessages} from '../../../src/reducers/locales';

const titleSet = (locale, messages) => {
    const store = configureStore()({
        scratchGui: {projectState: {loadingState: 'SHOWING_WITHOUT_ID'}, projectTitle: ''}
    });
    const Titled = TitledHOC(() => <div />);
    render(
        <Provider store={store}>
            <IntlProvider
                locale={locale}
                messages={messages}
            >
                <Titled />
            </IntlProvider>
        </Provider>
    );
    return store.getActions().find(a => a.type === 'projectTitle/SET_PROJECT_TITLE').title;
};

test('a new project is called a ThingBlock project, so it saves as "ThingBlock Project.tb"', () => {
    expect(titleSet('en', {})).toBe('ThingBlock Project');
});

test('in Vietnamese a new project is "Dự án ThingBlock"', () => {
    expect(titleSet('vi', viMessages)).toBe('Dự án ThingBlock');
});

// The app's English messages come from scratch-l10n, which calls a new project "Scratch Project".
// (Unit tests map scratch-l10n's messages to a mock, so feed the merge real-looking ones.)
const scratchL10n = {
    en: {'gui.gui.defaultProjectTitle': 'Scratch Project', 'gui.menuBar.file': 'File'},
    fr: {'gui.gui.defaultProjectTitle': 'Projet Scratch'},
    vi: {'gui.gui.defaultProjectTitle': 'Dự án Scratch'}
};

test('with scratch-l10n\'s English messages a new project is still a ThingBlock project', () => {
    const merged = withThingBlockMessages(scratchL10n, viMessages);
    expect(titleSet('en', merged.en)).toBe('ThingBlock Project');
    expect(merged.en['gui.menuBar.file']).toBe('File');
});

test('no locale calls a new project a Scratch project; Vietnamese keeps its own wording', () => {
    const merged = withThingBlockMessages(scratchL10n, viMessages);
    expect(titleSet('fr', merged.fr)).toBe('ThingBlock Project');
    expect(titleSet('vi', merged.vi)).toBe('Dự án ThingBlock');
});

test('an untouched new project follows a language change; a renamed one keeps its name', () => {
    const merged = withThingBlockMessages(scratchL10n, viMessages);
    const Titled = TitledHOC(() => <div />);
    const renderIn = (store, locale) => (
        <Provider store={store}>
            <IntlProvider
                locale={locale}
                messages={merged[locale]}
            >
                <Titled />
            </IntlProvider>
        </Provider>
    );
    const titlesAfterSwitch = projectTitle => {
        const store = configureStore()({
            scratchGui: {projectState: {loadingState: 'SHOWING_WITH_ID'}, projectTitle}
        });
        const {rerender} = render(renderIn(store, 'en'));
        store.clearActions();
        rerender(renderIn(store, 'vi'));
        return store.getActions()
            .filter(a => a.type === 'projectTitle/SET_PROJECT_TITLE')
            .map(a => a.title);
    };
    expect(titlesAfterSwitch('ThingBlock Project')).toEqual(['Dự án ThingBlock']);
    expect(titlesAfterSwitch('Xe dò line')).toEqual([]);
});
