"use strict";

// https://stackoverflow.com/questions/38477972/javascript-save-svg-element-to-file-on-disk?rq=1
const SVG_NS = 'http://www.w3.org/2000/svg';
const SVG_DOCTYPE = document.implementation.createDocumentType('svg', "-//W3C//DTD SVG 1.1//EN", "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd");

/* Returns SVG element representing current view of sketch,
 * given a palette
 */
export function exportsvg(sketch, palette) {
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

    let c = sketch.view.center;
    let s = sketch.view.scale;
    let w = [window.innerWidth, window.innerHeight];
    let bounds = [
        c[0] - w[0] / 2 / s,
        -c[1] - w[1] / 2 / s,
        w[0] / s,
        w[1] / s
    ]
    svg.setAttribute("viewBox", bounds.join(" "));

    let colors = {};

    for (let i in sketch.data) {
        let obj = sketch.data[i];
        if (obj.type !== "line") {
            continue;
        }
        let line = document.createElementNS(SVG_NS, "polyline");
        line.classList.add("line");
        line.style.strokeWidth = 2 * obj.width;

        let pointsstr = ""
        for (let j in obj.points) {
            let p = obj.points[j];
            pointsstr += `${p[0]} ${-p[1]} `;
        }
        line.setAttribute("points", pointsstr);

        let color = `c${obj.palette[0]}_${obj.palette[1]}`;
        line.classList.add(color);
        if (!(color in colors)) {
            let rgba = palette.color(obj.palette);
            colors[color] = `rgba(${rgba[0]},${rgba[1]},${rgba[2]},${rgba[3]})`;
        }
        svg.appendChild(line);
    }

    for (let color in colors) {
        style.innerHTML += `.${color.slice()} { stroke: ${colors[color]};}\n`;
    }

    return svg;
}

export function savesvg(svgdoc) {
	let svgstr = (new XMLSerializer()).serializeToString(svgdoc);
	let svgblob = new Blob([svgstr.replace(/></g, '>\n\r<')]);
	let svgurl = URL.createObjectURL(svgblob);
	let svglink = document.createElement("a");
	svglink.href = svgurl;
	svglink.download = "sketch.svg";
    document.body.appendChild(svglink);
	svglink.click();
    svglink.remove();
	URL.revokeObjectURL(svgurl);
}

export function importsvg(sketch, svgdoc, name) {
    let id = 0;
    for (let elem of svgdoc.rootElement.children) {
        if (elem.tagName !== "polyline") {
            continue;
        }
        id += 1;
        let palette = [0, 0];
        for (let classname of elem.classList) {
            let match = classname.match(/c(\d*)_(\d*)/);
            if (match) {
                palette = match.slice(1);
            }
        }
        let points = [];
        for (let point of elem.points) {
            points.push([point.x, -point.y]);
        }
        let newline  = {
            type: "line",
            points: points,
            width: parseFloat(elem.style.strokeWidth)/2,
            palette: palette,
            update: true
        };
        let idstr = name + "line" + id;
        sketch.data[idstr] = newline;
        sketch.trigger("lineImport", idstr);
    }
}

export function loadsvg(svgstring) {
    let parser = new DOMParser();
    return parser.parseFromString(svgstring, "image/svg+xml");
}
