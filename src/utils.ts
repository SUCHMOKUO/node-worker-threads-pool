const ES6_FUNC_REGEXP = /^task[^]*([^]*)[^]*{[^]*}$/;

export function createFunctionString(fn: Function): string {
  const strFn = Function.prototype.toString.call(fn);
  let expression = '';
  if (ES6_FUNC_REGEXP.test(strFn)) {
    // ES6 style in-object function.
    expression = 'function ' + strFn;
  } else {
    // ES5 function or arrow function.
    expression = strFn;
  }
  return `(${expression})`;
}

export const WORKER_RUNTIME_HELPER_CODE = `
  function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  }
`;
