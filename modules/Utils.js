export default class Utils {
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
