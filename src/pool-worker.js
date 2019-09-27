const { Worker } = require('worker_threads');

/**
 * worker in the pool.
 */
module.exports = class PoolWorker extends Worker {
  
  constructor(...args) {
    super(...args);

    // working status.
    this.isReady = false;

    this.once("online", () => {
      this.ready();
    });
  }

  /**
   * start working.
   * @param { * } param 
   */
  work(param) {
    this.isReady = false;
    return new Promise((resolve, reject) => {
      const self = this;

      function message(res) {
        self.removeListener("error", error);
        self.ready();
        resolve(res);
      }

      function error(err) {
        self.removeListener("message", message);
        reject(err);
      }

      this.once("message", message);
      this.once("error", error);
      this.postMessage(param);
    });
  }

  /**
   * ready to work.
   */
  ready() {
    this.isReady = true;
    this.emit("ready", this);
  }
}