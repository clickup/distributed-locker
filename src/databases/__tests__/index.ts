import Redis from "ioredis";
import RedisDatabase from "../RedisDatabase";

export const db = new RedisDatabase(
  new Redis({
    host:
      process.env["REDISCLI_HOST"] ||
      process.env["REDIS_QUEUE_HOST"] ||
      "127.0.0.1",
    port:
      parseInt(
        process.env["REDISCLI_PORT"] || process.env["REDIS_QUEUE_PORT"] || "0"
      ) || undefined,
    password:
      process.env["REDISCLI_AUTH"] ||
      process.env["REDIS_QUEUE_PASS"] ||
      undefined,
    keyPrefix: "test:", // do NOT make it dynamic: it is also used in a worker thread
  })
);

export const dbBroken = new RedisDatabase(
  new Redis({
    host: "127.0.0.1",
    port: 64000, // non-existing
    connectTimeout: 1000,
    maxRetriesPerRequest: 1,
  })
);
