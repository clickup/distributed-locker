import { hostname } from "os";
import delay from "delay";
import pTimeout from "p-timeout";
import type { DatabaseModule, LockData } from "./Database";
import Database from "./Database";
import Events from "./Events";
import type Extend from "./Extend";
import Heartbeater from "./Heartbeater";
import LockError from "./LockError";
import LockStatus from "./LockStatus";
import MutexError from "./MutexError";
import OwnerHashStatus from "./OwnerHashStatus";
import Reporter from "./Reporter";

const DEFAULT_REPORT_WRITE_MS = 2000;
const DEFAULT_REPORT_TTL_MS = 10000;
const DEFAULT_REPORTER_WORKER_SPAWN_TIMEOUT_MS = 15000;
const DEFAULT_LOCK_RECHECK_MS = 5 * 1000;
const DEFAULT_LOCK_EXTEND_MS = 60 * 1000;
const DEFAULT_LOCK_TTL_MS = 5 * 60 * 1000;

export interface LockerOptions {
  /** Backend database reference. Since we must instantiate the database in a
   * separate worker thread with exactly same options (including callbacks if
   * any, common in e.g. IORedis options), we can't pass an instance of a
   * Database object here. Instead, we pass a file name where the database
   * object is created and exported as a property. */
  readonly database: DatabaseModule;
  /** How often to report that the current process is alive. Since we have only
   * one reporter per process (not per lock), we can write pretty frequently. */
  readonly reportWriteMs?: number;
  /** After this time the process is treated as dead if it did not report for
   * its liveness. This TTL is relatively short, assuming the event loop of
   * reporter thread is never blocked (since it's a separate thread). */
  readonly reportTtlMs?: number;
  /** How much time to wait until the reporter background thread successfully
   * writes its liveness status to the database. */
  readonly reporterWorkerSpawnTimeoutMs?: number;
  /** How often to recheck that we still hold the lock and not taken over by
   * someone else. Rechecking is cheap (just 1 Redis GET operation), so can be
   * done frequently. */
  readonly lockRecheckMs?: number;
  /** Extend the lock TTL in heartbeats not more frequent than this long.
   * Extending is expensive (1 GET and 1 SET), so we do it way less frequently
   * than rechecking. */
  readonly lockExtendMs?: number;
  /** Expire the lock if it hasn't been extended for that long. Notice that the
   * value here should typically be pretty high to be resilient to event loop
   * blockage or other unexpected slowdown in the process. */
  readonly lockTtlMs?: number;
}

/**
 * Allows running "singleton jobs" in across multiple machines. Main features:
 *
 * 1. Resilient to event loop blocking, because the lock TTL is high (5 minutes
 *    by default).
 * 2. Despite the long lock TTL, the rest of the cluster quickly (seconds)
 *    understands that some job died on some other machine, so it can be
 *    re-picked-up.
 * 3. Supports "seppuku" - in an event when something went south, and a lock got
 *    taken over (e.g. due to connectivity issues), the old lock owner should
 *    kill itself as soon as possible and don't continue double-working.
 * 4. Way more performant than Bull, and does its job well.
 */
export default class Locker {
  private _reportTtlMs: number;
  private _lockRecheckMs: number;
  private _lockExtendMs: number;
  private _lockTtlMs: number;
  private _reporterInstance?: Reporter;
  private _databaseInstance?: Database;
  private _databaseErrorUnsubscribe?: () => void;

  /**
   * If we experience a temporary (recoverable) error and don't want to abort,
   * this property allows to subscribe to such errors.
   */
  readonly errors = new Events<{
    type: "reporter" | "locker" | "lost_lock";
    error: unknown;
  }>();

  constructor(private _options: LockerOptions) {
    this._reportTtlMs = _options.reportTtlMs ?? DEFAULT_REPORT_TTL_MS;
    this._lockRecheckMs = _options.lockRecheckMs ?? DEFAULT_LOCK_RECHECK_MS;
    this._lockExtendMs = _options.lockExtendMs ?? DEFAULT_LOCK_EXTEND_MS;
    this._lockTtlMs = _options.lockTtlMs ?? DEFAULT_LOCK_TTL_MS;
  }

