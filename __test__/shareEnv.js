const { DynamicPool, StaticPool } = require('..');
const assert = require('assert');

function expect(val) {
  return {
    val,
    toBe(val) {
      assert.strictEqual(val, this.val);
    }
  };
}

const env = process.env;
let pool;
const tests = [
  // should not change env of main thread in StaticPool
  async () => {
    pool = new StaticPool({
      size: 2,
      task() {
        process.env.A = Math.random().toString();
        return process.env.A;
      }
    });

    expect(env.A).toBe(undefined);
    await pool.exec();
    expect(env.A).toBe(undefined);
    pool.destroy();
  },
  // should not change env of main thread in DynamicPool
  async () => {
    pool = new DynamicPool(2);

    expect(env.A).toBe(undefined);
    await pool.exec({
      task() {
        process.env.A = Math.random().toString();
        return process.env.A;
      }
    });
    expect(env.A).toBe(undefined);
    pool.destroy();
  },
  // should change env of main thread in StaticPool
  async () => {
    pool = new StaticPool({
      size: 2,
      shareEnv: true,
      task() {
        process.env.A = Math.random().toString();
        return process.env.A;
      }
    });

    expect(env.A).toBe(undefined);
    const val = await pool.exec();
    expect(env.A).toBe(val);
    pool.destroy();
    delete env.A;
  },
  // should change env of main thread in DynamicPool
  async () => {
    pool = new DynamicPool(2, { shareEnv: true });

    expect(env.A).toBe(undefined);
    const val = await pool.exec({
      task() {
        process.env.A = Math.random().toString();
        return process.env.A;
      }
    });
    expect(env.A).toBe(val);
    pool.destroy();
    delete env.A;
  }
];

async function runTests() {
  try {
    for (const test of tests) {
      await test();
    }
  } catch (err) {
    console.error(err.message);
    process.exit(-1);
  }
}

runTests();
