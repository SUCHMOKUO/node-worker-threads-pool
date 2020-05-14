const Pool = require("./pool");
const PoolWorker = require("./pool-worker");

const script = `
  const vm = require('vm');
  const { parentPort } = require('worker_threads');

  process.once("unhandledRejection", (err) => {
      throw err;
  });

  parentPort.on('message', async ({ code, workerData }) => {
    this.workerData = workerData;
    const result = await vm.runInThisContext(code);
    parentPort.postMessage(result);
  });
`;

/**
 * Threads pool that can run different function
 * each call.
 */
module.exports = class DynamicPool extends Pool {
  constructor(size, opt) {
    super(size);
    const workerOpt = { eval: true };
    if (opt) {
      /* istanbul ignore next */
      if (opt.shareEnv) {
        const { SHARE_ENV } = require("worker_threads");
        workerOpt.env = SHARE_ENV;
      }
    }
    this.fill(() => new PoolWorker(script, workerOpt));
  }

  /**
   * choose a idle worker to execute the function
   * with context provided.
   * @param { Object } opt
   * @param { Function } opt.task function to be executed.
   * @param { * } opt.workerData
   * @param { number } opt.timeout timeout in ms for the task. 0 stands for no limit.
   */
  exec({ task, workerData, timeout }) {
    if (typeof task !== "function") {
      throw new TypeError('task "fn" must be a function!');
    }
    const code = createCode(task);
    const param = { code, workerData };
    return this.runTask(param, timeout);
  }
};

const es6FuncReg = /^task[^]*([^]*)[^]*{[^]*}$/;
/**
 * @param { Function } fn
 */
function createCode(fn) {
  const strFn = Function.prototype.toString.call(fn);
  let expression = "";
  if (es6FuncReg.test(strFn)) {
    // es6 style in-object function.
    expression = "function " + strFn;
  } else {
    // es5 function or arrow function.
    expression = strFn;
  }
  return `({ workerData, task: (${expression})}).task();`;
}
