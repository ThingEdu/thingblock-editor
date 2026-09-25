class UserData {
    _username = '';

    postData (data: {username: string}) {
        this._username = data.username;
    }

    getUsername () {
        return this._username;
    }
}

export default UserData;
