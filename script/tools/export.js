let { of } = rxjs;

// https://stackoverflow.com/questions/38477972/javascript-save-svg-element-to-file-on-disk?rq=1
const SVG_NS = 'http://www.w3.org/2000/svg';
const SVG_DOCTYPE = document.implementation.createDocumentType('svg', "-//W3C//DTD SVG 1.1//EN", "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd");

let average = (arr) => arr.reduce((a, i) => a+i, 0) / arr.length;

// Returns SVG element representing current view of sketch, given a palette
let exportsvg = (sketch, palette, topleft, size) => {
    let svgdoc = document.implementation.createDocument(SVG_NS, 'svg', SVG_DOCTYPE);
    let svg = svgdoc.documentElement;

    let style = document.createElementNS(SVG_NS, "style");
    style.innerHTML += `
        .line {
            fill: none;
            stroke: #000;
        }
    `;
    svg.appendChild(style);

    svg.setAttribute("viewBox", [...topleft, ...size].join(" "));

    let colors = {};

    for (let i in sketch.data) {
        let obj = sketch.data[i];
        if (obj.type !== "line") {
            continue;
        }
        let line = document.createElementNS(SVG_NS, "polyline");
        line.classList.add("line");
        // svg doesn't support variable width lines
        line.style.strokeWidth = 2 * average(obj.points.map(({ width }) => width));

        let pointsstr = ""
        for (let j in obj.points) {
            let { x, y } = obj.points[j];
            pointsstr += `${x} ${-y} `;
        }
        line.setAttribute("points", pointsstr);

        let paletteCoord = [obj.points[0].paletteX, obj.points[0].paletteY];
        let color = `c${paletteCoord[0]}_${paletteCoord[1]}`;
        line.classList.add(color);
        if (!(color in colors)) {
            let [r, g, b, a] = palette.getColor(paletteCoord);
            colors[color] = `rgba(${r},${g},${b},${a/255})`;
        }
        svg.appendChild(line);
    }

    for (let color in colors) {
        style.innerHTML += `.${color.slice()} { stroke: ${colors[color]};}\n`;
    }

    return svg;
}

let savesvg = (svgdoc) => {
    let svgstr = (new XMLSerializer()).serializeToString(svgdoc);
    let svgblob = new Blob([svgstr.replace(/></g, '>\n<')]);
    let svgurl = URL.createObjectURL(svgblob);
    let svglink = document.createElement("a");
    svglink.href = svgurl;
    svglink.download = "sketch.svg";
    svglink.click();
    URL.revokeObjectURL(svgurl);
}

export let save = (sketch, palette) => (stroke) => {
    let start;
    let end;
    stroke.subscribe({
        next: ({ p, p0 }) => {
            start = p0;
            end = p;
        },
        complete: () => {
            start = sketch.pix2sketch(start);
            end = sketch.pix2sketch(end);
            let topLeft = [
                Math.min(start[0], end[0]),
                -Math.max(start[1], end[1]),
            ];
            let size = [
                Math.abs(start[0] - end[0]),
                Math.abs(start[1] - end[1]),
            ];
            let svg = exportsvg(sketch, palette, topLeft, size);
            savesvg(svg);
        },
    });
};

let importsvg = (sketch, svgdoc, center, size) => {
    let svgViewbox = svgdoc.rootElement.viewBox.baseVal;
    let svgCenter = [svgViewbox.x + svgViewbox.width/2, svgViewbox.y + svgViewbox.height/2];
    let scale = Math.min(
        size[0] / svgViewbox.width,
        size[1] / svgViewbox.height,
    );
    for (let elem of svgdoc.rootElement.children) {
        if (elem.tagName !== "polyline") {
            continue;
        }
        let palette = [0, 0];
        for (let classname of elem.classList) {
            let match = classname.match(/c(\d*)_(\d*)/);
            if (match) {
                palette = match.slice(1);
            }
        }
        let width = parseFloat(elem.style.strokeWidth)/2;
        let points = [];
        for (let point of elem.points) {
            points.push({
                x: (point.x - svgCenter[0]) * scale + center[0],
                y: -(point.y - svgCenter[1]) * scale + center[1],
                width: width * scale, 
                paletteX: palette[0],
                paletteY: palette[1],
            });
        }
        of(points).subscribe(sketch.createLine());
    }
}

let loadsvg = () => new Promise((resolve) => {
    let input = document.createElement("input");
    input.setAttribute("type", "file");
    input.addEventListener("change", resolve);
    input.click();
}).then((e) => new Promise((resolve) => {
    let reader = new FileReader();
    let file = e.target.files[0];
    let name = file.name;
    reader.onload = resolve;
    
    reader.readAsText(file);
})).then((e) => {
    let parser = new DOMParser();
    return Promise.resolve(parser.parseFromString(e.target.result, "image/svg+xml"));
});

export let load = (sketch, _) => (stroke) => {
    let start;
    let end;
    stroke.subscribe({
        next: ({ p, p0 }) => {
            start = p0;
            end = p;
        },
        complete: async () => {
            let svg = await loadsvg();
            start = sketch.pix2sketch(start);
            end = sketch.pix2sketch(end);
            let center = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
            let size = [Math.abs(start[0] - end[0]), Math.abs(start[1] - end[1])];
            importsvg(sketch, svg, center, size);
        },
    });
};

