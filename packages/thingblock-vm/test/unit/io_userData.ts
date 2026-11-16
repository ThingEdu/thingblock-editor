import {test} from 'tap';
import UserData from '../../src/io/input/user-data.ts';

test('getUsername returns empty string initially', t => {
    const userData = new UserData();

    t.equal(userData.getUsername(), '');
    t.end();
});

test('postData sets the username', t => {
    const userData = new UserData();
    userData.postData({username: 'TEST'});
    t.equal(userData.getUsername(), 'TEST');
    t.end();
});
