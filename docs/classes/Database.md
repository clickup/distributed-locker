[@clickup/distributed-locker](../README.md) / [Exports](../modules.md) / Database

# Class: Database

Database instance must be stateless, because it's used in both the main and
in the worker (Reporter) thread. In both thread the database objects should
be configured exactly the same way.

## Hierarchy

- **`Database`**

  ↳ [`RedisDatabase`](RedisDatabase.md)

## Constructors

### constructor

• **new Database**(): [`Database`](Database.md)

#### Returns

[`Database`](Database.md)

## Properties

### errors

• `Readonly` **errors**: [`Events`](Events.md)\<`unknown`\>

Allows to subscribe to recoverable database errors.

#### Defined in

[src/Database.ts:64](https://github.com/clickup/distributed-locker/blob/master/src/Database.ts#L64)

## Methods

### load

▸ **load**(`«destructured»`): [`Database`](Database.md)

Dynamically loads a Database object from some file. This is needed, because
we instantiate the database in a background thread where we can't pass
objects or non-JSON-serializable configuration. So we can't pass an
instance of a database to a worker thread, and we can't even pass its
options there (e.g. for IORedis, to use TLS, one must pass a callback in
options for certificate rechecking) since they're not JSON-serializable. It
means that the only way to create a consistent instance in both threads is
to load this instance from a shared file (module).

#### Parameters

| Name | Type |
| :------ | :------ |
| `«destructured»` | [`DatabaseModule`](../interfaces/DatabaseModule.md) |

#### Returns

[`Database`](Database.md)

#### Defined in

[src/Database.ts:151](https://github.com/clickup/distributed-locker/blob/master/src/Database.ts#L151)

___

### readLockData

▸ **readLockData**(`key`): `Promise`\<``null`` \| [`LockData`](../interfaces/LockData.md)\>

Reads the data associated with some lock key.

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |

#### Returns

`Promise`\<``null`` \| [`LockData`](../interfaces/LockData.md)\>

#### Defined in

[src/Database.ts:69](https://github.com/clickup/distributed-locker/blob/master/src/Database.ts#L69)

___

### tryCreate

▸ **tryCreate**(`key`, `lockData`, `ttlMs`): `Promise`\<\{ `status`: [`SUCCESS`](../enums/LockStatus.md#success) ; `lockData`: [`LockData`](../interfaces/LockData.md)  } \| \{ `status`: [`SOMEONE_ELSE_HOLDS_LOCK`](../enums/LockStatus.md#someone_else_holds_lock) ; `lockData`: [`LockData`](../interfaces/LockData.md)  }\>

Writes the lock data to a lock with the provided key, but only if this lock
key doesn't exist yet.

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `lockData` | [`LockData`](../interfaces/LockData.md) |
| `ttlMs` | `number` |

#### Returns

`Promise`\<\{ `status`: [`SUCCESS`](../enums/LockStatus.md#success) ; `lockData`: [`LockData`](../interfaces/LockData.md)  } \| \{ `status`: [`SOMEONE_ELSE_HOLDS_LOCK`](../enums/LockStatus.md#someone_else_holds_lock) ; `lockData`: [`LockData`](../interfaces/LockData.md)  }\>

#### Defined in

[src/Database.ts:75](https://github.com/clickup/distributed-locker/blob/master/src/Database.ts#L75)

___

### tryUpdate

▸ **tryUpdate**(`key`, `lockData`, `ttlMs`, `onlyIfOwnerHashEq`): `Promise`\<\{ `status`: [`SUCCESS`](../enums/LockStatus.md#success) ; `lockData`: [`LockData`](../interfaces/LockData.md)  } \| \{ `status`: [`NO_KEY`](../enums/LockStatus.md#no_key) ; `lockData`: ``null``  } \| \{ `status`: [`SOMEONE_ELSE_HOLDS_LOCK`](../enums/LockStatus.md#someone_else_holds_lock) ; `lockData`: [`LockData`](../interfaces/LockData.md)  }\>

Writes the lock data to a lock with the provided key, but only if this lock
key exists, and its ownerHash is equal to the provided one.

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `lockData` | [`LockData`](../interfaces/LockData.md) |
| `ttlMs` | `number` |
| `onlyIfOwnerHashEq` | `string` |

#### Returns

`Promise`\<\{ `status`: [`SUCCESS`](../enums/LockStatus.md#success) ; `lockData`: [`LockData`](../interfaces/LockData.md)  } \| \{ `status`: [`NO_KEY`](../enums/LockStatus.md#no_key) ; `lockData`: ``null``  } \| \{ `status`: [`SOMEONE_ELSE_HOLDS_LOCK`](../enums/LockStatus.md#someone_else_holds_lock) ; `lockData`: [`LockData`](../interfaces/LockData.md)  }\>

#### Defined in

[src/Database.ts:88](https://github.com/clickup/distributed-locker/blob/master/src/Database.ts#L88)

___

### tryDelete

▸ **tryDelete**(`key`, `onlyIfOwnerHashEq`): `Promise`\<\{ `status`: [`SUCCESS`](../enums/LockStatus.md#success) ; `lockData`: ``null``  } \| \{ `status`: [`NO_KEY`](../enums/LockStatus.md#no_key) ; `lockData`: ``null``  } \| \{ `status`: [`SOMEONE_ELSE_HOLDS_LOCK`](../enums/LockStatus.md#someone_else_holds_lock) ; `lockData`: [`LockData`](../interfaces/LockData.md)  } \| \{ `retriableError`: `unknown`  }\>

Deletes the lock with the provided key, but only if this lock key exists,
and its ownerHash is equal to the provided one.

If the method returns a retriableError response, then the Locker will call
it again trying to release the lock up until the lock TTL elapses. This is
a case when e.g. the process temporarily lost connectivity to the database,
but is still alive (so we won't detect the lock quick-release sequence via
Reporter engine). If the code wants to release the lock, it means that it
KNOWS that it has already finished all the work, so it's safe to let other
processes kick in; thus, we try hard to release the lock ASAP.

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `onlyIfOwnerHashEq` | `string` |

#### Returns

`Promise`\<\{ `status`: [`SUCCESS`](../enums/LockStatus.md#success) ; `lockData`: ``null``  } \| \{ `status`: [`NO_KEY`](../enums/LockStatus.md#no_key) ; `lockData`: ``null``  } \| \{ `status`: [`SOMEONE_ELSE_HOLDS_LOCK`](../enums/LockStatus.md#someone_else_holds_lock) ; `lockData`: [`LockData`](../interfaces/LockData.md)  } \| \{ `retriableError`: `unknown`  }\>

#### Defined in

[src/Database.ts:111](https://github.com/clickup/distributed-locker/blob/master/src/Database.ts#L111)

___

### readProcessData

▸ **readProcessData**(`processHash`): `Promise`\<``null`` \| [`ProcessData`](../interfaces/ProcessData.md)\>

Returns a process data associated to some alive process hash (or null if
there is no alive process).

#### Parameters

| Name | Type |
| :------ | :------ |
| `processHash` | `string` |

#### Returns

`Promise`\<``null`` \| [`ProcessData`](../interfaces/ProcessData.md)\>

#### Defined in

[src/Database.ts:125](https://github.com/clickup/distributed-locker/blob/master/src/Database.ts#L125)

___

### saveProcessData

▸ **saveProcessData**(`processHash`, `processData`, `ttlMs`): `Promise`\<`void`\>

Saves the process aliveness status & aux data.

#### Parameters

| Name | Type |
| :------ | :------ |
| `processHash` | `string` |
| `processData` | [`ProcessData`](../interfaces/ProcessData.md) |
| `ttlMs` | `number` |

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/Database.ts:130](https://github.com/clickup/distributed-locker/blob/master/src/Database.ts#L130)

___

### terminate

▸ **terminate**(): `Promise`\<`void`\>

Terminates the database connections.

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/Database.ts:139](https://github.com/clickup/distributed-locker/blob/master/src/Database.ts#L139)

___

### createLockData

▸ **createLockData**(`«destructured»`): [`LockData`](../interfaces/LockData.md)

Creates a new LockData object.

#### Parameters

| Name | Type |
| :------ | :------ |
| `«destructured»` | `Object` |
| › `ownerHash` | `string` |
| › `processHash` | `string` |
| › `trace` | `undefined` \| `string` |

#### Returns

[`LockData`](../interfaces/LockData.md)

#### Defined in

[src/Database.ts:167](https://github.com/clickup/distributed-locker/blob/master/src/Database.ts#L167)

___

### createProcessData

▸ **createProcessData**(): [`ProcessData`](../interfaces/ProcessData.md)

Creates a new ProcessData object. Called in Reporter thread.

#### Returns

[`ProcessData`](../interfaces/ProcessData.md)

#### Defined in

[src/Database.ts:189](https://github.com/clickup/distributed-locker/blob/master/src/Database.ts#L189)
