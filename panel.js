"use strict";

const requestText = (url) => {
    return fetch(url).then((response) => {
        if (!response.ok) {
            throw response;
        }
        return response.text();
    });
}
class Panel extends HTMLElement {
    constructor() {
        super();
        this.addEventListener("pointerdown", this.finder("down"));
        this.addEventListener("pointerup", this.finder("up"));
        this.rules = {};
    }
    connectedCallback() {
        let styleElem = document.createElement("style");
        this.appendChild(styleElem);
        this.sheet = styleElem.sheet;
    }

    findData(tag, node) {
        return (node === this)
            ? null
            : (tag in node.dataset) 
                ? JSON.parse(node.dataset[tag])
                : this.findData(tag, node.parentNode);
    }
    finder(tag) {
        return (e) => {
            let data = this.findData(tag, e.target);
            if (data === null) { return; }
            this.dispatchEvent(new CustomEvent(
                "action",
                {detail: data}
            ));
        }
    }

    newRule(rule, name) {
        let idx = this.sheet.insertRule(rule);
        this.rules[name] = this.sheet.rules[idx];
    }
}

customElements.define("inf-panel", Panel);
