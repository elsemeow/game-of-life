export default class GameLoop {
  #fps;
  #interval;
  #then;
  #delta;
  #requestId;
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

      this.#requestId = window.requestAnimationFrame(this.#loopRunner);
    };
  }

  run() {
    this.#loopRunner();
  }

  cancel() {
    window.cancelAnimationFrame(this.#requestId);
    this.#then = window.performance.now();
    this.#delta = 0;
  }
}
