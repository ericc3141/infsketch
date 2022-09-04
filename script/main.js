"use strict";

let { BehaviorSubject, partition } = rxjs;
let { merge, filter, map, distinctUntilChanged } = rxjs;

import { withEvents, createSketch, createPalette } from "./sketch.js";
import { createGlview } from "./glview.js";
import { tools } from "./tools/tools.js";
import { createEraser } from "./tools/pen.js";
import { exportsvg, savesvg, importsvg, loadsvg } from "./exportsvg.js";
import * as inputs from "./inputs.js";
import { withLatest } from "./util.js";

let brush = {
    weight: 1,
    palette: [0, 0],
}
let keymap = {
    "a":"pen",
    "s":"eraser",
    "d":"move",
    "f":"zoom"
}
let elems = {
    modeSwitches: {},
    presets: [],
}

let modeSubject = new BehaviorSubject("pen");
let currPreset = -1;
let downPreset = -1;
let rerender = false;

let palette = withEvents(createPalette({}, 256));
palette.loadImg("palette.png", ()=>{palette.trigger("change");setPreset(brush.palette[1]/32);});

let sketch = withEvents(createSketch());

let canvas = createGlview(palette, sketch);

tools["eraser"] = createEraser(sketch);


function opt(a, b) {
    if (typeof a !== "undefined") {
        return a;
    }
    return b;
}

function main(){
    requestAnimationFrame(main);
    if (!rerender) { return;}
    canvas.render();
    rerender = false;
}


let brushSubscriber = {
    next: ([stroke, mode]) => {
        let [first, rest] = partition(stroke, (_, idx) => idx === 0);
        first.subscribe({
            next: (b) => {
                if (mode in tools && "down" in tools[mode]) {
                    tools[mode].down({inputs: {...b, ...brush}, sketch: sketch, view: canvas});
                }
            },
        });
        rest.subscribe({
            next: (b) => {
                rerender = true;
                if (mode in tools && "move" in tools[mode]) {
                    tools[mode].move({inputs: {...b, ...brush}, sketch: sketch, view: canvas});
                }
            },
            complete: () => {
                sketch.trigger("up");
                if (mode in tools && "up" in tools[mode]) {
                   tools[mode].up({inputs: brush, sketch: sketch, view: canvas});
                }
            },
        });
    },
};

function switchPreset(newPreset) {
    if (elems.presets[currPreset]) {
        elems.presets[currPreset].classList.remove("active");
    }
    currPreset = newPreset;
    brush.palette[0] = newPreset*32 + 16;
    elems.presets[currPreset].classList.add("active");
}
function setPreset(newValue) {
    palette.shiftTo([0, -newValue*32]);
    brush.palette[1] = newValue*32;
    rerender = true;
    for (let i = 0; i < 8; i ++) {
        let color = palette.color([i*32 + 16, newValue*32]);
        elems.presets[i].setAttribute("style", `--active:rgba(${color[0]},${color[1]},${color[2]},${color[3]})`);
    }
}

function presetColors(colors) {
    for (let i in colors) {
        elems.presets[i].setAttribute("style", "--active:"+colors[i]);
    }
}

function keyDown(e){
    if (e.repeat){return;}

    if (e.code.startsWith("Digit") || e.code.startsWith("Numpad")) {
        let val = parseInt(e.code.slice(e.code.length-1)) - 1;
        if (e.shiftKey) {
            setPreset(val);
        } else {
            switchPreset(val);
        }
    }
}

function init(){
    console.log("init");
    document.body.addEventListener("contextmenu", (e) => {e.preventDefault();});
    document.body.appendChild(canvas.domElement);
    window.addEventListener("resize", ()=>(canvas.resize()));

    let brushInput = inputs.brush(canvas.domElement);
    brushInput.pipe(
        withLatest(modeSubject),
    ).subscribe(brushSubscriber);

    canvas.domElement.classList.add("canvas");

    let keyboardModeInput = inputs.keyboardMode(keymap, document.body);
    let modePanel = inputs.ModePanel(["pen", "erase", "move", "zoom"], modeSubject);
    document.body.appendChild(modePanel.node);
    let press = merge(keyboardModeInput.press, modePanel.press);
    let release = merge(keyboardModeInput.release, modePanel.release);
    merge(
        press,
        release.pipe(
            withLatest(modeSubject),
            filter(([mode, active]) => mode === active),
            map((_) => "pen"),
        ),
    ).pipe(
        distinctUntilChanged(),
    ).subscribe(modeSubject);
    modeSubject.subscribe({ next: console.log });

    let presetSwitches = document.getElementsByClassName("presetSwitch");
    for (let i = 0; i < presetSwitches.length; i ++) {
        elems.presets[i] = presetSwitches[i];
        presetSwitches[i].addEventListener("pointerdown", (e) => {
            e.preventDefault();
            downPreset = i;
        });
        presetSwitches[i].addEventListener("pointerup", (e) => {
            switchPreset(i);downPreset=-1;
        });
        presetSwitches[i].addEventListener("pointerleave", (e) => {
            if (downPreset === i) {setPreset(i);}
        });
    }
    switchPreset(0);

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
