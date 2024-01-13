import { inspect } from "util";
import Events from "./Events";
import type LockStatus from "./LockStatus";

/**
 * A data structure which is stored in the Database per each lock key.
 */
export interface LockData {
  /** Globally unique hashcode (identifier) of the running coroutine which is
   * associated with a lock key. The engine guarantees that there will be only
   * one coroutine in the whole cluster running for each particular lock key,
   * and its coroutine hash will be eventually stored in this field. The format
   * is totally opaque for Database abstraction, but in Locker, it looks like:
   * "{key}@{processHash}.{seq}#{trace}". */
  ownerHash: string;
  /** Globally unique hashcode (identifier) of the process where the currently
   * lock-key related coroutine is running. For each process hash, the engine
   * stores a short-expiring separate Database record (see ProcessData) which is
   * updated frequently (1-2 times per second) in a dedicated background Node
   * worker thread called Reporter. Since the Reporter runs in its own dedicated
   * thread, it avoids event loop blockage. Having an alive ProcessData in
   * Database is mandatory to the lock owner to keep holding it (otherwise it
   * decides that there was e.g. a network blip, so someone else took over, and
   * it kills itself). The format is opaque for Database abstraction, but in
   * Locker, it looks like: "{hostname}/{pid}.{nanoseconds}". */
  processHash: string;
  /** The value passed in acquire() or acquireAndRun(), during the creation of
   * LockData structure. */
  trace?: string;
  /** When the lock was first acquired by ownerHash coroutine. */
  acquiredAt: string;
  /** When the lock was lastly written by ownerHash coroutine. The whole idea is
   * that there is no need for the engine to extend the lock too often, because
   * it relies on its processHash liveness as well. */
  extendedAt: string;
}

/**
 * Each Node process keeps and frequently updates exactly one ProcessData record
 * in the Database to indicate that this process is still alive.
 */
export interface ProcessData {
  aliveAt: string;
}

/**
 * An information on how to create a Database instance in a background Reporter
 * thread.
 */
export interface DatabaseModule {
  moduleName: string;
  exportName: string;
}

/**
 * Database instance must be stateless, because it's used in both the main and
 * in the worker (Reporter) thread. In both thread the database objects should
 * be configured exactly the same way.
 */
export default abstract class Database {
  /**
   * Allows to subscribe to recoverable database errors.
   */
  readonly errors = new Events<unknown>();

  /**
   * Reads the data associated with some lock key.
   */
  abstract readLockData(key: string): Promise<LockData | null>;

  /**
   * Writes the lock data to a lock with the provided key, but only if this lock
   * key doesn't exist yet.
   */
  abstract tryCreate(
    key: string,
    lockData: LockData,
    ttlMs: number,
  ): Promise<
    | { status: LockStatus.SUCCESS; lockData: LockData }
    | { status: LockStatus.SOMEONE_ELSE_HOLDS_LOCK; lockData: LockData }
  >;

  /**
   * Writes the lock data to a lock with the provided key, but only if this lock
   * key exists, and its ownerHash is equal to the provided one.
   */
  abstract tryUpdate(
    key: string,
    lockData: LockData,
    ttlMs: number,
    onlyIfOwnerHashEq: string,
  ): Promise<
    | { status: LockStatus.SUCCESS; lockData: LockData }
    | { status: LockStatus.NO_KEY; lockData: null }
    | { status: LockStatus.SOMEONE_ELSE_HOLDS_LOCK; lockData: LockData }
  >;

  /**
   * Deletes the lock with the provided key, but only if this lock key exists,
   * and its ownerHash is equal to the provided one.
   *
   * If the method returns a retriableError response, then the Locker will call
   * it again trying to release the lock up until the lock TTL elapses. This is
   * a case when e.g. the process temporarily lost connectivity to the database,
   * but is still alive (so we won't detect the lock quick-release sequence via
   * Reporter engine). If the code wants to release the lock, it means that it
   * KNOWS that it has already finished all the work, so it's safe to let other
   * processes kick in; thus, we try hard to release the lock ASAP.
   */
  abstract tryDelete(
    key: string,
    onlyIfOwnerHashEq: string,
  ): Promise<
    | { status: LockStatus.SUCCESS; lockData: null }
    | { status: LockStatus.NO_KEY; lockData: null }
    | { status: LockStatus.SOMEONE_ELSE_HOLDS_LOCK; lockData: LockData }
    | { retriableError: unknown }
  >;

  /**
   * Returns a process data associated to some alive process hash (or null if
   * there is no alive process).
   */
  abstract readProcessData(processHash: string): Promise<ProcessData | null>;

  /**
   * Saves the process aliveness status & aux data.
   */
  abstract saveProcessData(
    processHash: string,
    processData: ProcessData,
    ttlMs: number,
  ): Promise<void>;

  /**
   * Terminates the database connections.
   */
  abstract terminate(): Promise<void>;

  /**
   * Dynamically loads a Database object from some file. This is needed, because
   * we instantiate the database in a background thread where we can't pass
   * objects or non-JSON-serializable configuration. So we can't pass an
   * instance of a database to a worker thread, and we can't even pass its
   * options there (e.g. for IORedis, to use TLS, one must pass a callback in
   * options for certificate rechecking) since they're not JSON-serializable. It
   * means that the only way to create a consistent instance in both threads is
   * to load this instance from a shared file (module).
   */
  static load({ moduleName, exportName }: DatabaseModule): Database {
    const database = require(moduleName)[exportName];

    if ("readLockData" in database) {
      return database;
    }

    throw Error(
      `Export property ${exportName} in ${moduleName} is not an instance of Database: ` +
        inspect(database),
    );
  }

  /**
   * Creates a new LockData object.
   */
  createLockData({
    ownerHash,
    processHash,
    trace,
  }: {
    ownerHash: string;
    processHash: string;
    trace: string | undefined;
  }): LockData {
    const now = new Date();
    return {
      ownerHash,
      processHash,
      ...(trace ? { trace } : {}),
      acquiredAt: now.toJSON(),
      extendedAt: now.toJSON(),
    };
  }

  /**
   * Creates a new ProcessData object. Called in Reporter thread.
   */
  createProcessData(): ProcessData {
    const now = new Date();
    return {
      aliveAt: now.toJSON(),
    };
  }
}
