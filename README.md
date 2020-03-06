# node-worker-threads-pool

[![Build Status](https://travis-ci.org/SUCHMOKUO/node-worker-threads-pool.svg?branch=master)](https://travis-ci.org/SUCHMOKUO/node-worker-threads-pool)
[![Coverage Status](https://coveralls.io/repos/github/SUCHMOKUO/node-worker-threads-pool/badge.svg?branch=master)](https://coveralls.io/github/SUCHMOKUO/node-worker-threads-pool?branch=master)
[![](https://img.shields.io/npm/v/node-worker-threads-pool.svg)](https://www.npmjs.com/package/node-worker-threads-pool)
![](https://img.shields.io/badge/dependencies-none-brightgreen.svg)
![](https://img.shields.io/npm/dt/node-worker-threads-pool.svg)
![](https://img.shields.io/npm/l/node-worker-threads-pool.svg)

Simple worker threads pool using Node's worker_threads module. Compatible with ES6+ Promise, Async/Await.

## With this library, you can:

- Use `StaticPool` to create a threads pool with a task from worker file or from task function provided to make use of multi-core processor.
- Use `DynamicPool` to create a threads pool with different tasks provided each call. Thus you can get more flexibility than `StaticPool` and make use of multi-core processor.
- Set **timeout** for the task, thus you won't get a task that running forever.

## Notification

1. This module can only run in Node.js.
2. Since Node's worker_threads module is still in stage of **Experimental**, this module can be accessed ~~only if the `--experimental-worker` flag is added.~~, if node.js version is above 11.7.0, worker api is exposed by default.

## Installation

```
npm install node-worker-threads-pool --save
```

## API

## `Class: StaticPool`

Instance of StaticPool is a threads pool with static task provided.

### `new StaticPool(opt)`

- `opt` `<Object>`
  - `size` `<number>` Number of workers in this pool.
  - `task` `<string | function>` Static task to do. It can be a absolute path of worker file or a function. **Notice: If task is a function, you can not use closure in it! If you do want to use external data in the function, you can use workerData to pass some [cloneable data](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm).**
  - `workerData` `<any>` [Cloneable data](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm) you want to access in task function.

### `staticPool.exec(param[, timeout])`

- `param` `<any>` The param your worker script or task function need.
- `timeout` `<number>` Timeout in milisecond for limiting the execution time. When timeout, the function will throw a `TimeoutError`, use `isTimeoutError` function to detect it.
- Returns: `<Promise>`

Choose an idle worker in the pool to execute your heavy task with the param you provided. The Promise is resolved with the result.

### `staticPool.destroy()`

Call `worker.terminate()` for every worker in the pool and release them.

### Example (with worker file)

### In the worker.js :

```js
// Access the workerData by requiring it.
const { parentPort, workerData } = require("worker_threads");

// Something you shouldn"t run in main thread
// since it will block.
function fib(n) {
  if (n < 2) {
    return n;
  }
  return fib(n - 1) + fib(n - 2);
}

// Main thread will pass the data you need
// through this event listener.
parentPort.on("message", (param) => {
  if (typeof param !== "number") {
    throw new Error("param must be a number.");
  }
  const result = fib(param);

  // Access the workerData.
  console.log("workerData is", workerData);

  // return the result to main thread.
  parentPort.postMessage(result);
});
```

### In the main.js :

```js
const { StaticPool } = require("node-worker-threads-pool");

const filePath = "absolute/path/to/your/worker/script";

const pool = new StaticPool({
  size: 4,
  task: filePath,
  workerData: "workerData!",
});

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

### Example (with task function)

### In the main.js :

```js
const { StaticPool } = require("node-worker-threads-pool");

const pool = new StaticPool({
  size: 4,
  task: function(n) {
    const num = this.workerData.num;
    for (let i = 0; i < num; i++) {
      n += i;
    }
    return n;
  },
  workerData: {
    num: 1 << 30,
  },
});

for (let i = 0; i < 20; i++) {
  (async () => {
    const res = await pool.exec(i);
    console.log(`result${i}:`, res);
  })();
}
```

## `Class: DynamicPool`

Instance of DynamicPool is a threads pool executes different task functions provided every call.

### `new DynamicPool(size)`

- `size` `<number>` Number of workers in this pool.

### `dynamicPool.exec(opt)`

- `opt`
  - `task` `<function>` Function as a task to do. **Notice: You can not use closure in task function! If you do want to use external data in the function, you can use workerData to pass some [cloneable data](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm).**
  - `workerData` `<any>` [Cloneable data](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm) you want to access in task function.
  - `timeout` `<number>` Timeout in milisecond for limiting the execution time. When timeout, the function will throw a `TimeoutError`, use `isTimeoutError` function to detect it.
- Returns: `<Promise>`

Choose one idle worker in the pool to execute your task function. The Promise is resolved with the result your task returned.

### `dynamicPool.destroy()`

Call `worker.terminate()` for every worker in the pool and release them.

### Example

### In the main.js :

```js
const { DynamicPool } = require("node-worker-threads-pool");

const pool = new DynamicPool(4);

function task1() {
  // something heavy.
}

function task2() {
  // something heavy too.
}

// execute task1
(async () => {
  const res = await pool.exec({
    task: task1,
    workerData: {
      // some data
    },
  });
  console.log(res);
})();

// execute task2
(async () => {
  const res = await pool.exec({
    task: task2,
    workerData: {
      // some data
    },
  });
  console.log(res);
})();
```

## `function: isTimeoutError`

Detect if a thrown error is `TimeoutError`.

## `isTimeoutError(err)`

- `err <Error>` The error you want to detect.
- Returns `<boolean>` `true` if the error is a `TimeoutError`.

## Example

```js
const { isTimeoutError } = require("node-worker-threads-pool");

// create pool.
...

// static pool exec with timeout.
const timeout = 1000;
try {
  const res = await staticPool.exec(param, timeout);
} catch (err) {
  if (isTimeoutError(err)) {
    // deal with timeout.
  } else {
    // deal with other errors.
  }
}

// dynamic pool exec with timeout.
const timeout = 1000;
try {
  const res = await dynamicPool.exec({
    task() {
      // your task.
    },
    timeout
  });
} catch (err) {
  if (isTimeoutError(err)) {
    // deal with timeout.
  } else {
    // deal with other errors.
  }
}
```
