const { Worker } = require('worker_threads');
const Events = require('events');

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

class WaitingQueue extends Events {
  constructor() {
    super();
    this._queue = [];

    // when a worker turns idle.
    this.on('worker-idle', worker => {
      const callback = this._queue.shift();
      callback && callback(worker);
    });
  }

  /**
   * add a task to waiting queue.
   * @param {*} param 
   */
  addTask(param) {
    return new Promise((resolve, reject) => {
      this._queue.push(worker => {
        worker.work(param)
          .then(resolve)
          .catch(reject);
      });
    });
  }
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
    // waiting queue
    this.queue = new WaitingQueue();
  }

  /**
   * choose a worker to do this task.
   * @param {*} param 
   */
  async exec(param) {
    const worker = this.workers.find(worker => worker.isIdle);
    if (!worker) {
      // pool is busy, add task to waiting queue
      // then wait for a idle worker to do it.
      const result = await this.queue.addTask(param);
      return result;
    }

    const result = await worker.work(param);
    return result;
  }

  /**
   * replace this broken worker with a new one.
   * @param { PoolWorker } worker 
   */
  _replace(worker) {
    const index = this.workers.indexOf(worker);
    if (index !== -1) {
      this.workers[index] = new PoolWorker(this);
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