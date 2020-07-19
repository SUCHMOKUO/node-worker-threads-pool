/**
 * @typedef {import("./pool-worker").TaskConfig} TaskConfig
 */

class TaskContainer {
  /**
   * @param {any} param
   * @param {(value: any) => any} resolve
   * @param {(reason: any) => any} reject
   * @param {TaskConfig} [taskConfig]
   */
  constructor(param, resolve, reject, taskConfig) {
    this.param = param;
    this.resolve = resolve;
    this.reject = reject;
    this.taskConfig = taskConfig;
  }
}

module.exports.TaskContainer = TaskContainer;
