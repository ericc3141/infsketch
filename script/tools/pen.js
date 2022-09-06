let { map } = rxjs;

export const createDraw = (sketch) => (stroke) => {
    stroke.pipe(
        map(({p, weight, palette}) => [{
            x: sketch.pix2sketch(p)[0], 
            y: sketch.pix2sketch(p)[1], 
            width: weight / sketch.view.scale,
            paletteX: palette[0],
            paletteY: palette[1],
        }]),
    ).subscribe(sketch.createLine());
};

export const createErase = (sketch) => {
    let bounds = {};
    function updateBound(bound, pnt) {
        bound = bound ?? [Infinity, Infinity, -Infinity, -Infinity];
        return [
            Math.min(bound[0], pnt[0]),
            Math.min(bound[1], pnt[1]),
            Math.max(bound[2], pnt[0]),
            Math.max(bound[3], pnt[1]),
        ];
    }

    sketch.on.lineExtend.subscribe({
        next: ([id, points]) => {
            bounds[id] = points.map(({ x, y }) => [x, y]).reduce(updateBound, bounds[id]);
        },
    });
    sketch.on.lineDelete.subscribe({
        next: (id) => {
            delete bounds[id];
        },
    });

    return (stroke) => stroke.subscribe({
        next: (inputs) => {
            let p = sketch.pix2sketch(inputs.p);
            let rad = inputs.weight * 20 / sketch.view.scale;
            for (let i in bounds) {
                let b = bounds[i];
                if (!(b[0] < p[0] + rad && p[0] - rad < b[2] 
                        && b[1] < p[1] + rad && p[1] - rad < b[3])) {
                    continue;
                }
                let stroke = sketch.data[i];
                for (let j = 0; j < stroke.points.length; j ++) {
                    let pnt = [stroke.points[j].x, stroke.points[j].y];
                    if (Math.abs(pnt[0] - p[0]) < rad
                            && Math.abs(pnt[1] - p[1]) < rad) {
                        sketch.deleteLine(i);
                        delete bounds[i];
                        break;
                    }
                }
            }
        },
    });
}
