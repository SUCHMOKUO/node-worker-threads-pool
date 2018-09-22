# node-worker-threads-pool

Simple worker threads pool using Node's worker_threads module.

## Notification
1. This module can only run in Node.js.
2. Since Node's worker_threads module is still in stage of **Experimental**, this module can be accessed only if the --experimental-worker flag is added.

## Installation

```
npm install node-worker-threads-pool --save
```

## Example

### Run the example
```
npm run example
```

### In the worker.js :
```js
const { parentPort } = require('worker_threads');

// Something you shouldn't run in main thread
// since it will block the main thread.
function fib(n) {
  if (n < 2) {
    return n;
  }
  return fib(n - 1) + fib (n - 2);
}

// Main thread will pass the data you need
// through this event listener.
parentPort.on('message', param => {
  if (typeof param !== 'number') {
    throw new Error('param must be a number.');
  }
  const result = fib(param);

  // return the result to main thread.
  parentPort.postMessage(result);
});
```

### In the main.js :
```js
const Pool = require('node-worker-threads-pool');

const filePath = 'absolute/path/to/your/worker/script';
const num = 4; // The number of workers in this pool.
const pool = new Pool(filePath, num);

for (let i = 0; i < 20; i++) {
  (async () => {
    const num = 40 + Math.trunc(10 * Math.random());

    // This will choose one idle worker in the pool
    // to execute your heavy task without blocking
    // the main thread!
    const res = await pool.exec(num);
    
    console.log(`Fibonacci(${num}) result:`, res);
  })();
}
```

## API

### `new Pool(filePath, num)`

- `filePath` - The absolute path of your worker.js file.
- `num` - The number of the workers in your pool.

### `pool.exec(data)`

- `data` - The data your worker script need.
- Returns: `<Promise>`

Choose one idle worker in the pool to execute your heavy task with the data you provided. The Promise is resolved with the result your worker generated.

### `pool.destroy()`

Call `worker.terminate()` for every worker in the pool and release them.

## License

node-worker-threads-pool is licensed under the GNU General Public License v3 (GPL-3) (http://www.gnu.org/copyleft/gpl.html).