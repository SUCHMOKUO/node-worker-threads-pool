const { DynamicPool } = require('..');
const os = require("os");

process.stdout.write("Pool init...\n");
const pool = new DynamicPool(os.cpus().length);
process.stdout.write("Done! Start processing!\n");

for (let i = 0; i < 20; i++) {
  (async () => {
    const res = await pool.exec({
      task() {
        let res = 0, time = this.workerData.time;
        for (let i = 0; i < time; i++) {
          res += i;
        }
        return res;
      },
      workerData: {
        time: 1 << (Math.trunc(20 + 10 * Math.random()))
      }
    });

    process.stdout.write(`result${ i }: ${ res }.\n`);
  })();
}

setInterval(() => {
  process.stdout.write("non-blocking!\n");
}, 500);