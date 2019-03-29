const Events = require('events');

module.exports = class WaitingQueue extends Events {
  constructor() {
    super();

    this._queue = [];

    // when a worker turns idle.
    this.on("worker-idle", (worker) => {
      const taskFn = this._queue.shift();
      if (taskFn) {
        taskFn(worker);
      }
    });
  }

  /**
   * add a task to waiting queue.
   * @param { * } param 
   */
  runTask(param) {
    return new Promise((resolve, reject) => {
      this._queue.push((worker) => {
        worker.work(param)
          .then(resolve)
          .catch(reject);
      });
    });
  }
}