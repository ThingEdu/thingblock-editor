/* eslint-env jest */
import reducer, {codeInitialState, setSimLoadedCode} from '../../../src/reducers/code';

test('records the program loaded into the simulator, and clears it', () => {
    expect(codeInitialState.simLoadedCode).toBeNull();
    const loaded = reducer(codeInitialState, setSimLoadedCode('code-1'));
    expect(loaded.simLoadedCode).toBe('code-1');
    expect(reducer(loaded, setSimLoadedCode(null)).simLoadedCode).toBeNull();
});
