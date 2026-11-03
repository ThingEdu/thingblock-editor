import React from 'react';
import {IntlProvider} from 'react-intl';
import {fireEvent, render, screen} from '@testing-library/react';
import '@testing-library/jest-dom';
import CodeView from '../../../src/components/code-view/code-view.jsx';

const renderCodeView = props => render(
    <IntlProvider locale="en">
        <CodeView
            code={'void setup() {\n}'}
            language="arduino"
            {...props}
        />
    </IntlProvider>
);

test('folded, it shows only its header, which opens it', () => {
    const onToggle = jest.fn();
    const {container} = renderCodeView({collapsed: true, onToggle});

    expect(container.querySelector('pre')).toBeNull();
    const header = screen.getByRole('button', {name: /Generated Code/});
    expect(header).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(header);
    expect(onToggle).toHaveBeenCalledTimes(1);
});

test('open, it shows the code with line numbers', () => {
    const {container} = renderCodeView({collapsed: false, onToggle: jest.fn()});

    expect(screen.getByRole('button', {name: /Generated Code/})).toHaveAttribute('aria-expanded', 'true');
    expect(container.querySelector('pre').textContent).toContain('void setup()');
    expect(screen.getByText('2')).toBeInTheDocument();
});

test('without onToggle the header is plain text and the code always shows', () => {
    const {container} = renderCodeView({});

    expect(screen.queryByRole('button')).toBeNull();
    expect(container.querySelector('pre')).not.toBeNull();
});
