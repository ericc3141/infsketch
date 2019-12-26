"use strict";

const requestText = (url) => {
    return fetch(url).then((response) => {
        if (!response.ok) {
            throw response;
        }
        return response.text();
    });
}
const createPanel = (svg, callback) => {
    let findData = (ev, node) => {
        return (node === svg)
            ? {}
            : (ev in node.dataset) 
                ? JSON.parse(node.dataset[ev])
                : findData(ev, node.parentNode);
    }
    let down = (e) => {
        callback(findData("down", e.target));
    }
    let up = (e) => {
        callback(findData("up", e.target));
    }
    svg.addEventListener("pointerdown", down);
    svg.addEventListener("pointerup", up);
    return svg;
}


