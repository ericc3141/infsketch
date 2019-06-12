"use strict"

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
let prevKey = "";
let currTool = "pen";
let sketch = createSketch();
tools["eraser"] = createEraser(sketch);


function opt(a, b) {
    if (typeof a !== "undefined") {
        return a;
    }
    return b;
}

function main(){
	requestAnimationFrame(main);
	if (!brush.down){return;}
	if (Math.abs(brush.d[0]) < 1 
			&& Math.abs(brush.d[1]) < 1){
		return;
	}
	if (currTool in tools && "move" in tools[currTool]) {
    	tools[currTool].move({inputs: brush, sketch: sketch, view: canvas});
	}
	brush.d[0] = 0;
	brush.d[1] = 0;
	canvas.render();
}

function down(e){
	if (e.button != 0){return;}
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
	brush.p[0] = e.pageX;
	brush.p[1] = e.pageY;
	brush.d[0] += e.movementX;
	brush.d[1] += e.movementY;
}

function changeTool(newTool){
    if (newTool === currTool) {return;}
    if (brush.down) {
        up();
    }
    currTool = newTool;
	document.getElementById(newTool).checked = true;
}	

function keyDown(e){
	if (e.key == prevKey){return;}
	prevKey = e.key;
	if (e.key in keymap){
		changeTool(keymap[e.key]);
	} else if (!isNaN(parseInt(e.key))) {
	    let val = parseInt(e.key) - 0.5;
	    brush.palette[0] = val * 32;
	    document.getElementById("paletteX").value = val * 32;
	}
}
function keyUp(e){
	prevKey = "";
	if (e.key in keymap){
        changeTool("pen");
	}
}

function init(){
	console.log("init");
	var palette = document.getElementById("palette")
	window.canvas = createGlview(palette, sketch);
	document.body.appendChild(canvas.domElement);
	canvas.resize();
	var toolSwitches = document.getElementsByClassName("mode");
	for (var i = 0; i < toolSwitches.length; i ++){
		toolSwitches[i].addEventListener("touchstart", (e) => {
			e.stopPropagation();
		    changeTool(e.target.id);
		});
		toolSwitches[i].addEventListener("touchend", (e) => {
			e.stopPropagation();
		});
		toolSwitches[i].parentElement.addEventListener("touchstart", (e) => {
		    e.preventDefault();
		    console.log(e);
		    changeTool(e.target.getAttribute("for"));
		});
		toolSwitches[i].parentElement.addEventListener("touchend", (e) => {
		    e.preventDefault();
		    changeTool("pen");
		});
	}
	window.addEventListener("resize", ()=>(canvas.resize()));
	canvas.domElement.addEventListener("pointerdown", down);
	canvas.domElement.addEventListener("pointerup", up);
	canvas.domElement.addEventListener("pointercancel", up);
	canvas.domElement.addEventListener("pointerout", up);
	canvas.domElement.addEventListener("pointerleave", up);
	canvas.domElement.addEventListener("pointermove", move);
	document.body.addEventListener("keydown", keyDown);
	document.body.addEventListener("keyup", keyUp);
	document.getElementById("lineWidth").addEventListener("change", function(e){
		brush.weight = Math.exp(parseFloat(e.target.value));
	});
	document.getElementById("paletteX").addEventListener("change", function(e){
		brush.palette[0] = e.target.value;
	});
	document.getElementById("paletteY").addEventListener("change", function(e){
		brush.palette[1] = e.target.value;
	});
	document.getElementById("exportsvg").addEventListener("click", ()=>{
        savesvg(exportsvg(sketch, palette))
    });
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
