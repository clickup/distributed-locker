[@clickup/distributed-locker](../README.md) / [Exports](../modules.md) / Extend

# Interface: Extend

## Callable

### Extend

▸ **Extend**(): `Promise`\<\{ `status`: [`SUCCESS`](../enums/LockStatus.md#success) ; `lockData`: [`LockData`](LockData.md)  } \| \{ `status`: [`NO_KEY`](../enums/LockStatus.md#no_key) ; `lockData`: ``null``  } \| \{ `status`: [`SOMEONE_ELSE_HOLDS_LOCK`](../enums/LockStatus.md#someone_else_holds_lock) ; `lockData`: [`LockData`](LockData.md)  }\>

#### Returns

`Promise`\<\{ `status`: [`SUCCESS`](../enums/LockStatus.md#success) ; `lockData`: [`LockData`](LockData.md)  } \| \{ `status`: [`NO_KEY`](../enums/LockStatus.md#no_key) ; `lockData`: ``null``  } \| \{ `status`: [`SOMEONE_ELSE_HOLDS_LOCK`](../enums/LockStatus.md#someone_else_holds_lock) ; `lockData`: [`LockData`](LockData.md)  }\>

#### Defined in

[src/Extend.ts:5](https://github.com/clickup/distributed-locker/blob/master/src/Extend.ts#L5)
