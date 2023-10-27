import type { LockData } from "./Database";

export default class LockError extends Error {
  constructor(
    public readonly key: string,
    public readonly ownerHash: string,
    public readonly lockData: LockData | null
  ) {
    super(
      lockData
        ? `For key=${key} ownerHash=${ownerHash}: ` +
            `someone else (${lockData.ownerHash}) ` +
            "took over this lock " +
            `${Date.now() - new Date(lockData.acquiredAt).getTime()} ms ago ` +
            `(at ${lockData.acquiredAt}); dying`
        : "The process lost the lock (e.g. it was stale for too long); dying"
    );
    this.name = this.constructor.name; // https://javascript.info/custom-errors#further-inheritance
  }
}
