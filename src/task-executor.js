/**
 * @typedef {import("./pool").Pool} Pool
 * @typedef {import("./dynamic-pool").DynamicPool} DynamicPool
 * @typedef {import("./dynamic-pool").DynamicPoolWorkerParam} DynamicPoolWorkerParam
 * @typedef {import("./pool-worker").TaskConfig} TaskConfig
 * @typedef {import("../index").TransferList} TransferList
 */

const { createCode } = require("./create-code");

class BaseTaskExecutor {
  /**
   * @param {Pool} pool
   */
  constructor(pool) {
    /** @protected */
    this._pool = pool;

    /**
     * @type {TaskConfig}
     * @protected
     */
    this._taskConfig = {};

    /** @protected */
    this._called = false;
  }

  /**
   * @param {number} t
   */
  setTimeout(t) {
    this._taskConfig.timeout = t;
    return this;
  }

  /**
   * @param {TransferList} transferList
   */
  setTransferList(transferList) {
    this._taskConfig.transferList = transferList;
    return this;
  }

  /**
   * @param {any} param
   */
  async exec(param) {
    if (this._called) {
      throw new Error("task executor is already called!");
    }
    this._called = true;
    return await this._pool.runTask(param, this._taskConfig);
  }
}

class StaticTaskExecutor extends BaseTaskExecutor {}

class DynamicTaskExecutor extends BaseTaskExecutor {
  /**
   * @param {DynamicPool} dynamicPool
   * @param {Function} task
   */
  constructor(dynamicPool, task) {
    super(dynamicPool);

    /**
     * @private
     * @type {string}
     */
    this._code = createCode(task);
  }

  /**
   * @override
   * @param {any} param
   */
  async exec(param) {
    /** @type {DynamicPoolWorkerParam} */
    const workerParam = { code: this._code, param };
    return await super.exec(workerParam);
  }
}

module.exports.StaticTaskExecutor = StaticTaskExecutor;
module.exports.DynamicTaskExecutor = DynamicTaskExecutor;
