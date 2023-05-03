export default class Grid {
  #unscaled;

  constructor(cols, rows, unit) {
    this.cols = cols;
    this.rows = rows;
    this.unit = unit;
    this.#unscaled = this.unit;
    this.root = new Uint8Array(this.cols * this.rows);
    this.next = new Uint8Array(this.cols * this.rows);
    this.state = 0;
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

  indexByPos(x, y) {
    return y * this.cols + x;
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
    while (l--) {
      result += this.elByPos(arr, dx[l], dy[l]);
    }

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
