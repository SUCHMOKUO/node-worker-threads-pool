/// <reference types="node" />

import type { MessagePort } from "worker_threads";

type TransferList = Parameters<typeof MessagePort.prototype.postMessage>[1];

type TaskFuncThis<WorkerData = any> = {
  workerData: WorkerData;
  require: NodeRequire;
};

type TaskFunc<ParamType, ResultType, WorkerData = any> =
  | ((this: TaskFuncThis<WorkerData>) => Promise<ResultType>)
  | ((this: TaskFuncThis<WorkerData>) => ResultType)
  | ((this: TaskFuncThis<WorkerData>, param: ParamType) => Promise<ResultType>)
  | ((this: TaskFuncThis<WorkerData>, param: ParamType) => ResultType);

type CommonWorkerSettings = {
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
};

interface BaseTaskExecutor<ParamType, ResultType> {
  /** Set timeout (in millisecond) to this task. */
  setTimeout(t: number): this;

  /**
   * @see {@link https://nodejs.org/dist/latest-v14.x/docs/api/worker_threads.html#worker_threads_port_postmessage_value_transferlist transferList}
   */
  setTransferList(transferList: TransferList): this;

  /** Execute this task with the parameter provided. */
  exec(): Promise<ResultType>;
  exec(param: ParamType): Promise<ResultType>;
}

/** Executor for StaticPool. Used to apply some advanced settings to a task. */
export interface StaticTaskExecutor<ParamType, ResulType>
  extends BaseTaskExecutor<ParamType, ResulType> {}

/**
 * Threads pool with static task.
 */
export declare class StaticPool<ParamType, ResultType, WorkerData = any> {
  constructor(
    opt: {
      /** number of workers */
      size: number;

      /** path of worker file or a worker function */
      task: string | TaskFunc<ParamType, ResultType>;

      /** data to pass into workers */
      workerData?: WorkerData;
    } & CommonWorkerSettings
  );

  /**
   * Choose a idle worker to run the task
   * with param provided.
   */
  exec(): Promise<ResultType>;
  exec(param: ParamType, timeout?: number): Promise<ResultType>;

  /**
   * Create a task executor of this pool.
   * This is used to apply some advanced settings to a task.
   */
  createExecutor(): StaticTaskExecutor<ParamType, ResultType>;

  /**
   * Destroy this pool and terminate all threads.
   */
  destroy(): Promise<void>;
}

/** Executor for DynamicPool. Used to apply some advanced settings to a task. */
export interface DynamicTaskExecutor<ParamType, ResultType>
  extends BaseTaskExecutor<ParamType, ResultType> {}

/**
 * Threads pool that can run different function
 * each call.
 */
export declare class DynamicPool {
  constructor(
    /** Number of workers. */
    size: number,

    /** Some advanced settings. */
    opt?: CommonWorkerSettings
  );

  /**
   * Choose a idle worker to execute the function
   * with context provided.
   */
  exec<ParamType = any, ResultType = any, WorkerData = any>(param: {
    /** Function to be executed. */
    task: TaskFunc<ParamType, ResultType>;

    /** Parameter for task function. */
    param?: ParamType;

    /**
     * Data to pass into workers.
     * @deprecated since version 1.4.0. Please use parameter instead.
     */
    workerData?: WorkerData;

    timeout?: number;
  }): Promise<ResultType>;

  /**
   * Create a task executor of this pool.
   * This is used to apply some advanced settings to a task.
   */
  createExecutor<ParamType, ResultType>(
    task: TaskFunc<ParamType, ResultType>
  ): DynamicTaskExecutor<ParamType, ResultType>;

  /**
   * Destroy this pool and terminate all threads.
   */
  destroy(): Promise<void>;
}

/**
 * Detect if error is a Timeout error.
 */
export declare function isTimeoutError(err: Error): boolean;
