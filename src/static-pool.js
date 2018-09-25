const Pool = require('./pool');
const PoolWorker = require('./pool-worker');

/**
 * @param { Function } fn 
 */
function createScript(fn) {
  return `
    const { parentPort, workerData } = require('worker_threads');

    const fn = ${ fn.toString() };
    
    parentPort.on('message', param => {
      parentPort.postMessage(fn(param));
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
        this.fill(() => new PoolWorker(this, task));
        break;
      }

      case 'function': {
        const script = createScript(task);
        this.fill(() => new PoolWorker(this, script, { eval: true, workerData }));
        break;
      }
    }
  }

  exec(param) {
    return this.runTask(param);
  }
}