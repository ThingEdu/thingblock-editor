import React from 'react';
import {render, screen} from '@testing-library/react';
import '@testing-library/jest-dom';
import CodeView from '../../../src/components/code-view/code-view.jsx';

test('shows the code with line numbers', () => {
    const {container} = render(
        <CodeView
            code={'void setup() {\n}'}
            language="arduino"
        />
    );

    expect(container.querySelector('pre').textContent).toContain('void setup()');
    expect(screen.getByText('2')).toBeInTheDocument();
});
