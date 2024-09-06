export class Signal {

    constructor() {
        this.listeners = [];
    }

    listen(callback) {
        this.listeners.push(callback);
    }

    emit(data) {
        this.listeners.forEach(callback => callback(data));
    }

}
