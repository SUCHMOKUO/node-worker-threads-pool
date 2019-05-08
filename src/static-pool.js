const Pool = require('./pool');
const PoolWorker = require('./pool-worker');

const fnReg = /^task[^]*([^]*)[^]*{[^]*}$/;
/**
 * @param { Function } fn
 */
function createScript(fn) {
  const strFn = fn.toString();
  let expression = "";
  if (fnReg.test(strFn)) {
    // es6 style in-object function.
    expression = "function " + strFn;
  } else {
    // es5 function or arrow function.
    expression = strFn;
  }
  return `
    const { parentPort, workerData } = require('worker_threads');

    const container = {
      workerData,
      task: (${ expression })
    };
    
    parentPort.on('message', (param) => {
      parentPort.postMessage(container.task(param));
    });
  `;
}

/**
 * Threads pool with static task.
 */
module.exports = class StaticPool extends Pool {
  /**
   * @param { Object } opt
   * @param { Number } opt.size number of workers
   * @param { String | Function } opt.task path of worker file or a worker function
   * @param { * } opt.workerData data to pass into workers
   */
  constructor({ size, task, workerData }) {
    super(size);
    switch (typeof task) {
      case 'string': {
        // task is the path of worker script.
        this.fill(() => new PoolWorker(this, task, { workerData }));
        break;
      }

      case 'function': {
        const script = createScript(task);
        this.fill(() => new PoolWorker(this, script, { eval: true, workerData }));
        break;
      }

      default: throw new Error("Invalid type of 'task'!")
    }
  }

  /**
   * choose a idle worker to run the task
   * with param provided.
   * @param { * } param 
   */
  exec(param) {
    if (typeof param === 'function') {
      throw new Error('"param" can not be a function!');
    }
    return this.runTask(param);
  }
}