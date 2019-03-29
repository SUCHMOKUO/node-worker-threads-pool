const { StaticPool } = require('..');
const os = require("os");

process.stdout.write("Init pool...\n");
const pool = new StaticPool({
  size: os.cpus().length,
  workerData: 1.1,
  task(n) {
    function fib(n) {
      if (n < 2) return n;
      return fib(n - 1) + fib(n - 2);
    }
    return fib(n) + this.workerData;
  }
});
process.stdout.write("Start processing...\n");

for (let i = 0; i < 20; i++) {
  (async () => {
    const num = 35 + Math.trunc(5 * Math.random());
    const res = await pool.exec(num);
    process.stdout.write(`Fibonacci(${num}) + 1.1 = ${res}\n`);
  })();
}

setInterval(() => {
  process.stdout.write("non-blocking!\n");
}, 500);