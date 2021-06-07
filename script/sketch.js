"use strict";

import { emitter, changeable, list, set } from "./util.js";

// Simple events mixin
export const withEvents = (o) => {
    let events = {};
    const on = (evt, func) => {
        if (!(evt in events)) {
            events[evt] = [];
        }
        events[evt].push(func);
    }
    const trigger = (evt, ...args) => {
        if (!(evt in events)) {
            return;
        }
        for (let e in events[evt]) {
            events[evt][e](o, ...args);
        }
    }

    return Object.assign(o, {on, trigger});
}

let line = (props, initpoints) => {
    if (initpoints.length < 1) { throw new Error("line requires points"); }
    let points = list(initpoints);
    let min = [...initpoints[0]];
    let max = [...initpoints[0]];

    let updateBounds = (coords) => {
        for (let c of coords) {
            if (c[0] < min[0]) { min[0] = c[0]; }
            if (c[0] > max[0]) { max[0] = c[0]; }
            if (c[1] < min[1]) { min[1] = c[1]; }
            if (c[1] > max[1]) { max[1] = c[1]; }
        }
    };
    updateBounds(initpoints);
    points.onPush(updateBounds);

    let nearBound = (coord, threshold) => {
        return coord[0] >= min[0]-threshold &&
            coord[0] <= max[0]+threshold &&
            coord[1] >= min[1]-threshold &&
            coord[1] <= max[1]+threshold;
    }
    let nearPoints = (coord, threshold) => {
        for (let p of points.get()) {
            if (Math.abs(p[0] - coord[0]) <= threshold &&
                Math.abs(p[1] - coord[1]) <= threshold
            ) {
                return true;
            }
        }
        return false;
    }
    let isNear = (coord, threshold) => 
        nearBound(coord, threshold) && nearPoints(coord, threshold);

    let endEmitter = emitter();

    return { ...props, isNear, points,
        end: endEmitter.emit, onEnd: endEmitter.subscribe
    };
}

export const createSketch = () => {
    let lines = set();
    let center = changeable([0, 0]);
    let scale = changeable(1);

    let pix2sketch = (pix) => ([
        (pix[0] - window.innerWidth/2) / scale.get() + center.get()[0],
        (window.innerHeight/2 - pix[1]) / scale.get() + center.get()[1],
    ])
    let createLine = (style, coords) => {
        let created = line(style, coords);
        lines.add(created);
        return created;
    }

    return {
        lines, center, scale,
        createLine,
        pix2sketch,
    };
}

export const createPalette = (o, size) => {
    const init_cvs = (size) => {
        let cvs = document.createElement("canvas");
        cvs.width = size; cvs.height = size;
        let ctx = cvs.getContext("2d");
        ctx.fillRect(0, 0, size, size);
        return [cvs, ctx];
    }
    let orig_cvs, orig_ctx, view_cvs, view_ctx;
    [orig_cvs, orig_ctx] = init_cvs(size);
    [view_cvs, view_ctx] = init_cvs(size);

    const redraw = () => {
        view_ctx.drawImage(orig_cvs, -o.offset[0], -o.offset[1]);
        view_ctx.drawImage(orig_cvs, -o.offset[0], -o.offset[1] - size);
        view_ctx.drawImage(orig_cvs, -o.offset[0] - size, -o.offset[1]);
        view_ctx.drawImage(orig_cvs, -o.offset[0] - size, -o.offset[1] - size);
    }

    const loadImg = (src, callback) => {
        let img = document.createElement("img");
        img.onload = () => {
            orig_ctx.drawImage(img, 0, 0, size, size);
            redraw();
            callback();
        }
        img.src = src;
    }

    const color = (coord) => {
        return view_ctx.getImageData(coord[0], coord[1], 1, 1).data
    }
    const shiftTo = (coord) => {
        o.offset = coord.slice();
        redraw();
    }

    return Object.assign(o, {
        size, offset: [0,0], cvs: view_cvs, 
        loadImg, shiftTo, color
    });
}
