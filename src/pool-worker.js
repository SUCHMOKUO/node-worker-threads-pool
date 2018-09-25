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
    
    // call done method when work finished.
    this.prependListener('message', () => this.done());
    this.once('exit', code => {
      if (this.pool.isDeprecated || code === 0) {
        // exit normally, do nothing.
        return;
      }
      // exit with exception.
      this.handleException();
    });
  }

  /**
   * start working.
   * @param {*} param 
   */
  work(param) {
    this.isIdle = false;
    return new Promise((resolve, reject) => {
      this.once('message', resolve);
      this.once('error', reject);
      this.postMessage(param);
    });
  }

  /**
   * work finished.
   */
  done() {
    this.isIdle = true;
    this.pool.queue.emit('worker-idle', this);
  }

  /**
   * request pool to replace this
   * broken worker with a new one.
   */
  handleException() {
    this.pool._replace(this);
  }
}