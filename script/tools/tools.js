"use strict";

import { createDraw, createErase } from "./pen.js";
import { createMove, createZoom } from "./move.js";
import { save, load } from "./export.js";

export let MODES = {
    DRAW: "draw",
    ERASE: "erase",
    MOVE: "move",
    ZOOM: "zoom",
    SAVE: "save",
    LOAD: "load",
};

export let createModes = (sketch, palette) => ({
    draw: createDraw(sketch, palette),
    erase: createErase(sketch, palette),
    move: createMove(sketch, palette),
    zoom: createZoom(sketch, palette),
    save: save(sketch, palette),
    load: load(sketch, palette),
});
