/**
 * @typedef {import("./pool-worker").TaskConfig} TaskConfig
 */

/**
 * @typedef {object} DynamicPoolWorkerParam
 * @property {string} code
 * @property {any} [param]
 */

const { Pool } = require("./pool");
const { PoolWorker } = require("./pool-worker");
const { DynamicTaskExecutor } = require("./task-executor");
const { createCode } = require("./create-code");

const script = `
  const vm = require('vm');
  const { parentPort } = require('worker_threads');

  process.once("unhandledRejection", (err) => {
    throw err;
  });

  parentPort.on('message', async ({ code, workerData, param }) => {
    this.workerData = workerData;
    const task = vm.runInThisContext(code);
    const container = { task, workerData, require };
    const result = await container.task(param);
    parentPort.postMessage(result);
  });
`;

class DynamicPool extends Pool {
  constructor(size, opt) {
    super(size);
    const workerOpt = {
      eval: true,
    };
    if (opt) {
      /* istanbul ignore next */
      if (opt.shareEnv) {
        const { SHARE_ENV } = require("worker_threads");
        workerOpt.env = SHARE_ENV;
      }
      /* istanbul ignore next */
      if (typeof opt.resourceLimits === "object") {
        workerOpt.resourceLimits = opt.resourceLimits;
      }
    }
    this.fill(() => new PoolWorker(script, workerOpt));
  }

  /**
   * @param {object} opt
   * @param {Function} opt.task
   * @param {any} opt.param
   * @param {any} opt.workerData
   * @param {number} opt.timeout
   */
  exec({ task, param, workerData, timeout = 0 }) {
    if (typeof task !== "function") {
      throw new TypeError('task "fn" must be a function!');
    }
    const code = createCode(task);
    const workerParam = {
      code,
      param,
      workerData,
    };
    return this.runTask(workerParam, { timeout });
  }

  /**
   * @param {Function} task
   */
  createExecutor(task) {
    return new DynamicTaskExecutor(this, task);
  }
}

module.exports.DynamicPool = DynamicPool;
