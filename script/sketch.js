let { Subject } = rxjs;

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

export const createSketch = () => {
    let data = {};
    let center = [0, 0];
    let scale = 1;
    let pix2sketch = (pix) => [
        (pix[0] - window.innerWidth/2) / scale + center[0],
        (window.innerHeight/2 - pix[1]) / scale + center[1]
    ];

    let lineCreate = new Subject();
    let lineExtend = new Subject();
    let lineComplete=  new Subject();
    let lineDelete = new Subject();

    let lineCount = 0;
    let createLine = () => {
        lineCount += 1;
        let id = "line" + lineCount;
        let line = {
            type: "line",
            points: [],
        };
        data[id] = line;
        lineCreate.next(id)
        return {
            next: (points) => {
                lineExtend.next([id, points]);
                line.points.push(...points);
            },
            complete: () => lineComplete.next(id),
        };
    };
    
    let deleteLine = (id) => {
        lineDelete.next(id);
        delete data[id];
    };

    return {
        data,
        view: { center, scale },
        pix2sketch,
        createLine,
        deleteLine,
        on: { lineCreate, lineExtend, lineComplete, lineDelete },
    };
};

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
