const { Worker } = require('worker_threads');

/**
 * worker in the pool.
 */
class PoolWorker extends Worker {
  /**
   * @param { Pool } pool pool that own this worker
   */
  constructor(pool) {
    super(pool.filePath);

    this.pool = pool;
    // working status.
    this.isFree = true;
    
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
    this.isFree = false;
    this.postMessage(param);
  }

  /**
   * work finished.
   */
  done() {
    this.isFree = true;
  }

  /**
   * request pool to replace this
   * broken worker with a new one.
   */
  handleException() {
    this.pool._replace(this);
  }
}

/**
 * "waiting" for the next event loop.
 */
function nextLoop() {
  return new Promise((resolve, _) => {
    setTimeout(resolve, 20);
  });
}

/**
 * threads pool with node's worker_threads.
 */
module.exports = class Pool {
  /**
   * @param { String } filePath absolute path of the worker script.
   * @param { Number } num number of workers.
   */
  constructor(filePath, num) {
    if (typeof filePath !== 'string') {
      throw new Error('"filename" must be the type of string!');
    }
    if (typeof num !== 'number') {
      throw new Error('"max" must be the type of number!');
    }
    if (Number.isNaN(num)) {
      throw new Error('"max" must not be NaN!');
    }
    if (num < 1) {
      throw new Error('"max" must not be lower than 1!');
    }

    // path of the script this pool will use.
    this.filePath = filePath;
    // pool status.
    this.isDeprecated = false;
    // worker list.
    this.workers = Array.from(new Array(num), _ => new PoolWorker(this));
  }

  /**
   * choose a worker to do this task.
   * @param {*} param 
   */
  async exec(param) {
    const worker = this.workers.find(worker => worker.isFree);
    if (!worker) {
      // pool is busy, "waiting" for the next event loop.
      await nextLoop();
      return this.exec(param);
    }
    
    return new Promise((resolve, reject) => {
      worker.once('message', resolve);
      worker.once('error', reject);
      worker.work(param);
    });
  }

  /**
   * replace this broken worker with a new one.
   * @param { PoolWorker } worker 
   */
  _replace(worker) {
    const index = this.workers.indexOf(worker);
    if (index !== -1) {
      this.workers[index] = new PoolWorker(this);
      // console.log('--------------------- Replaced --------------------');
    }
  }

  /**
   * terminate all workers in this pool.
   */
  destroy() {
    this.isDeprecated = true;
    this.workers.forEach(worker => worker.terminate());
    this.workers = null;
  }
}