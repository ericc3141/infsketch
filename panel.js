"use strict";

const requestText = (url) => {
    return fetch(url).then((response) => {
        if (!response.ok) {
            throw response;
        }
        return response.text();
    });
}
const createPanel = (root, callback) => {
    let findData = (ev, node) => {
        return (node === root)
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
    root.addEventListener("pointerdown", down);
    root.addEventListener("pointerup", up);

    let styleElem = document.createElement("style");
    root.appendChild(styleElem);
    let rules = {}
    let newRule = (rule, name) => {
        let idx = styleElem.sheet.insertRule(rule);
        rules[name] = styleElem.sheet.rules[idx];
    }

    return {root, newRule, rules};
}


