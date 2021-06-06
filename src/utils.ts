const es6FuncRegexp = /^task[^]*([^]*)[^]*{[^]*}$/;

export function createFunctionString(fn: Function): string {
  const strFn = Function.prototype.toString.call(fn);
  let expression = '';
  if (es6FuncRegexp.test(strFn)) {
    // ES6 style in-object function.
    expression = 'function ' + strFn;
  } else {
    // ES5 function or arrow function.
    expression = strFn;
  }
  return `(${expression})`;
}
