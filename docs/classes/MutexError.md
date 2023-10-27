[@clickup/distributed-locker](../README.md) / [Exports](../modules.md) / MutexError

# Class: MutexError

## Hierarchy

- `Error`

  ↳ **`MutexError`**

## Constructors

### constructor

• **new MutexError**(`key`, `lockData`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `lockData` | [`LockData`](../interfaces/LockData.md) |

#### Overrides

Error.constructor

#### Defined in

[src/MutexError.ts:4](https://github.com/clickup/distributed-locker/blob/master/src/MutexError.ts#L4)

## Properties

### key

• `Readonly` **key**: `string`

#### Defined in

[src/MutexError.ts:4](https://github.com/clickup/distributed-locker/blob/master/src/MutexError.ts#L4)

___

### lockData

• `Readonly` **lockData**: [`LockData`](../interfaces/LockData.md)

#### Defined in

[src/MutexError.ts:4](https://github.com/clickup/distributed-locker/blob/master/src/MutexError.ts#L4)
