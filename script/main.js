"use strict";

let { BehaviorSubject, partition } = rxjs;
let { merge, filter, map, distinctUntilChanged } = rxjs;

import { withEvents, createSketch, createPalette } from "./sketch.js";
import { createGlview } from "./glview.js";
import { MODES, createModes } from "./tools/tools.js";
import { exportsvg, savesvg, importsvg, loadsvg } from "./exportsvg.js";
import * as inputs from "./inputs.js";
import { withLatest } from "./util.js";

let keymap = {
    "a":MODES.DRAW,
    "s":MODES.ERASE,
    "d":MODES.MOVE,
    "f":MODES.ZOOM,
}
let elems = {
    modeSwitches: {},
    presets: [],
}

let activeMode = new BehaviorSubject(MODES.DRAW);
let palettePicked = new BehaviorSubject([0, 0]);
let paletteOffset = new BehaviorSubject([0, 0]);
let paletteSrc = new BehaviorSubject("palette.png");

let rerender = false;

let palette = createPalette(paletteSrc, paletteOffset);
let sketch = createSketch();
let modes = createModes(sketch);

let canvas = createGlview(palette, sketch);

function main(){
    requestAnimationFrame(main);
    if (!rerender) { return;}
    canvas.render();
    rerender = false;
}


let brushSubscriber = {
    next: ([stroke, mode, palette]) => {
        modes[mode](stroke.pipe(
            map((v) => ({...v, weight: 1, palette})),
        ));
        stroke.subscribe({
            next: (_) => { rerender = true; },
        });
    },
};

function init(){
    console.log("init");
    document.body.addEventListener("contextmenu", (e) => {e.preventDefault();});
    document.body.appendChild(canvas.domElement);
    window.addEventListener("resize", ()=>(canvas.resize()));

    let brushInput = inputs.brush(canvas.domElement);
    brushInput.pipe(
        withLatest(activeMode, palettePicked),
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
            withLatest(activeMode),
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
    keyboardPaletteInput.offset.subscribe(paletteOffset);


    document.getElementById("exportsvg").addEventListener("click", ()=>{
        savesvg(exportsvg(sketch, palette))
    });
    document.getElementById("importsvg").addEventListener("change", (e)=>{
        let reader = new FileReader();
        let file = e.target.files[0];
        let name = file.name;
        reader.onload = (e) => {
            importsvg(sketch, loadsvg(e.target.result), name);
            rerender = true;
        }
        reader.readAsText(file);
    });
    canvas.resize();
    main();

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
