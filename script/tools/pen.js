"use strict";

export const createPen = () => {
    let currentLine;
    return {
        down: ({inputs, sketch, ...rest}) => {
            currentLine = sketch.createLine({
                width: inputs.weight / sketch.scale.get(),
                palette: inputs.palette.slice(),
                update: true
            }, [sketch.pix2sketch(inputs.p)])
        },
        move: ({inputs, sketch, ...rest}) => {
            if (currentLine) {
                currentLine.points.push([sketch.pix2sketch(inputs.p)]);
            }
        },
        up: ({inputs, sketch, ...rest}) => {
            currentLine.end();
        }
    }
}

export const createEraser = (sketch) => {
    let bounds = {};
    return {
        move: ({inputs, sketch, ...rest}) => {
            let p = sketch.pix2sketch(inputs.p);
            let rad = inputs.weight * 20 / sketch.scale.get();
            for (let i of sketch.lines.get().values()) {
                if (i.isNear(p, rad)) {
                    sketch.lines.remove(i);
                }
            }
        },
    }
}
