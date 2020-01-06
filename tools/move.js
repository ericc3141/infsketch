"use strict";

const createMove = () => ({
    action: ({moveby, moveto}, sketch) => {
        if (moveto) {
            sketch.view.center[0] = moveto[0];
            sketch.view.center[1] = moveto[1];
        }
        if (moveby) {
            sketch.view.center[0] += 512 * moveby[0] / sketch.view.scale;
            sketch.view.center[1] += 512 * moveby[1] / sketch.view.scale;
        }
    },
    move: (inputs, sketch) => {
        sketch.view.center[0] -= inputs.cursor.d[0] / sketch.view.scale;
        sketch.view.center[1] += inputs.cursor.d[1] / sketch.view.scale;
    }
});

const createZoom = () => ({
    action: ({scaleby, scaleto}, sketch) => {
        if (scaleto) {
            sketch.view.scale = scaleto;
        }
        if (scaleby) {
            sketch.view.scale *= scaleby;
        }
    },
    move: (inputs, sketch) => {
        sketch.view.scale *= Math.exp(-inputs.cursor.d[1]/100);
    }
})
