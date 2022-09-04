let { Observable, of,  fromEvent, concat, merge } = rxjs;
let { map, concatAll, share, first, filter, windowToggle, pairwise } = rxjs;

import { Ul, Li, Button, Text } from "./ui.js";
import { withLatest, asObservable } from "./util.js";

let fromPointerUp = (element) => new Observable((subscriber) => {
    let listener = (e) => subscriber.next(e);

    element.addEventListener("pointerup", listener);
    element.addEventListener("pointercancel", listener);
    element.addEventListener("pointerout", listener);
    element.addEventListener("pointerleave", listener);

    return () => {
        element.removeEventListener("pointerup", listener);
        element.removeEventListener("pointercancel", listener);
        element.removeEventListener("pointerout", listener);
        element.removeEventListener("pointerleave", listener);
    };
});


let uncoalesce = () => (observable) => observable.pipe(
    map((e) => of(...e.getCoalescedEvents())),
    concatAll(),
);

let clientCoords = () => (observable) => observable.pipe(
    map(({ clientX, clientY }) => [clientX, clientY]),
);

export let brush = (element) => {
    let pointerMove = fromEvent(element, "pointermove").pipe(uncoalesce());
    let pointerDown = fromEvent(element, "pointerdown").pipe(share());
    let pointerUp = fromPointerUp(element);

    let start = concat(
        of([0, 0]),
        pointerDown.pipe(clientCoords())
    );
    let position = pointerMove.pipe(
        clientCoords(),
        pairwise(),
        map(([prev, curr]) => ({ p: curr, d: [curr[0]-prev[0], curr[1]-prev[1]] })),
        withLatest(start),
        map(([pos, start]) => ({...pos, p0: start})),
    );

    return position.pipe(
        windowToggle(pointerDown, (_) => pointerUp.pipe(first())),
    );
};

export let keyboardMode = (keymap, element) => {
    let applyKeymap = () => (observable) => observable.pipe(
        filter(({ key }) => key in keymap),
        map(({ key }) => keymap[key]),
    );
    let press = fromEvent(element, "keydown").pipe(
        filter(({ repeat }) => !repeat),
        applyKeymap(),
    );
    let release = fromEvent(element, "keyup").pipe(
        applyKeymap(),
    );
    return { press, release };
}

let ModeButton = (mode, activeMode) => {
    let classList = activeMode.pipe(
        map((active) => active === mode ? "modeSwitch active" : "modeSwitch"),
    );
    let node = Button({
        "class": classList,
        id: mode,
        children: [Text({
            text: mode[0],
        })],
    });
    let press = fromEvent(node, "pointerdown").pipe(map((_) => mode));
    let release = fromEvent(node, "pointerup").pipe(map((_) => mode));
    return { node, press, release };
}

export let ModePanel = (modes, activeMode) => {
    let buttons = modes.map((m) => ModeButton(m, activeMode));
    let panel = Ul({
        children: buttons.map(({ node }) => Li({
            children: [node],
        })),
        "class": "panelVert controls",
        id: "tools",
    });
    let press = merge(...buttons.map(({ press }) => press));
    let release = merge(...buttons.map(({ release }) => release));

    return { node: panel, press, release };
}
