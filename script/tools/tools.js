"use strict";

import { createPen } from "./pen.js";
import { createMove, createZoom } from "./move.js";

export let tools = {
    pen: createPen(),
    move: createMove(),
    zoom: createZoom(),
}
