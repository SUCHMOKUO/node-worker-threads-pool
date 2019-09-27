const WaitingQueue = require('./waiting-queue');

/**
 * threads pool with node's worker_threads.
 */
module.exports = class Pool {
  /**
   * @param { Number } size number of workers.
   */
  constructor(size) {
    if (typeof size !== 'number') {
      throw new Error('"size" must be the type of number!');
    }
    if (Number.isNaN(size)) {
      throw new Error('"size" must not be NaN!');
    }
    if (size < 1) {
      throw new Error('"size" must not be lower than 1!');
    }

    // pool status.
    this.isDeprecated = false;
    // init worker list.
    this.workers = new Array(size).fill();
    // worker generator function.
    this._createWorker = null;
    // waiting queue
    this.queue = new WaitingQueue();
  }

  /**
   * add life cycle hooks to worker.
   * @param { PoolWorker } worker 
   */
  _addWorkerHooks(worker) {
    worker.on("ready", (worker) => {
      this.queue.emit("worker-ready", worker);
    });

    worker.once("exit", (code) => {
      if (this.isDeprecated || code == 0) {
        // exit normally.
        return;
      }
      // error happened.
      // console.log("worker exit.");
      this.replace(worker);
      // clear.
      worker.terminate();
      worker.removeAllListeners();
    });
  }

  /**
   * set worker generator function.
   * @param { Function } workerGen worker generator function.
   */
  _setWorkerGen(fn) {
    this._createWorker = () => {
      const worker = fn();
      this._addWorkerHooks(worker);
      return worker;
    }
  }

  /**
   * fill worker list with given function.
   * @param { Function } workerGen worker generator function.
   */
  fill(workerGen) {
    this._setWorkerGen(workerGen);
    this.workers = this.workers.map(() => this._createWorker());
  }

  /**
   * choose a worker to do this task.
   * @param { * } task 
   */
  async runTask(task) {
    if (this.isDeprecated) {
      throw new Error("This pool is deprecated! Please use a new one.");
    }
    const worker = this.workers.find((worker) => worker.isReady);
    if (!worker) {
      // pool is busy, add task to waiting queue
      // then wait for a idle worker to do it.
      const result = await this.queue.runTask(task);
      return result;
    }

    const result = await worker.work(task);
    return result;
  }

  /**
   * replace a broken worker with a new one.
   * @param { PoolWorker } worker 
   */
  replace(worker) {
    const i = this.workers.indexOf(worker);
    if (i > 0) {
      this.workers[i] = this._createWorker();
    }
  }

  /**
   * terminate all workers in this pool.
   */
  destroy() {
    this.isDeprecated = true;
    this.workers.forEach((worker) => worker.terminate());
    this.workers = null;
  }
}