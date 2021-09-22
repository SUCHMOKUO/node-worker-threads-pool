import { SHARE_ENV } from 'worker_threads';
import { Pool } from './pool';
import { PoolWorker } from './poolWorker';
import { TaskExecutor } from './taskExecutor';
import { Async, Func, NodeWorkerSettings, TaskFuncThis } from './types';
import { createFunctionString, WORKER_RUNTIME_HELPER_CODE } from './utils';

function createScript(fn: Function): string {
  return `
    const { parentPort, workerData } = require('worker_threads');

    ${WORKER_RUNTIME_HELPER_CODE}

    this.workerData = workerData;
    const container = {
      workerData,
      require,
      task: ${createFunctionString(fn)}
    };
    
    process.once("unhandledRejection", (err) => {
      throw err;
    });

    parentPort.on('message', async (param) => {
      parentPort.postMessage(await container.task(param));
    });
  `;
}

export type StaticPoolOptions<TTask extends Func<TaskFuncThis<TWorkerData>>, TWorkerData = any> = NodeWorkerSettings & {
  /** number of workers */
  size: number;

  /** path of worker file or worker function */
  task: string | TTask;

  /** data to pass into workers */
  workerData?: TWorkerData;
};

/** Executor for StaticPool. Used to apply some advanced settings to a task. */
export class StaticTaskExecutor<TTask extends Func> extends TaskExecutor {
  /** Execute this task with the parameter provided. */
  exec = ((param: any) => {
    return super.runTask(param);
  }) as Async<TTask>;
}

/**
 * Threads pool with static task.
 */
export class StaticPool<TTask extends Func, TWorkerData = any> extends Pool {
  constructor(opt: StaticPoolOptions<TTask, TWorkerData>) {
    super(opt.size);

    const { task, workerData, shareEnv, resourceLimits } = opt;

    const workerOpt: Record<string, any> = { workerData };

    if (shareEnv) {
      workerOpt.env = SHARE_ENV;
    }

    if (typeof resourceLimits === 'object') {
      workerOpt.resourceLimits = resourceLimits;
    }

    if (typeof task === 'function') {
      workerOpt.eval = true;
    }

    switch (typeof task) {
      case 'string': {
        this.fill(() => new PoolWorker(task, workerOpt));
        break;
      }

      case 'function': {
        const script = createScript(task);
        this.fill(() => new PoolWorker(script, workerOpt));
        break;
      }

      default:
        throw new TypeError('Invalid type of "task"!');
    }
  }

  /**
   * Choose a idle worker to run the task
   * with param provided.
   */
  exec: Async<TTask> = ((param: unknown) => {
    if (typeof param === 'function') {
      throw new TypeError('"param" can not be a function!');
    }
    return this.runTask(param, { timeout: 0 });
  }) as Async<TTask>;

  /**
   * Create a task executor of this pool.
   * This is used to apply some advanced settings to a task.
   */
  createExecutor(): StaticTaskExecutor<TTask> {
    return new StaticTaskExecutor(this);
  }
}
