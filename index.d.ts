type TaskFunc = (param: any) => any;

/**
 * Threads pool with static task.
 */
declare class StaticPool {
  constructor(param: {
    /** number of workers */
    size: number;

    /** path of worker file or a worker function */
    task: string | TaskFunc;

    /** data to pass into workers */
    workerData?: any;
  });

  /**
   * choose a idle worker to run the task
   * with param provided.
   */
  exec(param: any, timeout?: number): Promise<any>;

  /**
   * destroy this pool and terminate all threads.
   */
  destroy(): void;
}

/**
 * Threads pool that can run different function
 * each call.
 */
declare class DynamicPool {
  /**
   * @param size number of threads.
   */
  constructor(size: number);

  /**
   * choose a idle worker to execute the function
   * with context provided.
   */
  exec(param: {
    /** function to be executed. */
    task: TaskFunc;

    /** data to pass into workers. */
    workerData?: any;

    timeout?: number;
  }): Promise<any>;

  /**
   * destroy this pool and terminate all threads.
   */
  destroy(): void;
}

/**
 * Detect if error is a Timeout error.
 */
declare function isTimeoutError(err: Error): boolean;

export { DynamicPool, StaticPool, isTimeoutError };
