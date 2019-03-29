const { Worker } = require('worker_threads');

/**
 * worker in the pool.
 */
module.exports = class PoolWorker extends Worker {
  /**
   * @param { Pool } pool pool that own this worker
   */
  constructor(pool, ...args) {
    super(...args);

    this.pool = pool;
    // working status.
    this.isIdle = true;
    
    this.once("exit", (code) => {
      // console.debug("exit with code", code);
      if (this.pool.isDeprecated || code === 0) {
        // exit normally, do nothing.
        return;
      }
      // exit with exception.
      this.handleException();
    });

    // this.setMaxListeners(0);
  }

  /**
   * start working.
   * @param { * } param 
   */
  work(param) {
    this.isIdle = false;
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
    this.isIdle = true;
    this.pool.queue.emit("worker-idle", this);
  }

  /**
   * request pool to replace this
   * broken worker with a new one.
   */
  handleException() {
    this.removeAllListeners();
    this.pool.replace(this);
  }
}