module.exports = class TaskContainer {
  /**
   * @param { * } task
   * @param { Function } resolve
   * @param { Function } reject
   * @param { number } timeout
   */
  constructor(task, resolve, reject, timeout) {
    this.task = task;
    this.resolve = resolve;
    this.reject = reject;
    this.timeout = timeout;
  }
};
