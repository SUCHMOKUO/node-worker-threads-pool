import { SHARE_ENV } from 'worker_threads';
import { Pool } from './pool';
import { PoolWorker } from './poolWorker';
import { StaticTaskExecutor } from './taskExecutor';
import { createFunctionString } from './utils';
import { Async, CommonWorkerSettings, Func, TaskFunc } from './types';

function createScript(fn: Function): string {
  return `
    const { parentPort, workerData } = require('worker_threads');

    function __awaiter(thisArg, _arguments, P, generator) {
      function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
      return new (P || (P = Promise))(function (resolve, reject) {
          function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
          function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
          function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
          step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    }

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

export interface StaticPoolOptions<TTask, TWorkerData = any> extends CommonWorkerSettings {
  /** number of workers */
  size: number;

  /** path of worker file or a worker function */
  task: string | TTask;

  /** data to pass into workers */
  workerData?: TWorkerData;
}

/**
 * Threads pool with static task.
 */
export class StaticPool<TTask extends Func, TWorkerData = any> extends Pool {
  /**
   * Choose a idle worker to run the task
   * with param provided.
   */
  exec: Async<TTask>;

  constructor(opt: StaticPoolOptions<TTask, TWorkerData>) {
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

    this.exec = ((param: unknown) => {
      if (typeof param === 'function') {
        throw new TypeError('"param" can not be a function!');
      }
      return this.runTask(param, { timeout: 0 });
    }) as Async<TTask>;
  }

  /**
   * Create a task executor of this pool.
   * This is used to apply some advanced settings to a task.
   */
  createExecutor(): StaticTaskExecutor<TTask> {
    return new StaticTaskExecutor(this);
  }
}
