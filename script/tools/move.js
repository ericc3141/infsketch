"use strict";

export const createMove = (sketch) => ({
    move: (inputs) => {
        sketch.view.center[0] -= inputs.d[0] / sketch.view.scale;
        sketch.view.center[1] += inputs.d[1] / sketch.view.scale;
    }
});

export const createZoom = (sketch) => ({
    move: (inputs) => {
        sketch.view.scale *= Math.exp(-inputs.d[1]/100);
    }
})
