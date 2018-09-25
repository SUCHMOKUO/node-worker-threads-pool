const { StaticPool } = require('..');

function fib(n) {
  if (n < 2) {
    return n;
  }
  return fib(n - 1) + fib (n - 2);
}

console.log('Pool init...');
const pool = new StaticPool({
  size: 4,
  task: fib
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