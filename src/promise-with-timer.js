class TimeoutError extends Error {
  constructor(message) {
    super(message);
    this.name = "TimeoutError";
  }
}

/**
 * @param {Error} err
 */
function isTimeoutError(err) {
  return err instanceof TimeoutError;
}

class PromiseWithTimer {
  /**
   * @param {Promise} p
   * @param {number} timeout
   */
  constructor(p, timeout) {
    this._p = p;
    this._timeout = timeout;
    this._timerID = null;
    this._timeoutSymbol = Symbol("timeoutSymbol");
  }

  _createTimer() {
    return new Promise((resolve) => {
      this._timerID = setTimeout(resolve, this._timeout, this._timeoutSymbol);
    });
  }

  async startRace() {
    if (this._timeout <= 0) {
      return await this._p;
    }

    const result = await Promise.race([this._p, this._createTimer()]);

    if (result === this._timeoutSymbol) {
      throw new TimeoutError("timeout");
    }

    clearTimeout(this._timerID);
    return result;
  }
}

module.exports.PromiseWithTimer = PromiseWithTimer;
module.exports.isTimeoutError = isTimeoutError;
