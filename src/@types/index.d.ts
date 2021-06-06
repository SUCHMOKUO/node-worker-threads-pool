/// <reference types="node" />

import type { MessagePort } from 'worker_threads';

type TransferList = Parameters<typeof MessagePort.prototype.postMessage>[1];

interface TaskFuncThis<WorkerData = any> {
  workerData: WorkerData;
  require: NodeRequire;
}

type TaskFunc<ParamType, ResultType, WorkerData = any> =
  | ((this: TaskFuncThis<WorkerData>) => Promise<ResultType>)
  | ((this: TaskFuncThis<WorkerData>) => ResultType)
  | ((this: TaskFuncThis<WorkerData>, param: ParamType) => Promise<ResultType>)
  | ((this: TaskFuncThis<WorkerData>, param: ParamType) => ResultType);

interface CommonWorkerSettings {
  /**
   * Enable SHARE_ENV for all threads in pool.
   * @see {@link https://nodejs.org/dist/latest-v14.x/docs/api/worker_threads.html#worker_threads_worker_share_env SHARE_ENV}
   */
  shareEnv?: boolean;

  /**
   * Set resourceLimits for all threads in pool.
   * @see {@link https://nodejs.org/api/worker_threads.html#worker_threads_worker_resourcelimits resourcelimits}
   */
  resourceLimits?: {
    maxYoungGenerationSizeMb?: number;
    maxOldGenerationSizeMb?: number;
    codeRangeSizeMb?: number;
    stackSizeMb?: number;
  };
}
