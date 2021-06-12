// @ts-nocheck
import { Pool } from '../dist/pool';
import { DynamicPool, StaticPool, isTimeoutError } from '../dist';
import os from 'os';
import path from 'path';

const CPU_NUM = 4;

function wait(t) {
  return new Promise((resolve) => {
    setTimeout(resolve, t);
  });
}

describe('pool tests', () => {
  it('should throw error if size is not number', () => {
    expect(() => {
      new Pool('a' as unknown as number);
    }).toThrowError(TypeError);
  });

  it('should throw error if size is NaN', () => {
    expect(() => {
      new Pool(NaN);
    }).toThrowError('"size" must not be NaN!');
  });

  it('should throw error if size < 1', () => {
    expect(() => {
      new Pool(0);
    }).toThrowError(RangeError);
  });

  it('should throw error if pool is deprecated', async () => {
    const pool = new Pool(5);
    pool.destroy();
    try {
      await pool.runTask(null, {});
    } catch (err) {
      expect(err.message).toBe('This pool is deprecated! Please use a new one.');
    }
  });
});

describe('static pool tests', () => {
  it('should throw error if task is not string or function', () => {
    expect(() => {
      new StaticPool({
        size: CPU_NUM,
        task: 1 as unknown as string,
      });
    }).toThrowError(TypeError);
  });

  it('should throw error if param is function', async () => {
    const pool = new StaticPool({
      size: CPU_NUM,
      task(n) {
        return n;
      },
    });

    expect.assertions(1);

    try {
      await pool.exec(() => {});
    } catch (error) {
      expect(error).toBeInstanceOf(TypeError);
    }

    pool.destroy();
  });

  it('test task function with workerData', async () => {
    const pool = new StaticPool({
      size: CPU_NUM,
      workerData: 10,
      task: function (n: number) {
        return this.workerData * n;
      },
    });

    const execArr = [];
    for (let i = 0; i < 10; i++) {
      execArr.push(pool.exec(i));
    }
    const resArr = await Promise.all(execArr);
    expect(resArr).toEqual([0, 10, 20, 30, 40, 50, 60, 70, 80, 90]);

    pool.destroy();
  });

  it('test worker file', async () => {
    const workerData = 100;

    const pool = new StaticPool({
      task: path.resolve(__dirname, 'add.js'),
      size: CPU_NUM,
      workerData,
    });

    const paramArr = [0, 11, 12, 13, 14];
    const expectResArr = paramArr.map((n) => n + workerData);
    const execArr = paramArr.map((n) => pool.exec(n));
    const resArr = await Promise.all(execArr);
    expect(resArr).toEqual(expectResArr);

    pool.destroy();
  });

  it('test no param', async () => {
    const pool = new StaticPool({
      task: () => undefined,
      size: CPU_NUM,
    });

    expect(await pool.exec()).toBe(undefined);

    pool.destroy();
  });

  it("test 'this' reference", async () => {
    const data = 10;
    let pool, res;

    pool = new StaticPool({
      size: CPU_NUM,
      workerData: data,
      task() {
        return this.workerData;
      },
    });
    res = await pool.exec();
    expect(res).toBe(data);
    pool.destroy();

    pool = new StaticPool({
      size: CPU_NUM,
      workerData: data,
      task: () => {
        // @ts-ignore
        return this.workerData;
      },
    });
    res = await pool.exec();
    expect(res).toBe(data);
    pool.destroy();
  });

  it("test 'this' reference under strict mode", async () => {
    function task() {
      'use strict';
      return this.workerData;
    }

    const pool = new StaticPool({
      size: CPU_NUM,
      task,
      workerData: 10,
    });

    expect(await pool.exec()).toBe(10);

    pool.destroy();
  });
});

function add20() {
  return this.workerData + 20;
}

function sub10() {
  return this.workerData - 10;
}

function mult10() {
  return this.workerData * 10;
}

function div10() {
  return this.workerData / 10;
}

