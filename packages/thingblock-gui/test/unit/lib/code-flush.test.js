import {flushGeneratedCode, registerCodeFlush} from '../../../src/lib/code-flush';

test('returns null with no workspace registered', () => {
    expect(flushGeneratedCode()).toBeNull();
});

test('runs the registered flush and returns its code until unregistered', () => {
    const unregister = registerCodeFlush(() => ({generatedCode: 'a', simCode: 'b', simDiagnostics: []}));
    expect(flushGeneratedCode()).toEqual({generatedCode: 'a', simCode: 'b', simDiagnostics: []});
    unregister();
    expect(flushGeneratedCode()).toBeNull();
});

test('an older registration cannot unregister a newer one', () => {
    const first = registerCodeFlush(() => ({generatedCode: '1', simCode: '', simDiagnostics: []}));
    registerCodeFlush(() => ({generatedCode: '2', simCode: '', simDiagnostics: []}));
    first();
    expect(flushGeneratedCode().generatedCode).toBe('2');
});
