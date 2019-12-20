"use strict";

let sketch = withEvents(createSketch());
let brush = {
    cursor: {
        p: [0, 0],
        p0: [0, 0],
        d: [0, 0],
    },
    down: false,
    weight: 1,
    mode: "",
};
let ui = {
    palette: withEvents(createPalette({}, 256)),
    canvas: null,
    currTool: "",
    currPreset: -1,
    downPreset: -1,
};
ui.canvas = createGlview(ui.palette, sketch)
ui.palette.loadImg("palette.png", ()=>{
    ui.palette.trigger("change");
});

let config = {
    keymap: {
        a: {mode: "draw"},
        s: {mode: "erase"},
        d: {mode: "move"},
        f: {mode: "zoom"},
    },
};

let rerender = false;


let modes = {
    draw: createPen(),
    erase: createEraser(sketch),
    move: createMove(),
    zoom: createZoom(),
}


function main(){
    requestAnimationFrame(main);
    if (!rerender) { return;}
    ui.canvas.render();
    rerender = false;
}

function updateCursor(e, {p}) {
    return {
        p: [e.pageX, e.pageY],
        p0: p,
        d: [e.pageX - p[0], e.pageY - p[1]],
    };
}
function runMode(ev) {
    if (brush.mode in modes && ev in modes[brush.mode]) {
        return modes[brush.mode][ev](brush, sketch);
    }
    return {}
}

function down(e){
    if (e.button != 0){return;}
    e.preventDefault();
    brush.down = true;
    brush.cursor = updateCursor(e, brush.cursor);
    runMode("down");
}
function up(e){
    if (!brush.down) {
        return;
    }
    brush.down = false;
    brush.cursor = updateCursor(e, brush.cursor);
    sketch.trigger("up");
    runMode("up");
}
function move(e){
    if (!brush.down){return;}
    brush.cursor = updateCursor(e, brush.cursor);
    if (Math.abs(brush.cursor.d[0]) < 1 
            && Math.abs(brush.cursor.d[1]) < 1){
        return;
    }
    rerender = true;
    runMode("move");
}

function setMode(mode){
    if (mode === brush.mode) {return;}
    if (brush.down) {
        up({pageX: brush.cursor.p[0],
            pageY: brush.cursor.p[1]});
    }
    brush.mode = mode;
}

function toKey(e) {
    if (e.code.startsWith("Key")
        || e.code.startsWith("Digit")
        || e.code.startsWith("Numpad")) {
        return e.code.slice(e.code.length - 1).toLowerCase();
    }
    return ""
}
function keyDown(e){
    if (e.repeat){return;}

    let key = toKey(e);
    if (!(key in config.keymap)){
        return;
    }

    if (config.keymap[key].mode) {
        setMode(config.keymap[key].mode);
        return;
    }
}
function keyUp(e){
    let key = toKey(e);
    if (key in config.keymap && config.keymap[key].mode) {
        setMode("draw");
    }
}

function init(){
    console.log("init");
    document.body.addEventListener("contextmenu", (e) => {e.preventDefault();});
    document.body.appendChild(ui.canvas.domElement);
    window.addEventListener("resize", ()=>(ui.canvas.resize()));

    ui.canvas.domElement.addEventListener("pointerdown", down);
    ui.canvas.domElement.addEventListener("pointerup", up);
    ui.canvas.domElement.addEventListener("pointercancel", up);
    ui.canvas.domElement.addEventListener("pointerout", up);
    ui.canvas.domElement.addEventListener("pointerleave", up);
    ui.canvas.domElement.addEventListener("pointermove", move);
    ui.canvas.domElement.classList.add("canvas");
    document.body.addEventListener("keydown", keyDown);
    document.body.addEventListener("keyup", keyUp);

    let modeSwitches = document.getElementsByClassName("modeSwitch");
    for (let mode of modeSwitches){
        mode.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            setMode(e.target.id);
        });
        mode.addEventListener("pointerup", (e) => {
            setMode("draw");
        });
    }
    setMode("draw");

    let presetSwitches = document.getElementsByClassName("presetSwitch");

    document.getElementById("exportsvg").addEventListener("click", ()=>{
        savesvg(exportsvg(sketch, ui.palette))
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
    ui.canvas.resize();
    main();

    /*if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register("worker.js")
        .then(function(reg) {
        // registration worked
            console.log('Registration succeeded. Scope is ' + reg.scope);
        }).catch(function(error) {
            // registration failed
            console.log('Registration failed with ' + error);
        });
    }*/
}

document.addEventListener("DOMContentLoaded", init);