describe('dynamic pool tests', () => {
  it('test basic function', async () => {
    const pool = new DynamicPool(CPU_NUM);

    const execArr = [];
    execArr.push(
      pool.exec({
        task: add20,
        workerData: 20,
      })
    );

    execArr.push(
      pool.exec({
        task: sub10,
        workerData: 20,
      })
    );

    execArr.push(
      pool.exec({
        task: mult10,
        workerData: 20,
      })
    );

    execArr.push(
      pool.exec({
        task: div10,
        workerData: 20,
      })
    );

    const resArr = await Promise.all(execArr);
    expect(resArr).toEqual([40, 10, 200, 2]);

    pool.destroy();
  });

  it("test 'this' reference", async () => {
    const pool = new DynamicPool(CPU_NUM);
    const data = 10;

    let res = await pool.exec({
      workerData: data,
      task() {
        return this.workerData;
      },
    });

    expect(res).toBe(data);

    res = await pool.exec({
      workerData: data,
      task: () => {
        // @ts-ignore
        return this.workerData;
      },
    });

    expect(res).toBe(data);

    pool.destroy();
  });

  it("test 'this' reference under strict mode", async () => {
    function task() {
      'use strict';
      return this.workerData;
    }

    const pool = new DynamicPool(CPU_NUM);
    const res = await pool.exec({
      task,
      workerData: 10,
    });
    expect(res).toBe(10);

    pool.destroy();
  });

  it('should throw error if task is not function', async () => {
    const pool = new DynamicPool(CPU_NUM);

    await expect(
      pool.exec({
        // @ts-ignore
        task: 1,
      })
    ).rejects.toThrowError(TypeError);

    pool.destroy();
  });

  it('should param field work', async () => {
    const pool = new DynamicPool(1);

    const res = await pool.exec({
      task: (n) => n + 1,
      param: 10,
    });

    expect(res).toBe(11);

    pool.destroy();
  });
});

describe('error tests', () => {
  it('error static pool test', async () => {
    const pool = new StaticPool({
      task: (n) => {
        if (n < 0) {
          throw new Error('err');
        }
        return n + 1;
      },
      size: CPU_NUM,
    });

    for (let i = 0; i < CPU_NUM; i++) {
      try {
        await pool.exec(-1);
      } catch (err) {
        expect(err.message).toBe('err');
      }
    }

    for (let i = 0; i < CPU_NUM; i++) {
      const res = await pool.exec(i);
      expect(res).toBe(i + 1);
    }

    pool.destroy();
  });

  it('test dynamic pool error', async () => {
    const pool = new DynamicPool(CPU_NUM);

    for (let i = 0; i < CPU_NUM; i++) {
      try {
        await pool.exec({
          task() {
            if (this.workerData < 0) {
              throw new Error('err');
            }
            return this.workerData + 1;
          },
          workerData: -1,
        });
      } catch (err) {
        expect(err.message).toBe('err');
      }
    }

    for (let i = 0; i < CPU_NUM; i++) {
      try {
        const res = await pool.exec({
          task() {
            if (this.workerData < 0) {
              throw new Error('err');
            }
            return this.workerData + 1;
          },
          workerData: i,
        });
        expect(res).toBe(i + 1);
      } catch (err) {
        expect(err).toBe(null);
      }
    }

    pool.destroy();
  });
});

describe('timeout tests', () => {
  let pool: StaticPool;
  afterEach(() => pool.destroy());

  it('test static pool with timeout', async () => {
    pool = new StaticPool({
      size: CPU_NUM,
      task() {
        while (true);
      },
    });

    await wait(500);

    try {
      await pool.createExecutor().setTimeout(1000).exec();
    } catch (err) {
      expect(isTimeoutError(err)).toBe(true);
    }
  });

  it('should static pool pass within timeout', async () => {
    pool = new StaticPool({
      size: CPU_NUM,
      task() {
        return 1;
      },
    });

    const res = await pool.exec(null, 1000);
    expect(res).toBe(1);
  });

  it('should static pool recover after timeout', async () => {
    pool = new StaticPool({
      size: 1,
      task() {
        let i = 1 << 30;
        while (i--);
        return 0;
      },
    });

    let timeoutError: Error;

    expect.assertions(2);

    try {
      await pool.createExecutor().setTimeout(1).exec();
    } catch (error) {
      if (isTimeoutError(error)) {
        timeoutError = error;
        const result = await pool.exec();
        expect(result).toBe(0);
      }
    }

    expect(timeoutError).not.toBeUndefined();
  });

  it('test dynamic pool with timeout', async () => {
    pool = new DynamicPool(CPU_NUM);

    try {
      await pool.exec({
        task() {
          while (true);
        },
        timeout: 1000,
      });
    } catch (err) {
      expect(isTimeoutError(err)).toBe(true);
    }
  });

  it('should dynamic pool pass within timeout', async () => {
    pool = new DynamicPool(CPU_NUM);

    const res = await pool.exec({
      task() {
        return 1;
      },
      timeout: 1000,
    });

    expect(res).toBe(1);
  });
});

describe('async task function tests', () => {
  it('should static pool work with async task', async () => {
    const pool = new StaticPool({
      size: 1,
      task: async function (n) {
        return n;
      },
    });
    const res = await pool.exec(1);
    expect(res).toBe(1);
    pool.destroy();
  });

  it('should dynamic pool work with async task', async () => {
    const pool = new DynamicPool(1);
    const res = await pool.exec({
      task: async function () {
        return this.workerData;
      },
      workerData: 1,
    });
    expect(res).toBe(1);
    pool.destroy();
  });
});

