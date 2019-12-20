"use strict";

const createMove = () => ({
    move: (inputs, sketch) => {
        sketch.view.center[0] -= inputs.cursor.d[0] / sketch.view.scale;
        sketch.view.center[1] += inputs.cursor.d[1] / sketch.view.scale;
    }
});

const createZoom = () => ({
    move: (inputs, sketch) => {
        sketch.view.scale *= Math.exp(-inputs.cursor.d[1]/100);
    }
})
