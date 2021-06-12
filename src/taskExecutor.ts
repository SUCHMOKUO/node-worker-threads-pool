import { Async, Func, TransferList } from './types';
import { createFunctionString } from './utils';
import { DynamicPool } from './dynamicPool';
import { Pool } from './pool';
import { TaskConfig } from './taskContainer';

class BaseTaskExecutor {
  protected pool: Pool;
  protected taskConfig: TaskConfig = {};
  protected called = false;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /** Set timeout (in millisecond) to this task. */
  setTimeout(t: number): this {
    this.taskConfig.timeout = t;
    return this;
  }

  /**
   * @see {@link https://nodejs.org/dist/latest-v14.x/docs/api/worker_threads.html#worker_threads_port_postmessage_value_transferlist transferList}
   */
  setTransferList(transferList: TransferList): this {
    this.taskConfig.transferList = transferList;
    return this;
  }

  protected async _exec(param: any): Promise<any> {
    if (this.called) {
      throw new Error('task executor is already called!');
    }
    this.called = true;
    return this.pool.runTask(param, this.taskConfig);
  }
}

/** Executor for StaticPool. Used to apply some advanced settings to a task. */
export class StaticTaskExecutor<TTask extends Func> extends BaseTaskExecutor {
  /** Execute this task with the parameter provided. */
  exec = ((param: any) => {
    return super._exec(param);
  }) as Async<TTask>;
}

/** Executor for DynamicPool. Used to apply some advanced settings to a task. */
export class DynamicTaskExecutor<TParam, TResult> extends BaseTaskExecutor {
  private code: string;

  constructor(dynamicPool: DynamicPool, task: Function) {
    super(dynamicPool);

    this.code = createFunctionString(task);
  }

  /** Execute this task with the parameter provided. */
  async exec(param: TParam): Promise<TResult> {
    const workerParam = { code: this.code, param };
    return super._exec(workerParam);
  }
}
