const Pool = require("../src/pool");
const { DynamicPool, StaticPool, isTimeoutError } = require("..");
const os = require("os");
const path = require("path");
const numCPU = os.cpus().length;

describe("pool tests", () => {
  test("should throw error if size is not number", () => {
    expect(() => {
      new Pool("a");
    }).toThrowError(TypeError);
  });

  test("should throw error if size is NaN", () => {
    expect(() => {
      new Pool(NaN);
    }).toThrowError('"size" must not be NaN!');
  });

  test("should throw error if size < 1", () => {
    expect(() => {
      new Pool(0);
    }).toThrowError(RangeError);
  });

  test("should throw error if pool is deprecated", async () => {
    const pool = new Pool(5);
    pool.destroy();
    try {
      await pool.runTask();
    } catch (err) {
      expect(err.message).toBe(
        "This pool is deprecated! Please use a new one."
      );
    }
  });
});

describe("static pool tests", () => {
  test("should throw error if task is not string or function", () => {
    expect(() => {
      new StaticPool({
        size: numCPU,
        task: 1,
      });
    }).toThrowError(TypeError);
  });

  test("should throw error if param is function", () => {
    const pool = new StaticPool({
      size: numCPU,
      task(n) {
        return n;
      },
    });

    expect(() => {
      pool.exec(() => {});
    }).toThrowError(TypeError);

    pool.destroy();
  });

  test("test task function with workerData", async () => {
    const pool = new StaticPool({
      size: numCPU,
      workerData: 10,
      task: function(n) {
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

  test("test worker file", async () => {
    const workerData = 100;

    const pool = new StaticPool({
      task: path.resolve(__dirname, "add.js"),
      size: numCPU,
      workerData,
    });

    const paramArr = [0, 11, 12, 13, 14];
    const expectResArr = paramArr.map((n) => n + workerData);
    const execArr = paramArr.map((n) => pool.exec(n));
    const resArr = await Promise.all(execArr);
    expect(resArr).toEqual(expectResArr);

    pool.destroy();
  });

  test("test no param", async () => {
    const pool = new StaticPool({
      task: (param) => param,
      size: numCPU,
    });

    expect(await pool.exec()).toBe(undefined);

    pool.destroy();
  });

  test("test 'this' reference", async () => {
    const data = 10;
    let pool, res;

    pool = new StaticPool({
      size: numCPU,
      workerData: data,
      task() {
        return this.workerData;
      },
    });
    res = await pool.exec();
    expect(res).toBe(data);
    pool.destroy();

    pool = new StaticPool({
      size: numCPU,
      workerData: data,
      task: () => {
        return this.workerData;
      },
    });
    res = await pool.exec();
    expect(res).toBe(data);
    pool.destroy();
  });

  test("test 'this' reference under strict mode", async () => {
    function task() {
      "use strict";
      return this.workerData;
    }

    const pool = new StaticPool({
      size: numCPU,
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

describe("dynamic pool tests", () => {
  test("test basic function", async () => {
    const pool = new DynamicPool(numCPU);

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

  test("test 'this' reference", async () => {
    const pool = new DynamicPool(numCPU);
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
        return this.workerData;
      },
    });

    expect(res).toBe(data);

    pool.destroy();
  });

  test("test 'this' reference under strict mode", async () => {
    function task() {
      "use strict";
      return this.workerData;
    }

    const pool = new DynamicPool(numCPU);
    const res = await pool.exec({
      task,
      workerData: 10,
    });
    expect(res).toBe(10);

    pool.destroy();
  });

  test("should throw error if task is not function", () => {
    const pool = new DynamicPool(numCPU);

    expect(() => {
      pool.exec({
        task: 1,
      });
    }).toThrowError(TypeError);

    pool.destroy();
  });
});

describe("error tests", () => {
  test("error static pool test", async () => {
    const pool = new StaticPool({
      task: (n) => {
        if (n < 0) {
          throw new Error("err");
        }
        return n + 1;
      },
      size: numCPU,
    });

    for (let i = 0; i < numCPU; i++) {
      try {
        await pool.exec(-1);
      } catch (err) {
        expect(err.message).toBe("err");
      }
    }

    for (let i = 0; i < numCPU; i++) {
      const res = await pool.exec(i);
      expect(res).toBe(i + 1);
    }

    pool.destroy();
  });

  test("test dynamic pool error", async () => {
    const pool = new DynamicPool(numCPU);

    for (let i = 0; i < numCPU; i++) {
      try {
        await pool.exec({
          task() {
            if (this.workerData < 0) {
              throw new Error("err");
            }
            return this.workerData + 1;
          },
          workerData: -1,
        });
      } catch (err) {
        expect(err.message).toBe("err");
      }
    }

    for (let i = 0; i < numCPU; i++) {
      try {
        const res = await pool.exec({
          task() {
            if (this.workerData < 0) {
              throw new Error("err");
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

describe("timeout tests", () => {
  let pool;
  afterEach(() => pool.destroy());

  test("test static pool with timeout", async () => {
    pool = new StaticPool({
      size: numCPU,
      task() {
        while (true);
      },
    });

    try {
      await pool.exec(null, 1000);
    } catch (err) {
      expect(isTimeoutError(err)).toBe(true);
    }
  });

  test("test dynamic pool with timeout", async () => {
    pool = new DynamicPool(numCPU);

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
});
