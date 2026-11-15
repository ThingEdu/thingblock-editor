import {test} from 'tap';
import formatMessage from 'format-message';
import VirtualMachine from '../../src/virtual-machine/index.ts';

test('setLocale leaves the caller\'s messages as strings after the VM formats them', async t => {
    const vm = new VirtualMachine();
    const messages = {'test.setLocale.hello': 'xin chào'};
    await vm.setLocale('vi', messages);
    t.equal(formatMessage({id: 'test.setLocale.hello', default: 'hello'}), 'xin chào');
    // The editor hands the same object to react-intl, which shows the default for anything but a string.
    t.same(messages, {'test.setLocale.hello': 'xin chào'});
    await vm.setLocale('en', {});
    vm.quit();
    t.end();
});