  /**
   * Tries to acquire a lock and, if successful, runs the provided function with
   * (heartbeater, ownerHash) arguments.
   *
   * The function must call the passed heartbeat callback (the more frequent,
   * the better!), which automatically:
   *
   * 1. Extend the lock (not on each heartbeater call, but just time to time, so
   *    it's perfectly safe to call the heartbeater very frequently).
   * 2. Ensure that no-one else has taken over the lock. A takeover may happen
   *    if e.g. the function didn't call the heartbeat callback for too long
   *    (event loop blockage), there was a network blip or some other unexpected
   *    situation; in this case, the passed heartbeat callback throws.
   *
   * You can also optionally pass a custom trace id, which will be preserved in
   * LockData structure and become a part of ownerHash.
   */
  async acquireAndRun<TRet>(
    key: string,
    func: (heartbeater: Heartbeater, ownerHash: string) => Promise<TRet>,
    trace?: string
  ): Promise<
    | {
        status: LockStatus.SUCCESS;
        result: TRet;
        lockData?: never; // we don't return lockData here , since by the moment we exit acquireAndRun() with SUCCESS status, the lock is already released
      }
    | {
        status: LockStatus.SOMEONE_ELSE_HOLDS_LOCK;
        lockData: LockData;
        result?: never;
      }
  > {
    if (func.length < 1) {
      throw Error(
        "A callback passed to acquireAndRun() must accept at least 1 argument, a Heartbeater instance"
      );
    }

    const { status, lockData, extend } = await this.acquire(key, trace);
    if (status !== LockStatus.SUCCESS) {
      return { status, lockData };
    }

    try {
      const result = await func(
        new Heartbeater(key)
          .withOnEvery(this._lockExtendMs, async () =>
            this._doExtendLock(key, lockData.ownerHash, extend)
          )
          .withOnEvery(this._lockRecheckMs, async () =>
            this._doRecheckLock(key, lockData.ownerHash)
          ),
        lockData.ownerHash
      );
      return { status: LockStatus.SUCCESS, result };
    } finally {
      await this.release(key, lockData);
    }
  }

  /**
   * Runs a passed function in a globally exclusive mode. If the mutex is
   * already held by someone, waits for recheckDelayMs and tries to re-acquire
   * until timeoutMs elapsed. Throws if the mutex couldn't be acquired.
   */
  async mutex<TRet>(
    key: string,
    timeoutMs: number,
    func: (heartbeater: Heartbeater) => Promise<TRet>,
    recheckDelayMs = 100,
    trace?: string
  ): Promise<TRet> {
    const timer = process.hrtime.bigint();
    let lastResult = undefined;
    while (!lastResult || process.hrtime.bigint() - timer < timeoutMs * 1e6) {
      const result = await this.acquireAndRun(key, func, trace);
      if (result.status === LockStatus.SUCCESS) {
        return result.result;
      }

      lastResult = result;
      await delay(recheckDelayMs);
    }

    throw new MutexError(key, lastResult.lockData);
  }

  /**
   * Checks that the lock is currently held by some active process somewhere.
   * Notice that this method is probabilistic:
   *
   * 1. it may think that the lock is unlocked, although it's not;
   * 2. it may return LockData of a lock which is released a moment ago.
   */
  async readLockData(key: string): Promise<LockData | "maybe_unlocked"> {
    const database = this._database();

    const lockData = await database.readLockData(key);
    if (!lockData) {
      return "maybe_unlocked";
    }

    const processData = await database.readProcessData(lockData.processHash);
    return processData ? lockData : "maybe_unlocked";
  }

