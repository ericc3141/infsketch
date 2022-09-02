let { partition } = rxjs;
let { filter, mergeAll } = rxjs;

import { asObservable } from "./util.js";

let textObserver = (node) => ({
    next: (v) => { node.nodeValue = v; },
});

let childrenObserver = (node) => {
    let children = new Map();
    let childObserver = (key) => ({
        next: (v) => {
            if (!children.has(key)) {
                children.set(key, v);
                node.appendChild(v);
            } else {
                node.replaceChild(v, children.get(key));
                children.set(key, v);
            }
        },
        complete: () => {
            node.removeChild(children.get(key));
            children.delete(key);
        },
    });

    return {
        next: (o) => o.subscribe(childObserver(o.key)),
    };
}

let attributesObserver = (node) => {
    let attributeObserver = (name) => ({
        next: (v) => node.setAttribute(name, v),
        complete: () => node.removeAttribute(name),
    });

    return {
        next: (o) => o.subscribe(attributeObserver(o.key)),
    }
}

export let Text = (props) => {
    let node = document.createTextNode("");
    asObservable(props).pipe(
        filter((o) => o.key === "text"),
        mergeAll(),
    ).subscribe(textObserver(node));
    return node;
}

let Node = (tag) => (props) => {
    let node = document.createElement(tag);
    let [ childrenObservable, attributesObservable ] = partition(
        asObservable(props),
        (o) => o.key === "children",
    );
    childrenObservable.pipe(mergeAll()).subscribe(childrenObserver(node));
    attributesObservable.subscribe(attributesObserver(node));
    return node;
}

export let Ul = Node("ul");
export let Li = Node("li");
export let Button = Node("button");
