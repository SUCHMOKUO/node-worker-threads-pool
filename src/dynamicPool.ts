import { SHARE_ENV } from 'worker_threads';
import { Pool } from './pool';
import { PoolWorker } from './poolWorker';
import { DynamicTaskExecutor } from './taskExecutor';
import { createFunctionString } from './utils';
import { CommonWorkerSettings, TaskFunc } from './types';

export interface DynamicPoolExecOptions<TParam, TResult, TWorkerData = any> {
  /** Function to be executed. */
  task: TaskFunc<TParam, TResult>;

  /** Parameter for task function. */
  param?: TParam;

  /**
   * Data to pass into workers.
   * @deprecated since version 1.4.0. Please use parameter instead.
   */
  workerData?: TWorkerData;

  timeout?: number;
}

const script = `
  const vm = require('vm');
  const { parentPort } = require('worker_threads');

  function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  }

  process.once("unhandledRejection", (err) => {
    throw err;
  });

  parentPort.on('message', async ({ code, workerData, param }) => {
    this.workerData = workerData;
    const task = vm.runInThisContext(code);
    const container = { task, workerData, require };
    const result = await container.task(param);
    parentPort.postMessage(result);
  });
`;

/**
 * Threads pool that can run different function
 * each call.
 */
export class DynamicPool extends Pool {
  constructor(
    /** Number of workers. */
    size: number,

    /** Some advanced settings. */
    opt?: CommonWorkerSettings
  ) {
    super(size);

    const workerOpt: Record<string, any> = {
      eval: true,
    };

    if (opt?.shareEnv) {
      workerOpt.env = SHARE_ENV;
    }

    if (typeof opt?.resourceLimits === 'object') {
      workerOpt.resourceLimits = opt.resourceLimits;
    }

    this.fill(() => new PoolWorker(script, workerOpt));
  }

  /**
   * Choose a idle worker to execute the function
   * with context provided.
   */
  async exec<TParam, TResult, TWorkerData>(
    opt: DynamicPoolExecOptions<TParam, TResult, TWorkerData>
  ): Promise<TResult> {
    const { task, workerData, timeout, param } = opt;

    if (typeof task !== 'function') {
      throw new TypeError('task "fn" must be a function!');
    }

    const code = createFunctionString(task);
    const workerParam = {
      code,
      param,
      workerData,
    };

    return this.runTask(workerParam, { timeout });
  }

  /**
   * Create a task executor of this pool.
   * This is used to apply some advanced settings to a task.
   */
  createExecutor<TParam, TResult>(task: TaskFunc<TParam, TResult>): DynamicTaskExecutor<TParam, TResult> {
    return new DynamicTaskExecutor(this, task);
  }
}
