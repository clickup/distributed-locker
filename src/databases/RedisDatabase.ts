import type { Cluster } from "ioredis";
import type Redis from "ioredis";
import type { LockData, ProcessData } from "../Database";
import Database from "../Database";
import LockStatus from "../LockStatus";

export default class RedisDatabase extends Database {
  private _redis;

  constructor(redis: Redis | Cluster) {
    super();
    this._redis = redis as typeof redis & {
      tryCreate: (
        key: string,
        lockData: string,
        ttlMs: number
      ) => Promise<
        | [status: LockStatus.SUCCESS, lockData: string]
        | [status: LockStatus.SOMEONE_ELSE_HOLDS_LOCK, lockData: string]
      >;
      tryUpdate: (
        key: string,
        lockData: string,
        ttlMs: number,
        onlyIfOwnerHashEq: string
      ) => Promise<
        | [status: LockStatus.SUCCESS, lockData: string]
        | [status: LockStatus.NO_KEY, lockData: null]
        | [status: LockStatus.SOMEONE_ELSE_HOLDS_LOCK, lockData: string]
      >;
      tryDelete: (
        key: string,
        onlyIfOwnerHashEq: string
      ) => Promise<
        | [status: LockStatus.SUCCESS, lockData: null]
        | [status: LockStatus.NO_KEY, lockData: null]
        | [status: LockStatus.SOMEONE_ELSE_HOLDS_LOCK, lockData: string]
      >;
    };
    this._redis.defineCommand("tryCreate", {
      numberOfKeys: 1,
      lua: `
        local key, lockData, ttlMs = KEYS[1], ARGV[1], tonumber(ARGV[2])
        local lockDataBefore = redis.call("GET", key)
        if lockDataBefore and lockDataBefore ~= "" then
          return { "${LockStatus.SOMEONE_ELSE_HOLDS_LOCK}", lockDataBefore }
        end
        redis.call("SET", key, lockData, "PX", ttlMs)
        return { "${LockStatus.SUCCESS}", lockData }
      `,
    });
    this._redis.defineCommand("tryUpdate", {
      numberOfKeys: 1,
      lua: `
        local key, lockData, ttlMs, onlyIfOwnerHashEq = KEYS[1], ARGV[1], tonumber(ARGV[2]), ARGV[3]
        local lockDataBefore = redis.call("GET", key)
        if not lockDataBefore or lockDataBefore == "" then
          return { "${LockStatus.NO_KEY}", nil }
        end
        local decoded = cjson.decode(lockDataBefore)
        if decoded.ownerHash ~= onlyIfOwnerHashEq then
          return { "${LockStatus.SOMEONE_ELSE_HOLDS_LOCK}", lockDataBefore }
        end
        redis.call("SET", key, lockData, "PX", ttlMs)
        return { "${LockStatus.SUCCESS}", lockData }
      `,
    });
    this._redis.defineCommand("tryDelete", {
      numberOfKeys: 1,
      lua: `
        local key, onlyIfOwnerHashEq = KEYS[1], ARGV[1]
        local lockDataBefore = redis.call("GET", key)
        if not lockDataBefore or lockDataBefore == "" then
          return { "${LockStatus.NO_KEY}", nil }
        end
        local decoded = cjson.decode(lockDataBefore)
        if decoded.ownerHash ~= onlyIfOwnerHashEq then
          return { "${LockStatus.SOMEONE_ELSE_HOLDS_LOCK}", lockDataBefore }
        end
        redis.call("DEL", key)
        return { "${LockStatus.SUCCESS}", nil }
      `,
    });
    this._redis.on("error", (e) => this.errors.emit(e));
  }

  async readLockData(key: string): Promise<LockData | null> {
    const lockData = await this._redis.get(this._lockKey(key));
    return lockData ? JSON.parse(lockData) : null;
  }

  async tryCreate(
    key: string,
    lockDataIn: LockData,
    ttlMs: number
  ): Promise<
    | { status: LockStatus.SUCCESS; lockData: LockData }
    | { status: LockStatus.SOMEONE_ELSE_HOLDS_LOCK; lockData: LockData }
  > {
    const [status, lockData] = await this._redis.tryCreate(
      this._lockKey(key),
      JSON.stringify(lockDataIn),
      ttlMs
    );
    return {
      status,
      lockData: lockData ? JSON.parse(lockData) : null,
    };
  }

  async tryUpdate(
    key: string,
    lockDataIn: LockData,
    ttlMs: number,
    onlyIfOwnerHashEq: string
  ): Promise<
    | { status: LockStatus.SUCCESS; lockData: LockData }
    | { status: LockStatus.NO_KEY; lockData: null }
    | { status: LockStatus.SOMEONE_ELSE_HOLDS_LOCK; lockData: LockData }
  > {
    const [status, lockData] = await this._redis.tryUpdate(
      this._lockKey(key),
      JSON.stringify(lockDataIn),
      ttlMs,
      onlyIfOwnerHashEq
    );
    return {
      status,
      lockData: lockData ? JSON.parse(lockData) : null,
    };
  }

  async tryDelete(
    key: string,
    onlyIfOwnerHashEq: string
  ): Promise<
    | { status: LockStatus.SUCCESS; lockData: null }
    | { status: LockStatus.NO_KEY; lockData: null }
    | { status: LockStatus.SOMEONE_ELSE_HOLDS_LOCK; lockData: LockData }
    | { retriableError: unknown }
  > {
    try {
      const [status, lockData] = await this._redis.tryDelete(
        this._lockKey(key),
        onlyIfOwnerHashEq
      );
      return {
        status,
        lockData: lockData ? JSON.parse(lockData) : null,
      };
    } catch (e: any) {
      if (e?.name === "MaxRetriesPerRequestError") {
        return { retriableError: e };
      } else {
        throw e;
      }
    }
  }

  async readProcessData(processHash: string): Promise<ProcessData | null> {
    const value = await this._redis.get(this._processKey(processHash));
    return value ? JSON.parse(value) : null;
  }

  async saveProcessData(
    processHash: string,
    processData: ProcessData,
    ttlMs: number
  ): Promise<void> {
    await this._redis.set(
      this._processKey(processHash),
      JSON.stringify(processData),
      "PX",
      ttlMs
    );
  }

  async terminate(): Promise<void> {
    this._redis.disconnect();
  }

  private _lockKey(key: string): string {
    return "lock:" + key;
  }

  private _processKey(processHash: string): string {
    return "proc:" + processHash;
  }
}
