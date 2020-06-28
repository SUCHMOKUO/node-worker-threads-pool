/**
 * Threads pool with static task.
 */
declare class StaticPool<T, U> {
  constructor(param: {
    /** number of workers */
    size: number;

    /** path of worker file or a worker function */
    task: string | ((param: T) => Promise<U>) | ((param: T) => U);

    /** data to pass into workers */
    workerData?: any;

    /** enable SHARE_ENV for all threads in pool */
    shareEnv?: boolean;

    /** set resourceLimits for all threads in pool */
    resourceLimits?: {
      maxYoungGenerationSizeMb?: number;
      maxOldGenerationSizeMb?: number;
      codeRangeSizeMb?: number;
      stackSizeMb?: number;
    };
  });

  /**
   * choose a idle worker to run the task
   * with param provided.
   */
  exec(param: T, timeout?: number): Promise<U>;

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
   * @param opt additional options.
   */
  constructor(
    size: number,
    opt?: {
      /** enable SHARE_ENV for all threads in pool */
      shareEnv?: boolean;

      /** set resourceLimits for all threads in pool */
      resourceLimits?: {
        maxYoungGenerationSizeMb?: number;
        maxOldGenerationSizeMb?: number;
        codeRangeSizeMb?: number;
        stackSizeMb?: number;
      };
    }
  );

  /**
   * choose a idle worker to execute the function
   * with context provided.
   */
  exec<T = any>(param: {
    /** function to be executed. */
    task: (() => Promise<T>) | (() => T);

    /** data to pass into workers. */
    workerData?: any;

    timeout?: number;
  }): Promise<T>;

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
