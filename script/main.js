"use strict";

let { BehaviorSubject, partition } = rxjs;
let { merge, filter, map, distinctUntilChanged, withLatestFrom } = rxjs;

import { createSketch, createPalette } from "./sketch.js";
import { createGlview } from "./glview.js";
import { MODES, createModes } from "./tools/tools.js";
import * as inputs from "./inputs.js";

let keymap = {
    "a":MODES.DRAW,
    "s":MODES.ERASE,
    "d":MODES.MOVE,
    "f":MODES.ZOOM,
    "c":MODES.SAVE,
    "v":MODES.LOAD,
}
let elems = {
    modeSwitches: {},
    presets: [],
}

let activeMode = new BehaviorSubject(MODES.DRAW);
let palettePicked = new BehaviorSubject([0, 0]);

let palette = createPalette();
palette.setSrc("palette.png");
let sketch = createSketch();
let modes = createModes(sketch, palette);

let canvas = createGlview(palette, sketch);

let brushSubscriber = {
    next: ([stroke, mode]) => modes[mode](stroke.pipe(
        withLatestFrom(palettePicked, (b, palette) => ({...b, palette })),
    )),
};

function init(){
    console.log("init");
    document.body.addEventListener("contextmenu", (e) => {e.preventDefault();});
    document.body.appendChild(canvas.domElement);

    let brushInput = inputs.brush(canvas.domElement);
    brushInput.pipe(
        withLatestFrom(activeMode),
    ).subscribe(brushSubscriber);

    canvas.domElement.classList.add("canvas");

    let keyboardModeInput = inputs.keyboardMode(keymap, document.body);
    let modePanel = inputs.ModePanel(Object.values(MODES), activeMode);
    document.body.appendChild(modePanel.node);
    let press = merge(keyboardModeInput.press, modePanel.press);
    let release = merge(keyboardModeInput.release, modePanel.release);
    merge(
        press,
        release.pipe(
            withLatestFrom(activeMode),
            filter(([mode, active]) => mode === active),
            map((_) => MODES.DRAW),
        ),
    ).pipe(
        distinctUntilChanged(),
    ).subscribe(activeMode);

    let keyboardPaletteInput = inputs.keyboardPalette(document.body);
    let palettePanel = inputs.PalettePanel(palette, palettePicked);
    document.body.appendChild(palettePanel.node);
    merge(keyboardPaletteInput.pick, palettePanel.pick).subscribe(palettePicked);
    keyboardPaletteInput.offset.subscribe({
        next: palette.setOffset,
    });


    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register("worker.js")
        .then(function(reg) {
        // registration worked
            console.log('Registration succeeded. Scope is ' + reg.scope);
        }).catch(function(error) {
            // registration failed
            console.log('Registration failed with ' + error);
        });
    }
}

document.addEventListener("DOMContentLoaded", init);
