type TaskFunc = (param: any) => any;

declare namespace StaticPool {
  type ConstructorParam = {
    /** number of workers */
    size: number;

    /** path of worker file or a worker function */
    task: string | TaskFunc;

    /** data to pass into workers */
    workerData?: any;
  }
}

/**
 * Threads pool with static task.
 */
declare class StaticPool {
  constructor(param: StaticPool.ConstructorParam);

  /**
   * choose a idle worker to run the task
   * with param provided.
   */
  exec(param: any): Promise<any>;

  /**
   * destroy this pool and terminate all threads.
   */
  destroy(): void;
}

declare namespace DynamicPool {
  type ExecParam = {
    /** function to be executed. */
    task: TaskFunc;

    /** data to pass into workers. */
    workerData?: any;
  }
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
  exec(param: DynamicPool.ExecParam): Promise<any>;

  /**
   * destroy this pool and terminate all threads.
   */
  destroy(): void;
}

export { 
  DynamicPool,
  StaticPool
};