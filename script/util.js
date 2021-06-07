"use strict";

export let emitter = () => {
    let listeners = [];

    let subscribe = (callback) => {
        let len = listeners.push(callback);
        return () => { listeners.splice(len-1, 1) };
    }

    let emit = (...args) => {
        listeners.forEach(f => f(...args));
    }

    return { subscribe, emit };

}

export let changeable = (init) => {
    let value = init;
    let changeEmitter = emitter();

    let get = () => value;
    let set = (v) => {
        if (v === value) { return false; }
        value = v;
        changeEmitter.emit(v);
        return true;
    };

    return {
        value,
        get, set, onChange: changeEmitter.subscribe,
    };
};

export let list = (init) => {
    let value = init || [];
    let get = () => value;

    let pushEmitter = emitter();
    let push = (items) => {
        pushEmitter.emit(items);
        value.push(...items);
        return value.length;
    };

    let popEmitter = emitter();
    let pop = (num) => {
        let popped = value.splice(-num, num);
        popEmitter.emit(popped);
        return value.length;
    }

    return {
        get,
        push, onPush: pushEmitter.subscribe,
        pop, onPop: popEmitter.subscribe,
    };
}

export let set = (init) => {
    let value = new Set(init || null);
    let get = () => value;

    let addEmitter = emitter();
    let add = (item) => {
        addEmitter.emit(item);
        value.add(item);
        return item;
    }
    let removeEmitter = emitter();
    let remove = (item) => {
        if (value.delete(item)) {
            removeEmitter.emit(item);
            return true;
        }
        return false;
    }

    return {
        get,
        add, onAdd: addEmitter.subscribe,
        remove, onRemove: removeEmitter.subscribe,
    };
}
