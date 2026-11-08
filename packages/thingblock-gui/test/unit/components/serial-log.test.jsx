import React from 'react';
import {IntlProvider} from 'react-intl';
import {fireEvent, render, screen} from '@testing-library/react';
import '@testing-library/jest-dom';
import SerialLog from '../../../src/components/serial-log/serial-log';

describe('SerialLog', () => {
    const renderSerialLog = props => render(
        <IntlProvider locale="en">
            <SerialLog
                logs={[
                    {message: 'first message'},
                    {message: 'second message'}
                ]}
                {...props}
            />
        </IntlProvider>
    );

    describe('auto-scroll', () => {
        // jsdom has no layout, so the scrollable element's geometry must be stubbed.
        const stubGeometry = (el, {scrollHeight, scrollTop, clientHeight}) => {
            Object.defineProperty(el, 'scrollHeight', {value: scrollHeight, configurable: true});
            Object.defineProperty(el, 'clientHeight', {value: clientHeight, configurable: true});
            Object.defineProperty(el, 'scrollTop', {value: scrollTop, writable: true, configurable: true});
        };

        test('shows the jump-to-latest button after the user scrolls up', () => {
            renderSerialLog({});
            const content = screen.getByText('first message').parentElement;
            stubGeometry(content, {scrollHeight: 500, scrollTop: 0, clientHeight: 100});

            fireEvent.scroll(content);

            expect(screen.getByRole('button', {name: 'Scroll to latest output'})).toBeInTheDocument();
        });

        test('jumping to latest scrolls to the bottom and hides the button', () => {
            const scrollTo = jest.fn();
            Element.prototype.scrollTo = scrollTo;
            renderSerialLog({});
            const content = screen.getByText('first message').parentElement;
            stubGeometry(content, {scrollHeight: 500, scrollTop: 0, clientHeight: 100});
            fireEvent.scroll(content);

            fireEvent.click(screen.getByRole('button', {name: 'Scroll to latest output'}));

            expect(scrollTo).toHaveBeenCalledWith({top: 500, behavior: 'smooth'});
            expect(screen.queryByRole('button', {name: 'Scroll to latest output'})).not.toBeInTheDocument();
        });
    });

    describe('prompt prompt', () => {
        test('shows prompt text and answer placeholder when prompt prop is set', () => {
            renderSerialLog({prompt: 'What is your name?'});

            expect(screen.getByText('What is your name?')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('Type your answer...')).toBeInTheDocument();
        });

        test('shows send placeholder when no prompt is active', () => {
            renderSerialLog({});

            expect(screen.getByPlaceholderText('Send message...')).toBeInTheDocument();
            expect(screen.queryByPlaceholderText('Type your answer...')).not.toBeInTheDocument();
        });

        test('shows prompt and input for empty-string prompt (promptless ask)', () => {
            renderSerialLog({prompt: ''});

            expect(screen.getByPlaceholderText('Type your answer...')).toBeInTheDocument();
        });

        test('calls onSend with empty string when prompt is active and input is empty', () => {
            const onSend = jest.fn();
            renderSerialLog({prompt: 'What?', onSend});

            fireEvent.click(screen.getByRole('button', {name: 'Send'}));

            expect(onSend).toHaveBeenCalledWith('');
        });

        test('does not call onSend when no prompt and input is empty', () => {
            const onSend = jest.fn();
            renderSerialLog({onSend});

            fireEvent.click(screen.getByRole('button', {name: 'Send'}));

            expect(onSend).not.toHaveBeenCalled();
        });

        test('calls onBaudChange with a number when a new rate is picked', () => {
            const onBaudChange = jest.fn();
            renderSerialLog({baudRate: 9600, onBaudChange});

            fireEvent.change(screen.getByRole('combobox', {name: 'Serial monitor baud rate'}), {
                target: {value: '115200'}
            });

            expect(onBaudChange).toHaveBeenCalledWith(115200);
        });

        test('clears pre-existing input value when prompt becomes active', () => {
            const {rerender} = render(
                <IntlProvider locale="en">
                    <SerialLog
                        logs={[]}
                        prompt={null}
                    />
                </IntlProvider>
            );

            fireEvent.change(screen.getByPlaceholderText('Send message...'), {
                target: {value: 'half-typed text'}
            });

            rerender(
                <IntlProvider locale="en">
                    <SerialLog
                        logs={[]}
                        prompt="Are you ready?"
                    />
                </IntlProvider>
            );

            expect(screen.getByPlaceholderText('Type your answer...')).toHaveValue('');
        });
    });
});
