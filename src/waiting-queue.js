const Events = require('events');

module.exports = class WaitingQueue extends Events {
  constructor() {
    super();
    this._queue = [];

    // when a worker turns idle.
    this.on('worker-idle', worker => {
      const callback = this._queue.shift();
      callback && callback(worker);
    });
  }

  /**
   * add a task to waiting queue.
   * @param {*} param 
   */
  addTask(param) {
    return new Promise((resolve, reject) => {
      this._queue.push(worker => {
        worker.work(param)
          .then(resolve)
          .catch(reject);
      });
    });
  }
}