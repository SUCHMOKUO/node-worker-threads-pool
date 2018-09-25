const { StaticPool } = require('..');
const path = require('path');

const workerPath = path.join(__dirname, 'worker.js');

console.log('Pool init...');
const pool = new StaticPool({
  size: 4,
  task: workerPath
});
console.log('Done! Start processing!');

for (let i = 0; i < 20; i++) {
  (async () => {
    const num = 40 + Math.trunc(2 * Math.random());
    const res = await pool.exec(num);
    console.log(`Fibonacci(${num}) result:`, res);
  })();
}

setInterval(() => {
  console.log('non-blocking!');
}, 500);