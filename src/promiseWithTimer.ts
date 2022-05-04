class TimeoutError extends Error {
  override name = 'TimeoutError';
}

/**
 * Detect if error is a Timeout error.
 */
export function isTimeoutError(err: Error): boolean {
  return err instanceof TimeoutError;
}

export class PromiseWithTimer<T = any> {
  private promise: Promise<T>;
  private timeout: number;
  private timerId: number | undefined;
  private timeoutSymbol = Symbol('timeoutSymbol');

  constructor(p: Promise<T>, timeout: number) {
    this.promise = p;
    this.timeout = timeout;
  }

  private createTimer(): Promise<symbol> {
    return new Promise((resolve) => {
      this.timerId = setTimeout(resolve, this.timeout, this.timeoutSymbol);
    });
  }

  async startRace(): Promise<T> {
    if (this.timeout <= 0) {
      return this.promise;
    }

    const result = await Promise.race([this.promise, this.createTimer()]);

    if (result === this.timeoutSymbol) {
      throw new TimeoutError('timeout');
    }

    clearTimeout(this.timerId);
    return result as T;
  }

  async cleanTimer() {
    if (this.timerId) {
      clearTimeout(this.timerId);
    }
  }
}
