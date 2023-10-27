[@clickup/distributed-locker](../README.md) / [Exports](../modules.md) / LockerOptions

# Interface: LockerOptions

## Properties

### database

• `Readonly` **database**: [`DatabaseModule`](DatabaseModule.md)

Backend database reference. Since we must instantiate the database in a
separate worker thread with exactly same options (including callbacks if
any, common in e.g. IORedis options), we can't pass an instance of a
Database object here. Instead, we pass a file name where the database
object is created and exported as a property.

#### Defined in

[src/Locker.ts:28](https://github.com/clickup/distributed-locker/blob/master/src/Locker.ts#L28)

___

### reportWriteMs

• `Optional` `Readonly` **reportWriteMs**: `number`

How often to report that the current process is alive. Since we have only
one reporter per process (not per lock), we can write pretty frequently.

#### Defined in

[src/Locker.ts:31](https://github.com/clickup/distributed-locker/blob/master/src/Locker.ts#L31)

___

### reportTtlMs

• `Optional` `Readonly` **reportTtlMs**: `number`

After this time the process is treated as dead if it did not report for
its liveness. This TTL is relatively short, assuming the event loop of
reporter thread is never blocked (since it's a separate thread).

#### Defined in

[src/Locker.ts:35](https://github.com/clickup/distributed-locker/blob/master/src/Locker.ts#L35)

___

### reporterWorkerSpawnTimeoutMs

• `Optional` `Readonly` **reporterWorkerSpawnTimeoutMs**: `number`

How much time to wait until the reporter background thread successfully
writes its liveness status to the database.

#### Defined in

[src/Locker.ts:38](https://github.com/clickup/distributed-locker/blob/master/src/Locker.ts#L38)

___

### lockRecheckMs

• `Optional` `Readonly` **lockRecheckMs**: `number`

How often to recheck that we still hold the lock and not taken over by
someone else. Rechecking is cheap (just 1 Redis GET operation), so can be
done frequently.

#### Defined in

[src/Locker.ts:42](https://github.com/clickup/distributed-locker/blob/master/src/Locker.ts#L42)

___

### lockExtendMs

• `Optional` `Readonly` **lockExtendMs**: `number`

Extend the lock TTL in heartbeats not more frequent than this long.
Extending is expensive (1 GET and 1 SET), so we do it way less frequently
than rechecking.

#### Defined in

[src/Locker.ts:46](https://github.com/clickup/distributed-locker/blob/master/src/Locker.ts#L46)

___

### lockTtlMs

• `Optional` `Readonly` **lockTtlMs**: `number`

Expire the lock if it hasn't been extended for that long. Notice that the
value here should typically be pretty high to be resilient to event loop
blockage or other unexpected slowdown in the process.

#### Defined in

[src/Locker.ts:50](https://github.com/clickup/distributed-locker/blob/master/src/Locker.ts#L50)
