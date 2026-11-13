import React from 'react';
import {IntlProvider} from 'react-intl';
import {fireEvent, render, screen} from '@testing-library/react';
import '@testing-library/jest-dom';
import MonitorView from '../../../src/components/monitor-view/monitor-view';

describe('MonitorView', () => {
    const view = props => (
        <IntlProvider locale="en">
            <MonitorView
                logs={[
                    {message: 'first message'},
                    {message: 'second message'}
                ]}
                onClear={jest.fn()}
                onSend={jest.fn()}
                {...props}
            />
        </IntlProvider>
    );
    const renderMonitorView = props => render(view(props));

    describe('auto-scroll', () => {
        // jsdom has no layout, so the scrollable element's geometry must be stubbed.
        const stubGeometry = (el, {scrollHeight, scrollTop, clientHeight}) => {
            Object.defineProperty(el, 'scrollHeight', {value: scrollHeight, configurable: true});
            Object.defineProperty(el, 'clientHeight', {value: clientHeight, configurable: true});
            Object.defineProperty(el, 'scrollTop', {value: scrollTop, writable: true, configurable: true});
        };

        test('jumping to latest scrolls to the bottom and hides the button', () => {
            const scrollTo = jest.fn();
            Element.prototype.scrollTo = scrollTo;
            renderMonitorView({});
            const content = screen.getByText('first message').parentElement;
            stubGeometry(content, {scrollHeight: 500, scrollTop: 0, clientHeight: 100});
            fireEvent.scroll(content);

            fireEvent.click(screen.getByRole('button', {name: 'Scroll to latest output'}));

            expect(scrollTo).toHaveBeenCalledWith({top: 500, behavior: 'smooth'});
            expect(screen.queryByRole('button', {name: 'Scroll to latest output'})).not.toBeInTheDocument();
        });
    });

    describe('prompt', () => {
        test('shows prompt text and answer placeholder when prompt prop is set', () => {
            renderMonitorView({prompt: 'What is your name?'});

            expect(screen.getByText('What is your name?')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('Type your answer...')).toBeInTheDocument();
        });

        test('shows prompt and input for empty-string prompt (promptless ask)', () => {
            renderMonitorView({prompt: ''});

            expect(screen.getByPlaceholderText('Type your answer...')).toBeInTheDocument();
        });

        test('calls onSend with empty string when prompt is active and input is empty', () => {
            const onSend = jest.fn();
            renderMonitorView({prompt: 'What?', onSend});

            fireEvent.click(screen.getByRole('button', {name: 'Send'}));

            expect(onSend).toHaveBeenCalledWith('');
        });

        test('does not call onSend when no prompt and input is empty', () => {
            const onSend = jest.fn();
            renderMonitorView({onSend});

            fireEvent.click(screen.getByRole('button', {name: 'Send'}));

            expect(onSend).not.toHaveBeenCalled();
        });

        test('clears pre-existing input value when prompt becomes active', () => {
            const {rerender} = renderMonitorView({logs: []});

            fireEvent.change(screen.getByPlaceholderText('Send message...'), {
                target: {value: 'half-typed text'}
            });

            rerender(view({logs: [], prompt: 'Are you ready?'}));

            expect(screen.getByPlaceholderText('Type your answer...')).toHaveValue('');
        });
    });

    test('calls onBaudChange with a number when a new rate is picked', () => {
        const onBaudChange = jest.fn();
        renderMonitorView({baudRate: 9600, onBaudChange});

        fireEvent.change(screen.getByRole('combobox', {name: 'Serial monitor baud rate'}), {
            target: {value: '115200'}
        });

        expect(onBaudChange).toHaveBeenCalledWith(115200);
    });
});
