let { map } = rxjs;

export const createMove = (sketch) => (stroke) => stroke.pipe(
    map(({ d: [ dx, dy ]}) => [ dx / sketch.view.scale, dy / sketch.view.scale ]),
).subscribe({
    next: sketch.move,
});

export const createZoom = (sketch) => (stroke) => stroke.pipe(
    map(({ d: [_, dy]}) => Math.exp(-dy/100)),
).subscribe({
    next: sketch.zoom,
})
