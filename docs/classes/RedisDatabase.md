[@clickup/distributed-locker](../README.md) / [Exports](../modules.md) / RedisDatabase

# Class: RedisDatabase

Database instance must be stateless, because it's used in both the main and
in the worker (Reporter) thread. In both thread the database objects should
be configured exactly the same way.

## Hierarchy

- [`Database`](Database.md)

  ↳ **`RedisDatabase`**

## Constructors

### constructor

• **new RedisDatabase**(`redis`): [`RedisDatabase`](RedisDatabase.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `redis` | `Redis` \| `Cluster` |

#### Returns

[`RedisDatabase`](RedisDatabase.md)

#### Overrides

[Database](Database.md).[constructor](Database.md#constructor)

#### Defined in

[src/databases/RedisDatabase.ts:10](https://github.com/clickup/distributed-locker/blob/master/src/databases/RedisDatabase.ts#L10)

## Properties

### errors

• `Readonly` **errors**: [`Events`](Events.md)\<`unknown`\>

Allows to subscribe to recoverable database errors.

#### Inherited from

[Database](Database.md).[errors](Database.md#errors)

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

#### Inherited from

[Database](Database.md).[load](Database.md#load)

#### Defined in

[src/Database.ts:151](https://github.com/clickup/distributed-locker/blob/master/src/Database.ts#L151)

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

#### Inherited from

[Database](Database.md).[createLockData](Database.md#createlockdata)

#### Defined in

[src/Database.ts:167](https://github.com/clickup/distributed-locker/blob/master/src/Database.ts#L167)

___

### createProcessData

▸ **createProcessData**(): [`ProcessData`](../interfaces/ProcessData.md)

Creates a new ProcessData object. Called in Reporter thread.

#### Returns

[`ProcessData`](../interfaces/ProcessData.md)

#### Inherited from

[Database](Database.md).[createProcessData](Database.md#createprocessdata)

#### Defined in

[src/Database.ts:189](https://github.com/clickup/distributed-locker/blob/master/src/Database.ts#L189)

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

#### Overrides

[Database](Database.md).[readLockData](Database.md#readlockdata)

#### Defined in

[src/databases/RedisDatabase.ts:87](https://github.com/clickup/distributed-locker/blob/master/src/databases/RedisDatabase.ts#L87)

___

### tryCreate

▸ **tryCreate**(`key`, `lockDataIn`, `ttlMs`): `Promise`\<\{ `status`: [`SUCCESS`](../enums/LockStatus.md#success) ; `lockData`: [`LockData`](../interfaces/LockData.md)  } \| \{ `status`: [`SOMEONE_ELSE_HOLDS_LOCK`](../enums/LockStatus.md#someone_else_holds_lock) ; `lockData`: [`LockData`](../interfaces/LockData.md)  }\>

Writes the lock data to a lock with the provided key, but only if this lock
key doesn't exist yet.

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `lockDataIn` | [`LockData`](../interfaces/LockData.md) |
| `ttlMs` | `number` |

#### Returns

`Promise`\<\{ `status`: [`SUCCESS`](../enums/LockStatus.md#success) ; `lockData`: [`LockData`](../interfaces/LockData.md)  } \| \{ `status`: [`SOMEONE_ELSE_HOLDS_LOCK`](../enums/LockStatus.md#someone_else_holds_lock) ; `lockData`: [`LockData`](../interfaces/LockData.md)  }\>

#### Overrides

[Database](Database.md).[tryCreate](Database.md#trycreate)

#### Defined in

[src/databases/RedisDatabase.ts:92](https://github.com/clickup/distributed-locker/blob/master/src/databases/RedisDatabase.ts#L92)

___

### tryUpdate

▸ **tryUpdate**(`key`, `lockDataIn`, `ttlMs`, `onlyIfOwnerHashEq`): `Promise`\<\{ `status`: [`SUCCESS`](../enums/LockStatus.md#success) ; `lockData`: [`LockData`](../interfaces/LockData.md)  } \| \{ `status`: [`NO_KEY`](../enums/LockStatus.md#no_key) ; `lockData`: ``null``  } \| \{ `status`: [`SOMEONE_ELSE_HOLDS_LOCK`](../enums/LockStatus.md#someone_else_holds_lock) ; `lockData`: [`LockData`](../interfaces/LockData.md)  }\>

Writes the lock data to a lock with the provided key, but only if this lock
key exists, and its ownerHash is equal to the provided one.

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `lockDataIn` | [`LockData`](../interfaces/LockData.md) |
| `ttlMs` | `number` |
| `onlyIfOwnerHashEq` | `string` |

#### Returns

`Promise`\<\{ `status`: [`SUCCESS`](../enums/LockStatus.md#success) ; `lockData`: [`LockData`](../interfaces/LockData.md)  } \| \{ `status`: [`NO_KEY`](../enums/LockStatus.md#no_key) ; `lockData`: ``null``  } \| \{ `status`: [`SOMEONE_ELSE_HOLDS_LOCK`](../enums/LockStatus.md#someone_else_holds_lock) ; `lockData`: [`LockData`](../interfaces/LockData.md)  }\>

#### Overrides

[Database](Database.md).[tryUpdate](Database.md#tryupdate)

#### Defined in

[src/databases/RedisDatabase.ts:111](https://github.com/clickup/distributed-locker/blob/master/src/databases/RedisDatabase.ts#L111)

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

#### Overrides

[Database](Database.md).[tryDelete](Database.md#trydelete)

#### Defined in

[src/databases/RedisDatabase.ts:133](https://github.com/clickup/distributed-locker/blob/master/src/databases/RedisDatabase.ts#L133)

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

#### Overrides

[Database](Database.md).[readProcessData](Database.md#readprocessdata)

#### Defined in

[src/databases/RedisDatabase.ts:160](https://github.com/clickup/distributed-locker/blob/master/src/databases/RedisDatabase.ts#L160)

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

#### Overrides

[Database](Database.md).[saveProcessData](Database.md#saveprocessdata)

#### Defined in

[src/databases/RedisDatabase.ts:165](https://github.com/clickup/distributed-locker/blob/master/src/databases/RedisDatabase.ts#L165)

___

### terminate

▸ **terminate**(): `Promise`\<`void`\>

Terminates the database connections.

#### Returns

`Promise`\<`void`\>

#### Overrides

[Database](Database.md).[terminate](Database.md#terminate)

#### Defined in

[src/databases/RedisDatabase.ts:178](https://github.com/clickup/distributed-locker/blob/master/src/databases/RedisDatabase.ts#L178)
