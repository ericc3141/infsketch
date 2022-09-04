"use strict";

import { createDraw, createErase } from "./pen.js";
import { createMove, createZoom } from "./move.js";

export let MODES = {
    DRAW: "draw",
    ERASE: "erase",
    MOVE: "move",
    ZOOM: "zoom",
};

export let createModes = (sketch) => ({
    draw: createDraw(sketch),
    erase: createErase(sketch),
    move: createMove(sketch),
    zoom: createZoom(sketch),
});
