module.exports = {
  StaticPool: require("./src/static-pool"),
  DynamicPool: require("./src/dynamic-pool"),
  TimeoutError: require("./src/promise-with-timer").TimeoutError,
  isTimeoutError: require("./src/promise-with-timer").isTimeoutError,
};
