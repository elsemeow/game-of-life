// # Region: Classes
//------------------------------------------------------------------------------

class Utils {
  // Math
  //----------------------------------------------------------------------------

  /**
   * Keeps value between min and max.
   * @param {number} val
   * @param {number} min
   * @param {number} max
   */
  static clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
  }

  // Time
  //----------------------------------------------------------------------------

  /**
   * Promise based sleep. Use with `.then(() => {})` or `async`/`await`.
   * @param {number} ms - Milliseconds.
   */
  static sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

class Grid {
  #unscaled;

  constructor(cols, rows, unit) {
    this.cols = cols;
    this.rows = rows;
    this.unit = unit;
    this.#unscaled = this.unit;
    this.root = new Uint8Array(this.cols * this.rows);
    this.next = new Uint8Array(this.cols * this.rows);
  }

  get w() {
    return this.unit * this.cols;
  }

  get h() {
    return this.unit * this.rows;
  }

  get midX() {
    return this.w * 0.5;
  }

  get midY() {
    return this.h * 0.5;
  }

  get unitMid() {
    return this.unit * 0.5;
  }

  get unscaled() {
    return this.#unscaled;
  }

  xByIndex(index) {
    return index % this.cols;
  }

  yByIndex(index) {
    return Math.floor(index / this.cols);
  }

  elByPos(arr, x, y) {
    return arr[y * this.cols + x];
  }

  elValByPos(arr, x, y, val) {
    arr[y * this.cols + x] = val;
  }

  clearRoot() {
    this.root.fill(0);
    this.next.fill(0);
  }

  //
  // → → →
  // 0 1 2 ↓
  // 7 x 3 ↓
  // 6 5 4 ↓
  //

  getAroundAlive(arr, i) {
    const x = this.xByIndex(i);
    const y = this.yByIndex(i);
    let dx = [x - 1, x, x + 1, x + 1, x + 1, x, x - 1, x - 1];
    let dy = [y - 1, y - 1, y - 1, y, y + 1, y + 1, y + 1, y];
    let result = 0;

    if (x === 0) dx[0] = dx[6] = dx[7] = this.cols - 1;
    if (y === 0) dy[0] = dy[1] = dy[2] = this.rows - 1;
    if (x === this.cols - 1) dx[2] = dx[3] = dx[4] = 0;
    if (y === this.rows - 1) dy[4] = dy[5] = dy[6] = 0;

    let l = dx.length;
    while (l--) result += this.elByPos(arr, dx[l], dy[l]);

    return result;
  }

  nextGen() {
    let buffer = new Uint8Array(this.cols * this.rows);
    let i = this.next.length;
    while (i--) {
      buffer[i] = this.next[i];
      const val = buffer[i];
      const alive = this.getAroundAlive(this.next, i);
      buffer[i] = (val === 1 && alive === 2) || alive === 3 ? 1 : 0;
    }
    this.next = buffer;
  }
}

class Surface {
  #el;
  #ctx;

  /** @param {Object} el - Canvas element. */
  constructor(el) {
    this.#el = el;
    this.#ctx = this.#el.getContext("2d", { alpha: false });
    this.pan0 = { x: 0, y: 0 };
    this.panDelta = { x: 0, y: 0 };
    this.scale = 1;
    this.scaleF = 0.25;
    this.fitToWindow();
  }

  /** @returns {Object} Canvas element. */
  get el() {
    return this.#el;
  }

  /** @returns {Object} Canvas 2d context. */
  get ctx() {
    return this.#ctx;
  }

  /** @returns {number} Width. */
  get w() {
    return this.el.width;
  }

  /** @returns {number} Height. */
  get h() {
    return this.el.height;
  }

  /** @returns {number} Half width. */
  get midX() {
    return this.w * 0.5;
  }

  /** @returns {number} Half height. */
  get midY() {
    return this.h * 0.5;
  }

  /** Fit canvas to window. */
  fitToWindow() {
    this.el.width = window.innerWidth;
    this.el.height = window.innerHeight;
  }

