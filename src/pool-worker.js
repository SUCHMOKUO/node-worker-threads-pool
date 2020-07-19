/**
 * @typedef {import("../index").TransferList} TransferList
 */

/**
 * @typedef {object} TaskConfig
 * @property {number} [timeout]
 * @property {TransferList} [transferList]
 */

const { Worker } = require("worker_threads");
const { PromiseWithTimer } = require("./promise-with-timer");

class PoolWorker extends Worker {
  /**
   * @param {ConstructorParameters<typeof Worker>} args
   */
  constructor(...args) {
    super(...args);

    this.isReady = false;

    this.once("online", () => this.readyToWork());
  }

  /**
   * @param {any} param
   * @param {TaskConfig} taskConfig
   */
  run(param, taskConfig) {
    this.isReady = false;

    const timeout = taskConfig.timeout ? taskConfig.timeout : 0;
    const transferList = taskConfig.transferList;

    const taskPromise = new Promise((resolve, reject) => {
      const self = this;

      function message(res) {
        self.removeListener("error", error);
        self.readyToWork();
        resolve(res);
      }

      function error(err) {
        self.removeListener("message", message);
        reject(err);
      }

      this.once("message", message);
      this.once("error", error);
      this.postMessage(param, transferList);
    });

    return new PromiseWithTimer(taskPromise, timeout).startRace();
  }

  readyToWork() {
    this.isReady = true;
    this.emit("ready", this);
  }
}

module.exports.PoolWorker = PoolWorker;
