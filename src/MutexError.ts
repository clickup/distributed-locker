import type { LockData } from "./Database";

export default class MutexError extends Error {
  constructor(
    public readonly key: string,
    public readonly lockData: LockData,
  ) {
    super(
      lockData
        ? `For key=${key}: ` +
            `someone else (${lockData.ownerHash}) ` +
            "holds the mutex for too long; acquired " +
            `${Date.now() - new Date(lockData.acquiredAt).getTime()} ms ago ` +
            `(at ${lockData.acquiredAt}); dying`
        : "The process lost the lock (e.g. it was stale for too long); dying",
    );
    this.name = this.constructor.name; // https://javascript.info/custom-errors#further-inheritance
  }
}