  /**
   * For a given owner hash, checks whether the exact corresponding coroutine is
   * running somewhere.
   *
   * Don't bind any business logic to it (use for debugging purposes), otherwise
   * it WILL be race-prone. (I know it's tempting, but... please... don't.) E.g.
   * if the value returned is SUCCESS, the exact coroutine with ownerHash is now
   * running most likely, but it may also be finished just a millisecond ago, in
   * between you called this method and the actual finish.
   */
  async readOwnerHashStatus(ownerHash: string): Promise<
    | {
        status: OwnerHashStatus.RUNNING;
        lockData: LockData;
        key: string;
      }
    | {
        status: OwnerHashStatus.SOMEONE_ELSE_HOLDS_LOCK;
        lockData: LockData;
        key: string;
      }
    | {
        status: OwnerHashStatus.NO_KEY;
        lockData: null;
        key: string;
      }
    | {
        status: OwnerHashStatus.NO_RUNNING_PROCESS;
        lockData: LockData;
        key: string;
      }
    | {
        status: OwnerHashStatus.MALFORMED_OWNER_HASH;
        lockData: null;
        key: null;
      }
  > {
    const parsed = this._parseOwnerHash(ownerHash);
    if (!parsed) {
      return {
        status: OwnerHashStatus.MALFORMED_OWNER_HASH,
        lockData: null,
        key: null,
      };
    }

    const { key } = parsed;
    const database = this._database();

    const lockData = await database.readLockData(parsed.key);
    if (!lockData) {
      return { status: OwnerHashStatus.NO_KEY, lockData: null, key };
    }

    if (lockData.ownerHash !== ownerHash) {
      return { status: OwnerHashStatus.SOMEONE_ELSE_HOLDS_LOCK, lockData, key };
    }

    const processData = await database.readProcessData(lockData.processHash);
    if (!processData) {
      return { status: OwnerHashStatus.NO_RUNNING_PROCESS, lockData, key };
    }

    return { status: OwnerHashStatus.RUNNING, lockData, key };
  }

  /**
   * Destroys the instance. It can't be used after the destruction.
   */
  async terminate(): Promise<void> {
    this._databaseErrorUnsubscribe?.();
    this._databaseErrorUnsubscribe = undefined;
    this._databaseInstance = undefined;
    await this._reporterInstance?.terminate();
    this._reporterInstance = undefined;
  }

  /**
   * Note: a low-level API; try to use acquireAndRun() when possible.
   *
   * Tries to acquire or re-acquire the lock. If it's successful, returns an
   * extender callback which must be called time to time to:
   *
   * 1. Extend the lock in time,
   * 2. Make sure that the process can still continue running, and no-one else
   *    took over the lock.
   *
   * A takeover may happen if the current process didn't call the extender for
   * too long (e.g. it had an event loop blockage, or there was a network blip);
   * in this case, the current process will detect that and abort itself.
   *
   * You can also optionally pass a custom trace id, which will be preserved in
   * LockData structure and become a part of ownerHash.
   */
  async acquire(
    key: string,
    trace?: string
  ): Promise<
    | {
        status: LockStatus.SUCCESS;
        lockData: LockData;
        extend: Extend;
      }
    | {
        status: LockStatus.SOMEONE_ELSE_HOLDS_LOCK;
        lockData: LockData;
        extend?: never;
      }
  > {
    const database = this._database();

    if (!this._reporterInstance) {
      this._reporterInstance = new Reporter({
        database: this._options.database,
        processHash: this._createProcessHash(),
        reportWriteMs: this._options.reportWriteMs ?? DEFAULT_REPORT_WRITE_MS,
        reportTtlMs: this._reportTtlMs,
      });
      this._reporterInstance.errors.subscribe((error) =>
        this.errors.emit({ type: "reporter", error })
      );
    }

    await pTimeout(
      this._reporterInstance.ensureRunning(),
      this._options.reporterWorkerSpawnTimeoutMs ??
        DEFAULT_REPORTER_WORKER_SPAWN_TIMEOUT_MS,
      "Timed out waiting for ReporterThread worker to write aliveness info to the database"
    );

    const lockData = database.createLockData({
      ownerHash: this._createOwnerHash({
        key,
        processHash: this._reporterInstance.processHash(),
        trace,
      }),
      processHash: this._reporterInstance.processHash(),
      trace,
    });
    let result = await database.tryCreate(key, lockData, this._lockTtlMs);

    if (result.status === LockStatus.SOMEONE_ELSE_HOLDS_LOCK) {
      // Someone else is probably holding this lock. Checking whether they're
      // alive still somewhere...
      const processData = await database.readProcessData(
        result.lockData.processHash
      );
      if (!processData) {
        // They are not alive, so deleting their lock and retrying.
        await database.tryDelete(key, result.lockData.ownerHash);
        result = await database.tryCreate(key, lockData, this._lockTtlMs);
      }
    }

    return result.status === LockStatus.SUCCESS
      ? {
          ...result,
          extend: async () =>
            database.tryUpdate(
              key,
              { ...result.lockData, extendedAt: new Date().toJSON() },
              this._lockTtlMs,
              result.lockData.ownerHash
            ),
        }
      : result;
  }

