// # Region: Imports
//------------------------------------------------------------------------------

import "./styles/main.css";
import Utils from "./modules/Utils.js";
import Grid from "./modules/Grid.js";
import Surface from "./modules/Surface.js";
import GameLoop from "./modules/GameLoop.js";

(() => {
  "use strict";

  // # Region: Globals
  //----------------------------------------------------------------------------

  let grid = null;
  let surface = null;
  let gameLoop = null;
  let dotPattern = null;

  let isGamePaused = true;

  // For canvas shapes
  const palette = {
    bg: "#212121",
    dot: "#ddd",
    cell: "#ffcdfa"
  };

  // # Region: UI DOM elements
  //----------------------------------------------------------------------------

  const colsRange = document.getElementById("cols-range");
  const rowsRange = document.getElementById("rows-range");
  const colsDisplay = document.getElementById("cols-display");
  const rowsDisplay = document.getElementById("rows-display");
  const createGrid = document.getElementById("create-grid");

  const positionDisplay = document.getElementById("position");
  const scaleDisplay = document.getElementById("scale");
  const speedDisplay = document.getElementById("speed");

  const pencilBtn = document.getElementById("pencil");
  const eraserBtn = document.getElementById("eraser");
  const panBtn = document.getElementById("pan");
  const clearBtn = document.getElementById("clear");

  const resetBtn = document.getElementById("reset");
  const runBtn = document.getElementById("run");

  // # Region: 1st run init
  //----------------------------------------------------------------------------

  colsDisplay.textContent = colsRange.value;
  rowsDisplay.textContent = rowsRange.value;

  colsRange.addEventListener("input", rangeColsInputHandler);
  rowsRange.addEventListener("input", rangeRowsInputHandler);
  createGrid.addEventListener("click", createGridClickHandler);

  // # Region: Main
  //----------------------------------------------------------------------------

  function initGame() {
    grid = new Grid(colsRange.value, rowsRange.value, 36);
    surface = new Surface(document.getElementById("surface"));
    dotPattern = surface.dotPattern(
      grid.unit,
      grid.unitMid,
      palette.bg,
      palette.dot,
      2
    );
    gameLoop = new GameLoop(10 - Math.ceil(grid.cols * grid.rows * 0.000008));

    gameLoop.init(
      () => {
        if (!isGamePaused) grid.nextGen();
      },
      () => {
        surface.fill(palette.bg);
        surface.applyPan(grid.midX, grid.midY);
        surface.ctx.fillStyle = dotPattern;
        surface.ctx.fillRect(0, 0, grid.w, grid.h);
        surface.ctx.fillStyle = palette.cell;

        let i = grid.root.length;
        const unit = grid.unit;
        while (i--) {
          if (grid.next[i]) {
            surface.ctx.fillRect(
              grid.xByIndex(i) * unit,
              grid.yByIndex(i) * unit,
              unit,
              unit
            );
          }
        }

        surface.resetTransform();
      }
    );
  }

  // # Region: Event handlers
  //----------------------------------------------------------------------------

  // ## Update on resize

  function updateOnResize() {
    surface.fitToWindow();
  }

  // ## Range sliders

  function rangeColsInputHandler() {
    colsDisplay.textContent = colsRange.value;
  }

  function rangeRowsInputHandler() {
    rowsDisplay.textContent = rowsRange.value;
  }

  // ## Create grid (game start)

  function createGridClickHandler() {
    colsRange.removeEventListener("input", rangeColsInputHandler);
    rowsRange.removeEventListener("input", rangeRowsInputHandler);
    createGrid.removeEventListener("click", createGridClickHandler);

    initGame();
    uiSetupState();

    gameLoop.run();

    updatePositionDisplay();
    scaleDisplay.textContent = surface.scale * 100;
    speedDisplay.textContent = gameLoop.fps;

    window.addEventListener("resize", updateOnResize);
    document.addEventListener("keyup", keyUpHandler, false);

    clearBtn.addEventListener("click", clearClickHandler);
    surface.el.addEventListener("mousedown", pencilMouseDownHandler);

    pencilBtn.addEventListener("click", selectPencil);
    eraserBtn.addEventListener("click", selectEraser);
    panBtn.addEventListener("click", selectPan);

    runBtn.addEventListener("click", runClickHandler);
    resetBtn.addEventListener("click", resetClickHandler);

    const setup = document.getElementById("setup");

    setup.classList.add("zoom-fade-out");
    Utils.sleep(500 - 50).then(() => {
      setup.classList.add("hidden");
      setup.classList.remove("zoom-fade-out");
    });
  }

  // ## Scale and Speed

  function keyUpHandler(event) {
    const keyName = event.code;

    switch (keyName) {
      case "Minus":
      case "NumpadSubtract": {
        if (surface.scale > surface.scaleF) {
          surface.scale -= surface.scaleF;
          grid.unit = grid.unscaled * surface.scale;
          dotPattern = surface.dotPattern(
            grid.unit,
            grid.unitMid,
            palette.bg,
            palette.dot,
            2 * surface.scale
          );
          updatePositionDisplay();
          scaleDisplay.textContent = surface.scale * 100;
        }
        break;
      }
      case "Equal":
      case "NumpadAdd": {
        if (surface.scale < surface.scaleF * 6) {
          surface.scale += surface.scaleF;
          grid.unit = grid.unscaled * surface.scale;
          dotPattern = surface.dotPattern(
            grid.unit,
            grid.unitMid,
            palette.bg,
            palette.dot,
            2 * surface.scale
          );
          updatePositionDisplay();
          scaleDisplay.textContent = surface.scale * 100;
        }
        break;
      }
      case "ArrowLeft": {
        gameLoop.fps = Utils.clamp(gameLoop.fps - 1, 0, 60);
        speedDisplay.textContent = gameLoop.fps;
        break;
      }
      case "ArrowRight": {
        gameLoop.fps = Utils.clamp(gameLoop.fps + 1, 0, 60);
        speedDisplay.textContent = gameLoop.fps;
        break;
      }
    }
  }

  // ## Tools

  function selectPencil() {
    removeActiveFromTools();
    removeListnersFromTools();
    pencilBtn.classList.add("active");
    surface.el.addEventListener("mousedown", pencilMouseDownHandler);
  }

  function selectEraser() {
    removeActiveFromTools();
    removeListnersFromTools();
    eraserBtn.classList.add("active");
    surface.el.addEventListener("mousedown", eraserMouseDownHandler);
  }

  function selectPan() {
    removeActiveFromTools();
    removeListnersFromTools();
    panBtn.classList.add("active");
    surface.el.addEventListener("mousedown", panMouseDownHandler);
  }

  // ## Pencil

  function pencilMouseDownHandler() {
    surface.el.addEventListener("mousemove", pencilMouseMoveHandler);
    surface.el.addEventListener("mouseup", pencilMouseUpHandler);
  }

  function pencilMouseMoveHandler(event) {
    freeDrawing(1, event.clientX, event.clientY);
  }

  function pencilMouseUpHandler(event) {
    surface.el.removeEventListener("mousemove", pencilMouseMoveHandler);
    surface.el.removeEventListener("mouseup", pencilMouseUpHandler);
    freeDrawing(1, event.clientX, event.clientY);
  }

  // ## Eraser

  function eraserMouseDownHandler() {
    surface.el.addEventListener("mousemove", eraserMouseMoveHandler);
    surface.el.addEventListener("mouseup", eraserMouseUpHandler);
  }

  function eraserMouseMoveHandler(event) {
    freeDrawing(0, event.clientX, event.clientY);
  }

  function eraserMouseUpHandler(event) {
    surface.el.removeEventListener("mousemove", eraserMouseMoveHandler);
    surface.el.removeEventListener("mouseup", eraserMouseUpHandler);
    freeDrawing(0, event.clientX, event.clientY);
  }

  // ## Pan

  const panMouseDownHandler = (event) => {
    surface.el.addEventListener("mousemove", panMouseMoveHandler);
    surface.el.addEventListener("mouseup", panMouseUpHandler);
    surface.pan0.x = event.clientX;
    surface.pan0.y = event.clientY;
  };

  function panMouseMoveHandler(event) {
    surface.panDelta.x += Math.floor(
      (surface.pan0.x - event.clientX) / 50 / surface.scale
    );
    surface.panDelta.y += Math.floor(
      (surface.pan0.y - event.clientY) / 50 / surface.scale
    );
    updatePositionDisplay();
  }

  const panMouseUpHandler = () => {
    surface.el.removeEventListener("mousemove", panMouseMoveHandler);
    surface.el.removeEventListener("mouseup", panMouseUpHandler);
  };

  // ## Clear

  function clearClickHandler() {
    grid.clearRoot();
  }

  // ## Run

  function runClickHandler() {
    uiRunState();
    isGamePaused = false;
  }

  // ## Reset

  function resetClickHandler() {
    uiEditState();
    isGamePaused = true;
    let i = grid.next.length;
    while (i--) {
      grid.next[i] = grid.root[i];
    }
  }

  // # Region: UI States
  //----------------------------------------------------------------------------

  function uiSetupState() {
    pencilBtn.classList.add("active");
    resetBtn.classList.add("hidden");
  }

  function uiEditState() {
    pencilBtn.classList.remove("hidden");
    eraserBtn.classList.remove("hidden");
    clearBtn.classList.remove("hidden");
    runBtn.classList.remove("hidden");
    resetBtn.classList.add("hidden");
  }

  function uiRunState() {
    selectPan();
    pencilBtn.classList.add("hidden");
    eraserBtn.classList.add("hidden");
    clearBtn.classList.add("hidden");
    runBtn.classList.add("hidden");
    resetBtn.classList.remove("hidden");
  }

  // # Region: Utils
  //----------------------------------------------------------------------------

  function updatePositionDisplay() {
    positionDisplay.textContent =
      Math.round(-surface.panDelta.x) + ", " + Math.round(-surface.panDelta.y);
  }

  function freeDrawing(val, cX, cY) {
    const x =
      cX - surface.midX + grid.midX - surface.panDelta.x * surface.scale;
    const y =
      cY - surface.midY + grid.midY - surface.panDelta.y * surface.scale;

    if (x < grid.w && y < grid.h && x > 0 && y > 0) {
      const cell = surface.cell(cX, cY, grid.unit, grid.midX, grid.midY);
      grid.elValByPos(grid.root, cell.x, cell.y, val);
      grid.elValByPos(grid.next, cell.x, cell.y, val);
    }
  }

  function removeActiveFromTools() {
    const tools = document.querySelectorAll("#tools > .btn");
    let i = tools.length;
    while (i--) {
      tools[i].classList.remove("active");
    }
  }

  function removeListnersFromTools() {
    surface.el.removeEventListener("mousedown", pencilMouseDownHandler);
    surface.el.removeEventListener("mousedown", eraserMouseDownHandler);
    surface.el.removeEventListener("mousedown", panMouseDownHandler);
  }
})();
