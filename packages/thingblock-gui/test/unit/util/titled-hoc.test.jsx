import React from 'react';
import {render} from '@testing-library/react';
import {IntlProvider} from 'react-intl';
import {Provider} from 'react-redux';
import configureStore from 'redux-mock-store';
import TitledHOC from '../../../src/lib/titled-hoc.jsx';
import viMessages from '../../../src/locales/vi.json';

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
