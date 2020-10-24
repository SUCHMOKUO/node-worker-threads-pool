const { Pool } = require("./pool");
const { PoolWorker } = require("./pool-worker");
const { StaticTaskExecutor } = require("./task-executor");
const { createCode } = require("./create-code");

/**
 * @param {Function} fn
 */
function createScript(fn) {
  return `
    const { parentPort, workerData } = require('worker_threads');

    this.workerData = workerData;
    const container = {
      workerData,
      require,
      task: ${createCode(fn)}
    };
    
    process.once("unhandledRejection", (err) => {
      throw err;
    });

    parentPort.on('message', async (param) => {
      parentPort.postMessage(await container.task(param));
    });
  `;
}

class StaticPool extends Pool {
  /**
   * @param {object} opt
   * @param {number} opt.size
   * @param {string | Function} opt.task
   * @param {any} opt.workerData
   * @param {boolean} opt.shareEnv
   * @param {object} opt.resourceLimits
   */
  constructor({ size, task, workerData, shareEnv, resourceLimits }) {
    super(size);

    const workerOpt = { workerData };
    /* istanbul ignore next */
    if (shareEnv) {
      const { SHARE_ENV } = require("worker_threads");
      workerOpt.env = SHARE_ENV;
    }
    /* istanbul ignore next */
    if (typeof resourceLimits === "object") {
      workerOpt.resourceLimits = resourceLimits;
    }
    if (typeof task === "function") {
      workerOpt.eval = true;
    }

    switch (typeof task) {
      case "string": {
        this.fill(() => new PoolWorker(task, workerOpt));
        break;
      }

      case "function": {
        const script = createScript(task);
        this.fill(() => new PoolWorker(script, workerOpt));
        break;
      }

      default:
        throw new TypeError("Invalid type of 'task'!");
    }
  }

  /**
   * @param {any} param
   * @param {number} timeout
   */
  exec(param, timeout = 0) {
    if (typeof param === "function") {
      throw new TypeError('"param" can not be a function!');
    }
    return this.runTask(param, { timeout });
  }

  createExecutor() {
    return new StaticTaskExecutor(this);
  }
}

module.exports.StaticPool = StaticPool;
