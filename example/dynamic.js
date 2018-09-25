const { DynamicPool } = require('..');

console.log('Pool init...');
const pool = new DynamicPool(8);
console.log('Done! Start processing!');

for (let i = 0; i < 20; i++) {
  (async () => {
    const res = await pool.exec({
      task: function() {
        let res = 0, time = workerData.time;
        for (let i = 0; i < time; i++) {
          res += i;
        }
        return res;
      },
      workerData: {
        time: 1 << 30
      }
    });

    console.log(`result${ i }: ${ res }.`);
  })();
}

setInterval(() => {
  console.log('non-blocking!');
}, 500);