describe('SHARE_ENV tests', () => {
  const { promisify } = require('util');
  const exec = promisify(require('child_process').exec);

  it('should pass', async () => {
    await exec('node ./test/shareEnv.js');
  });
});

describe('resourceLimits tests', () => {
  const STACK_SIZE_MB = 16;

  function shouldSetResourceLimits(pool) {
    return new Promise((resolve, reject) => {
      pool.once('worker-ready', (worker) => {
        const stackSizeMb = worker.resourceLimits.stackSizeMb;
        if (stackSizeMb === STACK_SIZE_MB) {
          resolve(undefined);
        } else {
          reject(`stackSizeMb is ${stackSizeMb}`);
        }
      });
    });
  }

  it('should static pool created with resourceLimits', async () => {
    const pool = new StaticPool({
      size: 1,
      task() {},
      resourceLimits: {
        stackSizeMb: STACK_SIZE_MB,
      },
    });

    try {
      await shouldSetResourceLimits(pool);
    } catch (error) {
      throw error;
    } finally {
      pool.destroy();
    }
  });

  it('should dynamic pool created with resourceLimits', async () => {
    const pool = new DynamicPool(1, {
      resourceLimits: {
        stackSizeMb: STACK_SIZE_MB,
      },
    });

    try {
      await shouldSetResourceLimits(pool);
    } catch (error) {
      throw error;
    } finally {
      pool.destroy();
    }
  });
});

describe('task executor tests', () => {
  it('should static pool set timeout', async () => {
    const pool = new StaticPool({
      size: 1,
      task() {
        while (true);
      },
    });

    try {
      await pool.createExecutor().setTimeout(500).exec();
    } catch (error) {
      expect(isTimeoutError(error)).toBe(true);
    } finally {
      pool.destroy();
    }
  });

  it('should static pool set transferList', async () => {
    const pool = new StaticPool({
      size: 1,
      task() {},
    });

    const buf = new ArrayBuffer(16);
    expect(buf.byteLength).toBe(16);
    await pool.createExecutor().setTransferList([buf]).exec();
    expect(buf.byteLength).toBe(0);
    pool.destroy();
  });

  it('should throw when static pool executor run multiple time', async () => {
    const pool = new StaticPool({
      size: 2,
      task: () => {},
    });

    const executor = pool.createExecutor();
    await executor.exec();
    try {
      await executor.exec();
    } catch (error) {
      expect(error).toEqual(new Error('task executor is already called!'));
    }
    pool.destroy();
  });

  it('should dynamic pool set timeout', async () => {
    const pool = new DynamicPool(1);

    try {
      await pool
        .createExecutor(() => {
          while (true);
        })
        .setTimeout(500)
        .exec();
    } catch (error) {
      expect(isTimeoutError(error)).toBe(true);
    } finally {
      pool.destroy();
    }
  });

  it('should dynamic pool set transferList', async () => {
    const pool = new DynamicPool(1);

    const buf = new ArrayBuffer(16);
    expect(buf.byteLength).toBe(16);
    await pool
      .createExecutor(() => {})
      .setTransferList([buf])
      .exec();
    expect(buf.byteLength).toBe(0);
    pool.destroy();
  });

  it('should throw when dynamic pool executor run multiple time', async () => {
    const pool = new DynamicPool(2);

    const executor = pool.createExecutor(() => {});
    await executor.exec();
    try {
      await executor.exec();
    } catch (error) {
      expect(error).toEqual(new Error('task executor is already called!'));
    }
    pool.destroy();
  });
});

describe('require function tests', () => {
  it('should static pool require module using this.require', async () => {
    const pool = new StaticPool({
      size: 1,
      task() {
        const os = this.require('os');
        return os.cpus().length;
      },
    });

    const cpus = await pool.exec();

    expect(cpus).toBeGreaterThan(0);

    pool.destroy();
  });

  it('should static pool require module using this.require when using arrow function task', async () => {
    const pool = new StaticPool({
      size: 1,
      task: () => {
        // @ts-ignore
        const os = this.require('os');
        return os.cpus().length;
      },
    });

    const cpus = await pool.exec();

    expect(cpus).toBeGreaterThan(0);

    pool.destroy();
  });

  it('should dynamic pool require module using this.require', async () => {
    const pool = new DynamicPool(2);

    const cpus = await pool
      .createExecutor(function () {
        const os = this.require('os');
        return os.cpus().length;
      })
      .exec();

    expect(cpus).toBeGreaterThan(0);

    pool.destroy();
  });

  it('should dynamic pool require module using this.require when using arrow function task', async () => {
    const pool = new DynamicPool(2);

    const cpus = await pool
      .createExecutor(() => {
        // @ts-ignore
        const os = this.require('os');
        return os.cpus().length;
      })
      .exec();

    expect(cpus).toBeGreaterThan(0);

    pool.destroy();
  });
});
