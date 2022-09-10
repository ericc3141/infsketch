let { Subject, BehaviorSubject, combineLatest } = rxjs;
let { map } = rxjs;

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

export const createPalette = (src, offset, size = 256) => {
    let cvs = document.createElement("canvas");
    cvs.width = size; cvs.height = size;
    let ctx = cvs.getContext("2d");
    ctx.fillRect(0, 0, size, size);

    let currentSrc = new BehaviorSubject(null);
    let srcImg = document.createElement("img");
    srcImg.addEventListener("load", () => {
        ctx.drawImage(srcImg, 0, 0, size, size);
        currentSrc.next(srcImg.src);
    });
    src.subscribe({
        next: (s) => { srcImg.src = s; },
    });

    let colorAt = ([ x, y ]) => combineLatest([currentSrc, offset]).pipe(
        map(([_, [offX, offY]]) => ctx.getImageData(
            (x + offX) % size,
            (y + offY) % size,
            1,
            1,
        ).data),
    );

    return { size, cvs, offset, src: currentSrc, colorAt };
}