  /**
   * Note: a low-level API; try to use acquireAndRun() when possible.
   *
   * Releases the lock acquired by the current process.
   */
  async release(
    key: string,
    lockData: LockData
  ): Promise<
    | { status: LockStatus.SUCCESS; lockData: null }
    | { status: LockStatus.NO_KEY; lockData: null }
    | { status: LockStatus.SOMEONE_ELSE_HOLDS_LOCK; lockData: LockData }
  > {
    const database = this._database();
    const timer = process.hrtime.bigint();
    while (true) {
      const res = await database.tryDelete(key, lockData.ownerHash);
      if (!("retriableError" in res)) {
        return res;
      }

      if (
        process.hrtime.bigint() - timer >
        1e6 * (this._options.lockTtlMs ?? DEFAULT_LOCK_TTL_MS)
      ) {
        throw res.retriableError;
      } else {
        this.errors.emit({ type: "locker", error: res.retriableError });
        await delay(this._options.lockRecheckMs ?? DEFAULT_LOCK_RECHECK_MS);
      }
    }
  }

  /**
   * A helper method to read-only recheck the lock and throw on errors.
   */
  private async _doRecheckLock(key: string, ownerHash: string): Promise<void> {
    const database = this._database();
    const lockData = await database.readLockData(key);
    if (!lockData) {
      // Lost the lock (most likely some event loop blocking for a very long
      // time, or heartbeater hasn't been called, or there was a network blip in
      // process reporter). Force re-acquisition.
      throw new LockError(key, ownerHash, null);
    } else if (lockData.ownerHash !== ownerHash) {
      throw new LockError(key, ownerHash, lockData);
    }
  }

  /**
   * A helper method to extend the lock and throw on errors.
   */
  private async _doExtendLock(
    key: string,
    ownerHash: string,
    extend: Extend
  ): Promise<void> {
    const { status, lockData } = await extend();
    if (status !== LockStatus.SUCCESS) {
      throw new LockError(key, ownerHash, lockData);
    }
  }

  /**
   * Each time we want to work with a database instance, lazily ensure that we
   * waited enough time to let the reporter thread write liveness status to the
   * database. If it doesn't happen for a long time, we time out individual
   * attempt to access the database hoping that next time it will heal itself.
   */
  private _database(): Database {
    if (!this._databaseInstance) {
      this._databaseInstance = Database.load(this._options.database);
      this._databaseInstance.errors.subscribe((error) =>
        this.errors.emit({ type: "locker", error })
      );
    }

    return this._databaseInstance;
  }

  /**
   * Generates a new globally unique process hash.
   */
  private _createProcessHash(): string {
    return hostname() + "/" + process.pid + "." + process.hrtime.bigint();
  }

  /**
   * Generates a new globally unique owner hash.
   */
  private _createOwnerHash({
    key,
    processHash,
    trace,
  }: {
    key: string;
    processHash: string;
    trace: string | undefined;
  }): string {
    return `${key}@${processHash}.${seq++}` + (trace ? `#${trace}` : "");
  }

  /**
   * Parses the owner hash back into parts. Although owner hash is opaque for
   * Database abstraction, Locker introduces its own format for convenience.
   */
  private _parseOwnerHash(ownerHash: string): null | {
    key: string;
    processHash: string;
  } {
    return ownerHash.match(/^(.+)@([^/]+\/\d+\.\d+)\.\d+(#.*)?$/s)
      ? { key: RegExp.$1, processHash: RegExp.$2 }
      : null;
  }
}

let seq = 0;