  /**
   * Fill canvas with color.
   * @param {string} color
   */
  fill(color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.w, this.h);
  }

  /**
   * @param {number} unit
   * @param {number} unitMid
   * @param {string} bgColor
   * @param {string} dotColor
   * @param {number} r - Dot radius.
   */
  dotPattern(unit, unitMid, bgColor, dotColor, r) {
    const patternEl = document.createElement("canvas");
    const patternCtx = patternEl.getContext("2d", { alpha: false });

    patternEl.width = patternEl.height = unit;

    patternCtx.fillStyle = bgColor;
    patternCtx.fillRect(0, 0, unit, unit);
    patternCtx.fillStyle = dotColor;
    patternCtx.arc(unitMid, unitMid, r, 0, 2 * Math.PI);
    patternCtx.fill();

    return this.ctx.createPattern(patternEl, "repeat");
  }

  /** Reset canvas 2d context transformation. */
  resetTransform() {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  /**
   * @param {number} midX
   * @param {number} midY
   */
  applyPan(midX, midY) {
    this.ctx.translate(
      this.midX - midX + this.panDelta.x * this.scale,
      this.midY - midY + this.panDelta.y * this.scale
    );
  }

  cell(cX, cY, unit, midX, midY) {
    return {
      x: Math.floor(
        (cX - this.midX + midX - this.panDelta.x * this.scale) / unit
      ),
      y: Math.floor(
        (cY - this.midY + midY - this.panDelta.y * this.scale) / unit
      )
    };
  }
}

class GameLoop {
  #fps;
  #interval;
  #then;
  #delta;
  #loopRunner;

  /** @param {number} fps - Frames per second. */
  constructor(fps) {
    this.#fps = fps;
    this.#interval = 1000 / this.#fps;
    this.#then = window.performance.now();
    this.#delta = 0;
  }

  get fps() {
    return this.#fps;
  }

  set fps(val) {
    this.#fps = val;
    this.#interval = 1000 / this.#fps;
  }

  init(throttledRender, render) {
    this.#loopRunner = async (timestamp) => {
      this.#delta = timestamp - this.#then;

      await render();

      if (this.#delta > this.#interval) {
        this.#then = timestamp - (this.#delta % this.#interval);
        throttledRender();
      }

      window.requestAnimationFrame(this.#loopRunner);
    };
  }

  run() {
    this.#loopRunner();
  }
}

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
  const setup = document.getElementById("setup");
  const createGrid = document.getElementById("create-grid");

  const positionDisplay = document.getElementById("position");
  const scaleDisplay = document.getElementById("scale");
  const speedDisplay = document.getElementById("speed");

  const pencilBtn = document.getElementById("pencil");
  const eraserBtn = document.getElementById("eraser");
  const panBtn = document.getElementById("pan");
  const clearBtn = document.getElementById("clear");
  const tools = document.querySelectorAll("#tools > .btn");

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
          if (grid.next[i])
            surface.ctx.fillRect(
              grid.xByIndex(i) * unit,
              grid.yByIndex(i) * unit,
              unit,
              unit
            );
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

    surface.el.addEventListener("mousedown", pencilMouseDownHandler);

    pencilBtn.addEventListener("click", selectPencil);
    eraserBtn.addEventListener("click", selectEraser);
    panBtn.addEventListener("click", selectPan);
    clearBtn.addEventListener("click", clearClickHandler);

    runBtn.addEventListener("click", runClickHandler);
    resetBtn.addEventListener("click", resetClickHandler);

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
    while (i--) grid.next[i] = grid.root[i];
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
    let i = tools.length;
    while (i--) tools[i].classList.remove("active");
  }

  function removeListnersFromTools() {
    surface.el.removeEventListener("mousedown", pencilMouseDownHandler);
    surface.el.removeEventListener("mousedown", eraserMouseDownHandler);
    surface.el.removeEventListener("mousedown", panMouseDownHandler);
  }
})();
