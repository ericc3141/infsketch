"use strict";

const createPen = () => {
    let id = 0, idstr;
    let palette = [0, 0];
    let curr;
    return {
        palette,
        action: ({paletteX, paletteY}) => {
            palette[0] = (typeof paletteX === "undefined") ? palette[0] : paletteX;
            palette[1] = (typeof paletteY === "undefined") ? palette[1] : paletteY;
            return {
                paletteX: ".paletteX"+palette[0],
                paletteY: ".paletteY"+palette[1],
            };
        },
        down: (inputs, sketch) => {
            id ++;
            curr = {
                type: "line",
                points: [sketch.pix2sketch(inputs.cursor.p)],
                width: inputs.weight / sketch.view.scale,
                palette: palette.slice(),
                update: true
            };
            idstr = "line" + id;
            sketch.data[idstr] = curr;
            sketch.trigger("lineStart", idstr);
        },
        move: (inputs, sketch) => {
            curr.points.push(sketch.pix2sketch(inputs.cursor.p));
            sketch.trigger("lineAdd", idstr);
        },
        up: (inputs, sketch) => {
            if (!(Math.abs(inputs.cursor.p[0] - inputs.cursor.p0[0] < 2)
                    && Math.abs(inputs.cursor.p[1] - inputs.cursor.p0[1] < 2))) {
                sketch.trigger("lineEnd", idstr);
                return;
            }
            curr.points.push(sketch.pix2sketch([inputs.cursor.p[0] + 5, inputs.cursor.p[1] + 5]));
            sketch.trigger("lineAdd", idstr);
            sketch.trigger("lineEnd", idstr);
        }
    }
}

const createEraser = (sketch) => {
    let bounds = {};
    sketch.on("lineStart", create);
    sketch.on("lineAdd", update);
    sketch.on("lineRemove", remove);
    sketch.on("lineImport", lineImport);

    function create(sketch, name) {
        let p = sketch.data[name].points[0];
        bounds[name] = [p[0], p[1], p[0], p[1]];
    }
    function update(sketch, name) {
        let up = sketch.data[name]
        let pnt = up.points[up.points.length - 1];
        updateBound(bounds[name], pnt);
    }
    function lineImport(sketch, name) {
        let points = sketch.data[name].points;
        let bound = [points[0][0], points[0][1], points[0][0], points[0][1]];
        for (let point of points) {
            updateBound(bound, point);
        }
        bounds[name] = bound;
    }
    function updateBound(bound, pnt) {
        bound[0] = Math.min(bound[0], pnt[0]);
        bound[1] = Math.min(bound[1], pnt[1]);
        bound[2] = Math.max(bound[2], pnt[0]);
        bound[3] = Math.max(bound[3], pnt[1]);
    }
    function remove(sketch, name) {
        delete bounds[name];
    }
    return {
        move: (inputs, sketch) => {
            let p = sketch.pix2sketch(inputs.cursor.p);
            let rad = inputs.weight * 20 / sketch.view.scale;
            for (let i in bounds) {
                let b = bounds[i];
                if (!(b[0] < p[0] + rad && p[0] - rad < b[2] 
                        && b[1] < p[1] + rad && p[1] - rad < b[3]
                        && (sketch.data[i].palette[1] === 0))) {
                    continue;
                }
                let stroke = sketch.data[i];
                for (let j = 0; j < stroke.points.length; j ++) {
                    let pnt = stroke.points[j];
                    if (Math.abs(pnt[0] - p[0]) < rad
                            && Math.abs(pnt[1] - p[1]) < rad) {
                        sketch.trigger("lineRemove", i);
                        delete sketch.data[i];
                        break;
                    }
                }
            }
        },
    }
}
