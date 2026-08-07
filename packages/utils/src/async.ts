/**
 * Sleeps asynchronously for a specified duration in milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

/**
 * Rejects a promise with a timeout error if it does not resolve within timeoutMs.
 */
export function timeoutPromise<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage = "Operation timed out",
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export interface DeferredPromise<T> {
  readonly promise: Promise<T>;
  readonly resolve: (value: T | PromiseLike<T>) => void;
  readonly reject: (reason?: unknown) => void;
}

/**
 * Creates a deferred promise object exposing resolve and reject handles.
 */
export function deferredPromise<T>(): DeferredPromise<T> {
  let resolveHandle!: (value: T | PromiseLike<T>) => void;
  let rejectHandle!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolveHandle = res;
    rejectHandle = rej;
  });

  return {
    promise,
    resolve: resolveHandle,
    reject: rejectHandle,
  };
}
