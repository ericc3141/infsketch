let { Observable, of, pipe, fromEvent, concat, merge, partition } = rxjs;
let { map, concatAll, share, first, filter, windowToggle, pairwise } = rxjs;

import { Ul, Li, Button, Text } from "./ui.js";
import { withLatest, asObservable, range } from "./util.js";

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

export let keyboardPalette = (element) => {
    let pressedNumbers = fromEvent(element, "keydown").pipe(
        filter(({ repeat, code }) => !repeat && (code.startsWith("Digit") || code.startsWith("Numpad"))),
    );
    let [ withShift, withoutShift ] = partition(pressedNumbers, ({ shiftKey }) => shiftKey);
    let getNumber = pipe(map(({ code }) => parseInt(code.slice(code.length-1)) - 1));
    return {
        pick: withoutShift.pipe(
            getNumber,
            map((v) => [ v * 32, 0 ]),
        ),
        offset: withShift.pipe(
            getNumber,
            map((v) => [ 0, v * 32 ]),
        ),
    };
}

let PaletteButton = (idx, isActive, color) => {
    let classList = isActive.pipe(
        map((a) => a ? "presetSwitch active" : "presetSwitch"),
    );
    let style = color.pipe(
        map(([r, g, b, a]) => `--active:rgba(${r},${g},${b},${a})`),
    );
    let node = Button({
        "class": classList,
        style,
        children: [Text({
            text: (idx+1).toString(),
        })],
    });
    let pick = fromEvent(node, "pointerdown").pipe(map((_) => idx));
    return { node, pick };
}

export let PalettePanel = (palette, picked) => {
    let coords = range(0, 256, 32).map((x) => [x, 0]);
    let colors = coords.map((c) => palette.colorAt(c));
    let isActive = coords.map(([cx, _]) => picked.pipe(
        map(([px, _]) => cx === px),
    ));

    let buttons = coords.map((_, idx) =>
        PaletteButton(idx, isActive[idx], colors[idx]));

    let panel = Ul({
        children: buttons.map(({ node }) => Li({
            children: [node],
        })),
        "class": "panelHoriz controls",
        id: "presets",
    });
    let pick = merge(...buttons.map(({ pick }) => pick));

    return { node: panel, pick };
}

