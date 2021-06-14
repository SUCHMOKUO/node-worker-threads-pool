import { Pool } from './pool';
import { TaskConfig } from './taskContainer';
import { TransferList } from './types';

export class TaskExecutor {
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

  protected async runTask(param: any): Promise<any> {
    if (this.called) {
      throw new Error('task executor is already called!');
    }
    this.called = true;
    return this.pool.runTask(param, this.taskConfig);
  }
}
