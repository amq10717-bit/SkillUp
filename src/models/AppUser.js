class AppUser {
    constructor(uid, email, username, role) {
        this.uid = uid;
        this.email = email;
        this.username = username;
        this.role = role;
    }

    toMap() {
        return {
            uid: this.uid,
            email: this.email,
            username: this.username,
            role: this.role
        };
    }

    static fromMap(data) {
        return new AppUser(data.uid, data.email, data.username, data.role);
    }
}

export default AppUser;


