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
    this._deprecated = false;

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
    this._taskQueue = [];

    this._addEventHandlers();
  }

  /**
   * @private
   */
  _addEventHandlers() {
    this.on("worker-ready", (worker) => {
      this._processTask(worker);
    });
  }

  /**
   * @private
   * @param {PoolWorker} worker
   */
  _addWorkerLifecycleHandlers(worker) {
    worker.on("ready", (worker) => this.emit("worker-ready", worker));

    worker.once("exit", (code) => {
      if (this._deprecated || code === 0) {
        return;
      }
      this._replaceWorker(worker);
    });
  }

  /**
   * @private
   * @param {() => PoolWorker} getWorker
   */
  _setWorkerCreator(getWorker) {
    this._createWorker = () => {
      const worker = getWorker();
      this._addWorkerLifecycleHandlers(worker);
      return worker;
    };
  }

  /**
   * @param {PoolWorker} worker
   * @private
   */
  _replaceWorker(worker) {
    const i = this._workers.indexOf(worker);
    this._workers[i] = this._createWorker();
  }

  /**
   * @returns {PoolWorker | null}
   */
  _getIdleWorker() {
    const worker = this._workers.find((worker) => worker.ready);

    return worker ? worker : null;
  }

  /**
   * @param {PoolWorker} worker
   * @private
   */
  _processTask(worker) {
    const task = this._taskQueue.shift();

    if (!task) {
      return;
    }

    const { param, resolve, reject, taskConfig } = task;

    worker
      .run(param, taskConfig)
      .then(resolve)
      .catch((error) => {
        if (isTimeoutError(error)) {
          worker.terminate();
        }
        reject(error);
      });
  }

  /**
   * @param {() => PoolWorker} getWorker
   */
  fill(getWorker) {
    this._setWorkerCreator(getWorker);

    const size = this._size;

    for (let i = 0; i < size; i++) {
      this._workers.push(this._createWorker());
    }
  }

  /**
   * @param {any} param
   * @param {TaskConfig} taskConfig
   */
  runTask(param, taskConfig) {
    if (this._deprecated) {
      throw new Error("This pool is deprecated! Please use a new one.");
    }

    return new Promise((resolve, reject) => {
      const task = new TaskContainer(param, resolve, reject, taskConfig);

      this._taskQueue.push(task);
      const worker = this._getIdleWorker();

      if (worker) {
        this._processTask(worker);
      }
    });
  }

  async destroy() {
    this._deprecated = true;
    this.removeAllListeners();
    const workers = this._workers;
    this._workers = null;
    await Promise.all(workers.map((worker) => worker.terminate()));
  }
}

module.exports.Pool = Pool;
