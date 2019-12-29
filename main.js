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
    palette: createPalette({}, 256),
    view: null,
    modes: null,
};

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
    ui.view.render();
    rerender = false;
}

// Main canvas events
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

function brushDown(e){
    if (e.button != 0){return;}
    e.preventDefault();
    brush.down = true;
    brush.cursor = updateCursor(e, brush.cursor);
    runMode("down");
}
function brushUp(e){
    if (!brush.down) {
        return;
    }
    brush.down = false;
    brush.cursor = updateCursor(e, brush.cursor);
    sketch.trigger("up");
    runMode("up");
}
function brushMove(e){
    if (!brush.down){return;}
    brush.cursor = updateCursor(e, brush.cursor);
    if (Math.abs(brush.cursor.d[0]) < 1 
            && Math.abs(brush.cursor.d[1]) < 1){
        return;
    }
    rerender = true;
    runMode("move");
}

// Mode switch
function setMode(mode){
    if (mode === brush.mode) {return;}
    if (brush.down) {
        brushUp({pageX: brush.cursor.p[0],
            pageY: brush.cursor.p[1]});
    }
    ui.modes.rules.active.selectorText = "#" + mode;
    brush.mode = mode;
}

// Keyboard
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
        /*savesvg(exportsvg(sketch, ui.palette))
        let reader = new FileReader();
        let file = e.target.files[0];
        let name = file.name;
        reader.onload = (e) => {
            importsvg(sketch, loadsvg(e.target.result), name);
            rerender = true;
        }
        reader.readAsText(file);*/

function init(){
    console.log("init");

    let canvas = document.getElementById("canvas");
    ui.view = createGlview(canvas, sketch)
    canvas.addEventListener("pointerdown", brushDown);
    canvas.addEventListener("pointerup", brushUp);
    canvas.addEventListener("pointercancel", brushUp);
    canvas.addEventListener("pointerout", brushUp);
    canvas.addEventListener("pointerleave", brushUp);
    canvas.addEventListener("pointermove", brushMove);

    document.body.addEventListener("keydown", keyDown);
    document.body.addEventListener("keyup", keyUp);
    window.addEventListener("resize", ()=>(ui.view.resize()));
    document.body.addEventListener("contextmenu", (e) => {
        e.preventDefault();
    });

    ui.modes = new Panel();
    ui.modes.id = "modes";
    document.body.appendChild(ui.modes);
    ui.modes.addEventListener("action", ({detail}) => {setMode(detail.mode);});
    ui.modes.newRule(
        "#draw { --icon: var(--bg); --fill: var(--solid);}",
        "active");
    ui.modes.newRule(
        ":root { --icon: var(--solid); --fill: var(--bg);}",
        "vars");
    requestText("panels/modes.svg").then(loadsvg).then((svg) => {
        ui.modes.appendChild(svg.documentElement);
    });

    setMode("draw");

    ui.palette.loadImg("palette.png", ()=>{
        ui.view.setPalette(ui.palette.cvs);
    });
    ui.view.resize();
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
