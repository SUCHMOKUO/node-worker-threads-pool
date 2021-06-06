import { SHARE_ENV } from 'worker_threads';
import { Pool } from './pool';
import { PoolWorker } from './poolWorker';
import { StaticTaskExecutor } from './taskExecutor';
import { createFunctionString } from './utils';
import { CommonWorkerSettings, TaskFunc } from './@types/index';

function createScript(fn: Function): string {
  return `
    const { parentPort, workerData } = require('worker_threads');

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

export interface StaticPoolOptions<TParam, TResult, TWorkerData = any> extends CommonWorkerSettings {
  /** number of workers */
  size: number;

  /** path of worker file or a worker function */
  task: string | TaskFunc<TParam, TResult>;

  /** data to pass into workers */
  workerData?: TWorkerData;
}

/**
 * Threads pool with static task.
 */
export class StaticPool<TParam, TResult, TWorkerData = any> extends Pool {
  constructor(opt: StaticPoolOptions<TParam, TResult, TWorkerData>) {
    const { size, task, workerData, shareEnv, resourceLimits } = opt;

    super(size);

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
  async exec(param: TParam, timeout = 0): Promise<TResult> {
    if (typeof param === 'function') {
      throw new TypeError('"param" can not be a function!');
    }
    return this.runTask(param, { timeout });
  }

  /**
   * Create a task executor of this pool.
   * This is used to apply some advanced settings to a task.
   */
  createExecutor(): StaticTaskExecutor<TParam, TResult> {
    return new StaticTaskExecutor(this);
  }
}
