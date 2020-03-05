module.exports = class TaskContainer {
  /**
   * @param { * } task
   * @param { Function } resolve
   * @param { Function } reject
   */
  constructor(task, resolve, reject) {
    this.task = task;
    this.resolve = resolve;
    this.reject = reject;
  }
};
