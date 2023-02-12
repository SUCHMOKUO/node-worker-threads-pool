import { Worker } from 'worker_threads';
import { PromiseWithTimer } from './promiseWithTimer';
import { TaskConfig } from './taskContainer';

export class PoolWorker extends Worker {
  private _ready = false;
  private _taskPromiseWithTimer: PromiseWithTimer | undefined = undefined;

  constructor(...args: ConstructorParameters<typeof Worker>) {
    super(...args);

    this.once('online', () => this.setReadyToWork());
  }

  get ready(): boolean {
    return this._ready;
  }

  async run(param: any, taskConfig: TaskConfig): Promise<any> {
    this._ready = false;

    const { timeout = 0, transferList } = taskConfig;

    const taskPromise = new Promise((resolve, reject) => {
      const onMessage = (res: any) => {
        this.removeListener('error', onError);
        if (this._taskPromiseWithTimer) {
          this._taskPromiseWithTimer.clearTimer();
        }
        this.setReadyToWork();
        resolve(res);
      };

      const onError = (err: any) => {
        this.removeListener('message', onMessage);
        if (this._taskPromiseWithTimer) {
          this._taskPromiseWithTimer.clearTimer();
        }
        reject(err);
      };

      this.once('message', onMessage);
      this.once('error', onError);
      this.postMessage(param, transferList);
    });
    this._taskPromiseWithTimer = new PromiseWithTimer(taskPromise, timeout);
    return this._taskPromiseWithTimer.startRace();
  }

  private setReadyToWork(): void {
    this._ready = true;
    this.emit('ready', this);
  }

  override async terminate(): Promise<number> {
    this.once('exit', () => {
      setImmediate(() => {
        this.removeAllListeners();
      });
    });
    if (this._taskPromiseWithTimer) {
      this._taskPromiseWithTimer.clearTimer();
    }
    return super.terminate();
  }
}
