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
    palette: createPalette({}, 8),
    view: null,
    modes: null,
    controls: null,
    menu: null,
};

let config = {
    keymap: {
        a: {mode: "draw"},
        s: {mode: "erase"},
        d: {mode: "move"},
        f: {mode: "zoom"},
    },
    controls: {
        draw: "panels/draw.svg",
        move: "panels/move.svg",
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
    updatePalette();
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
function runMode(ev, ...args) {
    rerender = true;
    let state;
    if (brush.mode in modes && ev in modes[brush.mode]) {
        state = modes[brush.mode][ev](...args);
    }
    if (!state) { return; }
    for (let i in state) {
        if (!(i in ui.controls.rules)) { continue; }
        ui.controls.rules[i].selectorText = state[i];
    }
}

function brushDown(e){
    if (e.button != 0){return;}
    e.preventDefault();
    brush.down = true;
    brush.cursor = updateCursor(e, brush.cursor);
    runMode("down", brush, sketch);
}
function brushUp(e){
    if (!brush.down) {
        return;
    }
    brush.down = false;
    brush.cursor = updateCursor(e, brush.cursor);
    sketch.trigger("up");
    runMode("up", brush, sketch);
}
function brushMove(e){
    if (!brush.down){return;}
    brush.cursor = updateCursor(e, brush.cursor);
    if (Math.abs(brush.cursor.d[0]) < 1 
            && Math.abs(brush.cursor.d[1]) < 1){
        return;
    }
    runMode("move", brush, sketch);
}

// Mode switch
function setMode(mode){
    if (mode === brush.mode) {return;}
    if (brush.down) {
        brushUp({pageX: brush.cursor.p[0],
            pageY: brush.cursor.p[1]});
    }
    ui.modes.rules.activeButton.selectorText = "#" + mode;
    ui.controls.rules.activeControls.selectorText = "#controls ." + mode;
    brush.mode = mode;
}

function updatePalette() {
    ui.view.setPalette(ui.palette.cvs);

    let controlsStyle = ui.controls.rules.palette.style;
    let updateProp = (prop, [r,g,b,a]) => {
        
        let rgbastr = `rgba(${r},${g},${b},${a})`
        if (controlsStyle.getPropertyValue(prop) === rgbastr) { return; }
        controlsStyle.setProperty( prop, rgbastr);
    }

    let curr = modes.draw.palette;
    updateProp("--paletteCurr", ui.palette.color(curr));
    for (let i = 0; i < 8; i ++) {
        updateProp(`--paletteX${i}`, ui.palette.color([i, curr[1]]));
        updateProp(`--paletteY${i}`, ui.palette.color([curr[0], i]));
    }
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
        "#modes > nop { --icon: var(--bg); --fill: var(--solid);}",
        "activeButton");
    requestText("panels/modes.svg").then(loadsvg).then((svg) => {
        ui.modes.appendChild(svg.documentElement);
    });

    ui.controls = new Panel();
    ui.controls.id = "controls";
    document.body.appendChild(ui.controls);
    ui.controls.addEventListener("action", ({detail}) => {runMode("action", detail);} );
    ui.controls.newRule(
        ":root { --fill-snd: var(--bg); --fill-prm: var(--bg); }",
        "palette");
    ui.controls.newRule( "nop { --fill-prm: var(--paletteCurr);}", "paletteX");
    ui.controls.newRule( "nop { --fill-snd: var(--paletteCurr);}", "paletteY");
    ui.controls.newRule( "#controls > * { display:none;}", "hideall");
    ui.controls.newRule( "#controls > nop { display:unset;}", "activeControls");

    for (let control in config.controls) {
        requestText(config.controls[control]).then((response) => {
            let svgdoc = loadsvg(response).documentElement;
            svgdoc.classList.add(control);
            ui.controls.appendChild(svgdoc);
        });
    }


    setMode("draw");

    ui.palette.loadImg("palette.png", updatePalette);
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
