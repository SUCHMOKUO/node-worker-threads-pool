const es6FuncReg = /^task[^]*([^]*)[^]*{[^]*}$/;
/**
 * @param {Function} fn
 */
function createCode(fn) {
  const strFn = Function.prototype.toString.call(fn);
  let expression = "";
  if (es6FuncReg.test(strFn)) {
    // ES6 style in-object function.
    expression = "function " + strFn;
  } else {
    // ES5 function or arrow function.
    expression = strFn;
  }
  return `(${expression})`;
}

module.exports.createCode = createCode;
