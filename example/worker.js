const { parentPort } = require('worker_threads');

function fib(n) {
  if (n < 2) {
    return n;
  }
  return fib(n - 1) + fib (n - 2);
}

parentPort.on('message', msg => {
  if (typeof msg !== 'number') {
    throw new Error('param must be a number.');
  }
  parentPort.postMessage(fib(msg));
});