const Pool = require('..');
const path = require('path');

console.log('Pool init...');

const filePath = path.resolve(__dirname, 'worker.js');
const pool = new Pool(filePath, 4);

console.log('Done! Start processing!');

for (let i = 0; i < 20; i++) {
  (async () => {
    const num = 41 + Math.trunc(4 * Math.random());
    const res = await pool.exec(num);
    console.log(`Fibonacci(${num}) result:`, res);
  })();
}

setInterval(() => {
  console.log('non-blocking!');
}, 500);