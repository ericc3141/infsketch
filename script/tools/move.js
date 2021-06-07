"use strict";

export const createMove = () => ({
    move: ({inputs, sketch, ...rest}) => {
        let current = sketch.center.get();
        let scale = sketch.scale.get();
        sketch.center.set([
            current[0] - inputs.d[0] / scale,
            current[1] + inputs.d[1] / scale,
        ]);
    }
});

export const createZoom = () => ({
    move: ({inputs, sketch, ...rest}) => {
        sketch.scale.set(sketch.scale.get() * Math.exp(-inputs.d[1]/100));
    }
})
