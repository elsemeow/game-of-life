export default class Surface {
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
