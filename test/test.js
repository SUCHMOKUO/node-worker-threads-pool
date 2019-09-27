const { DynamicPool, StaticPool } = require("..");
const os = require("os");
const path = require("path");
const numCPU = os.cpus().length;

test('static pool test 1', async () => {
  const pool = new StaticPool({
    size: numCPU,
    workerData: 10,
    task: function(n) {
      return this.workerData * n;
    }
  });

  const execArr = [];
  for (let i = 0; i < 10; i++) {
    execArr.push(pool.exec(i));
  }
  const resArr = await Promise.all(execArr);
  expect(resArr).toEqual([0, 10, 20, 30, 40, 50, 60, 70, 80, 90]);

  pool.destroy();
});

test('static pool test 2', async () => {
  const pool = new StaticPool({
    size: numCPU,
    workerData: 10,
    task(n) {
      return this.workerData * n;
    }
  });

  const execArr = [];
  for (let i = 0; i < 10; i++) {
    execArr.push(pool.exec(i));
  }
  const resArr = await Promise.all(execArr);
  expect(resArr).toEqual([0, 10, 20, 30, 40, 50, 60, 70, 80, 90]);

  pool.destroy();
});

test('static pool test 4', async () => {
  const pool = new StaticPool({
    size: numCPU,
    workerData: 10,
    task: (n) => {
      return workerData * n;
    }
  });

  const execArr = [];
  for (let i = 0; i < 10; i++) {
    execArr.push(pool.exec(i));
  }
  const resArr = await Promise.all(execArr);
  expect(resArr).toEqual([0, 10, 20, 30, 40, 50, 60, 70, 80, 90]);

  pool.destroy();
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

test("dynamic pool test 1", async () => {
  const pool = new DynamicPool(numCPU);

  const execArr = [];
  execArr.push(pool.exec({
    task: add20,
    workerData: 20
  }));

  execArr.push(pool.exec({
    task: sub10,
    workerData: 20
  }));

  execArr.push(pool.exec({
    task: mult10,
    workerData: 20
  }));

  execArr.push(pool.exec({
    task: div10,
    workerData: 20
  }));

  const resArr = await Promise.all(execArr);
  expect(resArr).toEqual([40, 10, 200, 2]);

  pool.destroy();
});

test("test worker file function", async () => {
  const workerData = 100;

  const pool = new StaticPool({
    task: path.resolve(__dirname, "add.js"),
    size: numCPU,
    workerData
  });

  const paramArr = [0, 11, 12, 13, 14];
  const expectResArr = paramArr.map((n) => n + workerData);
  const execArr = paramArr.map((n) => pool.exec(n));
  const resArr = await Promise.all(execArr);
  expect(resArr).toEqual(expectResArr);

  pool.destroy();
});

test("error test", async () => {
  const pool = new StaticPool({
    task: (n) => {
      if (n < 0) {
        throw new Error("error test");
      }
      return n + 1;
    },
    size: numCPU
  });

  for (let i = 0; i < numCPU; i++) {
    pool.exec(-1).catch((err) => {
      console.log(i, err.message);
    });
  }

  for (let i = 0; i < numCPU; i++) {
    const res = await pool.exec(i);
    expect(res).toBe(i + 1);
  }

  pool.destroy();
});

test("test no param with static pool", async () => {
  const pool = new StaticPool({
    task: (param) => param,
    size: numCPU
  });

  expect(await pool.exec()).toBe(undefined);

  pool.destroy();
});

test("test 'this' in dynamic pool", async () => {
  const pool = new DynamicPool(numCPU);
  const data = 10;

  let res = await pool.exec({
    workerData: data,
    task() {
      return this.workerData;
    }
  });

  expect(res).toBe(data);

  res = await pool.exec({
    workerData: data,
    task: () => {
      return this.workerData;
    }
  });

  expect(res).toBe(data);

  pool.destroy();
});

test("test 'this' in static pool", async () => {
  const data = 10;
  let pool, res;

  pool = new StaticPool({
    size: numCPU,
    workerData: data,
    task() {
      return this.workerData;
    }
  });
  res = await pool.exec();
  expect(res).toBe(data);
  pool.destroy();

  pool = new StaticPool({
    size: numCPU,
    workerData: data,
    task: () => {
      return this.workerData;
    }
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

  let pool;
  pool = new StaticPool({
    size: numCPU,
    task,
    workerData: 10
  });

  expect(await pool.exec()).toBe(10);

  pool.destroy();

  pool = new DynamicPool(numCPU);
  const res = await pool.exec({
    task,
    workerData: 10
  });
  expect(res).toBe(10);

  pool.destroy();
});