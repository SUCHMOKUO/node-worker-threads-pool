class PromiseWithTimer {
  /**
   * @param { Promise } p
   * @param { number } timeout timeout in ms. 0 stands for no limit.
   */
  constructor(p, timeout) {
    this._p = p;
    this._timeout = timeout;
    this._timerID = null;
  }

  _timer() {
    return new Promise((resolve, _) => {
      this._timerID = setTimeout(resolve, this._timeout, this._timer);
    });
  }

  /**
   * start race of promise and timer.
   * it throws an error when timeout before the promise return.
   */
  async start() {
    if (this._timeout <= 0) {
      return await this._p;
    }
    const res = await Promise.race([this._p, this._timer()]);
    if (res === this._timer) {
      // timeout.
      throw new PromiseWithTimer.TimeoutError("timeout");
    }
    clearTimeout(this._timerID);
    return res;
  }
}

PromiseWithTimer.TimeoutError = class TimeoutError extends Error {
  constructor(message) {
    super(message);
    this.name = "TimeoutError";
  }
};

module.exports = PromiseWithTimer;
