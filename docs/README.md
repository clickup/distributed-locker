@clickup/distributed-locker / [Exports](modules.md)

# distributed-locker: ensures that some long-running job with an unique key is not double scheduled in the cluster

See also [Full API documentation](https://github.com/clickup/distributed-locker/blob/master/docs/modules.md).

As opposed to the popular redlock algorithm, the library also tracks per-process
liveness (in a separate Node thread), so the locks from a dead process are
quickly reported as free to the rest of the cluster as soon as the process dies.
This is extremely convenient when doing cluster-wide deployments or individual
worker process restarts.

<img src="README.jpg" />

Main features:

1. Resilient to event loop blocking in the worker process, because the lock TTL
   is high (5 minutes by default).
2. Despite the long lock TTL, the rest of the cluster quickly (seconds)
   understands that some job is dead on some other machine, so it can be quickly
   re-picked-up by another worker somewhere else.
3. Supports "seppuku": in an event when something goes south, and a lock gets
   taken over (e.g. due to connectivity issues), the old lock owner
   automatically kill itself as soon as possible and doesn't continue
   double-working.
4. Way more performant than Bull, and does the job of acquiring cluster-wide
   exclusive locks really well.

## Example

```ts
export const db = new RedisDatabase(
  // You can also use Redis Cluster here.
  new Redis({
    host: process.env.REDIS_WORKER_HOST,
    port: process.env.REDIS_WORKER_PORT,
    password: process.env.REDIS_WORKER_PASSWORD,
    keyPrefix: "locker:",
  })
);

const locker = new Locker({
  database: {
    moduleName: __file,
    exportName: "db",
  },
});

// ...

const res = await locker.acquireAndRun("job-key", async (heartbeat) => {
  while (shouldContinue()) {
    await doSomeWork();
    // 1. Reports that the job is still running to refresh the lock.
    // 2. If someone takes over (e.g. a network blip or event loop
    //    blockage), kills itself by throwing LockError exception.
    await heartbeat();
  }
});
// res is now either { status: LockStatus.SUCCESS } 
// or { status: LockStatus.SOMEONE_ELSE_HOLDS_LOCK }
```
