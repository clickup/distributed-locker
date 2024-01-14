[@clickup/distributed-locker](../README.md) / [Exports](../modules.md) / LockData

# Interface: LockData

A data structure which is stored in the Database per each lock key.

## Properties

### ownerHash

• **ownerHash**: `string`

Globally unique hashcode (identifier) of the running coroutine which is
associated with a lock key. The engine guarantees that there will be only
one coroutine in the whole cluster running for each particular lock key,
and its coroutine hash will be eventually stored in this field. The format
is totally opaque for Database abstraction, but in Locker, it looks like:
"{key}@{processHash}.{seq}#{trace}".

#### Defined in

[src/Database.ts:15](https://github.com/clickup/distributed-locker/blob/master/src/Database.ts#L15)

___

### processHash

• **processHash**: `string`

Globally unique hashcode (identifier) of the process where the currently
lock-key related coroutine is running. For each process hash, the engine
stores a short-expiring separate Database record (see ProcessData) which is
updated frequently (1-2 times per second) in a dedicated background Node
worker thread called Reporter. Since the Reporter runs in its own dedicated
thread, it avoids event loop blockage. Having an alive ProcessData in
Database is mandatory to the lock owner to keep holding it (otherwise it
decides that there was e.g. a network blip, so someone else took over, and
it kills itself). The format is opaque for Database abstraction, but in
Locker, it looks like: "{hostname}/{pid}.{nanoseconds}".

#### Defined in

[src/Database.ts:26](https://github.com/clickup/distributed-locker/blob/master/src/Database.ts#L26)

___

### trace

• `Optional` **trace**: `string`

The value passed in acquire() or acquireAndRun(), during the creation of
LockData structure.

#### Defined in

[src/Database.ts:29](https://github.com/clickup/distributed-locker/blob/master/src/Database.ts#L29)

___

### acquiredAt

• **acquiredAt**: `string`

When the lock was first acquired by ownerHash coroutine.

#### Defined in

[src/Database.ts:31](https://github.com/clickup/distributed-locker/blob/master/src/Database.ts#L31)

___

### extendedAt

• **extendedAt**: `string`

When the lock was lastly written by ownerHash coroutine. The whole idea is
that there is no need for the engine to extend the lock too often, because
it relies on its processHash liveness as well.

#### Defined in

[src/Database.ts:35](https://github.com/clickup/distributed-locker/blob/master/src/Database.ts#L35)
