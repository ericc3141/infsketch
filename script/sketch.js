let { Subject, BehaviorSubject, combineLatest } = rxjs;
let { map } = rxjs;

export const createSketch = () => {
    let data = {};
    let view = {
        center: [0, 0],
        scale: 1,
    };
    let pix2sketch = (pix) => [
        (pix[0] - window.innerWidth/2) / view.scale + view.center[0],
        (window.innerHeight/2 - pix[1]) / view.scale + view.center[1]
    ];

    let events = {
        lineCreate: new Subject(),
        lineExtend: new Subject(),
        lineComplete: new Subject(),
        lineDelete: new Subject(),
        move: new Subject(),
        zoom: new Subject(),
    };

    let lineCount = 0;
    let createLine = () => {
        lineCount += 1;
        let id = "line" + lineCount;
        let line = {
            type: "line",
            points: [],
        };
        data[id] = line;
        events.lineCreate.next(id)
        return {
            next: (points) => {
                events.lineExtend.next([id, points]);
                line.points.push(...points);
            },
            complete: () => events.lineComplete.next(id),
        };
    };
    
    let deleteLine = (id) => {
        events.lineDelete.next(id);
        delete data[id];
    };

    let move = ([ dx, dy ]) => {
        events.move.next([ dx, dy ]);
        view.center[0] -= dx;
        view.center[1] += dy;
    };
    let zoom = (ds) => {
        events.zoom.next(ds);
        view.scale *= ds;
    };

    return {
        data,
        view,
        pix2sketch,
        createLine,
        deleteLine,
        move,
        zoom,
        on: events,
    };
};

export const createPalette = (size = 256) => {
    let cvs = document.createElement("canvas");
    cvs.width = size; cvs.height = size;
    let ctx = cvs.getContext("2d");
    ctx.fillRect(0, 0, size, size);

    let offset = new BehaviorSubject([0, 0]);
    let setOffset = offset.next;

    let src = new BehaviorSubject(null);
    let onLoad = new Subject();
    let srcImg = document.createElement("img");
    srcImg.addEventListener("load", () => {
        ctx.drawImage(srcImg, 0, 0, size, size);
        onLoad.next(srcImg.src);
    });
    let setSrc = (s) => { srcImg.src = s; };

    let getColor = ([ x, y ]) => {
        let [ offX, offY ] = offset.getValue();
        return ctx.getImageData(
            (x + offX) % size,
            (y + offY) % size,
            1,
            1,
        ).data;
    };
    let colorAt = (c) => combineLatest([onLoad, offset]).pipe(
        map((_) => getColor(c)),
    );

    return { size, cvs, setOffset, offset, setSrc, onLoad, getColor, colorAt };
}
