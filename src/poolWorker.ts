import { Worker } from 'worker_threads';
import { PromiseWithTimer } from './promiseWithTimer';
import { TaskConfig } from './taskContainer';

export class PoolWorker extends Worker {
  private _ready = false;

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
        this.setReadyToWork();
        resolve(res);
      };

      const onError = (err: any) => {
        this.removeListener('message', onMessage);
        reject(err);
      };

      this.once('message', onMessage);
      this.once('error', onError);
      this.postMessage(param, transferList);
    });

    return new PromiseWithTimer(taskPromise, timeout).startRace();
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

    return super.terminate();
  }
}
