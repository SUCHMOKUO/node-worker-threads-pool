import { Worker } from 'worker_threads';
import { PromiseWithTimer } from './promiseWithTimer';
import { TaskConfig } from './taskContainer';

export class PoolWorker extends Worker {
  public ready = false;

  constructor(...args: ConstructorParameters<typeof Worker>) {
    super(...args);

    this.once('online', () => this.readyToWork());
  }

  async run(param: any, taskConfig: TaskConfig): Promise<any> {
    this.ready = false;

    const timeout = taskConfig.timeout ? taskConfig.timeout : 0;
    const transferList = taskConfig.transferList;

    const taskPromise = new Promise((resolve, reject) => {
      const onMessage = (res: any) => {
        this.removeListener('error', onError);
        this.readyToWork();
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

  private readyToWork(): void {
    this.ready = true;
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
