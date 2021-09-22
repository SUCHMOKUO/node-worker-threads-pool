import { SHARE_ENV } from 'worker_threads';
import { Pool } from './pool';
import { PoolWorker } from './poolWorker';
import { TaskExecutor } from './taskExecutor';
import { Async, Func, NodeWorkerSettings, TaskFuncThis } from './types';
import { createFunctionString, WORKER_RUNTIME_HELPER_CODE } from './utils';

export type DynamicPoolExecOptions<TTask extends Func<TaskFuncThis<TWorkerData>>, TWorkerData = any> = {
  /**
   * Data to pass into workers.
   * @deprecated since version 1.4.0. Please use parameter instead.
   */
  workerData?: TWorkerData;

  timeout?: number;
} & (
  | {
      /** Function to be executed. */
      task: () => ReturnType<TTask>;
    }
  | {
      /** Function to be executed. */
      task: TTask;

      /** Parameter for task function. */
      param: Parameters<TTask>[0];
    }
);

const script = `
  const vm = require('vm');
  const { parentPort } = require('worker_threads');

  ${WORKER_RUNTIME_HELPER_CODE}

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

/** Executor for DynamicPool. Used to apply some advanced settings to a task. */
export class DynamicTaskExecutor<TTask extends Func> extends TaskExecutor {
  private code: string;

  constructor(dynamicPool: DynamicPool, task: Function) {
    super(dynamicPool);

    this.code = createFunctionString(task);
  }

  /** Execute this task with the parameter provided. */
  exec = ((param: any) => {
    const workerParam = { code: this.code, param };
    return super.runTask(workerParam);
  }) as Async<TTask>;
}

/**
 * Threads pool that can run different function
 * each call.
 */
export class DynamicPool extends Pool {
  constructor(
    /** Number of workers. */
    size: number,

    /** Some advanced settings. */
    opt?: NodeWorkerSettings
  ) {
    super(size);

    const workerOpt: Record<string, any> = {
      eval: true
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
  exec<TTask extends Func, TWorkerData = any>(
    opt: DynamicPoolExecOptions<TTask, TWorkerData>
  ): ReturnType<Async<TTask>> {
    //@ts-ignore
    const { task, workerData, timeout, param } = opt;

    if (typeof task !== 'function') {
      throw new TypeError('task "fn" must be a function!');
    }

    const code = createFunctionString(task);
    const workerParam = {
      code,
      param,
      workerData
    };

    return this.runTask(workerParam, { timeout }) as ReturnType<TTask>;
  }

  /**
   * Create a task executor of this pool.
   * This is used to apply some advanced settings to a task.
   */
  createExecutor<TTask extends Func>(task: TTask): DynamicTaskExecutor<TTask> {
    return new DynamicTaskExecutor(this, task);
  }
}
