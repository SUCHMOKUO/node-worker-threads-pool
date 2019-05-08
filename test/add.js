const { parentPort, workerData } = require('worker_threads');

function add(a, b) {
  return a + b;
}

parentPort.on('message', msg => {
  if (typeof msg !== 'number') {
    throw new Error('param must be a number.');
  }
  if (typeof workerData !== 'number') {
    throw new Error('workerData must be a number.');
  }
  parentPort.postMessage(add(msg, workerData));
});