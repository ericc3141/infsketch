"use strict";

// Simple events mixin
const withEvents = (o) => {
    let events = {};
    const on = on(event, func) {
        if (!(event in events)) {
            events[event] = [];
        }
        events[event].push(func);
    }
    const trigger(event, ...args) {
        if (!(event in events)) {
            return;
        }
        for (let e in events[event]) {
            events[event][e](this, ...args);
        }
    }

    return Object.assign(o, {on, trigger});
}

const createSketch = () => ({
    data: {},
    view: {
        center: [0, 0],
        scale: 1,
    },
    paletteOffset: [0, 0],
    pix2sketch: function pix2sketch(pix) {
        return [
            (pix[0] - window.innerWidth/2) / this.view.scale + this.view.center[0],
            (window.innerHeight/2 - pix[1]) / this.view.scale + this.view.center[1]
        ];
    },
})
