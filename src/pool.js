/**
 * @typedef {import("./pool-worker").PoolWorker} PoolWorker
 * @typedef {import("../index").TransferList} TransferList
 * @typedef {import("./pool-worker").TaskConfig} TaskConfig
 */

const { EventEmitter } = require("events");
const { TaskContainer } = require("./task-container");
const { isTimeoutError } = require("./promise-with-timer");

class Pool extends EventEmitter {
  /**
   * @param {number} size
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

    /** @private */
    this._size = size;

    /** @private */
    this._isDeprecated = false;

    /**
     * @private
     * @type {PoolWorker[]}
     */
    this._workers = [];

    /**
     * @private
     */
    this._createWorker = null;

    /**
     * @private
     * @type {TaskContainer[]}
     */
    this._queue = [];

    this._addEventHandlers();
  }

  /**
   * @private
   */
  _addEventHandlers() {
    this.on("worker-ready", (/** @type {PoolWorker} */ worker) => {
      const taskContainer = this._queue.shift();
      if (taskContainer) {
        const { param, taskConfig, resolve, reject } = taskContainer;
        worker
          .run(param, taskConfig)
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
   * @private
   * @param {PoolWorker} worker
   */
  _addWorkerHooks(worker) {
    worker.on("ready", (worker) => this.emit("worker-ready", worker));

    worker.once("exit", (code) => {
      if (this._isDeprecated || code === 0) {
        return;
      }
      this._replaceBrokenWorker(worker);
      worker.terminate();
      worker.removeAllListeners();
    });
  }

  /**
   * @private
   * @param {() => PoolWorker} workerGen
   */
  _setWorkerGen(workerGen) {
    this._createWorker = () => {
      const worker = workerGen();
      this._addWorkerHooks(worker);
      return worker;
    };
  }

  /**
   * @param {PoolWorker} worker
   * @private
   */
  _replaceBrokenWorker(worker) {
    const i = this._workers.indexOf(worker);
    if (i > 0) {
      this._workers[i] = this._createWorker();
    }
  }

  /**
   * @param {() => PoolWorker} workerGen
   */
  fill(workerGen) {
    this._setWorkerGen(workerGen);
    const size = this._size;
    for (let i = 0; i < size; i++) {
      this._workers.push(this._createWorker());
    }
  }

  /**
   * @param {any} param
   * @param {TaskConfig} taskConfig
   */
  async dispatchTask(param, taskConfig) {
    if (this._isDeprecated) {
      throw new Error("This pool is deprecated! Please use a new one.");
    }

    const worker = this._workers.find((worker) => worker.isReady);

    if (worker) {
      try {
        return await worker.run(param, taskConfig);
      } catch (err) {
        if (isTimeoutError(err)) {
          worker.terminate();
        }
        throw err;
      }
    }

    return new Promise((resolve, reject) => {
      const taskContainer = new TaskContainer(
        param,
        resolve,
        reject,
        taskConfig
      );
      this._queue.push(taskContainer);
    });
  }

  async destroy() {
    this._isDeprecated = true;
    this.removeAllListeners();
    const workers = this._workers;
    this._workers = null;
    await Promise.all(workers.map((worker) => worker.terminate()));
  }
}

module.exports.Pool = Pool;
