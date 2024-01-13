[@clickup/distributed-locker](../README.md) / [Exports](../modules.md) / Locker

# Class: Locker

Allows running "singleton jobs" in across multiple machines. Main features:

1. Resilient to event loop blocking, because the lock TTL is high (5 minutes
   by default).
2. Despite the long lock TTL, the rest of the cluster quickly (seconds)
   understands that some job died on some other machine, so it can be
   re-picked-up.
3. Supports "seppuku" - in an event when something went south, and a lock got
   taken over (e.g. due to connectivity issues), the old lock owner should
   kill itself as soon as possible and don't continue double-working.
4. Way more performant than Bull, and does its job well.

## Constructors

### constructor

• **new Locker**(`_options`): [`Locker`](Locker.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_options` | [`LockerOptions`](../interfaces/LockerOptions.md) |

#### Returns

[`Locker`](Locker.md)

#### Defined in

[src/Locker.ts:84](https://github.com/clickup/distributed-locker/blob/master/src/Locker.ts#L84)

## Properties

### errors

• `Readonly` **errors**: [`Events`](Events.md)\<\{ `type`: ``"reporter"`` \| ``"locker"`` \| ``"lost_lock"`` ; `error`: `unknown`  }\>

If we experience a temporary (recoverable) error and don't want to abort,
this property allows to subscribe to such errors.

#### Defined in

[src/Locker.ts:79](https://github.com/clickup/distributed-locker/blob/master/src/Locker.ts#L79)

## Methods

### acquireAndRun

▸ **acquireAndRun**\<`TRet`\>(`key`, `func`, `trace?`): `Promise`\<\{ `status`: [`SUCCESS`](../enums/LockStatus.md#success) ; `result`: `TRet` ; `lockData?`: `undefined`  } \| \{ `status`: [`SOMEONE_ELSE_HOLDS_LOCK`](../enums/LockStatus.md#someone_else_holds_lock) ; `lockData`: [`LockData`](../interfaces/LockData.md) ; `result?`: `undefined`  }\>

Tries to acquire a lock and, if successful, runs the provided function with
(heartbeater, ownerHash) arguments.

The function must call the passed heartbeat callback (the more frequent,
the better!), which automatically:

1. Extend the lock (not on each heartbeater call, but just time to time, so
   it's perfectly safe to call the heartbeater very frequently).
2. Ensure that no-one else has taken over the lock. A takeover may happen
   if e.g. the function didn't call the heartbeat callback for too long
   (event loop blockage), there was a network blip or some other unexpected
   situation; in this case, the passed heartbeat callback throws.

You can also optionally pass a custom trace id, which will be preserved in
LockData structure and become a part of ownerHash.

#### Type parameters

| Name |
| :------ |
| `TRet` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `func` | (`heartbeater`: [`Heartbeater`](Heartbeater.md), `ownerHash`: `string`) => `Promise`\<`TRet`\> |
| `trace?` | `string` |

#### Returns

`Promise`\<\{ `status`: [`SUCCESS`](../enums/LockStatus.md#success) ; `result`: `TRet` ; `lockData?`: `undefined`  } \| \{ `status`: [`SOMEONE_ELSE_HOLDS_LOCK`](../enums/LockStatus.md#someone_else_holds_lock) ; `lockData`: [`LockData`](../interfaces/LockData.md) ; `result?`: `undefined`  }\>

#### Defined in

[src/Locker.ts:108](https://github.com/clickup/distributed-locker/blob/master/src/Locker.ts#L108)

___

### mutex

▸ **mutex**\<`TRet`\>(`key`, `timeoutMs`, `func`, `recheckDelay`, `trace?`): `Promise`\<`TRet`\>

Runs a passed function in a globally exclusive mode. If the mutex is
already held by someone, waits for recheckDelayMs and tries to re-acquire
until timeoutMs elapsed. Throws if the mutex couldn't be acquired.

#### Type parameters

| Name |
| :------ |
| `TRet` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `timeoutMs` | `number` |
| `func` | (`heartbeater`: [`Heartbeater`](Heartbeater.md)) => `Promise`\<`TRet`\> |
| `recheckDelay` | () => `Promise`\<`unknown`\> |
| `trace?` | `string` |

#### Returns

`Promise`\<`TRet`\>

#### Defined in

[src/Locker.ts:157](https://github.com/clickup/distributed-locker/blob/master/src/Locker.ts#L157)

___

### readLockData

▸ **readLockData**(`key`): `Promise`\<[`LockData`](../interfaces/LockData.md) \| ``"maybe_unlocked"``\>

Checks that the lock is currently held by some active process somewhere.
Notice that this method is probabilistic:

1. it may think that the lock is unlocked, although it's not;
2. it may return LockData of a lock which is released a moment ago.

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |

#### Returns

`Promise`\<[`LockData`](../interfaces/LockData.md) \| ``"maybe_unlocked"``\>

#### Defined in

[src/Locker.ts:186](https://github.com/clickup/distributed-locker/blob/master/src/Locker.ts#L186)

___

### readOwnerHashStatus

▸ **readOwnerHashStatus**(`ownerHash`): `Promise`\<\{ `status`: [`RUNNING`](../enums/OwnerHashStatus.md#running) ; `lockData`: [`LockData`](../interfaces/LockData.md) ; `key`: `string`  } \| \{ `status`: [`SOMEONE_ELSE_HOLDS_LOCK`](../enums/OwnerHashStatus.md#someone_else_holds_lock) ; `lockData`: [`LockData`](../interfaces/LockData.md) ; `key`: `string`  } \| \{ `status`: [`NO_KEY`](../enums/OwnerHashStatus.md#no_key) ; `lockData`: ``null`` ; `key`: `string`  } \| \{ `status`: [`NO_RUNNING_PROCESS`](../enums/OwnerHashStatus.md#no_running_process) ; `lockData`: [`LockData`](../interfaces/LockData.md) ; `key`: `string`  } \| \{ `status`: [`MALFORMED_OWNER_HASH`](../enums/OwnerHashStatus.md#malformed_owner_hash) ; `lockData`: ``null`` ; `key`: ``null``  }\>

For a given owner hash, checks whether the exact corresponding coroutine is
running somewhere.

Don't bind any business logic to it (use for debugging purposes), otherwise
it WILL be race-prone. (I know it's tempting, but... please... don't.) E.g.
if the value returned is SUCCESS, the exact coroutine with ownerHash is now
running most likely, but it may also be finished just a millisecond ago, in
between you called this method and the actual finish.

#### Parameters

| Name | Type |
| :------ | :------ |
| `ownerHash` | `string` |

#### Returns

`Promise`\<\{ `status`: [`RUNNING`](../enums/OwnerHashStatus.md#running) ; `lockData`: [`LockData`](../interfaces/LockData.md) ; `key`: `string`  } \| \{ `status`: [`SOMEONE_ELSE_HOLDS_LOCK`](../enums/OwnerHashStatus.md#someone_else_holds_lock) ; `lockData`: [`LockData`](../interfaces/LockData.md) ; `key`: `string`  } \| \{ `status`: [`NO_KEY`](../enums/OwnerHashStatus.md#no_key) ; `lockData`: ``null`` ; `key`: `string`  } \| \{ `status`: [`NO_RUNNING_PROCESS`](../enums/OwnerHashStatus.md#no_running_process) ; `lockData`: [`LockData`](../interfaces/LockData.md) ; `key`: `string`  } \| \{ `status`: [`MALFORMED_OWNER_HASH`](../enums/OwnerHashStatus.md#malformed_owner_hash) ; `lockData`: ``null`` ; `key`: ``null``  }\>

#### Defined in

[src/Locker.ts:208](https://github.com/clickup/distributed-locker/blob/master/src/Locker.ts#L208)

___

### terminate

▸ **terminate**(): `Promise`\<`void`\>

Destroys the instance. It can't be used after the destruction.

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/Locker.ts:267](https://github.com/clickup/distributed-locker/blob/master/src/Locker.ts#L267)

___

### acquire

▸ **acquire**(`key`, `trace?`): `Promise`\<\{ `status`: [`SUCCESS`](../enums/LockStatus.md#success) ; `lockData`: [`LockData`](../interfaces/LockData.md) ; `extend`: [`Extend`](../interfaces/Extend.md)  } \| \{ `status`: [`SOMEONE_ELSE_HOLDS_LOCK`](../enums/LockStatus.md#someone_else_holds_lock) ; `lockData`: [`LockData`](../interfaces/LockData.md) ; `extend?`: `undefined`  }\>

Note: a low-level API; try to use acquireAndRun() when possible.

Tries to acquire or re-acquire the lock. If it's successful, returns an
extender callback which must be called time to time to:

1. Extend the lock in time,
2. Make sure that the process can still continue running, and no-one else
   took over the lock.

A takeover may happen if the current process didn't call the extender for
too long (e.g. it had an event loop blockage, or there was a network blip);
in this case, the current process will detect that and abort itself.

You can also optionally pass a custom trace id, which will be preserved in
LockData structure and become a part of ownerHash.

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `trace?` | `string` |

#### Returns

`Promise`\<\{ `status`: [`SUCCESS`](../enums/LockStatus.md#success) ; `lockData`: [`LockData`](../interfaces/LockData.md) ; `extend`: [`Extend`](../interfaces/Extend.md)  } \| \{ `status`: [`SOMEONE_ELSE_HOLDS_LOCK`](../enums/LockStatus.md#someone_else_holds_lock) ; `lockData`: [`LockData`](../interfaces/LockData.md) ; `extend?`: `undefined`  }\>

#### Defined in

[src/Locker.ts:292](https://github.com/clickup/distributed-locker/blob/master/src/Locker.ts#L292)

___

### release

▸ **release**(`key`, `lockData`): `Promise`\<\{ `status`: [`SUCCESS`](../enums/LockStatus.md#success) ; `lockData`: ``null``  } \| \{ `status`: [`NO_KEY`](../enums/LockStatus.md#no_key) ; `lockData`: ``null``  } \| \{ `status`: [`SOMEONE_ELSE_HOLDS_LOCK`](../enums/LockStatus.md#someone_else_holds_lock) ; `lockData`: [`LockData`](../interfaces/LockData.md)  }\>

Note: a low-level API; try to use acquireAndRun() when possible.

Releases the lock acquired by the current process.

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `lockData` | [`LockData`](../interfaces/LockData.md) |

#### Returns

`Promise`\<\{ `status`: [`SUCCESS`](../enums/LockStatus.md#success) ; `lockData`: ``null``  } \| \{ `status`: [`NO_KEY`](../enums/LockStatus.md#no_key) ; `lockData`: ``null``  } \| \{ `status`: [`SOMEONE_ELSE_HOLDS_LOCK`](../enums/LockStatus.md#someone_else_holds_lock) ; `lockData`: [`LockData`](../interfaces/LockData.md)  }\>

#### Defined in

[src/Locker.ts:371](https://github.com/clickup/distributed-locker/blob/master/src/Locker.ts#L371)
