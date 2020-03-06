const Events = require("events");
const TaskContainer = require("./task-container");
const { PromiseWithTimer, isTimeoutError } = require("./promise-with-timer");

/**
 * threads pool with node's worker_threads.
 */
module.exports = class Pool extends Events {
  /**
   * @param { Number } size number of workers.
   */
  constructor(size) {
    super();
    if (typeof size !== "number") {
      throw new TypeError('"size" must be the type of number!');
    }
    if (Number.isNaN(size)) {
      throw new Error('"size" must not be NaN!');
    }
    if (size < 1) {
      throw new RangeError('"size" must not be lower than 1!');
    }

    // pool status.
    this.isDeprecated = false;
    /**
     * @type { PoolWorker[] }
     */
    this.workers = new Array(size).fill();
    // worker generator function.
    this._createWorker = null;
    /**
     * @type { TaskContainer[] }
     */
    this._queue = [];

    this.on("worker-ready", (worker) => {
      const taskContainer = this._queue.shift();
      if (taskContainer) {
        const { task, timeout, resolve, reject } = taskContainer;
        const p = new PromiseWithTimer(worker.work(task), timeout);
        p.start()
          .then(resolve)
          .catch((err) => {
            if (isTimeoutError(err)) {
              worker.terminate();
            }
            reject(err);
          });
      }
    });
  }

  /**
   * add life cycle hooks to worker.
   * @param { PoolWorker } worker
   */
  _addWorkerHooks(worker) {
    worker.on("ready", (worker) => this.emit("worker-ready", worker));

    worker.once("exit", (code) => {
      if (this.isDeprecated || code === 0) {
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
    };
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
   * @param { number } timeout timeout in ms for the task. 0 stands for no limit.
   */
  async runTask(task, timeout = 0) {
    if (this.isDeprecated) {
      throw new Error("This pool is deprecated! Please use a new one.");
    }

    const worker = this.workers.find((worker) => worker.isReady);

    if (worker) {
      const p = new PromiseWithTimer(worker.work(task), timeout);
      let res;
      try {
        res = await p.start();
      } catch (err) {
        if (isTimeoutError(err)) {
          worker.terminate();
        }
        throw err;
      }
      return res;
    }

    // pool is busy, add task to queue and wait for a idle worker.
    return new Promise((resolve, reject) => {
      const taskContainer = new TaskContainer(task, resolve, reject, timeout);
      this._queue.push(taskContainer);
    });
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
    this.workers.forEach((worker) => {
      if (worker) {
        worker.terminate();
      }
    });
    this.workers = null;
    this.removeAllListeners();
  }
};
