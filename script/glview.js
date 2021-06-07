/* Render sketches using WebGL
 */
"use strict";

import { createAlloc } from "./alloc.js";

export const createGlview = (palette, sketch) => {
    const vs = `#version 300 es

    uniform float u_vheight;
    uniform float u_aspect;
    uniform vec2 u_center;
    uniform float u_scale;

    in vec2 a_pos;
    in vec2 a_paletteCoord;

    out vec2 v_paletteCoord;

    void main() {
        vec2 pos;
        pos.x = (a_pos.x - u_center.x) / u_aspect;
        pos.y = (a_pos.y - u_center.y);
        pos *= 2. * u_scale / u_vheight;
        gl_Position = vec4(pos, 0, 1);
        v_paletteCoord = a_paletteCoord;
        //v_paletteCoord = a_pos;
    }
    `;

    const fs = `#version 300 es
    precision highp float;

    in vec2 v_paletteCoord;

    uniform sampler2D u_palette;
    uniform vec2 u_paletteOffset;

    out vec4 o_color;

    void main() {
        //o_color = vec4(1, 0, 0.5, 1);
        //o_color = vec4(v_paletteCoord, 1, 1);
        if (v_paletteCoord.x < 0. || v_paletteCoord.y < 0.) {
            o_color = vec4(0, 0, 0, 0);
        } else {
            o_color = texture(u_palette, (v_paletteCoord + u_paletteOffset)/256.);
        }
    }
    `;

    sketch.lines.onAdd(create);
    sketch.lines.onRemove(remove);

    // Buffer for attributes
    // Each point gets 4 values: [x, y, palettex, palettey]
    let strokes = new Float32Array(1048576);
    let allocator = createAlloc({arr: strokes});
    // Object for tracking how much we've allocated for each stroke
    // contains- id: [ptr, size]
    let allocs = new Map();

    // Ranges that must be re-uploaded to GPU
    // in format [ptr, size]
    let updateRanges = [];

    // WebGL init
    let size = [0, 0];
    let cvs = document.createElement("canvas");
    let gl = cvs.getContext("webgl2");
    let programInfo = twgl.createProgramInfo(gl, [vs, fs], ["a_pos", "a_paletteCoord"]);
    gl.useProgram(programInfo.program);

    // Set up attributes
    let attribLocs = {
        a_pos: gl.getAttribLocation(programInfo.program, "a_pos"),
        a_paletteCoord: gl.getAttribLocation(programInfo.program, "a_paletteCoord"),
    }
    let strokesBuff = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, strokesBuff);
    gl.bufferData(gl.ARRAY_BUFFER, strokes, gl.DYNAMIC_DRAW);

    let vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    // Floats are 4 bytes
    gl.enableVertexAttribArray(attribLocs["a_pos"]);
    gl.vertexAttribPointer(attribLocs["a_pos"], 2, gl.FLOAT, false, 4*4, 0);
    gl.enableVertexAttribArray(attribLocs["a_paletteCoord"]);
    gl.vertexAttribPointer(attribLocs["a_paletteCoord"], 2, gl.FLOAT, false, 4*4, 4*2);

    // Set up uniforms
    let texOpts = {
        "src": palette.cvs,
        "width": palette.size,
        "height": palette.size,
        "wrap": gl.REPEAT,
        "minMag": gl.NEAREST,
    };
    let paletteTex = twgl.createTexture(gl, texOpts);
    let uniforms = {
        u_vheight: window.innerHieght,
        u_aspect: 1,
        u_center: new Float32Array([0,0]),
        u_scale: 1,
        u_palette: paletteTex,
        u_paletteOffset: new Float32Array([0,0]),
    }

    palette.on("change", () => {
        twgl.setTextureFromElement(gl, paletteTex, palette.cvs, texOpts);
    });


    /* Respond to window resize
     */
    function resize() {
        twgl.resizeCanvasToDisplaySize(gl.canvas, window.devicePixelRatio);
        size = [gl.canvas.width, gl.canvas.height];
        uniforms.u_vheight = size[1];
        uniforms.u_aspect = size[0]/size[1];
        gl.viewport(0,0, size[0], size[1]);
        render();
    }

    /* Redraw view.
     * Uploads any ranges specified in updateRanges,
     * Re-sets all uniforms, and draws.
     */
    function render() {
        // update ranges
        // Merge ranges if possible
        for (let i = 1; i < updateRanges.length; i ++) {
            let prev = updateRanges[i-1];
            let curr = updateRanges[i];
            // If end of previous range does not reach start of current
            if (prev[0] + prev[1] < curr[0]) {
                continue;
            }
            prev[1] = Math.max(0, (curr[0] - prev[0]) + curr[1]);
            updateRanges.splice(i, 1);
            i --;
        }
        // Upload merged ranges
        gl.bindBuffer(gl.ARRAY_BUFFER, strokesBuff);
        while (updateRanges.length > 0) {
            let update = updateRanges.pop();
            gl.bufferSubData(gl.ARRAY_BUFFER, 4*update[0], 
                strokes, update[0], update[1]);
        }
//         gl.bufferData(gl.ARRAY_BUFFER, strokes, gl.DYNAMIC_DRAW);
        // Update uniforms
        uniforms.u_center[0] = sketch.center.get()[0];
        uniforms.u_center[1] = sketch.center.get()[1];
        uniforms.u_scale = sketch.scale.get() * window.devicePixelRatio;
        uniforms.u_paletteOffset[0] = palette.offset[0];
        uniforms.u_paletteOffset[1] = palette.offset[1];
        twgl.setUniforms(programInfo, uniforms);
        // Draw
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, strokes.length / 4);
    }

    /* Records new range to update.
     * Inserts into updateRanges, keeping it sorted by ptr.
     */
    function addUpdate(ptr, size) {
        // Search for first range that's after the updated block
        let i;
        for (i = 0; i < updateRanges.length; i ++) {
            if (updateRanges[i][0] > ptr) {
                break;
            }
        }
        updateRanges.splice(i, 0, [ptr, size]);
    }

    /* Write new point to strokes array at ptr
     * style- should contain palette coordinates,
     *      palette: [paletteX, paletteY]
     */
    function addPoint(coord, style, ptr) {
        strokes[ptr] = coord[0];
        strokes[ptr+1] = coord[1];
        strokes[ptr+2] = style.palette[0];
        strokes[ptr+3] = style.palette[1];
    }

    /* Add 2 points to strokes array, starting at ptr,
     * that would create a line from prev to cood.
     * style- should contain width, palette
     */
    function addLine(prev, coord, style, idx) {
        // 2 points need to be "pushed apart" by width.
        // Compute unit normal, and scale by width.
        var norm = [
            -coord[1]+prev[1],
            coord[0]-prev[0]
        ];
        var dist = Math.sqrt(Math.pow(norm[0],2)+ Math.pow(norm[1],2))/style.width;
        norm[0] /= dist; norm[1] /= dist;

        addPoint([coord[0]-norm[0], coord[1]-norm[1]], style, idx);
        addPoint([coord[0]+norm[0], coord[1]+norm[1]], style, idx+4);
    }

    function create(line) {
        let size = line.points.get().length * 8 + 4*4;
        let ptr = allocator.alloc(size)
        addUpdate(ptr, size);

        let points = line.points.get();
        addPoint(points[0], line, ptr);
        addPoint(points[0], line, ptr+4);
        for (let i = 1; i < points.length; i ++) {
            addLine(points[i-1], points[i], line, ptr + i*8);
        }
        addPoint(points[points.length-1], line, ptr + points.length*8);
        addPoint(points[points.length-1], line, ptr + points.length*8+4);

        let uPush = line.points.onPush((coords) => draw(line, coords));
        let uEnd = line.onEnd(() => checkFree(line));
        allocs.set(line, [ptr, size, uPush, uEnd]);
    }

    /* Handle drawing
     * Assumes one point has been added to line.
     */
    function draw (line, coords) {
        let points = line.points.get();
        if (points.length < 2) {
            return;
        }
        let coord = points[points.length-1];
        let prev = points[points.length-2];
        // Check if enough space allocated
        let block = allocs.get(line);
        // Need extra space for 4 points 
        // (starting and ending degenerate triangles)
        if (points.length * 8 + 4*4> block[1]) {
            addUpdate(block[0], block[1]);
            // Double size of allocation
            let newalloc = allocator.realloc(block[0], block[1] * 2);
            if (newalloc < 0) {
                console.log("Can not realloc");
                return;
            }
            block[0] = newalloc;
            block[1] *= 2;
            addUpdate(block[0], block[1]);
        }
        let idx = block[0] + points.length * 8 - 8;
        addLine(prev, coord, line, idx);
        // Need to cap off with 2 points to form degenerate triangle
        addPoint(coord, line, idx+8);
        addPoint(coord, line, idx+12);
        addUpdate(idx, 16);
    }

    /* Handle removal of line
     * Frees associated block.
     */
    function remove (line) {
        let alloc = allocs.get(line);
        allocator.free(alloc[0]);
        addUpdate(alloc[0], alloc[1]);
        alloc[2]();
        alloc[3]();
        allocs.delete(name);
    }

    function checkFree(line) {
        let len = line.points.get().length;
        // Trim away unused space
        let minsize = len * 8 + 4*4;
        let alloc = allocs.get(line);
        let shrunk = allocator.realloc(alloc[0], minsize);
        if (!(shrunk < 0)) {
            alloc[0] = shrunk;
            alloc[1] = minsize;
        }
        if (allocator.stats.free > allocator.stats.size / 16) {
            return;
        }
        let newstrokes = allocator.resize(allocator.stats.size * 2);
        if (!(ArrayBuffer.isView(newstrokes))) {
            console.log("Could not expand strokes");
            return;
        }
        strokes = newstrokes;
        gl.bindBuffer(gl.ARRAY_BUFFER, strokesBuff);
        gl.bufferData(gl.ARRAY_BUFFER, strokes, gl.DYNAMIC_DRAW);
    }

    return {
        domElement: cvs,
        size,
        resize,
        render,
        _strokes: strokes,
    }
}
