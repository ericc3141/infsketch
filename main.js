"use strict";

let brush = {
    p: [0, 0], // position
    d: [0, 0], // delta
    p0: [0, 0],// start position
    "down":false,
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

let currTool = "";
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

function down(e){
    if (e.button != 0){return;}
    e.preventDefault();
    brush.down=true;
    brush.p[0] = brush.p0[0] = e.pageX;
    brush.p[1] = brush.p0[1] = e.pageY;
    brush.d[0] = brush.d[1] = 0;
    if (currTool in tools && "down" in tools[currTool]) {
        tools[currTool].down({inputs: brush, sketch: sketch, view: canvas});
    }
}
function up(e){
    if (!brush.down) {
        return;
    }
    brush.down=false;
    sketch.trigger("up");
    if (currTool in tools && "up" in tools[currTool]) {
       tools[currTool].up({inputs: brush, sketch: sketch, view: canvas});
    }
}
function move(e){
    if (!brush.down){return;}
    brush.p0 = brush.p.slice();
    brush.p[0] = e.pageX;
    brush.p[1] = e.pageY;
    brush.d[0] += brush.p[0] - brush.p0[0];
    brush.d[1] += brush.p[1] - brush.p0[1];
    if (Math.abs(brush.d[0]) < 1 
            && Math.abs(brush.d[1]) < 1){
        return;
    }
    rerender = true;
    if (currTool in tools && "move" in tools[currTool]) {
        tools[currTool].move({inputs: brush, sketch: sketch, view: canvas});
    }
    brush.d[0] = 0;
    brush.d[1] = 0;
}

function changeTool(newTool){
    if (newTool === currTool) {return;}
    if (brush.down) {
        up();
    }
    if (elems.modeSwitches[currTool]) {
        elems.modeSwitches[currTool].classList.remove("active");
    }
    currTool = newTool;
    elems.modeSwitches[currTool].classList.add("active");
}
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

    if (e.key in keymap){
        changeTool(keymap[e.key]);
        return;
    }

    if (e.code.startsWith("Digit") || e.code.startsWith("Numpad")) {
        let val = parseInt(e.code.slice(e.code.length-1)) - 1;
        if (e.shiftKey) {
            setPreset(val);
        } else {
            switchPreset(val);
        }
    }
}
function keyUp(e){
    if (e.key in keymap){
        changeTool("pen");
    }
}

function init(){
    console.log("init");
    document.body.addEventListener("contextmenu", (e) => {e.preventDefault();});
    document.body.appendChild(canvas.domElement);
    window.addEventListener("resize", ()=>(canvas.resize()));

    canvas.domElement.addEventListener("pointerdown", down);
    canvas.domElement.addEventListener("pointerup", up);
    canvas.domElement.addEventListener("pointercancel", up);
    canvas.domElement.addEventListener("pointerout", up);
    canvas.domElement.addEventListener("pointerleave", up);
    canvas.domElement.addEventListener("pointermove", move);
    canvas.domElement.classList.add("canvas");
    document.body.addEventListener("keydown", keyDown);
    document.body.addEventListener("keyup", keyUp);

    let modeSwitches = document.getElementsByClassName("modeSwitch");
    for (let mode of modeSwitches){
        elems.modeSwitches[mode.id] = mode;
        mode.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            changeTool(e.target.id);
        });
        mode.addEventListener("pointerup", (e) => {
            changeTool("pen");
        });
    }
    changeTool("pen");

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
