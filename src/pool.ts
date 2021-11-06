import { EventEmitter } from 'events';
import { PoolWorker } from './poolWorker';
import { isTimeoutError } from './promiseWithTimer';
import { TaskConfig, TaskContainer } from './taskContainer';

export class Pool extends EventEmitter {
  private size: number;
  private deprecated = false;
  private workers: PoolWorker[] = [];
  private createWorker: (() => PoolWorker) | undefined;
  private taskQueue: TaskContainer[] = [];

  constructor(size: number) {
    super();

    if (typeof size !== 'number') {
      throw new TypeError('"size" must be the type of number!');
    }

    if (Number.isNaN(size)) {
      throw new Error('"size" must not be NaN!');
    }

    if (size < 1) {
      throw new RangeError('"size" must not be lower than 1!');
    }

    this.size = size;
    this.addSelfEventHandlers();
  }

  private addSelfEventHandlers(): void {
    this.on('worker-ready', (worker) => {
      this.processTask(worker);
    });
  }

  private addWorkerLifecycleHandlers(worker: PoolWorker): void {
    worker.on('ready', (worker) => this.emit('worker-ready', worker));

    worker.once('exit', (code) => {
      if (this.deprecated || code === 0) {
        return;
      }
      this.replaceWorker(worker);
    });
  }

  private setWorkerFactory(createWorker: () => PoolWorker): void {
    this.createWorker = () => {
      const worker = createWorker();
      this.addWorkerLifecycleHandlers(worker);
      return worker;
    };
  }

  private replaceWorker(worker: PoolWorker): void {
    const i = this.workers.indexOf(worker);
    this.workers[i] = this.createWorker!();
  }

  private getIdleWorker(): PoolWorker | null {
    const worker = this.workers.find((worker) => worker.ready);

    return worker ?? null;
  }

  private processTask(worker: PoolWorker): void {
    const task = this.taskQueue.shift();

    if (!task) {
      return;
    }

    const { param, resolve, reject, taskConfig } = task;

    worker
      .run(param, taskConfig)
      .then(resolve)
      .catch((error) => {
        if (isTimeoutError(error)) {
          worker.terminate();
        }
        reject(error);
      });
  }

  protected fill(getWorker: () => PoolWorker): void {
    this.setWorkerFactory(getWorker);

    const size = this.size;

    for (let i = 0; i < size; i++) {
      this.workers.push(this.createWorker!());
    }
  }

  async runTask<TParam, TResult>(param: TParam, taskConfig: TaskConfig): Promise<TResult> {
    if (this.deprecated) {
      throw new Error('This pool is deprecated! Please use a new one.');
    }

    return new Promise((resolve, reject) => {
      const task = new TaskContainer(param, resolve, reject, taskConfig);

      this.taskQueue.push(task);
      const worker = this.getIdleWorker();

      if (worker) {
        this.processTask(worker);
      }
    });
  }

  /**
   * Destroy this pool and terminate all threads.
   */
  async destroy(): Promise<void> {
    if (this.deprecated) {
      return;
    }

    this.deprecated = true;
    this.removeAllListeners();
    const workers = this.workers;
    this.workers = [];
    await Promise.all(workers.map((worker) => worker.terminate()));
  }
}
